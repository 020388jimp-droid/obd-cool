import { useCallback, useEffect, useRef, useState } from 'react'
import { LIVE_PID_KEYS, PID_BY_KEY, type PidDefinition } from '../data/pids'
import { lookupDtc, type ResolvedDtc } from '../data/dtcDatabase'
import { createTransport, Elm327Client } from '../lib/obd'
import type { ElmLogEntry, SppDevice } from '../lib/obd'
import type {
  DtcStatus,
  FreezeFrame,
  LiveValue,
  MonitorStatus,
  ObdConnectionKind,
  ObdConnectionStatus,
  ObdErrorInfo,
  VehicleInfo,
} from '../lib/obd/types'

export interface CodeWithStatus extends ResolvedDtc {
  statuses: DtcStatus[]
  raws: string[]
}

export interface ConnectionState {
  status: ObdConnectionStatus
  kind: ObdConnectionKind | null
  deviceName: string | null
  error: ObdErrorInfo | null
  startedAt: number | null
}

export interface Toast {
  id: number
  type: 'ok' | 'error' | 'info'
  text: string
}

const SEVERITY_ORDER: Record<string, number> = {
  critica: 0,
  alta: 1,
  media: 2,
  baja: 3,
  info: 4,
}

const EMPTY_CONNECTION: ConnectionState = {
  status: 'disconnected',
  kind: null,
  deviceName: null,
  error: null,
  startedAt: null,
}

function toErrorInfo(error: unknown): ObdErrorInfo {
  if (error instanceof Error) {
    const hint = (error as Error & { hint?: string }).hint
    return { message: error.message, hint }
  }
  return { message: 'Ocurrió un error inesperado.' }
}

