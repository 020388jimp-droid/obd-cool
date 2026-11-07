import { PID_BY_CODE, type PidDefinition } from '../../data/pids'
import {
  ObdError,
  type DtcRecord,
  type DtcStatus,
  type FreezeFrame,
  type MonitorStatus,
  type ObdTransport,
} from './types'

export interface ElmLogEntry {
  direction: 'tx' | 'rx' | 'info' | 'error'
  text: string
  at: number
}

export interface Elm327Options {
  timeoutMs?: number
  initTimeoutMs?: number
  onLog?: (entry: ElmLogEntry) => void
  onDisconnect?: () => void
}

interface PendingCommand {
  resolve: (value: string) => void
  reject: (reason: Error) => void
  timer: ReturnType<typeof setTimeout>
  command: string
}

const DTC_MODES: Record<DtcStatus, string> = {
  stored: '03',
  pending: '07',
  permanent: '0A',
}

const DTC_SERVICES: Record<DtcStatus, number> = {
  stored: 0x43,
  pending: 0x47,
  permanent: 0x4a,
}

const FREEZE_FRAME_PIDS = [
  '05',
  '06',
  '07',
  '0B',
  '0C',
  '0D',
  '0F',
  '10',
  '11',
  '42',
] as const

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function stripPrompt(text: string): string {
  return text.replace(/>/g, '').replace(/\r/g, '\n').trim()
}

function isNoData(raw: string): boolean {
  const text = raw.toUpperCase()
  return text.includes('NO DATA') || text.includes('NODATA')
}

export function isErrorResponse(raw: string): boolean {
  const text = raw.toUpperCase()
  return (
    text.includes('UNABLE TO CONNECT') ||
    text.includes('CAN ERROR') ||
    text.includes('BUS ERROR') ||
    text.includes('BUS INIT') ||
    text.includes('ERROR') ||
    text.includes('STOPPED') ||
    text.includes('?') ||
    text.includes('NOT CONNECTED')
  )
}

export function normalizeHexResponse(raw: string): string[] {
  return stripPrompt(raw)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const colon = line.lastIndexOf(':')
      return colon >= 0 ? line.slice(colon + 1).trim() : line
    })
}

export function extractHexBytes(line: string): number[] {
  const clean = line.replace(/[^0-9A-Fa-f]/g, '')
  if (clean.length < 2 || clean.length % 2 !== 0) return []
  const bytes: number[] = []
  for (let index = 0; index < clean.length; index += 2) {
    bytes.push(Number.parseInt(clean.slice(index, index + 2), 16))
  }
  return bytes
}

export function decodeDtcPair(first: number, second: number): string {
  const system = ['P', 'C', 'B', 'U'][(first & 0xc0) >> 6] ?? 'P'
  const secondDigit = (first & 0x30) >> 4
  const thirdDigit = first & 0x0f
  const fourthDigit = (second & 0xf0) >> 4
  const fifthDigit = second & 0x0f
  return `${system}${secondDigit}${thirdDigit.toString(16).toUpperCase()}${fourthDigit
    .toString(16)
    .toUpperCase()}${fifthDigit.toString(16).toUpperCase()}`
}

export function encodeDtcPair(code: string): [number, number] {
  const clean = code.trim().toUpperCase()
  const systems: Record<string, number> = { P: 0, C: 1, B: 2, U: 3 }
  const first = ((systems[clean.charAt(0)] ?? 0) << 6) | (Number.parseInt(clean.charAt(1), 16) << 4) | Number.parseInt(clean.charAt(2), 16)
  const second = (Number.parseInt(clean.charAt(3), 16) << 4) | Number.parseInt(clean.charAt(4), 16)
  return [first, second]
}

