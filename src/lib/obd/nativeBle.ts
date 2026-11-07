import type { BleCharacteristic, BleService } from '@capacitor-community/bluetooth-le'
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

function findChannel(services: BleService[]): { service: BleService; write: BleCharacteristic; notify: BleCharacteristic } | null {
  const candidates: Array<{ service: BleService; write: BleCharacteristic; notify: BleCharacteristic }> = []
  for (const service of services) {
    const writable = service.characteristics.find(
      (characteristic) => characteristic.properties.write || characteristic.properties.writeWithoutResponse,
    )
    const notifiable = service.characteristics.find(
      (characteristic) => characteristic.properties.notify || characteristic.properties.indicate,
    )
    if (writable && notifiable) candidates.push({ service, write: writable, notify: notifiable })
  }
  const preferred = candidates.find((candidate) =>
    KNOWN_SERVICES.some((uuid) => candidate.service.uuid.toLowerCase() === uuid.toLowerCase()),
  )
  return preferred ?? candidates[0] ?? null
}

export class NativeBleTransport implements ObdTransport {
  readonly kind: ObdConnectionKind = 'native-ble'
  readonly label = 'Bluetooth BLE (app)'
  private dataListeners = new Set<(chunk: string) => void>()
  private disconnectListeners = new Set<() => void>()
  private deviceId: string | null = null
  private serviceUuid: string | null = null
  private writeUuid: string | null = null
  private notifyUuid: string | null = null
  private decoder = new TextDecoder()

  async connect(): Promise<string> {
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le')
      await BleClient.initialize({ androidNeverForLocation: true })
      const device = await BleClient.requestDevice({
        services: [],
        optionalServices: KNOWN_SERVICES,
      })
      this.deviceId = device.deviceId
      await BleClient.connect(device.deviceId, () => {
        this.deviceId = null
        for (const listener of this.disconnectListeners) listener()
      })
      await sleep(250)
      const services = await BleClient.getServices(device.deviceId)
      const channel = findChannel(services)
      if (!channel) {
        throw new ObdError(
          'No encontré un canal serie BLE en este adaptador.',
          'Si tu ELM327 es Bluetooth clásico (SPP), usa la opción "Bluetooth clásico" de la app Android.',
        )
      }
      this.serviceUuid = channel.service.uuid
      this.writeUuid = channel.write.uuid
      this.notifyUuid = channel.notify.uuid

      await BleClient.startNotifications(
        device.deviceId,
        channel.service.uuid,
        channel.notify.uuid,
        (value: DataView) => {
          const text = this.decoder.decode(value)
          for (const listener of this.dataListeners) listener(text)
        },
      )

      return device.name || 'ELM327 BLE'
    } catch (error) {
      await this.disconnect().catch(() => undefined)
      if (error instanceof ObdError) throw error
      throw new ObdError(
        `No se pudo conectar por BLE: ${(error as Error).message}`,
        'Revisa que el Bluetooth esté activado y que el ELM327 sea BLE 4.0.',
      )
    }
  }

  async disconnect(): Promise<void> {
    if (this.deviceId) {
      try {
        const { BleClient } = await import('@capacitor-community/bluetooth-le')
        if (this.serviceUuid && this.notifyUuid) {
          await BleClient.stopNotifications(this.deviceId, this.serviceUuid, this.notifyUuid).catch(() => undefined)
        }
        await BleClient.disconnect(this.deviceId).catch(() => undefined)
      } catch {
        // La app puede haberse cerrado.
      }
    }
    this.deviceId = null
    this.serviceUuid = null
    this.writeUuid = null
    this.notifyUuid = null
  }

  async write(data: string): Promise<void> {
    if (!this.deviceId || !this.serviceUuid || !this.writeUuid) {
      throw new ObdError('No hay un canal BLE de escritura.')
    }
    const { BleClient } = await import('@capacitor-community/bluetooth-le')
    const bytes = new TextEncoder().encode(data)
    const chunkSize = 20
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      const chunk = bytes.slice(offset, offset + chunkSize)
      await BleClient.write(
        this.deviceId,
        this.serviceUuid,
        this.writeUuid,
        new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength),
        { timeout: 2500 },
      )
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
