import type { PluginListenerHandle } from '@capacitor/core'
import type { PairedBluetoothDevice } from '@ascentio-it/capacitor-bluetooth-serial'
import { ObdError, type ObdConnectionKind, type ObdTransport } from './types'

export interface SppDevice {
  name: string
  address: string
}

async function ensureReady(): Promise<void> {
  const { BluetoothSerial } = await import('@ascentio-it/capacitor-bluetooth-serial')
  const granted = await BluetoothSerial.checkBluetoothPermissions().catch(() => true)
  if (!granted) {
    throw new ObdError(
      'Faltan permisos de Bluetooth.',
      'Acepta los permisos de dispositivos cercanos y Bluetooth en los ajustes de Android.',
    )
  }
  const state = await BluetoothSerial.isEnabled()
  if (!state.enabled) {
    await BluetoothSerial.enable()
    const after = await BluetoothSerial.isEnabled()
    if (!after.enabled) {
      throw new ObdError('El Bluetooth está apagado.', 'Actívalo en los ajustes del teléfono y vuelve a intentar.')
    }
  }
}

export async function listSppDevices(): Promise<SppDevice[]> {
  await ensureReady()
  const { BluetoothSerial } = await import('@ascentio-it/capacitor-bluetooth-serial')
  const paired = await BluetoothSerial.getPairedDevices()
  if (paired.devices.length > 0) {
    return paired.devices.map((device: PairedBluetoothDevice) => ({
      name: device.name || 'Dispositivo sin nombre',
      address: device.address,
    }))
  }
  const scanned = await BluetoothSerial.scan()
  return scanned.devices
    .filter((device) => Boolean(device.address))
    .map((device) => ({
      name: device.name || 'Dispositivo sin nombre',
      address: device.address,
    }))
}

export class NativeSppTransport implements ObdTransport {
  readonly kind: ObdConnectionKind = 'native-spp'
  readonly label = 'Bluetooth clásico (SPP)'
  private dataListeners = new Set<(chunk: string) => void>()
  private disconnectListeners = new Set<() => void>()
  private device: SppDevice | null
  private address: string | null = null
  private connected = false
  private listener: PluginListenerHandle | null = null
  private monitor: number | null = null

  constructor(device?: SppDevice | null) {
    this.device = device ?? null
  }

  async connect(): Promise<string> {
    try {
      await ensureReady()
      const { BluetoothSerial } = await import('@ascentio-it/capacitor-bluetooth-serial')

      let device = this.device
      if (!device) {
        const devices = await listSppDevices()
        device = devices[0] ?? null
      }
      if (!device) {
        throw new ObdError(
          'No hay dispositivos Bluetooth emparejados.',
          'Empareja el ELM327 desde los ajustes de Bluetooth de Android y vuelve a intentar.',
        )
      }

      this.address = device.address
      try {
        await BluetoothSerial.connect({ address: device.address })
      } catch {
        await BluetoothSerial.connectInsecure({ address: device.address })
      }

      this.listener = await BluetoothSerial.addListener('onRead', (result) => {
        if (!result.value) return
        for (const listener of this.dataListeners) listener(result.value)
      })

      await BluetoothSerial.startNotifications({ address: device.address, delimiter: '>' })
      this.connected = true
      this.monitor = window.setInterval(() => {
        void this.checkConnection()
      }, 5000)

      return device.name || 'ELM327 Bluetooth'
    } catch (error) {
      await this.disconnect().catch(() => undefined)
      if (error instanceof ObdError) throw error
      throw new ObdError(
        `No se pudo conectar por Bluetooth clásico: ${(error as Error).message}`,
        'Comprueba que el ELM327 esté emparejado y que no esté conectado a otra app.',
      )
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false
    if (this.monitor !== null) {
      window.clearInterval(this.monitor)
      this.monitor = null
    }
    this.listener?.remove().catch(() => undefined)
    this.listener = null
    if (this.address) {
      try {
        const { BluetoothSerial } = await import('@ascentio-it/capacitor-bluetooth-serial')
        await BluetoothSerial.stopNotifications({ address: this.address }).catch(() => undefined)
        await BluetoothSerial.disconnect({ address: this.address }).catch(() => undefined)
      } catch {
        // La app pudo cerrarse.
      }
    }
    this.address = null
  }

  async write(data: string): Promise<void> {
    if (!this.address) throw new ObdError('No hay un dispositivo Bluetooth conectado.')
    const { BluetoothSerial } = await import('@ascentio-it/capacitor-bluetooth-serial')
    await BluetoothSerial.write({ address: this.address, value: data })
  }

  onData(callback: (chunk: string) => void): () => void {
    this.dataListeners.add(callback)
    return () => this.dataListeners.delete(callback)
  }

  onDisconnect(callback: () => void): () => void {
    this.disconnectListeners.add(callback)
    return () => this.disconnectListeners.delete(callback)
  }

  private async checkConnection(): Promise<void> {
    if (!this.address || !this.connected) return
    try {
      const { BluetoothSerial } = await import('@ascentio-it/capacitor-bluetooth-serial')
      const result = await BluetoothSerial.isConnected({ address: this.address })
      if (!result.connected) this.handleDisconnect()
    } catch {
      this.handleDisconnect()
    }
  }

  private handleDisconnect(): void {
    if (!this.connected) return
    this.connected = false
    if (this.monitor !== null) {
      window.clearInterval(this.monitor)
      this.monitor = null
    }
    for (const listener of this.disconnectListeners) listener()
  }
}