export function parseDtcResponse(raw: string, status: DtcStatus): DtcRecord[] {
  const service = DTC_SERVICES[status]
  const found: DtcRecord[] = []
  const seen = new Set<string>()

  for (const line of normalizeHexResponse(raw)) {
    const bytes = extractHexBytes(line)
    const serviceIndex = bytes.indexOf(service)
    if (serviceIndex < 0) continue
    const payload = bytes.slice(serviceIndex + 1)
    for (let index = 0; index + 1 < payload.length; index += 2) {
      const first = payload[index]!
      const second = payload[index + 1]!
      if (first === 0 && second === 0) continue
      const code = decodeDtcPair(first, second)
      if (!/^[PCBU][0-3][0-9A-F]{3}$/.test(code)) continue
      if (seen.has(code)) continue
      seen.add(code)
      found.push({ code, status, raw: line })
    }
  }

  return found
}

export function parsePidBytes(raw: string, mode: 0x01 | 0x02, pid: string, frame = 0): number[] | null {
  const service = mode === 0x01 ? 0x41 : 0x42
  const pidValue = Number.parseInt(pid, 16)
  for (const line of normalizeHexResponse(raw)) {
    const bytes = extractHexBytes(line)
    for (let index = 0; index + 1 < bytes.length; index += 1) {
      if (bytes[index] !== service || bytes[index + 1] !== pidValue) continue
      const start = mode === 0x01 ? index + 2 : index + 3
      if (mode === 0x02 && bytes.slice(index + 2, index + 3)[0] !== frame) continue
      if (bytes.length <= start) return []
      return bytes.slice(start)
    }
  }
  return null
}

export function decodePidValue(definition: PidDefinition, bytes: number[]): number | null {
  if (bytes.length < definition.bytes) return null
  if (bytes.some((value) => Number.isNaN(value))) return null
  return definition.formula(bytes)
}

export function parseMonitorStatus(raw: string): MonitorStatus | null {
  const bytes = parsePidBytes(raw, 0x01, '01')
  if (!bytes || bytes.length < 4) return null
  const first = bytes[0]!
  const second = bytes[1]!
  return {
    milOn: (first & 0x80) !== 0,
    dtcCount: first & 0x7f,
    raw: bytes.slice(0, 4),
    readiness: {
      misfire: (second & 0x01) === 0,
      fuelSystem: (second & 0x02) === 0,
      components: (second & 0x04) === 0,
    },
  }
}

export function parseSupportedPids(raw: string, base: number): string[] {
  const bytes = parsePidBytes(raw, 0x01, base.toString(16).padStart(2, '0'))
  if (!bytes || bytes.length < 4) return []
  const supported: string[] = []
  for (let bit = 0; bit < 32; bit += 1) {
    const byte = bytes[Math.floor(bit / 8)] ?? 0
    const mask = 1 << (7 - (bit % 8))
    if ((byte & mask) !== 0) {
      const value = base + bit + 1
      supported.push(value.toString(16).toUpperCase().padStart(2, '0'))
    }
  }
  return supported
}

export class Elm327Client {
  private transport: ObdTransport
  private timeoutMs: number
  private initTimeoutMs: number
  private onLog?: (entry: ElmLogEntry) => void
  private onDisconnect?: () => void
  private buffer = ''
  private pending: PendingCommand | null = null
  private chain: Promise<unknown> = Promise.resolve()
  private unsubscribeData: (() => void) | null = null
  private unsubscribeDisconnect: (() => void) | null = null
  private connected = false
  private deviceName = ''
  private version = ''
  private supportedPids = new Set<string>()

  constructor(transport: ObdTransport, options: Elm327Options = {}) {
    this.transport = transport
    this.timeoutMs = options.timeoutMs ?? 3500
    this.initTimeoutMs = options.initTimeoutMs ?? 6500
    this.onLog = options.onLog
    this.onDisconnect = options.onDisconnect
  }

  get device(): string {
    return this.deviceName
  }

  get firmware(): string {
    return this.version
  }

  get supported(): ReadonlySet<string> {
    return this.supportedPids
  }

  async connect(): Promise<string> {
    this.deviceName = await this.transport.connect()
    this.unsubscribeData = this.transport.onData((chunk) => this.handleData(chunk))
    this.unsubscribeDisconnect = this.transport.onDisconnect(() => this.handleDisconnect())
    this.connected = true
    this.log('info', `Conectado a ${this.deviceName}`)
    await this.initialize()
    await this.loadSupportedPids()
    return this.deviceName
  }

