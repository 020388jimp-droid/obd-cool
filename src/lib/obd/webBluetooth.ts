import { ObdError, type ObdConnectionKind, type ObdTransport } from './types'

const KNOWN_SERVICES = [
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000fff0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe5-0000-1000-8000-00805f9b34fb',
  '000018f0-0000-1000-8000-00805f9b34fb',
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
]

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class WebBluetoothTransport implements ObdTransport {
  readonly kind: ObdConnectionKind = 'web-ble'
  readonly label = 'Bluetooth BLE (web)'
  private dataListeners = new Set<(chunk: string) => void>()
  private disconnectListeners = new Set<() => void>()
  private device: BluetoothDevice | null = null
  private server: BluetoothRemoteGATTServer | null = null
  private writeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null
  private notifyCharacteristic: BluetoothRemoteGATTCharacteristic | null = null
  private decoder = new TextDecoder()

  private readonly onNotification = (event: Event): void => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic
    const value = characteristic.value
    if (!value) return
    const text = this.decoder.decode(value)
    for (const listener of this.dataListeners) listener(text)
  }

  private readonly onGattDisconnected = (): void => {
    this.server = null
    for (const listener of this.disconnectListeners) listener()
  }

  async connect(): Promise<string> {
    if (!navigator.bluetooth) {
      throw new ObdError(
        'Este navegador no soporta Web Bluetooth.',
        'Abre la web en Chrome o Edge (Android/escritorio) o usa la app Android. Safari en iPhone no permite Web Bluetooth.',
      )
    }

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: KNOWN_SERVICES,
      })
      this.device = device
      device.addEventListener('gattserverdisconnected', this.onGattDisconnected)

      if (!device.gatt) {
        throw new ObdError('El dispositivo no ofrece GATT.', 'Prueba con otro adaptador ELM327 BLE.')
      }

      const server = await device.gatt.connect()
      this.server = server
      await sleep(250)

      const services = await server.getPrimaryServices()
      const candidates: Array<{
        service: BluetoothRemoteGATTService
        write: BluetoothRemoteGATTCharacteristic
        notify: BluetoothRemoteGATTCharacteristic
      }> = []

      for (const service of services) {
        let characteristics: BluetoothRemoteGATTCharacteristic[] = []
        try {
          characteristics = await service.getCharacteristics()
        } catch {
          continue
        }
        const writable = characteristics.find(
          (characteristic) =>
            characteristic.properties.write || characteristic.properties.writeWithoutResponse,
        )
        const notifiable = characteristics.find(
          (characteristic) => characteristic.properties.notify || characteristic.properties.indicate,
        )
        if (writable && notifiable) {
          candidates.push({ service, write: writable, notify: notifiable })
        }
      }

      if (candidates.length === 0) {
        throw new ObdError(
          'No encontré un canal serie BLE en este adaptador.',
          'Muchos ELM327 baratos usan Bluetooth clásico (SPP), que la web no puede abrir. En Android usa la app OBD COOL con Bluetooth clásico o un ELM327 BLE 4.0.',
        )
      }

      const preferred = candidates.find((candidate) =>
        KNOWN_SERVICES.some((uuid) => candidate.service.uuid.toLowerCase() === uuid.toLowerCase()),
      )
      const selected = preferred ?? candidates[0]!
      this.writeCharacteristic = selected.write
      this.notifyCharacteristic = selected.notify

      this.notifyCharacteristic.addEventListener(
        'characteristicvaluechanged',
        this.onNotification,
      )
      await this.notifyCharacteristic.startNotifications()

      return device.name || 'ELM327 BLE'
    } catch (error) {
      await this.disconnect().catch(() => undefined)
      if (error instanceof ObdError) throw error
      const message = (error as Error).message
      if (message.includes('User cancelled')) {
        throw new ObdError('Selección de dispositivo cancelada.')
      }
      throw new ObdError(`No se pudo conectar por Bluetooth: ${message}`, 'Revisa que el ELM327 esté encendido y cerca.')
    }
  }

  async disconnect(): Promise<void> {
    if (this.notifyCharacteristic) {
      this.notifyCharacteristic.removeEventListener(
        'characteristicvaluechanged',
        this.onNotification,
      )
      await this.notifyCharacteristic.stopNotifications().catch(() => undefined)
    }
    this.notifyCharacteristic = null
    this.writeCharacteristic = null
    if (this.device) {
      this.device.removeEventListener('gattserverdisconnected', this.onGattDisconnected)
    }
    if (this.server?.connected) {
      this.server.disconnect()
    }
    this.server = null
    this.device = null
  }

  async write(data: string): Promise<void> {
    const characteristic = this.writeCharacteristic
    if (!characteristic) throw new ObdError('No hay un canal de escritura Bluetooth.')
    const bytes = new TextEncoder().encode(data)
    const chunkSize = 20
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      const chunk = bytes.slice(offset, offset + chunkSize)
      if (characteristic.properties.writeWithoutResponse) {
        await characteristic.writeValueWithoutResponse(chunk)
      } else {
        await characteristic.writeValue(chunk)
      }
      if (bytes.length > chunkSize) await sleep(8)
    }
  }

  onData(callback: (chunk: string) => void): () => void {
    this.dataListeners.add(callback)
    return () => this.dataListeners.delete(callback)
  }

  onDisconnect(callback: () => void): () => void {
    this.disconnectListeners.add(callback)
    return () => this.disconnectListeners.delete(callback)
  }
}
