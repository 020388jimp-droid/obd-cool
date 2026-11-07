export const VEHICLE_MAKES = [
  'Toyota',
  'Honda',
  'Nissan',
  'Chevrolet',
  'Ford',
  'Volkswagen',
  'Mazda',
  'Hyundai',
  'Kia',
  'Renault',
  'Peugeot',
  'Seat',
  'BMW',
  'Mercedes-Benz',
  'Jeep',
  'Dodge',
  'RAM',
  'Mitsubishi',
  'Subaru',
  'Audi',
  'Volvo',
  'Suzuki',
  'Fiat',
  'Chrysler',
  'Land Rover',
  'Jaguar',
  'Porsche',
  'Tesla',
  'Otra',
] as const

export const MODELS_BY_MAKE: Record<string, string[]> = {
  Toyota: ['Corolla', 'Camry', 'Hilux', 'Yaris', 'RAV4', 'Tacoma', 'Tundra', 'Prius', 'Avanza', 'Sienna'],
  Honda: ['Civic', 'Accord', 'CR-V', 'Fit', 'HR-V', 'Pilot', 'City', 'Odyssey'],
  Nissan: ['Sentra', 'Versa', 'Altima', 'X-Trail', 'Frontier', 'Pathfinder', 'Kicks', 'March', 'Navara'],
  Chevrolet: ['Aveo', 'Cruze', 'Silverado', 'Spark', 'Malibu', 'Equinox', 'Tahoe', 'Suburban', 'Colorado', 'Captiva'],
  Ford: ['Focus', 'Fiesta', 'F-150', 'Ranger', 'Explorer', 'Escape', 'Edge', 'Mustang', 'Expedition', 'Transit'],
  Volkswagen: ['Jetta', 'Golf', 'Passat', 'Tiguan', 'Polo', 'Beetle', 'Amarok', 'Vento', 'Teramont'],
  Mazda: ['3', '6', 'CX-3', 'CX-5', 'CX-9', 'MX-5', '2', 'BT-50'],
  Hyundai: ['Elantra', 'Accent', 'Tucson', 'Santa Fe', 'Sonata', 'i10', 'i20', 'Creta', 'Kona'],
  Kia: ['Rio', 'Forte', 'Sportage', 'Sorento', 'Soul', 'Picanto', 'Cerato', 'Seltos'],
  Renault: ['Logan', 'Sandero', 'Duster', 'Clio', 'Megane', 'Kangoo', 'Captur', 'Kwid'],
  Peugeot: ['206', '207', '208', '301', '308', '3008', '2008', 'Partner', 'Boxer'],
  Seat: ['Ibiza', 'Leon', 'Arona', 'Ateca', 'Toledo', 'Alhambra', 'Cordoba'],
  BMW: ['Serie 1', 'Serie 2', 'Serie 3', 'Serie 5', 'X1', 'X3', 'X5', 'M3', 'M5'],
  'Mercedes-Benz': ['Clase A', 'Clase B', 'Clase C', 'Clase E', 'GLA', 'GLC', 'GLE', 'Sprinter', 'Vito'],
  Jeep: ['Grand Cherokee', 'Wrangler', 'Compass', 'Cherokee', 'Renegade', 'Patriot', 'Liberty'],
  Dodge: ['Ram 1500', 'Charger', 'Challenger', 'Durango', 'Journey', 'Neon', 'Avenger'],
  RAM: ['1500', '2500', '3500', 'ProMaster', 'Dakota'],
  Mitsubishi: ['Lancer', 'Outlander', 'Montero', 'ASX', 'Eclipse Cross', 'L200', 'Mirage'],
  Subaru: ['Impreza', 'Forester', 'Outback', 'Legacy', 'Crosstrek', 'WRX', 'XV'],
  Audi: ['A1', 'A3', 'A4', 'A5', 'A6', 'Q3', 'Q5', 'Q7', 'TT'],
  Volvo: ['S40', 'S60', 'S80', 'V40', 'V60', 'XC40', 'XC60', 'XC90'],
  Suzuki: ['Swift', 'Vitara', 'Jimny', 'S-Cross', 'Baleno', 'Grand Vitara'],
  Fiat: ['500', 'Punto', 'Uno', 'Palio', 'Tipo', 'Ducato', 'Strada'],
  Chrysler: ['300', 'PT Cruiser', 'Town & Country', 'Sebring', 'Pacifica'],
  'Land Rover': ['Defender', 'Discovery', 'Range Rover', 'Freelander', 'Evoque'],
  Jaguar: ['XE', 'XF', 'XJ', 'F-Pace', 'E-Pace', 'F-Type'],
  Porsche: ['911', 'Cayenne', 'Macan', 'Panamera', 'Boxster', 'Cayman'],
  Tesla: ['Model 3', 'Model S', 'Model X', 'Model Y'],
}

export const VEHICLE_YEARS = Array.from({ length: 37 }, (_, index) => String(2026 - index))

export const ENGINE_OPTIONS = [
  'No especificado',
  '1.0 L',
  '1.2 L',
  '1.4 L',
  '1.5 L',
  '1.6 L',
  '1.8 L',
  '2.0 L',
  '2.2 L',
  '2.4 L',
  '2.5 L',
  '2.7 L',
  '3.0 L',
  '3.3 L',
  '3.5 L',
  '3.6 L',
  '4.0 L',
  '4.6 L',
  '5.0 L',
  '5.3 L',
  '5.7 L',
  '6.0 L',
  'Diésel',
  'Híbrido',
  'Eléctrico',
]

export function modelsForMake(make: string): string[] {
  return MODELS_BY_MAKE[make] ?? []
}

export function describeVehicle(vehicle: {
  make?: string
  model?: string
  year?: string
  engine?: string
}): string {
  const parts = [vehicle.make, vehicle.model, vehicle.year].filter(Boolean)
  if (vehicle.engine && vehicle.engine !== 'No especificado') parts.push(vehicle.engine)
  return parts.length > 0 ? parts.join(' · ') : 'Vehículo sin configurar'
}