  private async initialize(): Promise<void> {
    await sleep(350)
    try {
      const banner = await this.send('ATZ', this.initTimeoutMs)
      this.version = stripPrompt(banner).split(/\r?\n/).filter(Boolean).join(' ').slice(0, 80)
      this.log('info', `Adaptador: ${this.version || 'ELM327'}`)
    } catch {
      this.log('error', 'ATZ no respondió; se intentará inicializar igualmente.')
    }

    const commands = ['ATE0', 'ATL0', 'ATS0', 'ATH0', 'ATSP0']
    for (const command of commands) {
      try {
        const response = await this.send(command, 2500)
        this.log('info', `${command}: ${stripPrompt(response) || 'OK'}`)
      } catch {
        this.log('error', `${command} sin respuesta; se omite.`)
      }
    }
    await sleep(250)
  }

  private async loadSupportedPids(): Promise<void> {
    const bases = [0x00, 0x20, 0x40, 0x60]
    const supported = new Set<string>()
    for (const base of bases) {
      try {
        const raw = await this.send(`01${base.toString(16).padStart(2, '0')}`, this.timeoutMs)
        if (isNoData(raw) || isErrorResponse(raw)) continue
        for (const pid of parseSupportedPids(raw, base)) supported.add(pid)
      } catch {
        // Un vehículo antiguo puede no responder a los bloques superiores.
      }
    }
    this.supportedPids = supported
    this.log('info', `PIDs soportados: ${supported.size}`)
  }

  async readPid(pid: string): Promise<number | null> {
    const definition = PID_BY_CODE[pid.toUpperCase()]
    if (!definition) throw new ObdError(`PID desconocido: ${pid}`)
    const raw = await this.send(`01${pid.toUpperCase()}`, this.timeoutMs)
    if (isNoData(raw)) return null
    if (isErrorResponse(raw)) {
      throw new ObdError(`El vehículo no respondió al PID ${pid}.`, 'Puede que este sensor no esté soportado.')
    }
    const bytes = parsePidBytes(raw, 0x01, pid)
    if (!bytes) return null
    return decodePidValue(definition, bytes)
  }

  async readDtcs(status: DtcStatus): Promise<DtcRecord[]> {
    const raw = await this.send(DTC_MODES[status], this.timeoutMs)
    if (isNoData(raw)) return []
    if (isErrorResponse(raw)) {
      throw new ObdError(`No se pudieron leer los códigos ${status}.`, 'Comprueba que el contacto esté encendido y el adaptador conectado.')
    }
    return parseDtcResponse(raw, status)
  }

  async readAllDtcs(): Promise<DtcRecord[]> {
    const result: DtcRecord[] = []
    for (const status of ['stored', 'pending', 'permanent'] as const) {
      try {
        result.push(...(await this.readDtcs(status)))
      } catch (error) {
        this.log('error', `Error leyendo ${status}: ${(error as Error).message}`)
      }
    }
    return result
  }

  async clearDtcs(): Promise<void> {
    const raw = await this.send('04', 6000)
    if (isErrorResponse(raw)) {
      throw new ObdError('El vehículo rechazó el borrado de códigos.', 'Revisa que el contacto esté encendido y el motor apagado.')
    }
    if (!/OK|44|CLEARED/i.test(stripPrompt(raw))) {
      throw new ObdError('El ELM327 no confirmó el borrado.', `Respuesta: ${stripPrompt(raw) || '(vacía)'}`)
    }
  }

  async readMonitorStatus(): Promise<MonitorStatus | null> {
    const raw = await this.send('0101', this.timeoutMs)
    if (isNoData(raw) || isErrorResponse(raw)) return null
    return parseMonitorStatus(raw)
  }

