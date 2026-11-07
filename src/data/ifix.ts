const DEFAULT_BASE = 'https://es.ifixit.com/Device/Car_and_Truck'
const SEARCH_BASE = 'https://es.ifixit.com/Search'

export function ifixBaseUrl(): string {
  return import.meta.env.VITE_IFIX_BASE_URL || DEFAULT_BASE
}

export function ifixSearchUrl(query: string): string {
  const clean = query.trim()
  if (!clean) return ifixBaseUrl()
  return `${SEARCH_BASE}?query=${encodeURIComponent(clean)}`
}

export function ifixQueryForVehicle(query: string, vehicle: { make?: string; model?: string; year?: string }): string {
  const parts = [vehicle.make, vehicle.model, vehicle.year, query].filter(Boolean)
  return parts.join(' ')
}

export function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer')
}
