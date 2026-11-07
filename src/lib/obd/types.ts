export type ObdConnectionKind = 'demo' | 'web-ble' | 'native-ble' | 'native-spp'

export type ObdConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'initializing'
  | 'ready'
  | 'error'

export type DtcStatus = 'stored' | 'pending' | 'permanent'

export interface ObdTransport {
  readonly kind: ObdConnectionKind
  readonly label: string
  connect(): Promise<string>
  disconnect(): Promise<void>
  write(data: string): Promise<void>
  onData(callback: (chunk: string) => void): () => void
  onDisconnect(callback: () => void): () => void
}

export interface DtcRecord {
  code: string
  status: DtcStatus
  raw: string
}

export interface MonitorStatus {
  milOn: boolean
  dtcCount: number
  raw: number[]
  readiness: {
    misfire: boolean
    fuelSystem: boolean
    components: boolean
  }
}

export interface FreezeFrame {
  code: string | null
  values: Record<string, number>
  capturedAt: number
}

export interface LiveValue {
  key: string
  value: number
  unit: string
  updatedAt: number
  history: number[]
}

export interface VehicleInfo {
  make: string
  model: string
  year: string
  engine: string
  vin: string
}

export interface ObdErrorInfo {
  message: string
  hint?: string
}

export interface ConnectionInfo {
  status: ObdConnectionStatus
  kind: ObdConnectionKind | null
  deviceName: string | null
  error: ObdErrorInfo | null
  startedAt: number | null
}

export class ObdError extends Error {
  hint?: string

  constructor(message: string, hint?: string) {
    super(message)
    this.name = 'ObdError'
    this.hint = hint
  }
}
