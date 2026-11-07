interface WmiEntry {
  prefix: string
  make: string
  country: string
}

/** Prefijos WMI más comunes. Es una ayuda, no una decodificación oficial. */
const WMI: WmiEntry[] = [
  { prefix: '1HG', make: 'Honda', country: 'Estados Unidos' },
  { prefix: 'JHM', make: 'Honda', country: 'Japón' },
  { prefix: '2HG', make: 'Honda', country: 'Canadá' },
  { prefix: '3HG', make: 'Honda', country: 'México' },
  { prefix: '1G1', make: 'Chevrolet', country: 'Estados Unidos' },
  { prefix: '1GC', make: 'Chevrolet', country: 'Estados Unidos' },
  { prefix: '2G1', make: 'Chevrolet', country: 'Canadá' },
  { prefix: '3GC', make: 'Chevrolet', country: 'México' },
  { prefix: '1FA', make: 'Ford', country: 'Estados Unidos' },
  { prefix: '1FT', make: 'Ford', country: 'Estados Unidos' },
  { prefix: '1FD', make: 'Ford', country: 'Estados Unidos' },
  { prefix: '2FM', make: 'Ford', country: 'Canadá' },
  { prefix: '3FA', make: 'Ford', country: 'México' },
  { prefix: '1NX', make: 'Toyota', country: 'Estados Unidos' },
  { prefix: 'JTD', make: 'Toyota', country: 'Japón' },
  { prefix: 'JTE', make: 'Toyota', country: 'Japón' },
  { prefix: '4T1', make: 'Toyota', country: 'Estados Unidos' },
  { prefix: '4T3', make: 'Toyota', country: 'Estados Unidos' },
  { prefix: '5TD', make: 'Toyota', country: 'Estados Unidos' },
  { prefix: '2T1', make: 'Toyota', country: 'Canadá' },
  { prefix: '3TY', make: 'Toyota', country: 'México' },
  { prefix: 'JN1', make: 'Nissan', country: 'Japón' },
  { prefix: 'JN8', make: 'Nissan', country: 'Japón' },
  { prefix: '1N4', make: 'Nissan', country: 'Estados Unidos' },
  { prefix: '3N1', make: 'Nissan', country: 'México' },
  { prefix: '5N1', make: 'Nissan', country: 'Estados Unidos' },
  { prefix: 'WVW', make: 'Volkswagen', country: 'Alemania' },
  { prefix: '3VW', make: 'Volkswagen', country: 'México' },
  { prefix: '1VW', make: 'Volkswagen', country: 'Estados Unidos' },
  { prefix: 'WVG', make: 'Volkswagen', country: 'Alemania' },
  { prefix: 'WBA', make: 'BMW', country: 'Alemania' },
  { prefix: 'WBS', make: 'BMW', country: 'Alemania' },
  { prefix: '4US', make: 'BMW', country: 'Estados Unidos' },
  { prefix: 'WDD', make: 'Mercedes-Benz', country: 'Alemania' },
  { prefix: 'WDB', make: 'Mercedes-Benz', country: 'Alemania' },
  { prefix: '4JG', make: 'Mercedes-Benz', country: 'Estados Unidos' },
  { prefix: 'JM1', make: 'Mazda', country: 'Japón' },
  { prefix: 'JM3', make: 'Mazda', country: 'Japón' },
  { prefix: '3MZ', make: 'Mazda', country: 'México' },
  { prefix: '4F2', make: 'Mazda', country: 'Estados Unidos' },
  { prefix: 'KMH', make: 'Hyundai', country: 'Corea del Sur' },
  { prefix: '5NP', make: 'Hyundai', country: 'Estados Unidos' },
  { prefix: 'KNA', make: 'Kia', country: 'Corea del Sur' },
  { prefix: 'KNB', make: 'Kia', country: 'Corea del Sur' },
  { prefix: '5XY', make: 'Kia', country: 'Estados Unidos' },
  { prefix: 'VF1', make: 'Renault', country: 'Francia' },
  { prefix: 'VF3', make: 'Peugeot', country: 'Francia' },
  { prefix: 'VF7', make: 'Citroën', country: 'Francia' },
  { prefix: 'VSS', make: 'Seat', country: 'España' },
  { prefix: 'TMB', make: 'Škoda', country: 'República Checa' },
  { prefix: 'SAJ', make: 'Jaguar', country: 'Reino Unido' },
  { prefix: 'SAL', make: 'Land Rover', country: 'Reino Unido' },
  { prefix: 'YV1', make: 'Volvo', country: 'Suecia' },
  { prefix: 'YV4', make: 'Volvo', country: 'Suecia' },
  { prefix: 'JMB', make: 'Mitsubishi', country: 'Japón' },
  { prefix: '4A3', make: 'Mitsubishi', country: 'Estados Unidos' },
  { prefix: 'JF1', make: 'Subaru', country: 'Japón' },
  { prefix: '4S3', make: 'Subaru', country: 'Estados Unidos' },
  { prefix: 'WAU', make: 'Audi', country: 'Alemania' },
  { prefix: 'TRU', make: 'Audi', country: 'Hungría' },
  { prefix: '1C3', make: 'Chrysler', country: 'Estados Unidos' },
  { prefix: '1C6', make: 'Dodge', country: 'Estados Unidos' },
  { prefix: '3C6', make: 'RAM', country: 'México' },
  { prefix: '1J4', make: 'Jeep', country: 'Estados Unidos' },
  { prefix: '1J8', make: 'Jeep', country: 'Estados Unidos' },
  { prefix: 'ZFA', make: 'Fiat', country: 'Italia' },
  { prefix: 'ZFF', make: 'Ferrari', country: 'Italia' },
  { prefix: 'WP0', make: 'Porsche', country: 'Alemania' },
  { prefix: '5YJ', make: 'Tesla', country: 'Estados Unidos' },
  { prefix: '7SA', make: 'Tesla', country: 'Estados Unidos' },
]

export interface VinInfo {
  valid: boolean
  make?: string
  country?: string
  year?: number
  message: string
}

const YEAR_CODES: Record<string, number> = {
  A: 2010,
  B: 2011,
  C: 2012,
  D: 2013,
  E: 2014,
  F: 2015,
  G: 2016,
  H: 2017,
  J: 2018,
  K: 2019,
  L: 2020,
  M: 2021,
  N: 2022,
  P: 2023,
  R: 2024,
  S: 2025,
  T: 2026,
  V: 2027,
  W: 2028,
  X: 2029,
  Y: 2030,
  '1': 2001,
  '2': 2002,
  '3': 2003,
  '4': 2004,
  '5': 2005,
  '6': 2006,
  '7': 2007,
  '8': 2008,
  '9': 2009,
}

export function decodeVin(vin: string): VinInfo {
  const clean = vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '')
  if (clean.length !== 17) {
    return {
      valid: false,
      message: 'El VIN debe tener 17 caracteres (sin I, O ni Q).',
    }
  }

  const entry = WMI.find((item) => clean.startsWith(item.prefix))
  const year = YEAR_CODES[clean[9] ?? '']

  return {
    valid: true,
    make: entry?.make,
    country: entry?.country,
    year,
    message: entry
      ? `Fabricante probable: ${entry.make} (${entry.country})${year ? ` · Año ${year}` : ''}.`
      : 'No reconocí el prefijo del fabricante. Puedes escribirlo manualmente.',
  }
}
