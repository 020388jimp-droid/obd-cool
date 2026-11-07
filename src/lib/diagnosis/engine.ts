import type { ResolvedDtc } from '../../data/dtcDatabase'
import { describeVehicle } from '../../data/vehicles'
import type {
  DiagnosisContext,
  DiagnosisHypothesis,
  DiagnosisNote,
  DiagnosisResult,
  DiagnosisSeverity,
} from './types'

const SEVERITY_RANK: Record<DiagnosisSeverity, number> = {
  baja: 1,
  media: 2,
  alta: 3,
  critica: 4,
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function hasCode(ctx: DiagnosisContext, ...prefixes: string[]): boolean {
  return ctx.codes.some((code) => prefixes.some((prefix) => code.code.startsWith(prefix)))
}

function value(ctx: DiagnosisContext, key: string): number | undefined {
  const found = ctx.snapshot[key]
  return Number.isFinite(found) ? found : undefined
}

function hasSymptom(ctx: DiagnosisContext, ...ids: string[]): boolean {
  return ids.some((id) => ctx.symptoms.includes(id))
}

function fmt(valueToFormat: number | undefined, digits = 1, unit = ''): string {
  if (valueToFormat === undefined) return 'sin lectura'
  return `${valueToFormat.toFixed(digits)}${unit ? ` ${unit}` : ''}`
}

function symptomBoost(ctx: DiagnosisContext, ids: string[], amount: number): number {
  return hasSymptom(ctx, ...ids) ? amount : 0
}

function make(
  id: string,
  title: string,
  confidence: number,
  severity: DiagnosisSeverity,
  system: string,
  summary: string,
  evidence: string[],
  checks: string[],
  components: string[],
  ifixQuery: string,
): DiagnosisHypothesis {
  return {
    id,
    title,
    confidence: clamp(confidence, 5, 95),
    severity,
    system,
    summary,
    evidence,
    checks,
    components,
    ifixQuery,
    source: 'local',
  }
}

function codeNames(ctx: DiagnosisContext): string {
  return ctx.codes.map((code) => code.code).join(', ')
}

function leanRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  const ltft = Math.max(value(ctx, 'ltft1') ?? -999, value(ctx, 'ltft2') ?? -999)
  const stft = Math.max(value(ctx, 'stft1') ?? -999, value(ctx, 'stft2') ?? -999)
  const maf = value(ctx, 'maf')
  const rpm = value(ctx, 'rpm')
  const triggered =
    hasCode(ctx, 'P0171', 'P0174', 'P2187') ||
    (ltft > 12 && hasSymptom(ctx, 'rough-idle', 'power-loss', 'misfire'))
  if (!triggered) return []

  const evidence = [
    `Códigos relacionados: ${codeNames(ctx) || 'ninguno'}`,
    `Ajuste largo plazo: ${fmt(ltft > -900 ? ltft : undefined, 1, '%')} (normal ±10 %)`,
  ]
  if (stft > -900) evidence.push(`Ajuste corto plazo: ${fmt(stft, 1, '%')}`)
  if (maf !== undefined) evidence.push(`MAF: ${fmt(maf, 1, 'g/s')}${rpm !== undefined ? ` a ${fmt(rpm, 0, 'rpm')}` : ''}`)

  let base = 48
  if (ltft > 20) base += 12
  if (ltft > 30) base += 8
  if (maf !== undefined && maf < 2.5 && (rpm ?? 0) < 1200) base += 5
  base += symptomBoost(ctx, ['rough-idle', 'stall', 'misfire'], 5)

  return [
    make(
      'vacuum-leak',
      'Fuga de vacío o entrada de aire no medida',
      base,
      'alta',
      'Admisión',
      'La ECU está añadiendo combustible porque entra aire que el MAF no mide. Es la causa más frecuente de una mezcla pobre.',
      evidence,
      [
        'Prueba de humo en admisión, PCV y juntas del colector.',
        'Revisa mangueras agrietadas y abrazaderas flojas.',
        'Compara el LTFT antes y después de tapar la fuga.',
      ],
      ['vacuum-hoses', 'intake-gasket', 'pcv-valve'],
      'fuga de vacío admisión',
    ),
    make(
      'maf-dirty',
      'Sensor MAF sucio o descalibrado',
      base * 0.62,
      'media',
      'Admisión',
      'Un MAF sucio puede subestimar el aire que entra y empobrecer la mezcla.',
      evidence,
      [
        'Limpia el MAF con limpiador específico y sin tocar el hilo.',
        'Compara los g/s en ralentí con la especificación del motor.',
        'Revisa el filtro de aire y el tubo de admisión.',
      ],
      ['maf-sensor', 'air-filter'],
      'limpiar sensor MAF',
    ),
    make(
      'fuel-delivery',
      'Baja presión o caudal de combustible',
      base * 0.48,
      'alta',
      'Combustible',
      'Si la bomba o el filtro no entregan suficiente combustible, la ECU compensa y aun así la mezcla queda pobre.',
      evidence,
      [
        'Mide la presión de combustible en ralentí y bajo carga.',
        'Revisa el filtro y el estado de la bomba.',
        'Comprueba que los inyectores no estén obstruidos.',
      ],
      ['fuel-pump', 'fuel-filter', 'fuel-pressure-regulator'],
      'presión de combustible baja',
    ),
  ]
}

function richRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  const ltft = Math.min(value(ctx, 'ltft1') ?? 999, value(ctx, 'ltft2') ?? 999)
  const triggered = hasCode(ctx, 'P0172', 'P0175', 'P2188') || ltft < -12
  if (!triggered) return []

  const evidence = [
    `Códigos relacionados: ${codeNames(ctx) || 'ninguno'}`,
    `Ajuste largo plazo: ${fmt(ltft < 900 ? ltft : undefined, 1, '%')} (normal ±10 %)`,
  ]
  let base = 50
  if (ltft < -20) base += 12
  base += symptomBoost(ctx, ['black-smoke', 'fuel-smell', 'high-consumption'], 6)

  return [
    make(
      'injector-leak',
      'Inyector que gotea o no cierra',
      base,
      'alta',
      'Combustible',
      'Un inyector con fuga añade combustible que la ECU no puede compensar, sobre todo en ralentí.',
      evidence,
      [
        'Prueba de estanqueidad y caudal de inyectores.',
        'Compara las bujías: una muy negra puede delatar el cilindro afectado.',
        'Revisa el olor a combustible en el aceite.',
      ],
      ['injectors'],
      'inyector fuga combustible',
    ),
    make(
      'fuel-pressure-high',
      'Presión de combustible alta',
      base * 0.6,
      'media',
      'Combustible',
      'Un regulador atascado o una restricción en el retorno elevan la presión y enriquecen la mezcla.',
      evidence,
      ['Mide la presión en ralentí y compara con la especificación.', 'Revisa el regulador y la línea de retorno.'],
      ['fuel-pressure-regulator', 'fuel-pump'],
      'presión combustible alta',
    ),
    make(
      'evap-stuck',
      'Válvula de purga EVAP atascada abierta',
      base * 0.5,
      'media',
      'Emisiones',
      'La purga puede estar metiendo vapores de combustible de forma continua.',
      evidence,
      ['Prueba la válvula de purga.', 'Revisa si hay olor a combustible y códigos EVAP.'],
      ['evap-purge-valve', 'gas-cap'],
      'válvula purga EVAP',
    ),
    make(
      'maf-overreport',
      'MAF sobreestimando el aire',
      base * 0.45,
      'media',
      'Admisión',
      'Si el MAF informa más aire del real, la ECU inyecta combustible de más.',
      evidence,
      ['Limpia el MAF y compara la lectura con la especificación.', 'Revisa el filtro y posibles obstrucciones.'],
      ['maf-sensor', 'air-filter'],
      'sensor MAF mezcla rica',
    ),
  ]
}

function misfireRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  const specific = ctx.codes.filter((code) => /^P030[1-8]$/.test(code.code))
  const triggered =
    hasCode(ctx, 'P0300', 'P0301', 'P0302', 'P0303', 'P0304', 'P0305', 'P0306', 'P0307', 'P0308') ||
    hasSymptom(ctx, 'misfire', 'rough-idle', 'vibration')
  if (!triggered) return []

  const flashing = hasSymptom(ctx, 'mil-flashing')
  const evidence = [
    `Códigos de fallo: ${codeNames(ctx) || 'sin códigos'}`,
    `Cilindros identificados: ${specific.map((code) => code.code).join(', ') || 'no especificados'}`,
  ]
  const rpm = value(ctx, 'rpm')
  const coolant = value(ctx, 'coolant')
  if (rpm !== undefined) evidence.push(`RPM: ${fmt(rpm, 0, 'rpm')}`)
  if (coolant !== undefined) evidence.push(`Refrigerante: ${fmt(coolant, 0, '°C')}`)

  let base = 52
  if (flashing) base += 15
  if (specific.length > 0) base += 6
  if (hasCode(ctx, 'P0300')) base += 4
  if (hasSymptom(ctx, 'misfire')) base += 5

  const injectorBoost = hasCode(ctx, 'P0201', 'P0202', 'P0203', 'P0204', 'P0205', 'P0206', 'P0207', 'P0208')
    ? 15
    : 0
  const coilBoost = hasCode(ctx, 'P0351', 'P0352', 'P0353', 'P0354', 'P0355', 'P0356', 'P0357', 'P0358')
    ? 15
    : 0

  return [
    make(
      'ignition-misfire',
      'Bujías o bobinas de encendido',
      base + coilBoost,
      flashing ? 'critica' : 'alta',
      'Encendido',
      'El fallo de combustión suele originarse en el encendido, sobre todo si se concentra en un cilindro.',
      evidence,
      [
        'Intercambia la bobina del cilindro afectado con otro y observa si el código se mueve.',
        'Revisa la bujía: desgaste, aceite o electrodo cerrado.',
        'Comprueba el conector y el cableado de la bobina.',
      ],
      ['spark-plugs', 'ignition-coils', 'wiring'],
      'bujías bobinas fallo combustión',
    ),
    make(
      'injector-misfire',
      'Inyector obstruido o defectuoso',
      base * 0.65 + injectorBoost,
      'alta',
      'Combustible',
      'Un inyector que no entrega el caudal correcto empobrece ese cilindro y produce fallos.',
      evidence,
      [
        'Prueba el inyector y su conector.',
        'Compara la bujía del cilindro afectado con las demás.',
        'Valora una limpieza o prueba de caudal.',
      ],
      ['injectors', 'wiring'],
      'inyector fallo combustión',
    ),
    make(
      'vacuum-misfire',
      'Fuga de vacío que afecta a un cilindro',
      base * 0.5,
      'media',
      'Admisión',
      'Una fuga cerca de un cilindro puede causar un fallo localizado, a menudo con mezcla pobre.',
      evidence,
      ['Prueba de humo en admisión.', 'Revisa juntas del colector y mangueras cercanas.'],
      ['vacuum-hoses', 'intake-gasket', 'pcv-valve'],
      'fuga vacío fallo cilindro',
    ),
    make(
      'compression-misfire',
      'Compresión baja o problema mecánico',
      base * 0.42,
      'alta',
      'Motor',
      'Si el encendido y el combustible están bien, una compresión baja explica el fallo persistente.',
      evidence,
      ['Prueba de compresión en todos los cilindros.', 'Compara las diferencias entre cilindros.', 'Revisa válvulas, aros y junta de culata.'],
      ['compression', 'head-gasket'],
      'prueba compresión motor',
    ),
  ]
}

function catalystRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  if (!hasCode(ctx, 'P0420', 'P0430')) return []
  const evidence = [`Código: ${codeNames(ctx)}`]
  if (hasCode(ctx, 'P0300', 'P0171', 'P0172')) {
    evidence.push('Hay códigos de mezcla o combustión que pueden haber dañado el catalizador.')
  }

  return [
    make(
      'catalyst-aged',
      'Catalizador desgastado o contaminado',
      58,
      'media',
      'Emisiones',
      'La ECU compara las sondas O2 y detecta que el catalizador ya no reduce emisiones como debería.',
      evidence,
      [
        'Compara la señal de la sonda delantera y la posterior.',
        'Descarta fugas de escape antes de cambiar el catalizador.',
        'Corrige cualquier fallo de mezcla o consumo de aceite.',
      ],
      ['catalytic-converter', 'exhaust', 'o2-sensor'],
      'catalizador escape',
    ),
    make(
      'o2-downstream',
      'Sonda O2 posterior envejecida',
      42,
      'media',
      'Emisiones',
      'Una sonda posterior lenta puede hacer que la ECU interprete que el catalizador está agotado.',
      evidence,
      ['Revisa la señal de la sonda posterior.', 'Comprueba el conector y el calentador.'],
      ['o2-sensor'],
      'sonda O2 posterior',
    ),
    make(
      'exhaust-leak',
      'Fuga de escape antes de la sonda',
      30,
      'media',
      'Emisiones',
      'Una fuga deja entrar oxígeno y falsea la lectura de la sonda posterior.',
      evidence,
      ['Busca soplidos o marcas de hollín.', 'Revisa juntas y soldaduras.'],
      ['exhaust'],
      'fuga escape',
    ),
    make(
      'catalyst-root-cause',
      'Fallo de mezcla o combustión de fondo',
      28,
      'alta',
      'Motor',
      'Cambiar el catalizador sin corregir la causa original puede repetir el código.',
      evidence,
      ['Revisa los códigos P0171, P0172 o P0300.', 'Comprueba el consumo de aceite y la puesta a punto.'],
      ['spark-plugs', 'ignition-coils', 'vacuum-hoses', 'oil-change'],
      'consumo aceite mezcla catalizador',
    ),
  ]
}

function thermostatRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  const coolant = value(ctx, 'coolant')
  const runTime = value(ctx, 'runTime')
  const triggered =
    hasCode(ctx, 'P0128', 'P0125') ||
    (coolant !== undefined && coolant < 75 && (runTime ?? 0) > 300 && !hasSymptom(ctx, 'overheat'))
  if (!triggered) return []

  const evidence = [
    `Temperatura del refrigerante: ${fmt(coolant, 0, '°C')}`,
    `Tiempo de motor: ${fmt(runTime, 0, 's')}`,
  ]
  return [
    make(
      'thermostat-stuck',
      'Termostato atascado abierto',
      68,
      'media',
      'Refrigeración',
      'El motor no alcanza su temperatura de trabajo, así que la ECU no entra en lazo cerrado y gasta más.',
      evidence,
      [
        'Compara la temperatura del tablero con la del escáner.',
        'Con el motor frío, arranca y observa si la temperatura sube lentamente.',
        'Sustituye el termostato si no cierra.',
      ],
      ['thermostat', 'coolant'],
      'termostato atascado abierto',
    ),
    make(
      'ect-drift',
      'Sensor ECT descalibrado',
      35,
      'media',
      'Refrigeración',
      'El sensor puede estar midiendo de menos y simular un termostato abierto.',
      evidence,
      ['Mide la resistencia del ECT en frío y caliente.', 'Compárala con la tabla del fabricante.'],
      ['coolant-temp-sensor'],
      'sensor temperatura refrigerante',
    ),
    make(
      'coolant-level',
      'Nivel de refrigerante bajo',
      24,
      'media',
      'Refrigeración',
      'Con poco refrigerante, la lectura puede ser errática y el motor calienta de forma desigual.',
      evidence,
      ['Revisa el nivel en frío.', 'Busca fugas y purga el sistema si hace falta.'],
      ['coolant'],
      'nivel refrigerante',
    ),
  ]
}

function coolantSensorRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  const coolant = value(ctx, 'coolant')
  const triggered = hasCode(ctx, 'P0117', 'P0118') || (coolant !== undefined && (coolant < -30 || coolant > 130))
  if (!triggered) return []
  const evidence = [`Temperatura leída: ${fmt(coolant, 0, '°C')}`]
  return [
    make(
      'ect-sensor-fault',
      'Sensor ECT o su circuito',
      62,
      'alta',
      'Refrigeración',
      'La ECU recibe una temperatura fuera de rango. Puede ser el sensor, el conector o el cableado.',
      evidence,
      ['Mide la resistencia del sensor.', 'Revisa el conector y la continuidad.', 'Compara con un termómetro.'],
      ['coolant-temp-sensor', 'wiring'],
      'sensor temperatura refrigerante',
    ),
    make(
      'ect-wiring',
      'Cableado o conector del ECT',
      34,
      'media',
      'Eléctrico',
      'Un cortocircuito o circuito abierto produce lecturas extremas.',
      evidence,
      ['Inspecciona pines y humedad.', 'Mide continuidad y caída de voltaje.'],
      ['wiring'],
      'reparar conector sensor temperatura',
    ),
    make(
      'ect-pcm',
      'Entrada del módulo de control',
      16,
      'media',
      'Red CAN',
      'Si el sensor y el cableado están bien, revisa la entrada del módulo.',
      evidence,
      ['Prueba con una resistencia conocida en el conector.', 'Consulta el esquema del fabricante.'],
      ['ecu', 'taller-especializado'],
      'módulo control temperatura',
    ),
  ]
}

function iatSensorRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  const intake = value(ctx, 'intakeTemp')
  const triggered = hasCode(ctx, 'P0112', 'P0113') || (intake !== undefined && (intake < -30 || intake > 80))
  if (!triggered) return []
  const evidence = [`Temperatura de admisión: ${fmt(intake, 0, '°C')}`]
  return [
    make(
      'iat-fault',
      'Sensor IAT o su circuito',
      60,
      'media',
      'Admisión',
      'La temperatura de aire no es coherente con el ambiente y altera el cálculo de mezcla.',
      evidence,
      ['Mide el sensor en frío.', 'Revisa el conector y el cableado.', 'Compara con la temperatura ambiente.'],
      ['iat-sensor', 'wiring'],
      'sensor IAT temperatura admisión',
    ),
    make(
      'iat-wiring',
      'Cableado del IAT',
      30,
      'media',
      'Eléctrico',
      'Un circuito abierto o cortocircuito da lecturas extremas.',
      evidence,
      ['Inspecciona el conector.', 'Mide continuidad.'],
      ['wiring'],
      'reparar cableado IAT',
    ),
  ]
}

function mafRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  const maf = value(ctx, 'maf')
  const rpm = value(ctx, 'rpm')
  const triggered =
    hasCode(ctx, 'P0101', 'P0102', 'P0103') ||
    (maf !== undefined && maf < 1.5 && (rpm ?? 0) > 400 && (rpm ?? 0) < 1200)
  if (!triggered) return []
  const evidence = [`MAF: ${fmt(maf, 1, 'g/s')}`, `RPM: ${fmt(rpm, 0, 'rpm')}`]
  return [
    make(
      'maf-dirty-2',
      'MAF sucio o defectuoso',
      60,
      'media',
      'Admisión',
      'El caudalímetro es el primer sospechoso cuando la señal no cuadra con el régimen.',
      evidence,
      ['Limpia el MAF con limpiador específico.', 'Comprueba la lectura en ralentí.', 'Revisa el filtro de aire.'],
      ['maf-sensor', 'air-filter'],
      'limpiar sensor MAF',
    ),
    make(
      'intake-leak',
      'Fuga de admisión',
      36,
      'media',
      'Admisión',
      'Una fuga después del MAF deja entrar aire no medido.',
      evidence,
      ['Prueba de humo.', 'Revisa el tubo de admisión y las abrazaderas.'],
      ['vacuum-hoses', 'intake-gasket'],
      'fuga admisión',
    ),
    make(
      'maf-wiring',
      'Cableado o conector del MAF',
      24,
      'media',
      'Eléctrico',
      'Una señal baja o alta puede venir de un conector suelto.',
      evidence,
      ['Revisa pines y humedad.', 'Mide alimentación y señal.'],
      ['wiring'],
      'conector MAF',
    ),
  ]
}

function o2HeaterRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  const codes = ['P0031', 'P0037', 'P0051', 'P0057', 'P0135', 'P0141', 'P0155', 'P0161']
  if (!hasCode(ctx, ...codes)) return []
  return [
    make(
      'o2-heater',
      'Calentador de la sonda O2',
      58,
      'media',
      'Emisiones',
      'El calentador no alcanza la temperatura de trabajo y la sonda tarda en corregir la mezcla.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Revisa el fusible y el relé del calentador.', 'Mide la resistencia del calentador.', 'Inspecciona el conector.'],
      ['o2-sensor', 'wiring'],
      'calentador sonda O2',
    ),
    make(
      'o2-sensor-heater',
      'Sonda O2 defectuosa',
      40,
      'media',
      'Emisiones',
      'El elemento calefactor puede estar abierto dentro de la sonda.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Compara la resistencia con la especificación.', 'Sustituye la sonda si el circuito está abierto.'],
      ['o2-sensor'],
      'cambiar sonda O2',
    ),
  ]
}

function evapRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  if (!hasCode(ctx, 'P0440', 'P0442', 'P0446', 'P0455', 'P0456', 'P0457')) return []
  const evidence = [`Códigos: ${codeNames(ctx)}`]
  if (hasSymptom(ctx, 'fuel-smell')) evidence.push('Hay olor a combustible, lo que refuerza una fuga real.')
  return [
    make(
      'gas-cap-leak',
      'Tapón de combustible',
      48 + symptomBoost(ctx, ['fuel-smell'], 8),
      'baja',
      'Emisiones',
      'Es la causa más común y la más barata de descartar en los códigos EVAP.',
      evidence,
      ['Revisa la junta del tapón.', 'Aprieta hasta el clic.', 'Borra el código y conduce un ciclo completo.'],
      ['gas-cap'],
      'tapón de combustible',
    ),
    make(
      'evap-purge',
      'Válvula de purga EVAP',
      32,
      'media',
      'Emisiones',
      'Una purga atascada puede causar fugas o mezcla rica.',
      evidence,
      ['Prueba que la válvula cierre.', 'Revisa las mangueras.'],
      ['evap-purge-valve'],
      'válvula purga EVAP',
    ),
    make(
      'evap-vent',
      'Válvula de venteo o canister',
      26,
      'media',
      'Emisiones',
      'La válvula de venteo permite la prueba de estanqueidad; si falla, el sistema no sella.',
      evidence,
      ['Prueba la válvula.', 'Revisa el canister y las mangueras.'],
      ['evap-vent-valve'],
      'válvula venteo EVAP',
    ),
    make(
      'evap-hose',
      'Manguera o sello EVAP',
      22,
      'baja',
      'Emisiones',
      'Una grieta pequeña en una manguera explica las fugas difíciles.',
      evidence,
      ['Prueba de humo en el sistema EVAP.', 'Revisa la tapa del depósito y los sellos.'],
      ['evap-purge-valve', 'gas-cap'],
      'fuga EVAP manguera',
    ),
  ]
}

function egrRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  if (!hasCode(ctx, 'P0401', 'P0402', 'P0403')) return []
  return [
    make(
      'egr-carbon',
      'Válvula EGR obstruida por carbonilla',
      58,
      'media',
      'Emisiones',
      'La carbonilla impide el paso de gases y dispara P0401 o fallos de combustión.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Desmonta y limpia la EGR.', 'Revisa el paso del colector.', 'Comprueba el actuador.'],
      ['egr-valve'],
      'limpiar válvula EGR',
    ),
    make(
      'egr-valve-fault',
      'Válvula EGR o solenoide defectuoso',
      40,
      'media',
      'Emisiones',
      'El actuador puede no abrir o cerrar correctamente.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Prueba el solenoide.', 'Revisa el conector y el vacío.'],
      ['egr-valve', 'wiring'],
      'válvula EGR',
    ),
    make(
      'dpfe-sensor',
      'Sensor de presión diferencial EGR (DPFE)',
      30,
      'media',
      'Emisiones',
      'El sensor puede informar un flujo que no existe.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Compara la señal con la apertura de la EGR.', 'Revisa las mangueras del sensor.'],
      ['egr-valve', 'wiring'],
      'sensor DPFE EGR',
    ),
  ]
}

function turboRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  const under = hasCode(ctx, 'P0299', 'P2263')
  const over = hasCode(ctx, 'P0234', 'P2261')
  if (!under && !over) return []
  const boost = symptomBoost(ctx, ['power-loss'], 8)
  if (under) {
    return [
      make(
        'boost-leak',
        'Fuga de presión en admisión o intercooler',
        55 + boost,
        'alta',
        'Admisión',
        'El turbo puede estar bien, pero la presión se escapa antes de llegar al motor.',
        [`Códigos: ${codeNames(ctx)}`],
        ['Revisa mangueras y abrazaderas del intercooler.', 'Prueba de presión o humo.', 'Busca silbidos.'],
        ['intercooler', 'turbo-wastegate'],
        'fuga intercooler turbo',
      ),
      make(
        'wastegate-stuck-open',
        'Wastegate o válvula de descarga abierta',
        42 + boost,
        'alta',
        'Admisión',
        'Si la wastegate no cierra, el turbo no genera presión.',
        [`Códigos: ${codeNames(ctx)}`],
        ['Comprueba el movimiento de la varilla.', 'Prueba el solenoide de control.', 'Revisa el vacío.'],
        ['turbo-wastegate', 'boost-control-solenoid'],
        'wastegate turbo',
      ),
      make(
        'turbo-worn',
        'Turbo desgastado',
        28,
        'alta',
        'Admisión',
        'Un turbo con holgura o álabes dañados no alcanza la presión.',
        [`Códigos: ${codeNames(ctx)}`],
        ['Revisa la holgura del eje.', 'Busca aceite en la admisión.', 'Mide la presión real.'],
        ['turbo-wastegate'],
        'turbo desgastado',
      ),
    ]
  }
  return [
    make(
      'wastegate-stuck-closed',
      'Wastegate atascada cerrada',
      55 + boost,
      'alta',
      'Admisión',
      'El turbo genera más presión de la solicitada y la ECU corta la potencia por protección.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Revisa el actuador y la varilla.', 'Prueba el solenoide.', 'No circules con sobrepresión.'],
      ['turbo-wastegate', 'boost-control-solenoid'],
      'sobrepresión turbo',
    ),
    make(
      'boost-solenoid',
      'Solenoide de control de turbo',
      38,
      'media',
      'Admisión',
      'El solenoide puede no regular correctamente la presión.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Prueba el solenoide.', 'Revisa las mangueras de vacío.'],
      ['boost-control-solenoid', 'vacuum-hoses'],
      'solenoide turbo',
    ),
  ]
}

function fuelPressureRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  if (!hasCode(ctx, 'P0087', 'P0088', 'P0093', 'P0094')) return []
  const critical = hasCode(ctx, 'P0093')
  return [
    make(
      'fuel-filter-clog',
      'Filtro de combustible obstruido',
      52,
      'alta',
      'Combustible',
      'Un filtro tapado reduce el caudal y la presión, sobre todo bajo carga.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Sustituye el filtro si toca mantenimiento.', 'Mide la presión antes y después.', 'Revisa el caudal.'],
      ['fuel-filter'],
      'cambiar filtro de combustible',
    ),
    make(
      'fuel-pump-weak',
      'Bomba de combustible débil',
      44,
      'alta',
      'Combustible',
      'La bomba puede entregar presión en ralentí pero no caudal bajo carga.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Mide presión y caudal.', 'Revisa el relé y la alimentación.', 'Prueba la bomba en carga.'],
      ['fuel-pump'],
      'bomba de combustible',
    ),
    make(
      'pressure-regulator',
      'Regulador o válvula de presión',
      32,
      'alta',
      'Combustible',
      'El regulador puede estar atascado o desgastado.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Comprueba la presión de retorno.', 'Revisa el sensor de presión del riel.'],
      ['fuel-pressure-regulator'],
      'regulador presión combustible',
    ),
    make(
      'injector-return-leak',
      'Retorno de inyectores excesivo',
      30,
      critical ? 'critica' : 'alta',
      'Combustible',
      'Un inyector que devuelve demasiado combustible hace caer la presión del riel.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Mide el retorno de cada inyector.', 'No circules si hay olor fuerte a diésel o pérdida de presión.'],
      ['injectors'],
      'retorno inyectores',
    ),
  ]
}

function dpfRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  if (!hasCode(ctx, 'P2002', 'P2453', 'P2463', 'P24A4')) return []
  return [
    make(
      'dpf-saturated',
      'Filtro de partículas (DPF) saturado',
      60,
      'alta',
      'Emisiones',
      'El DPF acumula hollín y no logra regenerarse, lo que aumenta la contrapresión.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Lee la presión diferencial.', 'Revisa si los trayectos cortos impiden la regeneración.', 'Corrige EGR e inyectores antes de limpiar.'],
      ['dpf', 'egr-valve'],
      'limpiar DPF',
    ),
    make(
      'dpf-sensor',
      'Sensor de presión diferencial del DPF',
      38,
      'media',
      'Emisiones',
      'Un sensor o mangueras obstruidas pueden simular un DPF saturado.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Revisa las mangueras del sensor.', 'Compara la lectura con la presión real.'],
      ['dpf', 'wiring'],
      'sensor presión DPF',
    ),
    make(
      'dpf-regeneration',
      'Regeneración incompleta',
      30,
      'media',
      'Emisiones',
      'La regeneración se interrumpe por trayectos cortos o por un fallo de dosificación.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Realiza un trayecto de regeneración según el fabricante.', 'Revisa la temperatura y la dosificación.'],
      ['dpf'],
      'regeneración DPF',
    ),
  ]
}

function scrRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  if (!hasCode(ctx, 'P203B', 'P20B9', 'P20EE')) return []
  return [
    make(
      'def-level',
      'Nivel o calidad de AdBlue',
      55,
      'media',
      'Emisiones',
      'El sistema SCR necesita AdBlue en buen estado. Un nivel bajo o líquido contaminado dispara los códigos.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Revisa el nivel.', 'Usa AdBlue certificado.', 'No diluyas con agua.'],
      ['def-system'],
      'AdBlue DEF',
    ),
    make(
      'nox-sensor-fault',
      'Sensor de NOx',
      38,
      'alta',
      'Emisiones',
      'El sensor puede estar contaminado o con el cableado dañado.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Lee los valores en vivo.', 'Revisa el conector.', 'Sustituye si la señal es incoherente.'],
      ['nox-sensor'],
      'sensor NOx',
    ),
    make(
      'scr-dosing',
      'Inyector de urea o dosificación',
      30,
      'alta',
      'Emisiones',
      'Si la urea no llega al catalizador, la eficiencia de NOx cae.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Comprueba la dosificación.', 'Revisa el calentador y la línea.', 'Evalúa el catalizador SCR.'],
      ['def-system', 'scr-catalyst'],
      'inyector urea SCR',
    ),
  ]
}

function throttleRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  if (!hasCode(ctx, 'P2100', 'P2119', 'P2135')) return []
  return [
    make(
      'throttle-carbon',
      'Carbonilla en el cuerpo de aceleración',
      52,
      'alta',
      'Admisión',
      'La mariposa no alcanza la posición pedida por la ECU y entra en modo de emergencia.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Limpiar el cuerpo de aceleración.', 'Hacer adaptación con escáner.', 'No forzar la mariposa.'],
      ['throttle-body'],
      'limpiar cuerpo de aceleración',
    ),
    make(
      'throttle-actuator',
      'Actuador de la mariposa',
      40,
      'alta',
      'Admisión',
      'El motor eléctrico del cuerpo puede estar desgastado.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Comprueba el actuador.', 'Revisa el conector.', 'Sustituye el cuerpo si es necesario.'],
      ['throttle-body', 'wiring'],
      'actuador mariposa',
    ),
    make(
      'throttle-wiring',
      'Cableado del cuerpo de aceleración',
      26,
      'media',
      'Eléctrico',
      'Una señal incoherente puede deberse al arnés.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Revisa las dos señales del TPS.', 'Inspecciona el conector.'],
      ['wiring'],
      'cableado cuerpo aceleración',
    ),
  ]
}

function pedalRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  if (!hasCode(ctx, 'P2122', 'P2138')) return []
  return [
    make(
      'pedal-sensor',
      'Sensor del pedal del acelerador',
      55,
      'alta',
      'Admisión',
      'Las dos señales del pedal no coinciden y la ECU limita la potencia.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Lee las dos señales con escáner.', 'Revisa el conector.', 'Sustituye el pedal si es necesario.'],
      ['accelerator-pedal', 'wiring'],
      'sensor pedal acelerador',
    ),
    make(
      'pedal-wiring',
      'Cableado del pedal',
      32,
      'media',
      'Eléctrico',
      'Un conector suelto o un cable roto produce la misma incoherencia.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Inspecciona el arnés.', 'Mide continuidad.', 'Haz la adaptación después de reparar.'],
      ['wiring'],
      'reparar cableado pedal',
    ),
  ]
}

function chargingRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  const voltage = value(ctx, 'voltage')
  const triggered =
    hasCode(ctx, 'P0562', 'P0563', 'P0620') ||
    (voltage !== undefined && (voltage < 12.2 || voltage > 15))
  if (!triggered) return []
  const evidence = [`Voltaje: ${fmt(voltage, 2, 'V')}`, `Códigos: ${codeNames(ctx) || 'ninguno'}`]
  return [
    make(
      'battery-weak',
      'Batería descargada o en mal estado',
      45,
      'alta',
      'Eléctrico',
      'Una batería débil provoca códigos U y fallos eléctricos que parecen de otros módulos.',
      evidence,
      ['Mide el voltaje en reposo.', 'Haz prueba de carga.', 'Limpia bornes y masas.'],
      ['battery'],
      'comprobar batería',
    ),
    make(
      'alternator-fault',
      'Alternador o regulador',
      42,
      'alta',
      'Eléctrico',
      'Si el voltaje no sube con el motor en marcha, el alternador no está cargando.',
      evidence,
      ['Mide voltaje en marcha.', 'Revisa la correa.', 'Prueba el alternador.'],
      ['alternator', 'serpentine-belt'],
      'comprobar alternador',
    ),
    make(
      'ground-fault',
      'Masa o cableado de carga',
      28,
      'media',
      'Eléctrico',
      'Una masa corroída o un cable flojo causa caídas de tensión intermitentes.',
      evidence,
      ['Revisa masas de motor y carrocería.', 'Mide caída de voltaje.', 'Limpia y aprieta.'],
      ['wiring', 'battery'],
      'revisar masas coche',
    ),
  ]
}

function transmissionRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  if (!hasCode(ctx, 'P0700', 'P0705', 'P0715', 'P0720', 'P0740', 'P0741', 'P0750', 'P0755', 'P0760', 'P0841')) {
    return []
  }
  const boost = symptomBoost(ctx, ['no-shift', 'vibration'], 8)
  return [
    make(
      'transmission-fluid',
      'Nivel o estado del aceite de transmisión',
      48 + boost,
      'alta',
      'Transmisión',
      'El nivel bajo o el aceite contaminado alteran la presión y los cambios.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Revisa nivel y color.', 'Usa el aceite especificado.', 'Escanear el TCM.'],
      ['transmission-fluid'],
      'aceite transmisión',
    ),
    make(
      'transmission-solenoid',
      'Solenoide de transmisión',
      42 + boost,
      'alta',
      'Transmisión',
      'Un solenoide con fallo eléctrico provoca cambios bruscos o modo de emergencia.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Lee los códigos del TCM.', 'Mide la resistencia.', 'Prueba el cuerpo de válvulas.'],
      ['transmission-solenoid'],
      'solenoide transmisión',
    ),
    make(
      'transmission-sensor',
      'Sensor de velocidad de la transmisión',
      30,
      'media',
      'Transmisión',
      'Una señal de velocidad errática desordena los cambios.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Revisa el sensor y el conector.', 'Comprueba la señal.'],
      ['transmission-solenoid', 'wiring'],
      'sensor velocidad transmisión',
    ),
    make(
      'tcm-fault',
      'Módulo de transmisión (TCM)',
      22,
      'alta',
      'Transmisión',
      'Si alimentación, sensores y solenoides están bien, revisa el TCM.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Revisa alimentación y masas.', 'Consulta reprogramación.'],
      ['tcm', 'taller-especializado'],
      'módulo transmisión',
    ),
  ]
}

function communicationRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  if (!hasCode(ctx, 'U0100', 'U0101', 'U0121', 'U0140', 'U0155', 'U1000')) return []
  return [
    make(
      'can-power',
      'Batería, masa o alimentación de módulos',
      46,
      'alta',
      'Red CAN',
      'Antes de culpar al módulo, revisa la tensión y las masas: un módulo sin alimentación desaparece del bus.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Mide la batería y las masas.', 'Revisa fusibles de los módulos.', 'Escanear todos los módulos.'],
      ['battery', 'wiring', 'can-bus'],
      'revisar masas módulos',
    ),
    make(
      'can-wiring',
      'Cableado del bus CAN',
      38,
      'alta',
      'Red CAN',
      'Un cable CAN abierto o en cortocircuito tumba la comunicación de varios módulos.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Mide la resistencia del bus.', 'Inspecciona conectores.', 'Aísla módulos con el esquema.'],
      ['can-bus', 'wiring'],
      'reparar bus CAN',
    ),
    make(
      'can-module',
      'Módulo que no responde',
      28,
      'alta',
      'Red CAN',
      'El módulo afectado puede estar defectuoso o sin programación.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Comprueba alimentación en el módulo.', 'Revisa el conector.', 'Valora sustitución o reprogramación.'],
      ['ecu', 'tcm', 'taller-especializado'],
      'módulo comunicación CAN',
    ),
  ]
}

function injectorCircuitRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  if (!hasCode(ctx, 'P0201', 'P0202', 'P0203', 'P0204', 'P0205', 'P0206', 'P0207', 'P0208')) return []
  return [
    make(
      'injector-electrical',
      'Inyector o conector defectuoso',
      55,
      'alta',
      'Combustible',
      'La ECU detecta un problema eléctrico en el circuito de un inyector.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Mide la resistencia del inyector.', 'Revisa el conector.', 'Prueba el pulso con lámpara.'],
      ['injectors', 'wiring'],
      'inyector circuito eléctrico',
    ),
    make(
      'injector-wiring',
      'Cableado del inyector',
      32,
      'media',
      'Eléctrico',
      'Un cable abierto o un pin flojo produce el mismo código.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Revisa continuidad.', 'Inspecciona el arnés.', 'Repara con terminales adecuados.'],
      ['wiring'],
      'reparar cableado inyector',
    ),
  ]
}

function ignitionCoilRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  if (!hasCode(ctx, 'P0351', 'P0352', 'P0353', 'P0354', 'P0355', 'P0356', 'P0357', 'P0358')) return []
  return [
    make(
      'coil-fault',
      'Bobina de encendido',
      58,
      'alta',
      'Encendido',
      'La ECU detecta un fallo en el circuito primario de una bobina.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Intercambia la bobina con otro cilindro.', 'Revisa la bujía.', 'Mide primario y secundario.'],
      ['ignition-coils', 'spark-plugs'],
      'bobina encendido',
    ),
    make(
      'coil-wiring',
      'Cableado de la bobina',
      30,
      'media',
      'Eléctrico',
      'Un conector o cable dañado simula una bobina defectuosa.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Revisa el conector.', 'Mide continuidad.', 'Comprueba la alimentación.'],
      ['wiring'],
      'reparar cableado bobina',
    ),
  ]
}

function overheatRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  if (!hasCode(ctx, 'P0217') && !hasSymptom(ctx, 'overheat', 'coolant-loss')) return []
  const coolant = value(ctx, 'coolant')
  return [
    make(
      'coolant-low',
      'Nivel de refrigerante bajo o fuga',
      50,
      'critica',
      'Refrigeración',
      'Sin refrigerante suficiente, el motor no disipa calor y puede dañarse.',
      [`Temperatura: ${fmt(coolant, 0, '°C')}`, `Códigos: ${codeNames(ctx) || 'ninguno'}`],
      ['Detén el motor y deja enfriar.', 'Revisa nivel y fugas.', 'No abras el tapón en caliente.'],
      ['coolant'],
      'pérdida refrigerante',
    ),
    make(
      'thermostat-closed',
      'Termostato cerrado',
      42,
      'critica',
      'Refrigeración',
      'Si el termostato no abre, el refrigerante no circula al radiador.',
      [`Temperatura: ${fmt(coolant, 0, '°C')}`],
      ['Comprueba la temperatura de entrada y salida del radiador.', 'Sustituye el termostato.'],
      ['thermostat'],
      'termostato cerrado',
    ),
    make(
      'fan-fault',
      'Ventilador o relé del ventilador',
      34,
      'alta',
      'Refrigeración',
      'Sin ventilador, el motor se calienta en tráfico lento.',
      [`Temperatura: ${fmt(coolant, 0, '°C')}`],
      ['Comprueba el ventilador y el relé.', 'Revisa el sensor de temperatura.', 'No metas las manos cerca de las aspas.'],
      ['radiator-fan'],
      'ventilador radiador',
    ),
    make(
      'water-pump-fault',
      'Bomba de agua',
      30,
      'critica',
      'Refrigeración',
      'Una bomba que no circula provoca sobrecalentamiento rápido.',
      [`Temperatura: ${fmt(coolant, 0, '°C')}`],
      ['Busca ruido o fuga en la bomba.', 'Revisa la correa.', 'Sustituye si no circula.'],
      ['water-pump', 'serpentine-belt'],
      'bomba de agua',
    ),
    make(
      'head-gasket-fault',
      'Junta de culata',
      24,
      'critica',
      'Refrigeración',
      'Si hay gases en el refrigerante o mayonesa en el aceite, puede ser la junta.',
      [`Temperatura: ${fmt(coolant, 0, '°C')}`],
      ['Prueba de gases en el refrigerante.', 'Revisa el aceite.', 'No sigas circulando.'],
      ['head-gasket', 'taller-especializado'],
      'junta de culata',
    ),
  ]
}

function airbagRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  if (!hasCode(ctx, 'B0001', 'B0010', 'B0020') && !hasSymptom(ctx, 'airbag-light')) return []
  return [
    make(
      'airbag-connector',
      'Conector o cableado del airbag',
      45,
      'critica',
      'Airbag',
      'Los conectores bajo los asientos y en el volante son una causa frecuente de testigo SRS.',
      [`Códigos: ${codeNames(ctx) || 'ninguno'}`],
      ['Desconecta la batería y espera el tiempo indicado.', 'Revisa conectores amarillos.', 'No midas el airbag con multímetro.'],
      ['airbag-clock-spring', 'wiring'],
      'conector airbag',
    ),
    make(
      'airbag-clock-spring-fault',
      'Clock spring del volante',
      35,
      'critica',
      'Airbag',
      'El anillo del volante puede romperse y dejar sin conexión el airbag del conductor.',
      [`Códigos: ${codeNames(ctx) || 'ninguno'}`],
      ['Requiere desmontar el volante con procedimiento seguro.', 'Sustituye el clock spring centrado.'],
      ['airbag-clock-spring'],
      'clock spring airbag',
    ),
    make(
      'airbag-module',
      'Módulo SRS o sensor',
      22,
      'critica',
      'Airbag',
      'Si el cableado está bien, el módulo o un sensor lateral pueden estar defectuosos.',
      [`Códigos: ${codeNames(ctx) || 'ninguno'}`],
      ['Escanear el módulo SRS.', 'No sustituyas el módulo sin confirmar.', 'Consulta un especialista.'],
      ['ecu', 'taller-especializado'],
      'módulo airbag SRS',
    ),
  ]
}

function absRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  if (!hasCode(ctx, 'C0035', 'C0040', 'C0050', 'C0055') && !hasSymptom(ctx, 'abs-light')) return []
  return [
    make(
      'wheel-sensor',
      'Sensor de velocidad de rueda',
      50,
      'media',
      'ABS',
      'El sensor o su cable suelen ser la causa del testigo ABS.',
      [`Códigos: ${codeNames(ctx) || 'ninguno'}`],
      ['Revisa el conector y el cable.', 'Mide la señal.', 'Inspecciona la rueda fónica.'],
      ['wheel-speed-sensor', 'wiring'],
      'sensor ABS rueda',
    ),
    make(
      'tone-ring',
      'Rueda fónica o rodamiento',
      30,
      'media',
      'ABS',
      'Una rueda fónica sucia o dañada altera la señal.',
      [`Códigos: ${codeNames(ctx) || 'ninguno'}`],
      ['Limpia la rueda fónica.', 'Revisa holgura del rodamiento.', 'Sustituye si está dañada.'],
      ['wheel-speed-sensor'],
      'rueda fónica ABS',
    ),
    make(
      'abs-wiring',
      'Cableado del ABS',
      24,
      'media',
      'Eléctrico',
      'Un cable roto o un conector con humedad produce fallos intermitentes.',
      [`Códigos: ${codeNames(ctx) || 'ninguno'}`],
      ['Inspecciona el arnés.', 'Mide continuidad.', 'Sella el conector.'],
      ['wiring'],
      'reparar cableado ABS',
    ),
  ]
}

function vvtRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  if (!hasCode(ctx, 'P0010', 'P0011', 'P0012', 'P0016', 'P0017')) return []
  const critical = hasCode(ctx, 'P0016', 'P0017')
  return [
    make(
      'vvt-oil',
      'Aceite sucio o baja presión de aceite',
      48,
      critical ? 'critica' : 'alta',
      'Motor',
      'El sistema VVT funciona con presión de aceite. Un aceite viejo o sucio obstruye el solenoide.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Cambia aceite y filtro.', 'Comprueba la presión.', 'Revisa la malla del solenoide.'],
      ['oil-change', 'oil-pressure-sensor'],
      'cambio aceite VVT',
    ),
    make(
      'vvt-solenoid-fault',
      'Solenoide VVT obstruido o defectuoso',
      46,
      critical ? 'critica' : 'alta',
      'Motor',
      'El solenoide no mueve el árbol de levas como pide la ECU.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Mide la resistencia.', 'Limpia o sustituye el solenoide.', 'Borra los códigos y prueba.'],
      ['vvt-solenoid'],
      'solenoide VVT',
    ),
    make(
      'timing-chain-fault',
      'Cadena o tensor de distribución',
      34,
      'critica',
      'Motor',
      'Si la sincronización se movió, el motor puede dañarse. No circules con P0016.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Verifica las marcas de sincronización.', 'Revisa el tensor.', 'No arranques si hay ruido fuerte.'],
      ['timing-chain'],
      'cadena distribución',
    ),
    make(
      'cam-sensor-fault',
      'Sensor de árbol de levas',
      24,
      'alta',
      'Encendido',
      'Una señal de posición errónea también produce códigos de correlación.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Revisa el sensor y el conector.', 'Compara la señal con el cigüeñal.'],
      ['camshaft-sensor', 'wiring'],
      'sensor árbol de levas',
    ),
  ]
}

function crankCamRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  if (!hasCode(ctx, 'P0335', 'P0340', 'P0341')) return []
  return [
    make(
      'crank-sensor-fault',
      'Sensor de cigüeñal o árbol de levas',
      55,
      'critica',
      'Encendido',
      'La ECU no recibe una señal de posición válida y puede no arrancar.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Revisa el conector.', 'Mide la señal.', 'Inspecciona la rueda fónica.'],
      ['crankshaft-sensor', 'camshaft-sensor', 'wiring'],
      'sensor cigüeñal árbol levas',
    ),
    make(
      'sensor-wiring',
      'Cableado o rueda fónica',
      30,
      'alta',
      'Eléctrico',
      'Un cable dañado o una rueda fónica sucia simulan un sensor defectuoso.',
      [`Códigos: ${codeNames(ctx)}`],
      ['Revisa continuidad.', 'Limpia la rueda fónica.', 'Comprueba la separación.'],
      ['wiring', 'crankshaft-sensor'],
      'rueda fónica sensor',
    ),
  ]
}

function knockRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  if (!hasCode(ctx, 'P0325') && !hasSymptom(ctx, 'knocking')) return []
  return [
    make(
      'knock-sensor-fault',
      'Sensor de detonación',
      50,
      'media',
      'Encendido',
      'El sensor puede estar flojo, con el cable dañado o defectuoso.',
      [`Códigos: ${codeNames(ctx) || 'ninguno'}`],
      ['Revisa el par de apriete.', 'Inspecciona el conector.', 'Prueba el sensor.'],
      ['knock-sensor', 'wiring'],
      'sensor detonación',
    ),
    make(
      'fuel-quality-knock',
      'Combustible de bajo octanaje o carbonilla',
      30,
      'media',
      'Motor',
      'El cascabeleo también aparece con combustible inadecuado o carbonilla en la cámara.',
      [`Códigos: ${codeNames(ctx) || 'ninguno'}`],
      ['Usa el octanaje recomendado.', 'Revisa la carbonilla.', 'Comprueba el avance.'],
      ['oil-change', 'taller-especializado'],
      'cascabeleo combustible',
    ),
  ]
}

function generalSymptomsRule(ctx: DiagnosisContext): DiagnosisHypothesis[] {
  if (ctx.codes.length > 0) return []
  const hypotheses: DiagnosisHypothesis[] = []

  if (hasSymptom(ctx, 'no-start', 'hard-start')) {
    hypotheses.push(
      make(
        'general-battery',
        'Batería o sistema de arranque',
        40,
        'alta',
        'Eléctrico',
        'Antes de buscar sensores, confirma que la batería y el motor de arranque giran con fuerza.',
        ['No hay códigos almacenados.', 'Síntoma: no arranca o arranque difícil.'],
        ['Mide el voltaje en reposo y al arrancar.', 'Revisa bornes y masas.', 'Comprueba el motor de arranque.'],
        ['battery', 'alternator', 'wiring'],
        'no arranca batería',
      ),
      make(
        'general-fuel',
        'Falta de combustible o presión',
        34,
        'alta',
        'Combustible',
        'Si el motor gira pero no enciende, comprueba si llega combustible.',
        ['No hay códigos almacenados.', 'Síntoma: no arranca.'],
        ['Escucha la bomba al dar contacto.', 'Mide presión en el riel.', 'Revisa el filtro.'],
        ['fuel-pump', 'fuel-filter'],
        'no arranca combustible',
      ),
      make(
        'general-ignition',
        'Falta de chispa',
        30,
        'alta',
        'Encendido',
        'Revisa bujías, bobinas y la señal del cigüeñal.',
        ['No hay códigos almacenados.', 'Síntoma: no arranca.'],
        ['Prueba chispa en un cilindro.', 'Revisa el sensor del cigüeñal.', 'Comprueba el inmovilizador.'],
        ['spark-plugs', 'ignition-coils', 'crankshaft-sensor'],
        'no arranca chispa',
      ),
    )
  }

  if (hasSymptom(ctx, 'rough-idle', 'vibration', 'stall')) {
    hypotheses.push(
      make(
        'general-idle',
        'Fuga de vacío o admisión sucia',
        38,
        'media',
        'Admisión',
        'Con el motor al ralentí, una pequeña entrada de aire desestabiliza la mezcla.',
        ['No hay códigos almacenados.', 'Síntoma: ralentí inestable.'],
        ['Prueba de humo.', 'Limpia el cuerpo de aceleración.', 'Revisa el MAF.'],
        ['vacuum-hoses', 'throttle-body', 'maf-sensor'],
        'ralentí inestable',
      ),
    )
  }

  if (hasSymptom(ctx, 'power-loss')) {
    hypotheses.push(
      make(
        'general-power',
        'Admisión o combustible limitando potencia',
        34,
        'media',
        'Motor',
        'Revisa filtro de aire, MAF, presión de combustible y, si aplica, el turbo.',
        ['No hay códigos almacenados.', 'Síntoma: pérdida de potencia.'],
        ['Revisa el filtro de aire.', 'Mide la presión de combustible.', 'Comprueba la presión del turbo.'],
        ['air-filter', 'maf-sensor', 'fuel-pump', 'turbo-wastegate'],
        'pérdida de potencia',
      ),
    )
  }

  if (hasSymptom(ctx, 'overheat', 'coolant-loss')) {
    hypotheses.push(
      make(
        'general-overheat',
        'Sistema de refrigeración',
        55,
        'critica',
        'Refrigeración',
        'El sobrecalentamiento puede dañar el motor. Detente y revisa el circuito.',
        ['No hay códigos almacenados.', 'Síntoma: sobrecalentamiento.'],
        ['No abras el tapón en caliente.', 'Revisa nivel y fugas.', 'Comprueba termostato y ventilador.'],
        ['coolant', 'thermostat', 'radiator-fan', 'water-pump'],
        'sobrecalentamiento',
      ),
    )
  }

  if (hasSymptom(ctx, 'no-shift')) {
    hypotheses.push(
      make(
        'general-transmission',
        'Aceite o control de transmisión',
        42,
        'alta',
        'Transmisión',
        'Revisa el nivel y el estado del aceite antes de pensar en el TCM.',
        ['No hay códigos almacenados.', 'Síntoma: la transmisión no cambia.'],
        ['Revisa nivel y color.', 'Escanear el TCM.', 'Prueba los solenoides.'],
        ['transmission-fluid', 'transmission-solenoid', 'tcm'],
        'transmisión no cambia',
      ),
    )
  }

  if (hasSymptom(ctx, 'electrical')) {
    hypotheses.push(
      make(
        'general-electrical',
        'Batería, masas o alternador',
        40,
        'alta',
        'Eléctrico',
        'Las fallas eléctricas intermitentes casi siempre empiezan por alimentación y masas.',
        ['No hay códigos almacenados.', 'Síntoma: fallas eléctricas intermitentes.'],
        ['Mide la batería.', 'Revisa masas.', 'Comprueba el alternador.'],
        ['battery', 'alternator', 'wiring'],
        'fallas eléctricas intermitentes',
      ),
    )
  }

  return hypotheses
}