  async readFreezeFrame(): Promise<FreezeFrame | null> {
    try {
      const dtcRaw = await this.send('020200', this.timeoutMs)
      const bytes = parsePidBytes(dtcRaw, 0x02, '02')
      if (!bytes || bytes.length < 2) return null
      const code = decodeDtcPair(bytes[0]!, bytes[1]!)
      const values: Record<string, number> = {}
      for (const pid of FREEZE_FRAME_PIDS) {
        const definition = PID_BY_CODE[pid]
        if (!definition) continue
        try {
          const raw = await this.send(`02${pid}00`, this.timeoutMs)
          const data = parsePidBytes(raw, 0x02, pid)
          if (!data) continue
          const value = decodePidValue(definition, data)
          if (value !== null) values[definition.key] = value
        } catch {
          // El fotograma congelado es opcional.
        }
      }
      return { code, values, capturedAt: Date.now() }
    } catch {
      return null
    }
  }

  async readVin(): Promise<string | null> {
    try {
      const raw = await this.send('0902', 6000)
      if (isNoData(raw) || isErrorResponse(raw)) return null
      const chars: string[] = []
      for (const line of normalizeHexResponse(raw)) {
        const bytes = extractHexBytes(line)
        for (let index = 0; index < bytes.length; index += 1) {
          const value = bytes[index]!
          if (value >= 0x20 && value <= 0x7e) chars.push(String.fromCharCode(value))
        }
      }
      const vin = chars.join('').replace(/[^A-HJ-NPR-Z0-9]/gi, '')
      const match = vin.match(/[A-HJ-NPR-Z0-9]{17}/i)
      return match ? match[0].toUpperCase() : null
    } catch {
      return null
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false
    this.rejectPending(new ObdError('Conexión cerrada.'))
    this.unsubscribeData?.()
    this.unsubscribeDisconnect?.()
    this.unsubscribeData = null
    this.unsubscribeDisconnect = null
    await this.transport.disconnect().catch(() => undefined)
  }

  private send(command: string, timeoutMs: number): Promise<string> {
    const run = () => this.sendNow(command, timeoutMs)
    const next = this.chain.then(run, run)
    this.chain = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }

  private sendNow(command: string, timeoutMs: number): Promise<string> {
    if (!this.connected) {
      return Promise.reject(new ObdError('No hay conexión con el ELM327.', 'Vuelve a conectar el adaptador.'))
    }
    if (this.pending) {
      return Promise.reject(new ObdError('Hay un comando OBD en curso.'))
    }

    const clean = command.replace(/\s+/g, '').toUpperCase()
    this.buffer = ''
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending = null
        reject(
          new ObdError(
            `El ELM327 no respondió a "${clean}" en ${Math.round(timeoutMs / 1000)} s.`,
            'Comprueba que el contacto esté encendido y que el adaptador sea compatible.',
          ),
        )
      }, timeoutMs)

      this.pending = {
        command: clean,
        timer,
        resolve: (value) => {
          clearTimeout(timer)
          resolve(value)
        },
        reject,
      }

      this.log('tx', clean)
      this.transport.write(`${clean}\r`).catch((error: unknown) => {
        if (!this.pending) return
        clearTimeout(timer)
        this.pending = null
        reject(new ObdError(`No se pudo enviar "${clean}".`, (error as Error).message))
      })
    })
  }

  private handleData(chunk: string): void {
    if (!chunk) return
    this.buffer += chunk
    this.log('rx', chunk)
    if (!this.buffer.includes('>')) return
    const response = stripPrompt(this.buffer)
    this.buffer = ''
    const pending = this.pending
    if (!pending) return
    this.pending = null
    clearTimeout(pending.timer)
    pending.resolve(response)
  }

  private handleDisconnect(): void {
    if (!this.connected) return
    this.connected = false
    this.rejectPending(new ObdError('El ELM327 se desconectó.', 'Acércalo al vehículo y vuelve a conectar.'))
    this.onDisconnect?.()
  }

  private rejectPending(error: Error): void {
    if (!this.pending) return
    clearTimeout(this.pending.timer)
    this.pending.reject(error)
    this.pending = null
  }

  private log(direction: ElmLogEntry['direction'], text: string): void {
    this.onLog?.({
      direction,
      text: stripPrompt(text).replace(/\s+/g, ' ').slice(0, 180),
      at: Date.now(),
    })
  }
}
