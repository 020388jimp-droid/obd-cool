import { encodeDtcPair } from './elm327'
import type { ObdConnectionKind, ObdTransport } from './types'

const DEMO_VIN = '1NXBR32E45Z123456'

const DEMO_PIDS = [
  '04',
  '05',
  '06',
  '07',
  '09',
  '0B',
  '0C',
  '0D',
  '0E',
  '0F',
  '10',
  '11',
  '1F',
  '21',
  '2F',
  '33',
  '42',
  '46',
  '5C',
  '5E',
] as const

function hex(value: number): string {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()
}

function word(value: number): string {
  const rounded = Math.max(0, Math.min(65535, Math.round(value)))
  return `${hex(rounded / 256)} ${hex(rounded % 256)}`
}

function supportedMask(base: number): string {
  const bytes = [0, 0, 0, 0]
  for (const pid of DEMO_PIDS) {
    const number = Number.parseInt(pid, 16)
    if (number > base && number <= base + 0x20) {
      const bit = number - base - 1
      const index = Math.floor(bit / 8)
      bytes[index] = (bytes[index] ?? 0) | (1 << (7 - (bit % 8)))
    }
  }
  return `41 ${base.toString(16).padStart(2, '0').toUpperCase()} ${bytes.map(hex).join(' ')}`
}

function dtcResponse(service: string, codes: string[]): string {
  if (codes.length === 0) return `${service} 00 00 00 00 00 00`
  const payload = codes.flatMap((code) => encodeDtcPair(code))
  return `${service} ${payload.map(hex).join(' ')} 00 00`
}

export class DemoTransport implements ObdTransport {
  readonly kind: ObdConnectionKind = 'demo'
  readonly label = 'Simulador'
  private dataListeners = new Set<(chunk: string) => void>()
  private disconnectListeners = new Set<() => void>()
  private connected = false
  private startedAt = Date.now()
  private storedDtcs = ['P0171', 'P0300', 'P0420']
  private pendingDtcs = ['P0301']
  private permanentDtcs = ['P0420']
  private milOn = true

  async connect(): Promise<string> {
    this.connected = true
    this.startedAt = Date.now()
    return 'ELM327 v1.5 · Demo Toyota Corolla'
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return
    this.connected = false
    for (const listener of this.disconnectListeners) listener()
  }

  async write(data: string): Promise<void> {
    if (!this.connected) throw new Error('El simulador no está conectado.')
    const command = data.replace(/\s+/g, '').toUpperCase()
    const delay = 18 + Math.random() * 35
    window.setTimeout(() => {
      const response = this.respond(command)
      const payload = `${response}\r\r>`
      for (const listener of this.dataListeners) listener(payload)
    }, delay)
  }

  onData(callback: (chunk: string) => void): () => void {
    this.dataListeners.add(callback)
    return () => this.dataListeners.delete(callback)
  }

  onDisconnect(callback: () => void): () => void {
    this.disconnectListeners.add(callback)
    return () => this.disconnectListeners.delete(callback)
  }

  private respond(command: string): string {
    if (command === 'ATZ') return 'ELM327 v1.5'
    if (command === 'ATI') return 'ELM327 v1.5'
    if (command.startsWith('AT')) return 'OK'

    if (command === '0100') return supportedMask(0x00)
    if (command === '0120') return supportedMask(0x20)
    if (command === '0140') return supportedMask(0x40)
    if (command === '0160') return supportedMask(0x60)

    if (command === '0101') {
      const count = this.storedDtcs.length + this.pendingDtcs.length
      return `41 01 ${hex((this.milOn ? 0x80 : 0) | count)} 07 65 00`
    }

    if (command === '03') return dtcResponse('43', this.storedDtcs)
    if (command === '07') return dtcResponse('47', this.pendingDtcs)
    if (command === '0A') return dtcResponse('4A', this.permanentDtcs)

    if (command === '04') {
      this.storedDtcs = []
      this.pendingDtcs = []
      this.milOn = false
      return '44'
    }

    if (command === '0902') {
      const bytes = [...DEMO_VIN].map((char) => char.charCodeAt(0))
      return `49 02 01 ${bytes.map(hex).join(' ')}`
    }

    if (command === '020200') return '42 02 00 01 71'
    if (command.startsWith('02') && command.length >= 6 && command.endsWith('00')) {
      return this.freezeFrame(command.slice(2, 4))
    }

    if (command.startsWith('01') && command.length === 4) {
      return this.livePid(command.slice(2, 4))
    }

    return '?'
  }

  private livePid(pid: string): string {
    const seconds = (Date.now() - this.startedAt) / 1000
    const noise = (scale: number) => Math.sin(seconds * 1.7) * scale
    const map: Record<string, string> = {
      '04': `41 04 ${hex((22 + noise(2)) * 2.55)}`,
      '05': `41 05 ${hex(88 + noise(2) + 40)}`,
      '06': `41 06 ${hex(128 + (17 + noise(4)) * 1.28)}`,
      '07': `41 07 ${hex(128 + (11 + noise(1.5)) * 1.28)}`,
      '09': `41 09 ${hex(128 + (6 + noise(1)) * 1.28)}`,
      '0B': `41 0B ${hex(36 + noise(1))}`,
      '0C': `41 0C ${word((780 + noise(25)) * 4)}`,
      '0D': '41 0D 00',
      '0E': `41 0E ${hex((12 + noise(1)) * 2 + 128)}`,
      '0F': `41 0F ${hex(32 + 40)}`,
      '10': `41 10 ${word((3.2 + noise(0.2)) * 100)}`,
      '11': `41 11 ${hex((14 + noise(0.8)) * 2.55)}`,
      '1F': `41 1F ${word(seconds)}`,
      '21': `41 21 ${word(120)}`,
      '2F': `41 2F ${hex(62 * 2.55)}`,
      '33': `41 33 ${hex(101)}`,
      '42': `41 42 ${word((13.9 + noise(0.04)) * 1000)}`,
      '46': `41 46 ${hex(28 + 40)}`,
      '5C': `41 5C ${hex(92 + 40)}`,
      '5E': `41 5E ${word((0.9 + noise(0.05)) * 20)}`,
    }
    return map[pid] ?? 'NO DATA'
  }

  private freezeFrame(pid: string): string {
    const map: Record<string, string> = {
      '02': '42 02 00 01 71',
      '05': '42 05 00 5C',
      '06': '42 06 00 96',
      '07': '42 07 00 8D',
      '0B': '42 0B 00 23',
      '0C': '42 0C 00 22 60',
      '0D': '42 0D 00 50',
      '0F': '42 0F 00 48',
      '10': '42 10 00 04 E2',
      '11': '42 11 00 40',
      '42': '42 42 00 36 4C',
    }
    return map[pid] ?? 'NO DATA'
  }
}
