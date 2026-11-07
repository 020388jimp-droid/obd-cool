import type { VehicleInfo } from './obd/types'

const VEHICLE_KEY = 'obd-cool.vehicle.v1'
const SETTINGS_KEY = 'obd-cool.settings.v1'

export interface AppSettings {
  aiEnabled: boolean
  pollingMs: number
  showRawLogs: boolean
}

export const EMPTY_VEHICLE: VehicleInfo = {
  make: '',
  model: '',
  year: '',
  engine: '',
  vin: '',
}

export const DEFAULT_SETTINGS: AppSettings = {
  aiEnabled: true,
  pollingMs: 1500,
  showRawLogs: false,
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) }
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Modo privado o almacenamiento lleno: la app sigue funcionando en memoria.
  }
}

export function loadVehicle(): VehicleInfo {
  return readJson<VehicleInfo>(VEHICLE_KEY, EMPTY_VEHICLE)
}

export function saveVehicle(vehicle: VehicleInfo): void {
  writeJson(VEHICLE_KEY, vehicle)
}

export function loadSettings(): AppSettings {
  return readJson<AppSettings>(SETTINGS_KEY, DEFAULT_SETTINGS)
}

export function saveSettings(settings: AppSettings): void {
  writeJson(SETTINGS_KEY, settings)
}

export function clearLocalData(): void {
  try {
    localStorage.removeItem(VEHICLE_KEY)
    localStorage.removeItem(SETTINGS_KEY)
  } catch {
    // Ignorar.
  }
}
