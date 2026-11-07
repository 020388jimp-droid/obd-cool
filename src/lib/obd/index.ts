import { DemoTransport } from './demo'
import { NativeBleTransport } from './nativeBle'
import { NativeSppTransport, type SppDevice } from './nativeSpp'
import type { ObdConnectionKind, ObdTransport } from './types'
import { WebBluetoothTransport } from './webBluetooth'

export interface CreateTransportOptions {
  sppDevice?: SppDevice | null
}

export function createTransport(
  kind: ObdConnectionKind,
  options: CreateTransportOptions = {},
): ObdTransport {
  switch (kind) {
    case 'demo':
      return new DemoTransport()
    case 'web-ble':
      return new WebBluetoothTransport()
    case 'native-ble':
      return new NativeBleTransport()
    case 'native-spp':
      return new NativeSppTransport(options.sppDevice)
    default:
      throw new Error(`Tipo de conexión desconocido: ${kind}`)
  }
}

export { Elm327Client } from './elm327'
export type { ElmLogEntry } from './elm327'
export type {
  ConnectionInfo,
  DtcRecord,
  DtcStatus,
  FreezeFrame,
  LiveValue,
  MonitorStatus,
  ObdConnectionKind,
  ObdConnectionStatus,
  ObdTransport,
  VehicleInfo,
} from './types'
export { ObdError } from './types'
export { listSppDevices } from './nativeSpp'
export type { SppDevice } from './nativeSpp'