export function useObd(vehicle: VehicleInfo, pollingMs: number) {
  const [connection, setConnection] = useState<ConnectionState>(EMPTY_CONNECTION)
  const [codes, setCodes] = useState<CodeWithStatus[]>([])
  const [monitor, setMonitor] = useState<MonitorStatus | null>(null)
  const [freezeFrame, setFreezeFrame] = useState<FreezeFrame | null>(null)
  const [live, setLive] = useState<Record<string, LiveValue>>({})
  const [liveKeys, setLiveKeys] = useState<string[]>([...LIVE_PID_KEYS])
  const [polling, setPolling] = useState(false)
  const [logs, setLogs] = useState<ElmLogEntry[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [firmware, setFirmware] = useState('')
  const [supportedPids, setSupportedPids] = useState<string[]>([])

  const clientRef = useRef<Elm327Client | null>(null)
  const activeRef = useRef(false)
  const timerRef = useRef<number | null>(null)
  const pollingMsRef = useRef(pollingMs)
  const vehicleRef = useRef(vehicle)
  const keysRef = useRef<string[]>([...LIVE_PID_KEYS])

  vehicleRef.current = vehicle
  pollingMsRef.current = pollingMs

  const pushToast = useCallback((type: Toast['type'], text: string) => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current.slice(-3), { id, type, text }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 5500)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const stopPolling = useCallback(() => {
    activeRef.current = false
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setPolling(false)
  }, [])

  const applyLiveValue = useCallback((definition: PidDefinition, value: number) => {
    setLive((current) => {
      const previous = current[definition.key]
      const history = previous ? [...previous.history, value].slice(-48) : [value]
      return {
        ...current,
        [definition.key]: {
          key: definition.key,
          value,
          unit: definition.unit,
          updatedAt: Date.now(),
          history,
        },
      }
    })
  }, [])

  const readCodesInternal = useCallback(
    async (client: Elm327Client, announce = true) => {
      const records = await client.readAllDtcs()
      const map = new Map<string, CodeWithStatus>()
      for (const record of records) {
        const resolved = lookupDtc(record.code, vehicleRef.current)
        const existing = map.get(record.code)
        if (existing) {
          if (!existing.statuses.includes(record.status)) existing.statuses.push(record.status)
          existing.raws.push(record.raw)
        } else {
          map.set(record.code, {
            ...resolved,
            statuses: [record.status],
            raws: [record.raw],
          })
        }
      }
      const list = [...map.values()].sort((a, b) => {
        const severity = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
        return severity !== 0 ? severity : a.code.localeCompare(b.code)
      })
      setCodes(list)

      const [status, frame] = await Promise.all([
        client.readMonitorStatus().catch(() => null),
        list.length > 0 ? client.readFreezeFrame().catch(() => null) : Promise.resolve(null),
      ])
      setMonitor(status)
      setFreezeFrame(frame)

      if (announce) {
        if (list.length === 0) pushToast('ok', 'No hay códigos de falla almacenados.')
        else pushToast('info', `Se leyeron ${list.length} código${list.length === 1 ? '' : 's'}.`)
      }
      return list
    },
    [pushToast],
  )

  const disconnect = useCallback(async () => {
    stopPolling()
    const client = clientRef.current
    clientRef.current = null
    if (client) await client.disconnect().catch(() => undefined)
    setConnection(EMPTY_CONNECTION)
    setPolling(false)
    setLive({})
  }, [stopPolling])

  const connect = useCallback(
    async (kind: ObdConnectionKind, sppDevice?: SppDevice | null): Promise<boolean> => {
      if (connection.status === 'connecting') return false
      await disconnect()
      setConnection({
        status: 'connecting',
        kind,
        deviceName: null,
        error: null,
        startedAt: null,
      })
      setCodes([])
      setMonitor(null)
      setFreezeFrame(null)
      setLive({})
      setLogs([])
      setSupportedPids([])

      try {
        const transport = createTransport(kind, { sppDevice })
        const client = new Elm327Client(transport, {
          onLog: (entry) => setLogs((current) => [entry, ...current].slice(0, 250)),
          onDisconnect: () => {
            stopPolling()
            setConnection((current) => ({
              ...current,
              status: 'disconnected',
              error: {
                message: 'El adaptador se desconectó.',
                hint: 'Acércalo al vehículo, comprueba el encendido y vuelve a conectar.',
              },
            }))
          },
        })
        clientRef.current = client
        const name = await client.connect()
        setConnection({
          status: 'ready',
          kind,
          deviceName: name,
          error: null,
          startedAt: Date.now(),
        })
        setFirmware(client.firmware)
        setSupportedPids([...client.supported])
        pushToast('ok', `Conectado a ${name}.`)
        void readCodesInternal(client, false).catch(() => undefined)
        return true
      } catch (error) {
        const info = toErrorInfo(error)
        setConnection({
          status: 'error',
          kind,
          deviceName: null,
          error: info,
          startedAt: null,
        })
        await clientRef.current?.disconnect().catch(() => undefined)
        clientRef.current = null
        pushToast('error', info.message)
        return false
      }
    },
    [connection.status, disconnect, pushToast, readCodesInternal, stopPolling],
  )

  const readCodes = useCallback(async () => {
    const client = clientRef.current
    if (!client || connection.status !== 'ready') {
      pushToast('error', 'Conecta el ELM327 antes de leer códigos.')
      return
    }
    stopPolling()
    setBusy('codes')
    try {
      await readCodesInternal(client)
    } catch (error) {
      const info = toErrorInfo(error)
      setConnection((current) => ({ ...current, error: info }))
      pushToast('error', info.message)
    } finally {
      setBusy(null)
    }
  }, [connection.status, pushToast, readCodesInternal, stopPolling])

  const clearCodes = useCallback(async () => {
    const client = clientRef.current
    if (!client || connection.status !== 'ready') {
      pushToast('error', 'Conecta el ELM327 antes de borrar códigos.')
      return false
    }
    stopPolling()
    setBusy('clear')
    try {
      await client.clearDtcs()
      setCodes([])
      setFreezeFrame(null)
      setMonitor({
        milOn: false,
        dtcCount: 0,
        raw: [],
        readiness: { misfire: true, fuelSystem: true, components: true },
      })
      pushToast('ok', 'Códigos borrados. Realiza una prueba de conducción y vuelve a leer.')
      return true
    } catch (error) {
      const info = toErrorInfo(error)
      pushToast('error', info.message)
      return false
    } finally {
      setBusy(null)
    }
  }, [connection.status, pushToast, stopPolling])

  const startLive = useCallback(
    (keys: string[] = [...LIVE_PID_KEYS]) => {
      const client = clientRef.current
      if (!client || connection.status !== 'ready') {
        pushToast('error', 'Conecta el ELM327 antes de ver sensores.')
        return
      }
      stopPolling()
      const selected = keys.length > 0 ? keys : [...LIVE_PID_KEYS]
      keysRef.current = selected
      setLiveKeys(selected)
      activeRef.current = true
      setPolling(true)

      let failures = 0
      const tick = async () => {
        if (!activeRef.current) return
        let ok = 0
        for (const key of keysRef.current) {
          if (!activeRef.current) break
          const definition = PID_BY_KEY[key]
          if (!definition) continue
          try {
            const value = await client.readPid(definition.pid)
            if (value !== null) {
              ok += 1
              applyLiveValue(definition, value)
            }
          } catch {
            // Un PID no soportado no debe detener el resto.
          }
        }
        failures = ok === 0 ? failures + 1 : 0
        if (failures >= 3) {
          stopPolling()
          pushToast(
            'error',
            'No se pudieron leer los sensores. Comprueba el contacto y que el vehículo soporte estos PIDs.',
          )
          return
        }
        if (activeRef.current) {
          timerRef.current = window.setTimeout(() => {
            void tick()
          }, Math.max(500, pollingMsRef.current))
        }
      }
      void tick()
    },
    [applyLiveValue, connection.status, pushToast, stopPolling],
  )

  const stopLive = useCallback(() => {
    stopPolling()
  }, [stopPolling])

  const readVin = useCallback(async () => {
    const client = clientRef.current
    if (!client || connection.status !== 'ready') return null
    setBusy('vin')
    try {
      return await client.readVin()
    } finally {
      setBusy(null)
    }
  }, [connection.status])

  const snapshot = useCallback((): Record<string, number> => {
    return Object.fromEntries(
      Object.entries(live).map(([key, value]) => [key, Math.round(value.value * 100) / 100]),
    )
  }, [live])

  const clearError = useCallback(() => {
    setConnection((current) => ({ ...current, error: null }))
  }, [])

  useEffect(() => {
    return () => {
      activeRef.current = false
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      void clientRef.current?.disconnect().catch(() => undefined)
      clientRef.current = null
    }
  }, [])

  return {
    connection,
    codes,
    monitor,
    freezeFrame,
    live,
    liveKeys,
    polling,
    logs,
    busy,
    toasts,
    firmware,
    supportedPids,
    connect,
    disconnect,
    readCodes,
    clearCodes,
    startLive,
    stopLive,
    readVin,
    snapshot,
    clearError,
    dismissToast,
    pushToast,
  }
}

export type ObdApi = ReturnType<typeof useObd>
