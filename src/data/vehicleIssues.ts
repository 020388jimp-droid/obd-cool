export interface VehicleIssue {
  make: string
  model: string
  years: [number, number]
  notes: Record<string, string>
}

/**
 * Notas de averías conocidas por modelo. No sustituyen un boletín técnico (TSB)
 * ni una inspección física, pero ayudan a priorizar las causas más probables.
 */
export const VEHICLE_ISSUES: VehicleIssue[] = [
  {
    make: 'Toyota',
    model: 'Corolla',
    years: [2003, 2008],
    notes: {
      P0171: 'Es muy común una fuga en la junta del colector de admisión o en el tubo de PCV. Revisa también el MAF.',
      P0420: 'El catalizador y la sonda O2 posterior suelen ser los primeros sospechosos, sobre todo con consumo de aceite.',
      P0300: 'Revisa bujías, bobinas y la junta de la tapa de válvulas: la fuga de aceite a los pozos de bujías es frecuente.',
    },
  },
  {
    make: 'Toyota',
    model: 'Camry',
    years: [2007, 2011],
    notes: {
      P0420: 'Revisa la eficiencia del catalizador y la sonda O2 posterior. También fugas en el escape.',
      P0171: 'Revisa mangueras de vacío y la junta del colector de admisión.',
    },
  },
  {
    make: 'Toyota',
    model: 'Hilux',
    years: [2005, 2015],
    notes: {
      P0087: 'En diésel, revisa el filtro de combustible y la válvula SCV de la bomba de alta presión.',
      P0093: 'Una fuga en el sistema de alta presión o una válvula SCV desgastada son causas típicas.',
      P2002: 'Revisa la regeneración del DPF y el sensor de presión diferencial.',
    },
  },
  {
    make: 'Honda',
    model: 'Civic',
    years: [2001, 2005],
    notes: {
      P0420: 'Revisa la sonda O2 posterior y el catalizador. El consumo de aceite acelera el desgaste.',
      P0300: 'Revisa bujías y bobinas. Una válvula EGR obstruida también puede causar fallos.',
      P0171: 'Revisa el tubo de admisión y el MAF; las grietas en el tubo son comunes.',
    },
  },
  {
    make: 'Honda',
    model: 'Accord',
    years: [2003, 2007],
    notes: {
      P0420: 'Revisa la sonda O2 posterior y el catalizador.',
      P0300: 'Revisa bujías, bobinas y la válvula EGR.',
    },
  },
  {
    make: 'Nissan',
    model: 'Sentra',
    years: [2007, 2012],
    notes: {
      P0171: 'Revisa el MAF y el cuerpo de aceleración; la limpieza del cuerpo suele corregir el ralentí.',
      P0420: 'Revisa fugas de escape y la sonda O2 posterior.',
      P0300: 'Revisa bujías y bobinas; revisa también el MAF.',
    },
  },
  {
    make: 'Nissan',
    model: 'Versa',
    years: [2012, 2019],
    notes: {
      P0171: 'Revisa mangueras de vacío y el MAF.',
      P0420: 'Revisa la sonda O2 posterior y el catalizador.',
    },
  },
  {
    make: 'Chevrolet',
    model: 'Aveo',
    years: [2004, 2011],
    notes: {
      P0171: 'Revisa la válvula PCV, la tapa de válvulas y las mangueras de vacío.',
      P0300: 'Revisa bujías, bobinas y la compresión.',
    },
  },
  {
    make: 'Chevrolet',
    model: 'Cruze',
    years: [2011, 2016],
    notes: {
      P0171: 'Revisa la tapa de válvulas (membrana PCV) y las mangueras de admisión.',
      P0299: 'Revisa el solenoide de control del turbo y las mangueras de intercooler.',
      P0420: 'Revisa la sonda O2 posterior y el catalizador.',
    },
  },
  {
    make: 'Chevrolet',
    model: 'Silverado',
    years: [2007, 2013],
    notes: {
      P0300: 'Revisa bujías, cables y bobinas; también la presión de combustible.',
      P0420: 'Revisa el catalizador y las sondas O2.',
    },
  },
  {
    make: 'Ford',
    model: 'Focus',
    years: [2000, 2011],
    notes: {
      P0171: 'Revisa mangueras de vacío y la válvula IAC; el tubo de admisión agrietado es común.',
      P0401: 'Revisa la válvula EGR y el sensor DPFE; la carbonilla es habitual.',
      P0300: 'Revisa bujías, cables y bobinas.',
    },
  },
  {
    make: 'Ford',
    model: 'F-150',
    years: [2004, 2010],
    notes: {
      P0300: 'Revisa bujías y bobinas; en motores Triton revisa la compresión y las bujías flojas.',
      P0420: 'Revisa el catalizador y las sondas O2.',
    },
  },
  {
    make: 'Ford',
    model: 'Ranger',
    years: [2012, 2022],
    notes: {
      P0299: 'Revisa mangueras de intercooler, wastegate y el sensor de presión de turbo.',
      P2002: 'En diésel, revisa la regeneración del DPF y el sensor de presión diferencial.',
    },
  },
  {
    make: 'Volkswagen',
    model: 'Jetta',
    years: [2005, 2011],
    notes: {
      P0171: 'Revisa la válvula PCV y el tubo de admisión; la membrana PCV se rompe con frecuencia.',
      P0420: 'Revisa la sonda O2 posterior y el catalizador.',
      P2015: 'Revisa el colector de admisión variable y su actuador; la carbonilla puede bloquearlo.',
    },
  },
  {
    make: 'Volkswagen',
    model: 'Golf',
    years: [2010, 2018],
    notes: {
      P0299: 'Revisa la válvula de descarga, el wastegate y las fugas del intercooler.',
      P0011: 'Revisa el solenoide VVT, el aceite y la cadena de distribución.',
    },
  },
  {
    make: 'Mazda',
    model: '3',
    years: [2004, 2013],
    notes: {
      P0171: 'Revisa el MAF y las mangueras de admisión.',
      P0420: 'Revisa la sonda O2 posterior y el catalizador.',
      P0300: 'Revisa bujías y bobinas; revisa también la válvula EGR.',
    },
  },
  {
    make: 'Hyundai',
    model: 'Elantra',
    years: [2007, 2016],
    notes: {
      P0300: 'Revisa bujías y bobinas; en algunos motores el consumo de aceite afecta la combustión.',
      P0420: 'Revisa la sonda O2 posterior y el catalizador.',
    },
  },
  {
    make: 'Kia',
    model: 'Rio',
    years: [2006, 2011],
    notes: {
      P0300: 'Revisa bujías, cables y bobinas.',
      P0171: 'Revisa mangueras de vacío y el MAF.',
    },
  },
  {
    make: 'Renault',
    model: 'Logan',
    years: [2007, 2014],
    notes: {
      P0300: 'Revisa bujías, bobinas y la presión de combustible.',
      P0171: 'Revisa mangueras de vacío y la junta del colector.',
    },
  },
  {
    make: 'Peugeot',
    model: '206',
    years: [2000, 2012],
    notes: {
      P0300: 'Revisa bujías, bobinas y la sonda lambda.',
      P0420: 'Revisa la sonda lambda posterior y el catalizador.',
    },
  },
  {
    make: 'Seat',
    model: 'Ibiza',
    years: [2002, 2008],
    notes: {
      P0171: 'Revisa la válvula PCV y las mangueras de admisión.',
      P0300: 'Revisa bujías y bobinas.',
    },
  },
  {
    make: 'BMW',
    model: 'Serie 3',
    years: [2005, 2012],
    notes: {
      P0171: 'Revisa el tubo de admisión, la válvula PCV y el MAF.',
      P0011: 'Revisa el solenoide VANOS y el aceite.',
      P0300: 'Revisa bujías, bobinas e inyectores; la carbonilla en admisión es común.',
    },
  },
  {
    make: 'Mercedes-Benz',
    model: 'Clase C',
    years: [2007, 2014],
    notes: {
      P0171: 'Revisa fugas de admisión y la válvula PCV.',
      P0300: 'Revisa bujías, bobinas e inyectores.',
    },
  },
  {
    make: 'Jeep',
    model: 'Grand Cherokee',
    years: [2005, 2010],
    notes: {
      P0300: 'Revisa bujías y bobinas; también la presión de combustible.',
      P0420: 'Revisa el catalizador y las sondas O2.',
    },
  },
  {
    make: 'Dodge',
    model: 'Ram 1500',
    years: [2009, 2018],
    notes: {
      P0300: 'Revisa bujías, bobinas y la compresión.',
      P0420: 'Revisa el catalizador y las sondas O2.',
    },
  },
  {
    make: 'Mitsubishi',
    model: 'Lancer',
    years: [2008, 2015],
    notes: {
      P0420: 'Revisa la sonda O2 posterior y el catalizador.',
      P0171: 'Revisa el MAF y las mangueras de admisión.',
    },
  },
  {
    make: 'Subaru',
    model: 'Impreza',
    years: [2008, 2016],
    notes: {
      P0420: 'Revisa la sonda O2 posterior y el catalizador; el consumo de aceite es un factor.',
      P0300: 'Revisa bujías y bobinas; revisa también la junta de culata.',
    },
  },
  {
    make: 'Audi',
    model: 'A4',
    years: [2009, 2016],
    notes: {
      P0171: 'Revisa la válvula PCV y el tubo de admisión.',
      P0299: 'Revisa la válvula de descarga y las fugas del intercooler.',
    },
  },
  {
    make: 'Volvo',
    model: 'S60',
    years: [2010, 2018],
    notes: {
      P0171: 'Revisa la válvula PCV y las mangueras de admisión.',
      P0420: 'Revisa la sonda O2 posterior y el catalizador.',
    },
  },
]

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function findVehicleNote(
  make: string,
  model: string,
  year: string,
  code: string,
): string | undefined {
  if (!make || !model) return undefined
  const nMake = normalize(make)
  const nModel = normalize(model)
  const numericYear = Number.parseInt(year, 10)

  const issue = VEHICLE_ISSUES.find((item) => {
    const itemMake = normalize(item.make)
    const itemModel = normalize(item.model)
    const makeMatches = nMake.includes(itemMake) || itemMake.includes(nMake)
    const modelMatches = nModel.includes(itemModel) || itemModel.includes(nModel)
    const yearMatches =
      Number.isFinite(numericYear) && numericYear >= item.years[0] && numericYear <= item.years[1]
    return makeMatches && modelMatches && yearMatches
  })

  return issue?.notes[code]
}