const RULES = [
  leanRule,
  richRule,
  misfireRule,
  catalystRule,
  thermostatRule,
  coolantSensorRule,
  iatSensorRule,
  mafRule,
  o2HeaterRule,
  evapRule,
  egrRule,
  turboRule,
  fuelPressureRule,
  dpfRule,
  scrRule,
  throttleRule,
  pedalRule,
  chargingRule,
  transmissionRule,
  communicationRule,
  injectorCircuitRule,
  ignitionCoilRule,
  overheatRule,
  airbagRule,
  absRule,
  vvtRule,
  crankCamRule,
  knockRule,
  generalSymptomsRule,
]

function mergeHypotheses(hypotheses: DiagnosisHypothesis[]): DiagnosisHypothesis[] {
  const map = new Map<string, DiagnosisHypothesis>()
  for (const hypothesis of hypotheses) {
    const existing = map.get(hypothesis.id)
    if (!existing) {
      map.set(hypothesis.id, { ...hypothesis })
      continue
    }
    existing.confidence = clamp(Math.max(existing.confidence, hypothesis.confidence) + 4, 5, 95)
    existing.evidence = [...new Set([...existing.evidence, ...hypothesis.evidence])].slice(0, 6)
    existing.checks = [...new Set([...existing.checks, ...hypothesis.checks])].slice(0, 6)
    existing.components = [...new Set([...existing.components, ...hypothesis.components])]
  }
  return [...map.values()]
}

function normalize(hypotheses: DiagnosisHypothesis[]): DiagnosisHypothesis[] {
  if (hypotheses.length === 0) return []
  const total = hypotheses.reduce((sum, hypothesis) => sum + hypothesis.confidence, 0)
  if (total <= 100) return hypotheses.sort((a, b) => b.confidence - a.confidence)
  return hypotheses
    .map((hypothesis) => ({
      ...hypothesis,
      confidence: clamp((hypothesis.confidence / total) * 100, 8, 95),
    }))
    .sort((a, b) => b.confidence - a.confidence)
}

function buildNotes(ctx: DiagnosisContext): DiagnosisNote[] {
  const notes: DiagnosisNote[] = []
  for (const code of ctx.codes) {
    if (code.brandNote) {
      notes.push({ kind: 'brand', code: code.code, text: code.brandNote })
    }
    if (code.vehicleNote) {
      notes.push({ kind: 'model', code: code.code, text: code.vehicleNote })
    }
  }
  if (!ctx.vehicle.make || !ctx.vehicle.model) {
    notes.push({
      kind: 'data',
      text: 'Configura marca, modelo y año en Vehículo para afinar la interpretación y los enlaces de reparación.',
    })
  }
  if (Object.keys(ctx.snapshot).length === 0) {
    notes.push({
      kind: 'data',
      text: 'No hay datos en vivo en este análisis. Abre Sensores y vuelve a diagnosticar para mejorar la precisión.',
    })
  }
  if (ctx.freezeFrame?.values && Object.keys(ctx.freezeFrame.values).length > 0) {
    notes.push({
      kind: 'data',
      code: ctx.freezeFrame.code ?? undefined,
      text: 'Se incluyó el fotograma congelado del momento en que se detectó el fallo.',
    })
  }
  return notes
}

function buildSafety(ctx: DiagnosisContext, urgency: DiagnosisSeverity): string[] {
  const safety = [
    'Este análisis es orientativo y no sustituye una inspección física ni el manual del fabricante.',
    'Antes de intervenir, desconecta la batería si el procedimiento lo indica y usa gafas de protección.',
  ]
  if (hasSymptom(ctx, 'mil-flashing') || hasCode(ctx, 'P0300', 'P0301', 'P0302', 'P0303', 'P0304')) {
    safety.push('Si el testigo MIL parpadea, detén el motor: un fallo de combustión continuo puede dañar el catalizador.')
  }
  if (urgency === 'critica' || hasSymptom(ctx, 'overheat') || hasCode(ctx, 'P0217')) {
    safety.push('No abras el tapón del refrigerante con el motor caliente. Deja enfriar y usa guantes.')
  }
  if (hasCode(ctx, 'B0001', 'B0010', 'B0020') || hasSymptom(ctx, 'airbag-light')) {
    safety.push('No midas el circuito del airbag con multímetro ni lo alimentes: riesgo de despliegue.')
  }
  if (hasCode(ctx, 'P0087', 'P0088', 'P0093', 'P0094') || hasSymptom(ctx, 'fuel-smell')) {
    safety.push('Trabaja en un lugar ventilado, sin chispas ni cigarrillos. El combustible es inflamable.')
  }
  if (hasCode(ctx, 'P0016', 'P0017')) {
    safety.push('No sigas circulando con un código de correlación: la distribución puede saltar y dañar el motor.')
  }
  return safety
}

function normalizeSeverity(severity: ResolvedDtc['severity']): DiagnosisSeverity {
  return severity === 'info' ? 'baja' : severity
}

export function runLocalDiagnosis(ctx: DiagnosisContext): DiagnosisResult {
  const hypotheses = normalize(mergeHypotheses(RULES.flatMap((rule) => rule(ctx))))
  const maxCodeSeverity = ctx.codes.reduce<DiagnosisSeverity>((max, code) => {
    const severity = normalizeSeverity(code.severity)
    return SEVERITY_RANK[severity] > SEVERITY_RANK[max] ? severity : max
  }, 'baja')
  const maxHypothesisSeverity = hypotheses.reduce<DiagnosisSeverity>((max, hypothesis) => {
    return SEVERITY_RANK[hypothesis.severity] > SEVERITY_RANK[max] ? hypothesis.severity : max
  }, 'baja')
  let urgency: DiagnosisSeverity =
    SEVERITY_RANK[maxCodeSeverity] >= SEVERITY_RANK[maxHypothesisSeverity]
      ? maxCodeSeverity
      : maxHypothesisSeverity
  if (hasSymptom(ctx, 'mil-flashing', 'overheat')) urgency = 'critica'

  const top = hypotheses[0]
  const vehicleName = describeVehicle(ctx.vehicle)
  let summary: string
  if (top) {
    summary = `En ${vehicleName} la prioridad es revisar ${top.title.toLowerCase()}. ${
      ctx.codes.length > 0
        ? `Hay ${ctx.codes.length} código${ctx.codes.length === 1 ? '' : 's'} relacionado${ctx.codes.length === 1 ? '' : 's'}.`
        : 'No hay códigos almacenados, pero los síntomas permiten orientar la revisión.'
    }`
  } else if (ctx.codes.length > 0) {
    summary = `Se detectaron ${ctx.codes.length} códigos, pero no hay una regla local específica. Revisa las notas y usa la segunda opinión de la IA.`
  } else {
    summary =
      'No se detectaron códigos ni síntomas compatibles con una falla concreta. Revisa los sensores en vivo y vuelve a leer los códigos después de un ciclo de conducción.'
  }

  return {
    summary,
    urgency,
    safety: buildSafety(ctx, urgency),
    hypotheses: hypotheses.slice(0, 6),
    notes: buildNotes(ctx),
    source: 'local',
    generatedAt: Date.now(),
    freezeFrame: ctx.freezeFrame,
  }
}

export function allComponentsFromCodes(codes: ResolvedDtc[]): string[] {
  return [...new Set(codes.flatMap((code) => code.components))]
}
