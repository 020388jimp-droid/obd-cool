import { useEffect, useMemo, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import {
  Bluetooth,
  Cable,
  Car,
  CheckCircle2,
  Loader2,
  Radio,
  RefreshCw,
  Smartphone,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import type { ObdApi } from '../hooks/useObd'
import { listSppDevices, type SppDevice } from '../lib/obd'
import type { ObdConnectionKind } from '../lib/obd/types'
import { Badge, Modal } from './ui'

interface ModeOption {
  id: ObdConnectionKind
  title: string
  description: string
  icon: typeof Bluetooth
  badge?: string
  recommended?: boolean
}

export function ConnectionModal({
  open,
  onClose,
  obd,
}: {
  open: boolean
  onClose: () => void
  obd: ObdApi
}) {
  const platform = Capacitor.getPlatform()
  const native = Capacitor.isNativePlatform()
  const hasWebBluetooth = typeof navigator !== 'undefined' && Boolean(navigator.bluetooth)

  const options = useMemo<ModeOption[]>(() => {
    const list: ModeOption[] = []
    if (native) {
      list.push({
        id: 'native-ble',
        title: 'Bluetooth BLE',
        description: 'Para ELM327 BLE 4.0. La app muestra los dispositivos cercanos.',
        icon: Bluetooth,
        badge: 'BLE',
      })
      if (platform === 'android') {
        list.push({
          id: 'native-spp',
          title: 'Bluetooth clásico (SPP)',
          description: 'Para la mayoría de ELM327 baratos. Usa un dispositivo ya emparejado.',
          icon: Cable,
          badge: 'SPP',
          recommended: true,
        })
      }
    } else {
      list.push({
        id: 'web-ble',
        title: 'Bluetooth BLE (navegador)',
        description: 'Chrome o Edge en Android/escritorio. No funciona con ELM327 clásico.',
        icon: Bluetooth,
        badge: 'Web',
        recommended: hasWebBluetooth,
      })
    }
    list.push({
      id: 'demo',
      title: 'Simulador',
      description: 'Prueba la app sin coche ni adaptador. Incluye códigos y sensores de ejemplo.',
      icon: Sparkles,
      badge: 'Demo',
      recommended: !hasWebBluetooth && !native,
    })
    return list
  }, [hasWebBluetooth, native, platform])

  const [mode, setMode] = useState<ObdConnectionKind>(() => {
    if (native && platform === 'android') return 'native-spp'
    if (!native && hasWebBluetooth) return 'web-ble'
    return 'demo'
  })
  const [sppDevices, setSppDevices] = useState<SppDevice[]>([])
  const [sppDevice, setSppDevice] = useState<SppDevice | null>(null)
  const [sppLoading, setSppLoading] = useState(false)
  const [sppError, setSppError] = useState('')
  const [sppReload, setSppReload] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open || mode !== 'native-spp' || !native) return
    let active = true
    setSppLoading(true)
    setSppError('')
    listSppDevices()
      .then((devices) => {
        if (!active) return
        setSppDevices(devices)
        const preferred =
          devices.find((device) => /elm|obd|vlink|vgate|scan|bluetooth/i.test(device.name)) ?? devices[0] ?? null
        setSppDevice(preferred)
      })
      .catch((error: unknown) => {
        if (!active) return
        setSppError((error as Error).message || 'No se pudieron listar los dispositivos.')
      })
      .finally(() => {
        if (active) setSppLoading(false)
      })
    return () => {
      active = false
    }
  }, [mode, native, open, sppReload])

  const connected = obd.connection.status === 'ready'
  const connecting = submitting || obd.connection.status === 'connecting'
  const canConnect = mode !== 'native-spp' || Boolean(sppDevice)

  const handleConnect = async () => {
    if (connecting) return
    setSubmitting(true)
    const ok = await obd.connect(mode, mode === 'native-spp' ? sppDevice : null)
    setSubmitting(false)
    if (ok) onClose()
  }

  const handleDisconnect = async () => {
    await obd.disconnect()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={connected ? 'Conexión activa' : 'Conectar ELM327'}
      subtitle={
        connected
          ? 'El adaptador está listo para leer códigos y sensores.'
          : 'Elige cómo quieres conectar. El contacto debe estar en posición II (encendido, motor apagado) para leer códigos.'
      }
      wide
      footer={
        <div className="modal__footer-row">
          <div className="modal__footer-note">
            {mode === 'demo'
              ? 'El simulador no envía datos a tu coche.'
              : 'No borres códigos antes de diagnosticar.'}
          </div>
          <div className="modal__footer-actions">
            <button type="button" className="button button--ghost" onClick={onClose}>
              {connected ? 'Cerrar' : 'Cancelar'}
            </button>
            {connected ? (
              <button type="button" className="button button--danger" onClick={() => void handleDisconnect()}>
                Desconectar
              </button>
            ) : (
              <button
                type="button"
                className="button button--primary"
                onClick={() => void handleConnect()}
                disabled={connecting || !canConnect}
              >
                {connecting ? <Loader2 size={16} className="spin" /> : <Radio size={16} />}
                {connecting ? 'Conectando…' : 'Conectar'}
              </button>
            )}
          </div>
        </div>
      }
    >
      {connected && (
        <div className="connected-banner">
          <CheckCircle2 size={22} />
          <div>
            <strong>{obd.connection.deviceName}</strong>
            <span>
              {obd.connection.kind === 'demo' ? 'Modo simulador' : 'ELM327'} ·{' '}
              {obd.firmware || 'firmware no informado'}
            </span>
          </div>
        </div>
      )}

      {!connected && (
        <>
          <div className="connection-options">
            {options.map((option) => {
              const Icon = option.icon
              const selected = mode === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  className={`connection-option ${selected ? 'is-selected' : ''}`}
                  onClick={() => setMode(option.id)}
                >
                  <span className="connection-option__icon">
                    <Icon size={22} />
                  </span>
                  <span className="connection-option__body">
                    <span className="connection-option__title">
                      {option.title}
                      {option.badge && <Badge tone={option.recommended ? 'accent' : 'neutral'}>{option.badge}</Badge>}
                      {option.recommended && <Badge tone="ok">Recomendado</Badge>}
                    </span>
                    <span className="connection-option__description">{option.description}</span>
                  </span>
                  <span className={`radio-dot ${selected ? 'is-on' : ''}`} />
                </button>
              )
            })}
          </div>

          {mode === 'native-spp' && (
            <div className="connection-extra">
              <div className="connection-extra__head">
                <strong>Dispositivo emparejado</strong>
                <button
                  type="button"
                  className="button button--tiny button--ghost"
                  onClick={() => setSppReload((value) => value + 1)}
                  disabled={sppLoading}
                >
                  <RefreshCw size={14} className={sppLoading ? 'spin' : ''} /> Actualizar
                </button>
              </div>
              {sppLoading && (
                <div className="inline-loading">
                  <Loader2 size={16} className="spin" /> Buscando dispositivos emparejados…
                </div>
              )}
              {sppError && (
                <div className="inline-error">
                  <TriangleAlert size={16} /> {sppError}
                </div>
              )}
              {!sppLoading && !sppError && sppDevices.length === 0 && (
                <div className="inline-note">
                  No hay dispositivos emparejados. Empareja el ELM327 desde los ajustes de Bluetooth de Android y
                  vuelve a actualizar.
                </div>
              )}
              {sppDevices.length > 0 && (
                <select
                  className="input"
                  value={sppDevice?.address ?? ''}
                  onChange={(event) => {
                    const selected = sppDevices.find((device) => device.address === event.target.value) ?? null
                    setSppDevice(selected)
                  }}
                >
                  {sppDevices.map((device) => (
                    <option key={device.address} value={device.address}>
                      {device.name} · {device.address}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {mode === 'web-ble' && !hasWebBluetooth && (
            <div className="inline-error">
              <TriangleAlert size={16} /> Este navegador no expone Web Bluetooth. Usa Chrome/Edge en Android o la app
              Android.
            </div>
          )}

          {obd.connection.error && (
            <div className="inline-error">
              <TriangleAlert size={16} />
              <div>
                <strong>{obd.connection.error.message}</strong>
                {obd.connection.error.hint && <span>{obd.connection.error.hint}</span>}
              </div>
            </div>
          )}

          <div className="connection-help">
            <div className="connection-help__item">
              <Bluetooth size={18} />
              <div>
                <strong>BLE 4.0</strong>
                <p>Funciona en web y app. Es el único tipo que el navegador puede abrir.</p>
              </div>
            </div>
            <div className="connection-help__item">
              <Cable size={18} />
              <div>
                <strong>Bluetooth clásico SPP</strong>
                <p>La mayoría de ELM327 baratos. Solo la app Android puede usarlo.</p>
              </div>
            </div>
            <div className="connection-help__item">
              <Smartphone size={18} />
              <div>
                <strong>iPhone</strong>
                <p>iOS no permite Web Bluetooth. Usa la app con un adaptador BLE.</p>
              </div>
            </div>
            <div className="connection-help__item">
              <Car size={18} />
              <div>
                <strong>Antes de conectar</strong>
                <p>Enciende el contacto. No arranques el motor para leer códigos.</p>
              </div>
            </div>
          </div>
        </>
      )}
    </Modal>
  )
}
