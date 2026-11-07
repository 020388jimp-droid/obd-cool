export type ViewId = 'dashboard' | 'codes' | 'live' | 'diagnosis' | 'repair' | 'vehicle' | 'settings'

export interface NavItem {
  id: ViewId
  label: string
  shortLabel: string
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Inicio', shortLabel: 'Inicio' },
  { id: 'codes', label: 'Códigos', shortLabel: 'Códigos' },
  { id: 'live', label: 'Sensores', shortLabel: 'Sensores' },
  { id: 'diagnosis', label: 'Diagnóstico', shortLabel: 'Diagnóstico' },
  { id: 'repair', label: 'Reparación', shortLabel: 'Reparar' },
  { id: 'vehicle', label: 'Vehículo', shortLabel: 'Vehículo' },
  { id: 'settings', label: 'Ajustes', shortLabel: 'Ajustes' },
]
