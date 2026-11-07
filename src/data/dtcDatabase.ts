import { findVehicleNote } from './vehicleIssues'

export type DtcSeverity = 'info' | 'baja' | 'media' | 'alta' | 'critica'

export type DtcSystem =
  | 'Motor'
  | 'Admisión'
  | 'Combustible'
  | 'Encendido'
  | 'Emisiones'
  | 'Refrigeración'
  | 'Eléctrico'
  | 'Transmisión'
  | 'ABS'
  | 'Airbag'
  | 'Red CAN'
  | 'Carrocería'

export interface DtcInfo {
  code: string
  title: string
  system: DtcSystem
  severity: DtcSeverity
  description: string
  symptoms: string[]
  causes: string[]
  checks: string[]
  components: string[]
  ifixQuery: string
  brandNotes?: Record<string, string>
  generic: boolean
}

export interface ResolvedDtc extends DtcInfo {
  brandNote?: string
  vehicleNote?: string
}

type DtcSeed = Omit<DtcInfo, 'code' | 'generic'>
type Entry = [string, DtcSeed]

const entries: Entry[] = []

function d(
  code: string,
  title: string,
  system: DtcSystem,
  severity: DtcSeverity,
  description: string,
  symptoms: string[],
  causes: string[],
  checks: string[],
  components: string[],
  ifixQuery: string,
  brandNotes?: Record<string, string>,
): void {
  entries.push([
    code,
    {
      title,
      system,
      severity,
      description,
      symptoms,
      causes,
      checks,
      components,
      ifixQuery,
      brandNotes,
    },
  ])
}

d(
  'P0010',
  'Circuito del solenoide de control del árbol de levas (banco 1)',
  'Motor',
  'media',
  'La ECU detecta un problema eléctrico en el circuito del solenoide de sincronización variable (VVT/VCT).',
  ['Ralentí inestable', 'Pérdida de potencia', 'Consumo alto', 'Testigo MIL encendido'],
  ['Solenoide VVT defectuoso', 'Aceite sucio o bajo', 'Cableado o conector dañado', 'Malla del solenoide obstruida'],
  ['Revisar nivel y estado del aceite', 'Medir resistencia del solenoide', 'Inspeccionar el conector y el arnés'],
  ['vvt-solenoid', 'oil-change', 'wiring'],
  'solenoide VVT árbol de levas',
)

d(
  'P0011',
  'Sincronización del árbol de levas fuera de rango (banco 1)',
  'Motor',
  'alta',
  'La posición real del árbol de levas no coincide con la que pide la ECU. Puede afectar la potencia y la mezcla.',
  ['Ralentí áspero', 'Pérdida de potencia', 'Arranque difícil', 'Consumo elevado'],
  ['Solenoide VVT obstruido', 'Aceite sucio o con baja presión', 'Cadena o tensor de distribución desgastado', 'Sensor de posición del árbol de levas'],
  ['Revisar aceite y presión', 'Probar el solenoide VVT', 'Verificar la sincronización de la cadena'],
  ['vvt-solenoid', 'oil-change', 'camshaft-sensor', 'timing-chain'],
  'solenoide VVT sincronización',
  {
    Toyota: 'Revisa aceite y el solenoide VVT; en motores con cadena revisa el tensor.',
    Honda: 'Revisa el solenoide VTC y el nivel de aceite.',
    BMW: 'Revisa el solenoide VANOS y el estado del aceite.',
    Volkswagen: 'Revisa la cadena y el tensor de distribución; es un fallo frecuente.',
  },
)

d(
  'P0012',
  'Sincronización del árbol de levas excesivamente retrasada (banco 1)',
  'Motor',
  'media',
  'La ECU no puede adelantar el árbol de levas como espera. Suele relacionarse con el sistema VVT.',
  ['Ralentí inestable', 'Pérdida de potencia', 'Consumo alto'],
  ['Aceite sucio', 'Solenoide VVT pegajoso', 'Cadena desgastada', 'Baja presión de aceite'],
  ['Cambiar aceite y filtro', 'Limpiar o sustituir el solenoide VVT', 'Comprobar la sincronización'],
  ['vvt-solenoid', 'oil-change', 'timing-chain'],
  'árbol de levas retrasado VVT',
)

d(
  'P0016',
  'Correlación entre cigüeñal y árbol de levas (banco 1)',
  'Motor',
  'critica',
  'La ECU detecta que el cigüeñal y el árbol de levas no están sincronizados. Puede impedir el arranque o dañar el motor.',
  ['No arranca', 'Arranca y se apaga', 'Ruido de cadena', 'Pérdida de potencia'],
  ['Cadena o correa de distribución saltada', 'Tensor desgastado', 'Sensor de cigüeñal o árbol de levas', 'Rueda fónica dañada'],
  ['No seguir circulando', 'Verificar la sincronización con las marcas', 'Revisar sensores y ruedas fónicas'],
  ['timing-chain', 'crankshaft-sensor', 'camshaft-sensor'],
  'correlación cigüeñal árbol de levas',
  {
    Toyota: 'Revisa la cadena y el tensor; no circule si el motor perdió sincronización.',
    Volkswagen: 'Revisa la cadena y el tensor; en TSI es una falla conocida.',
    BMW: 'Revisa la cadena y el sistema VANOS.',
  },
)

d(
  'P0017',
  'Correlación entre cigüeñal y árbol de levas (banco 2)',
  'Motor',
  'critica',
  'La sincronización del banco 2 no coincide. Aplica a motores en V o con dos árboles de levas.',
  ['No arranca', 'Marcha irregular', 'Ruido en la distribución'],
  ['Cadena saltada', 'Tensor desgastado', 'Sensor de árbol de levas del banco 2'],
  ['Revisar la sincronización', 'Inspeccionar sensores y cableado'],
  ['timing-chain', 'camshaft-sensor'],
  'correlación cigüeñal árbol de levas banco 2',
)

d(
  'P0031',
  'Calentador de la sonda O2 bajo (banco 1, sensor 1)',
  'Emisiones',
  'media',
  'El circuito del calentador de la sonda lambda delantera no alcanza la corriente esperada.',
  ['Testigo MIL', 'Consumo alto', 'Mezcla pobre o rica', 'Olor a gasolina'],
  ['Sonda O2 defectuosa', 'Fusible quemado', 'Cableado abierto', 'Relé del calentador'],
  ['Revisar fusible y relé', 'Medir resistencia del calentador', 'Inspeccionar el conector'],
  ['o2-sensor', 'wiring'],
  'calentador sonda O2 banco 1 sensor 1',
)

d(
  'P0037',
  'Calentador de la sonda O2 bajo (banco 1, sensor 2)',
  'Emisiones',
  'media',
  'El calentador de la sonda posterior no funciona correctamente.',
  ['Testigo MIL', 'Lecturas erráticas de la sonda posterior'],
  ['Sonda O2 posterior defectuosa', 'Fusible', 'Cableado'],
  ['Revisar fusible', 'Medir resistencia', 'Inspeccionar el conector'],
  ['o2-sensor', 'wiring'],
  'calentador sonda O2 banco 1 sensor 2',
)

d(
  'P0051',
  'Calentador de la sonda O2 bajo (banco 2, sensor 1)',
  'Emisiones',
  'media',
  'El calentador de la sonda delantera del banco 2 no alcanza la corriente esperada.',
  ['Testigo MIL', 'Mezcla incorrecta en el banco 2'],
  ['Sonda O2 defectuosa', 'Fusible', 'Cableado'],
  ['Revisar fusible', 'Medir resistencia', 'Inspeccionar el conector'],
  ['o2-sensor', 'wiring'],
  'calentador sonda O2 banco 2 sensor 1',
)

d(
  'P0087',
  'Presión de combustible demasiado baja',
  'Combustible',
  'alta',
  'La presión del riel de combustible está por debajo de lo que necesita el motor.',
  ['Pérdida de potencia', 'Arranque difícil', 'Fallo al acelerar', 'Motor que se apaga'],
  ['Filtro de combustible obstruido', 'Bomba de baja o alta presión', 'Válvula de control de presión', 'Fuga en el sistema'],
  ['Medir presión de combustible', 'Revisar filtro y bomba', 'Comprobar el sensor de presión del riel'],
  ['fuel-pump', 'fuel-filter', 'fuel-pressure-regulator'],
  'presión de combustible baja',
  {
    Toyota: 'En Hilux diésel revisa el filtro y la válvula SCV.',
    'RAM': 'En diésel Cummins revisa el filtro y la bomba de alta presión.',
    Ford: 'En Ranger diésel revisa la válvula SCV y el filtro.',
  },
)

d(
  'P0088',
  'Presión de combustible demasiado alta',
  'Combustible',
  'alta',
  'La presión del riel supera el máximo esperado. Puede dañar inyectores y sellos.',
  ['Humo negro', 'Olor a combustible', 'Fallo de inyectores', 'Consumo alto'],
  ['Regulador de presión atascado', 'Sensor de presión defectuoso', 'Restricción en el retorno', 'Bomba de alta presión'],
  ['Medir presión real con manómetro', 'Revisar el regulador', 'Comprobar el retorno'],
  ['fuel-pressure-regulator', 'fuel-pump', 'injectors'],
  'presión de combustible alta',
)

d(
  'P0093',
  'Fuga en el sistema de combustible de alta presión',
  'Combustible',
  'critica',
  'La ECU detecta una caída brusca de presión compatible con una fuga en el sistema de alta presión.',
  ['Pérdida de potencia repentina', 'Olor a diésel', 'Arranque difícil', 'Humo'],
  ['Fuga en tubería de alta presión', 'Válvula SCV desgastada', 'Inyector que no cierra', 'Bomba de alta presión'],
  ['No seguir circulando', 'Revisar fugas visibles', 'Probar el retorno de inyectores'],
  ['fuel-pump', 'injectors', 'fuel-filter'],
  'fuga alta presión diésel',
  {
    Toyota: 'En Hilux revisa la válvula SCV y el retorno de inyectores.',
    'RAM': 'Revisa la bomba de alta presión y las tuberías.',
  },
)

d(
  'P0094',
  'Fuga pequeña en el sistema de combustible de alta presión',
  'Combustible',
  'alta',
  'La ECU detecta una pérdida de presión menor, compatible con una fuga o desgaste interno.',
  ['Pérdida de potencia', 'Arranque difícil', 'Consumo alto'],
  ['Válvula SCV', 'Inyector desgastado', 'Tubería con fuga'],
  ['Revisar retorno de inyectores', 'Probar la válvula SCV', 'Inspeccionar tuberías'],
  ['injectors', 'fuel-pump'],
  'fuga presión combustible',
)

d(
  'P0101',
  'Rango o rendimiento del sensor MAF',
  'Admisión',
  'media',
  'El caudalímetro entrega una señal que no corresponde al régimen y a la carga del motor.',
  ['Ralentí inestable', 'Pérdida de potencia', 'Consumo alto', 'Mezcla pobre'],
  ['MAF sucio', 'Fuga de admisión', 'Filtro de aire obstruido', 'Cableado o conector'],
  ['Limpiar el MAF con limpiador específico', 'Revisar fugas de admisión', 'Comparar g/s en ralentí'],
  ['maf-sensor', 'air-filter', 'vacuum-hoses'],
  'limpiar sensor MAF',
  {
    Toyota: 'Revisa el MAF y las mangueras de admisión.',
    Nissan: 'Limpia el MAF y el cuerpo de aceleración.',
    Volkswagen: 'Revisa la válvula PCV y el tubo de admisión.',
  },
)

d(
  'P0102',
  'Señal baja del sensor MAF',
  'Admisión',
  'media',
  'La señal del caudalímetro está por debajo del mínimo esperado.',
  ['Motor que se apaga', 'Ralentí bajo', 'Mezcla pobre', 'Pérdida de potencia'],
  ['MAF defectuoso', 'Cableado abierto', 'Conector suelto', 'Filtro muy obstruido'],
  ['Medir alimentación y señal', 'Revisar el conector', 'Probar con un MAF conocido'],
  ['maf-sensor', 'wiring', 'air-filter'],
  'sensor MAF señal baja',
)

d(
  'P0103',
  'Señal alta del sensor MAF',
  'Admisión',
  'media',
  'La señal del caudalímetro supera el máximo esperado.',
  ['Mezcla rica', 'Humo negro', 'Consumo alto', 'Ralentí inestable'],
  ['MAF defectuoso', 'Cortocircuito en la señal', 'Tubo de admisión obstruido'],
  ['Medir la señal', 'Revisar el cableado', 'Comprobar la admisión'],
  ['maf-sensor', 'wiring'],
  'sensor MAF señal alta',
)

d(
  'P0112',
  'Señal baja del sensor de temperatura de admisión (IAT)',
  'Admisión',
  'baja',
  'La ECU recibe una temperatura de aire demasiado baja, a menudo por un cortocircuito.',
  ['Consumo alto', 'Mezcla rica', 'Testigo MIL'],
  ['Sensor IAT defectuoso', 'Cortocircuito a masa', 'Conector con humedad'],
  ['Medir resistencia del sensor', 'Revisar el conector', 'Comparar con temperatura ambiente'],
  ['iat-sensor', 'wiring'],
  'sensor IAT señal baja',
)

d(
  'P0113',
  'Señal alta del sensor de temperatura de admisión (IAT)',
  'Admisión',
  'baja',
  'La ECU recibe una temperatura de aire fuera de rango, normalmente por circuito abierto.',
  ['Mezcla pobre', 'Consumo alto', 'Testigo MIL'],
  ['Sensor IAT defectuoso', 'Circuito abierto', 'Conector suelto'],
  ['Medir resistencia', 'Revisar continuidad', 'Sustituir el sensor si está fuera de rango'],
  ['iat-sensor', 'wiring'],
  'sensor IAT señal alta',
)

d(
  'P0117',
  'Señal baja del sensor de temperatura del refrigerante (ECT)',
  'Refrigeración',
  'alta',
  'La ECU lee una temperatura de refrigerante demasiado baja, a menudo por cortocircuito.',
  ['Ventilador siempre encendido', 'Consumo alto', 'Mezcla rica', 'Testigo MIL'],
  ['Sensor ECT defectuoso', 'Cortocircuito', 'Conector con agua'],
  ['Medir resistencia en frío y caliente', 'Revisar el conector', 'Comparar con un termómetro'],
  ['coolant-temp-sensor', 'wiring'],
  'sensor temperatura refrigerante señal baja',
)

d(
  'P0118',
  'Señal alta del sensor de temperatura del refrigerante (ECT)',
  'Refrigeración',
  'alta',
  'La ECU lee una temperatura fuera de rango, normalmente por circuito abierto.',
  ['Sobrecalentamiento indicado', 'Ventilador no enciende', 'Consumo alto'],
  ['Sensor ECT defectuoso', 'Circuito abierto', 'Conector suelto'],
  ['Medir resistencia', 'Revisar continuidad', 'Sustituir el sensor si es necesario'],
  ['coolant-temp-sensor', 'wiring'],
  'sensor temperatura refrigerante señal alta',
)

d(
  'P0121',
  'Rango o rendimiento del sensor de posición de la mariposa',
  'Admisión',
  'media',
  'La señal del TPS no es coherente con la posición esperada del acelerador.',
  ['Ralentí inestable', 'Aceleración irregular', 'Pérdida de potencia'],
  ['Cuerpo de aceleración sucio', 'TPS defectuoso', 'Cableado', 'Adaptación borrada'],
  ['Limpiar el cuerpo de aceleración', 'Revisar la señal del TPS', 'Hacer adaptación con escáner'],
  ['throttle-body', 'wiring'],
  'sensor posición mariposa',
)

d(
  'P0125',
  'Temperatura insuficiente para el lazo cerrado',
  'Refrigeración',
  'media',
  'El motor tarda demasiado en alcanzar la temperatura de lazo cerrado.',
  ['Consumo alto', 'Calefacción débil', 'Testigo MIL'],
  ['Termostato atascado abierto', 'Sensor ECT', 'Bajo nivel de refrigerante'],
  ['Revisar el termostato', 'Comprobar el nivel de refrigerante', 'Verificar el sensor ECT'],
  ['thermostat', 'coolant', 'coolant-temp-sensor'],
  'termostato atascado abierto',
)

d(
  'P0128',
  'Temperatura del refrigerante por debajo del termostato',
  'Refrigeración',
  'media',
  'El motor no alcanza la temperatura de funcionamiento en el tiempo esperado. Casi siempre apunta al termostato.',
  ['Calefacción débil', 'Consumo alto', 'Temperatura baja en el tablero'],
  ['Termostato atascado abierto', 'Sensor ECT descalibrado', 'Bajo nivel de refrigerante', 'Ventilador siempre encendido'],
  ['Comparar temperatura real con la del escáner', 'Revisar el termostato', 'Comprobar el nivel de refrigerante'],
  ['thermostat', 'coolant-temp-sensor', 'coolant'],
  'termostato motor',
  {
    Toyota: 'Termostato atascado abierto; revisa también el sensor ECT.',
    Honda: 'Termostato y sensor ECT son los sospechosos habituales.',
    Chevrolet: 'Termostato; revisa el nivel de refrigerante.',
    Ford: 'Termostato; comprueba la temperatura real.',
  },
)

d(
  'P0131',
  'Señal baja de la sonda O2 (banco 1, sensor 1)',
  'Emisiones',
  'media',
  'La sonda lambda delantera indica una mezcla permanentemente pobre o un circuito con problemas.',
  ['Mezcla pobre', 'Consumo alto', 'Ralentí inestable', 'Testigo MIL'],
  ['Sonda O2 defectuosa', 'Fuga de vacío', 'Presión de combustible baja', 'Cableado'],
  ['Revisar fugas de vacío', 'Medir la señal de la sonda', 'Comprobar la presión de combustible'],
  ['o2-sensor', 'vacuum-hoses', 'fuel-pump'],
  'sonda O2 señal baja banco 1',
)

d(
  'P0133',
  'Respuesta lenta de la sonda O2 (banco 1, sensor 1)',
  'Emisiones',
  'media',
  'La sonda delantera tarda demasiado en cambiar de señal. Suele estar envejecida o contaminada.',
  ['Consumo alto', 'Mezcla irregular', 'Testigo MIL'],
  ['Sonda O2 envejecida', 'Fugas de admisión', 'Contaminación por aceite o refrigerante'],
  ['Observar la onda de la sonda', 'Revisar fugas', 'Sustituir la sonda si la respuesta es lenta'],
  ['o2-sensor', 'vacuum-hoses'],
  'sonda O2 respuesta lenta',
)

d(
  'P0135',
  'Calentador de la sonda O2 (banco 1, sensor 1)',
  'Emisiones',
  'media',
  'El calentador de la sonda delantera no funciona correctamente.',
  ['Testigo MIL', 'Mezcla incorrecta al arrancar', 'Consumo alto'],
  ['Sonda O2 defectuosa', 'Fusible', 'Relé', 'Cableado'],
  ['Revisar fusible y relé', 'Medir resistencia del calentador', 'Inspeccionar el conector'],
  ['o2-sensor', 'wiring'],
  'calentador sonda O2',
)

d(
  'P0137',
  'Señal baja de la sonda O2 (banco 1, sensor 2)',
  'Emisiones',
  'media',
  'La sonda posterior indica una señal baja o un circuito con problemas.',
  ['Testigo MIL', 'Lecturas erráticas del catalizador'],
  ['Sonda posterior defectuosa', 'Cableado', 'Fuga de escape'],
  ['Revisar la señal', 'Inspeccionar el escape', 'Comprobar el conector'],
  ['o2-sensor', 'exhaust'],
  'sonda O2 posterior señal baja',
)

d(
  'P0141',
  'Calentador de la sonda O2 (banco 1, sensor 2)',
  'Emisiones',
  'media',
  'El calentador de la sonda posterior no funciona correctamente.',
  ['Testigo MIL', 'Lecturas lentas de la sonda posterior'],
  ['Sonda defectuosa', 'Fusible', 'Cableado'],
  ['Revisar fusible', 'Medir resistencia', 'Inspeccionar el conector'],
  ['o2-sensor', 'wiring'],
  'calentador sonda O2 posterior',
)

d(
  'P0151',
  'Señal baja de la sonda O2 (banco 2, sensor 1)',
  'Emisiones',
  'media',
  'La sonda delantera del banco 2 indica mezcla pobre o un circuito defectuoso.',
  ['Mezcla pobre en banco 2', 'Consumo alto', 'Testigo MIL'],
  ['Sonda O2', 'Fuga de vacío', 'Presión de combustible'],
  ['Revisar fugas', 'Medir la señal', 'Comprobar presión'],
  ['o2-sensor', 'vacuum-hoses', 'fuel-pump'],
  'sonda O2 banco 2 señal baja',
)

d(
  'P0155',
  'Calentador de la sonda O2 (banco 2, sensor 1)',
  'Emisiones',
  'media',
  'El calentador de la sonda delantera del banco 2 no funciona.',
  ['Testigo MIL', 'Mezcla incorrecta en banco 2'],
  ['Sonda defectuosa', 'Fusible', 'Cableado'],
  ['Revisar fusible', 'Medir resistencia', 'Inspeccionar conector'],
  ['o2-sensor', 'wiring'],
  'calentador sonda O2 banco 2',
)

d(
  'P0161',
  'Calentador de la sonda O2 (banco 2, sensor 2)',
  'Emisiones',
  'media',
  'El calentador de la sonda posterior del banco 2 no funciona.',
  ['Testigo MIL', 'Lecturas erráticas'],
  ['Sonda defectuosa', 'Fusible', 'Cableado'],
  ['Revisar fusible', 'Medir resistencia', 'Inspeccionar conector'],
  ['o2-sensor', 'wiring'],
  'calentador sonda O2 posterior banco 2',
)

d(
  'P0171',
  'Mezcla demasiado pobre (banco 1)',
  'Combustible',
  'alta',
  'La ECU tiene que añadir combustible porque detecta exceso de aire o falta de combustible en el banco 1.',
  ['Ralentí inestable', 'Pérdida de potencia', 'Consumo alto', 'Tironeo', 'Olor a gasolina'],
  ['Fuga de vacío', 'MAF sucio o defectuoso', 'Presión de combustible baja', 'Inyectores obstruidos', 'Fuga en el escape antes de la sonda'],
  ['Buscar fugas de vacío con humo', 'Revisar MAF en g/s', 'Medir presión de combustible', 'Revisar ajustes de combustible'],
  ['vacuum-hoses', 'maf-sensor', 'intake-gasket', 'fuel-pump', 'injectors'],
  'mezcla pobre fuga de vacío',
  {
    Toyota: 'Revisa la junta del colector de admisión, el tubo de PCV y el MAF.',
    Honda: 'Revisa el tubo de admisión agrietado y el MAF.',
    Nissan: 'Revisa el MAF y limpia el cuerpo de aceleración.',
    Chevrolet: 'Revisa la válvula PCV y la tapa de válvulas; en Aveo/Cruze es común.',
    Ford: 'Revisa mangueras de vacío y la válvula IAC; en Focus revisa el tubo de admisión.',
    Volkswagen: 'Revisa la membrana PCV y el tubo de admisión; es una falla frecuente en TSI.',
    Mazda: 'Revisa el MAF y las mangueras de admisión.',
    Hyundai: 'Revisa mangueras de vacío y el MAF.',
    Kia: 'Revisa mangueras de vacío y el MAF.',
  },
)

d(
  'P0172',
  'Mezcla demasiado rica (banco 1)',
  'Combustible',
  'alta',
  'La ECU reduce combustible porque detecta exceso de combustible o falta de aire en el banco 1.',
  ['Humo negro', 'Olor a gasolina', 'Consumo alto', 'Ralentí inestable', 'Bujías negras'],
  ['Inyector que gotea', 'Presión de combustible alta', 'MAF que sobreestima el aire', 'Filtro de aire obstruido', 'Válvula de purga EVAP atascada'],
  ['Revisar inyectores', 'Medir presión de combustible', 'Revisar el MAF', 'Comprobar la purga EVAP'],
  ['injectors', 'fuel-pressure-regulator', 'maf-sensor', 'evap-purge-valve'],
  'mezcla rica inyector',
)

d(
  'P0174',
  'Mezcla demasiado pobre (banco 2)',
  'Combustible',
  'alta',
  'El banco 2 recibe demasiado aire o poco combustible.',
  ['Ralentí inestable', 'Pérdida de potencia', 'Consumo alto', 'Tironeo'],
  ['Fuga de vacío en banco 2', 'MAF', 'Presión de combustible', 'Inyectores'],
  ['Buscar fugas con humo', 'Revisar MAF', 'Medir presión'],
  ['vacuum-hoses', 'maf-sensor', 'fuel-pump', 'injectors'],
  'mezcla pobre banco 2',
)

d(
  'P0175',
  'Mezcla demasiado rica (banco 2)',
  'Combustible',
  'alta',
  'El banco 2 recibe demasiado combustible o poco aire.',
  ['Humo negro', 'Olor a gasolina', 'Consumo alto'],
  ['Inyector que gotea', 'Presión alta', 'MAF', 'Purga EVAP'],
  ['Revisar inyectores', 'Medir presión', 'Revisar MAF y purga'],
  ['injectors', 'fuel-pressure-regulator', 'maf-sensor', 'evap-purge-valve'],
  'mezcla rica banco 2',
)

for (let cylinder = 1; cylinder <= 8; cylinder += 1) {
  d(
    `P020${cylinder}`,
    `Circuito del inyector del cilindro ${cylinder}`,
    'Combustible',
    'alta',
    `La ECU detecta un problema eléctrico en el inyector del cilindro ${cylinder}.`,
    ['Fallo de combustión', 'Ralentí inestable', 'Pérdida de potencia', 'Olor a gasolina'],
    ['Inyector defectuoso', 'Conector o cableado', 'ECU', 'Inyector obstruido'],
    ['Medir resistencia del inyector', 'Probar pulsos con lámpara', 'Inspeccionar el conector'],
    ['injectors', 'wiring'],
    `inyector cilindro ${cylinder}`,
  )
}

d(
  'P0217',
  'Sobrecalentamiento del motor',
  'Refrigeración',
  'critica',
  'La temperatura del refrigerante superó el límite seguro. Detén el motor para evitar daños graves.',
  ['Temperatura alta', 'Vapor', 'Pérdida de refrigerante', 'Olor dulce', 'Motor que se apaga'],
  ['Bajo nivel de refrigerante', 'Termostato cerrado', 'Ventilador defectuoso', 'Bomba de agua', 'Junta de culata'],
  ['Detener el motor y dejar enfriar', 'Revisar nivel y fugas', 'Comprobar el ventilador y el termostato', 'Hacer prueba de gases en el refrigerante'],
  ['coolant', 'thermostat', 'radiator-fan', 'water-pump', 'head-gasket'],
  'sobrecalentamiento motor',
)

d(
  'P0234',
  'Sobrepresión del turbo',
  'Admisión',
  'alta',
  'El turbo genera más presión de la que pide la ECU. Puede dañar el motor.',
  ['Pérdida de potencia', 'Corte de inyección', 'Humo negro', 'Testigo MIL'],
  ['Wastegate atascada', 'Solenoide de control de turbo', 'Sensor de presión', 'Modificación de software'],
  ['Revisar el wastegate', 'Probar el solenoide', 'Comparar presión real con la solicitada'],
  ['turbo-wastegate', 'boost-control-solenoid', 'intercooler'],
  'sobrepresión turbo wastegate',
)

d(
  'P0299',
  'Baja presión del turbo',
  'Admisión',
  'alta',
  'El turbo no alcanza la presión esperada. Se nota como falta de potencia.',
  ['Pérdida de potencia', 'Silbido', 'Humo negro', 'Testigo MIL'],
  ['Fuga en intercooler o mangueras', 'Wastegate o válvula de descarga', 'Turbo desgastado', 'Sensor de presión'],
  ['Revisar fugas de admisión', 'Probar el wastegate', 'Medir presión de turbo'],
  ['turbo-wastegate', 'intercooler', 'boost-control-solenoid'],
  'baja presión turbo',
  {
    Volkswagen: 'Revisa la válvula de descarga y las fugas del intercooler.',
    Chevrolet: 'Revisa el solenoide de control del turbo y las mangueras.',
    Ford: 'Revisa mangueras de intercooler y el wastegate.',
  },
)

d(
  'P0300',
  'Fallo de combustión aleatorio o múltiple',
  'Encendido',
  'critica',
  'La ECU detecta fallos de combustión en varios cilindros. Si el testigo parpadea, puede dañar el catalizador.',
  ['Ralentí áspero', 'Tironeo', 'Pérdida de potencia', 'Testigo MIL parpadeando', 'Olor a gasolina'],
  ['Bujías o bobinas desgastadas', 'Fuga de vacío', 'Presión de combustible', 'Inyectores', 'Compresión baja', 'Combustible de mala calidad'],
  ['No exigir el motor si el testigo parpadea', 'Revisar bujías y bobinas', 'Buscar fugas de vacío', 'Medir compresión'],
  ['spark-plugs', 'ignition-coils', 'injectors', 'compression', 'vacuum-hoses'],
  'fallo de combustión múltiple',
  {
    Toyota: 'Revisa bujías, bobinas y la junta de la tapa de válvulas.',
    Honda: 'Revisa bujías y bobinas; una EGR obstruida también causa fallos.',
    Nissan: 'Revisa bujías, bobinas y el MAF.',
    Chevrolet: 'Revisa bujías, bobinas y la compresión.',
    Ford: 'Revisa bujías, cables y bobinas.',
    Volkswagen: 'Revisa bujías y bobinas; en TSI revisa la cadena.',
  },
)

for (let cylinder = 1; cylinder <= 8; cylinder += 1) {
  d(
    `P030${cylinder}`,
    `Fallo de combustión en el cilindro ${cylinder}`,
    'Encendido',
    'alta',
    `La ECU detecta fallos de combustión repetidos en el cilindro ${cylinder}.`,
    ['Tironeo', 'Ralentí inestable', 'Pérdida de potencia', 'Olor a gasolina'],
    ['Bujía o bobina', 'Inyector', 'Fuga de vacío cercana', 'Compresión baja', 'Cableado'],
    ['Intercambiar bobina con otro cilindro', 'Revisar la bujía', 'Probar el inyector', 'Medir compresión'],
    ['spark-plugs', 'ignition-coils', 'injectors', 'compression'],
    `fallo cilindro ${cylinder}`,
  )
}

d(
  'P0325',
  'Circuito del sensor de detonación (banco 1)',
  'Encendido',
  'media',
  'El sensor de detonación no entrega una señal válida. La ECU puede retrasar el encendido por seguridad.',
  ['Pérdida de potencia', 'Consumo alto', 'Cascabeleo', 'Testigo MIL'],
  ['Sensor de detonación', 'Cableado', 'Conector', 'Montaje flojo'],
  ['Revisar el conector', 'Medir la señal', 'Comprobar el par de apriete'],
  ['knock-sensor', 'wiring'],
  'sensor de detonación',
)

d(
  'P0335',
  'Circuito del sensor de posición del cigüeñal',
  'Encendido',
  'critica',
  'La ECU no recibe una señal válida del cigüeñal. El motor puede no arrancar.',
  ['No arranca', 'Se apaga de repente', 'Arranque difícil', 'Cuentarrevoluciones a cero'],
  ['Sensor de cigüeñal', 'Rueda fónica dañada', 'Cableado', 'Conector'],
  ['Revisar la señal con osciloscopio', 'Inspeccionar la rueda fónica', 'Comprobar el conector'],
  ['crankshaft-sensor', 'wiring'],
  'sensor cigüeñal',
)

d(
  'P0340',
  'Circuito del sensor de posición del árbol de levas',
  'Encendido',
  'alta',
  'La ECU no recibe una señal válida del árbol de levas.',
  ['Arranque difícil', 'Pérdida de potencia', 'Ralentí inestable', 'Testigo MIL'],
  ['Sensor de árbol de levas', 'Cableado', 'Rueda fónica', 'Sincronización'],
  ['Revisar el conector', 'Medir la señal', 'Comprobar la sincronización'],
  ['camshaft-sensor', 'wiring', 'timing-chain'],
  'sensor árbol de levas',
)

d(
  'P0341',
  'Rango de rendimiento del sensor del árbol de levas',
  'Encendido',
  'alta',
  'La señal del árbol de levas existe pero no es coherente con el régimen del motor.',
  ['Arranque difícil', 'Pérdida de potencia', 'Testigo MIL'],
  ['Sensor desgastado', 'Rueda fónica', 'Sincronización', 'Cableado'],
  ['Comparar señales de cigüeñal y árbol', 'Revisar la rueda fónica', 'Verificar la sincronización'],
  ['camshaft-sensor', 'timing-chain', 'wiring'],
  'sensor árbol de levas rango',
)

for (let cylinder = 1; cylinder <= 8; cylinder += 1) {
  d(
    `P035${cylinder}`,
    `Bobina de encendido del cilindro ${cylinder}`,
    'Encendido',
    'alta',
    `La ECU detecta un problema en el circuito primario de la bobina del cilindro ${cylinder}.`,
    ['Fallo de combustión', 'Tironeo', 'Ralentí inestable', 'Testigo MIL'],
    ['Bobina defectuosa', 'Bujía desgastada', 'Cableado', 'ECU'],
    ['Intercambiar la bobina', 'Revisar la bujía', 'Medir el primario y el secundario'],
    ['ignition-coils', 'spark-plugs', 'wiring'],
    `bobina encendido cilindro ${cylinder}`,
  )
}

d(
  'P0401',
  'Flujo insuficiente de la válvula EGR',
  'Emisiones',
  'media',
  'La ECU no detecta el flujo esperado de gases recirculados.',
  ['Ralentí inestable', 'Cascabeleo', 'Pérdida de potencia', 'Testigo MIL'],
  ['Válvula EGR obstruida por carbonilla', 'Sensor DPFE', 'Mangueras tapadas', 'Solenoide EGR'],
  ['Desmontar y limpiar la EGR', 'Revisar el sensor DPFE', 'Comprobar las mangueras'],
  ['egr-valve', 'wiring'],
  'limpiar válvula EGR',
  {
    Ford: 'Revisa la válvula EGR y el sensor DPFE; la carbonilla es habitual.',
    Honda: 'Una EGR obstruida también puede causar fallos de combustión.',
  },
)

d(
  'P0402',
  'Flujo excesivo de la válvula EGR',
  'Emisiones',
  'media',
  'La válvula EGR deja pasar más gases de los esperados, empobreciendo la mezcla.',
  ['Ralentí inestable', 'Motor que se apaga', 'Tironeo', 'Testigo MIL'],
  ['Válvula EGR atascada abierta', 'Sensor DPFE', 'Mangueras'],
  ['Revisar la válvula EGR', 'Comprobar el sensor DPFE', 'Inspeccionar las mangueras'],
  ['egr-valve', 'wiring'],
  'válvula EGR atascada',
)

d(
  'P0403',
  'Circuito de la válvula EGR',
  'Emisiones',
  'media',
  'La ECU detecta un fallo eléctrico en el circuito de control de la EGR.',
  ['Testigo MIL', 'Ralentí inestable', 'Pérdida de potencia'],
  ['Solenoide EGR', 'Cableado', 'Conector', 'ECU'],
  ['Medir la resistencia del solenoide', 'Revisar el conector', 'Comprobar la alimentación'],
  ['egr-valve', 'wiring'],
  'circuito válvula EGR',
)

d(
  'P0420',
  'Eficiencia del catalizador por debajo del umbral (banco 1)',
  'Emisiones',
  'media',
  'La ECU compara las sondas O2 delantera y posterior y concluye que el catalizador no está limpiando bien.',
  ['Testigo MIL', 'Olor a huevo podrido', 'Consumo alto', 'Pérdida de potencia'],
  ['Catalizador desgastado', 'Sonda O2 posterior', 'Fugas de escape', 'Fallo de combustión o mezcla rica que dañó el catalizador', 'Consumo de aceite'],
  ['Revisar fugas de escape', 'Comparar las dos sondas O2', 'Corregir antes cualquier fallo de mezcla o combustión', 'Revisar el consumo de aceite'],
  ['catalytic-converter', 'o2-sensor', 'exhaust', 'spark-plugs'],
  'catalizador sonda O2',
  {
    Toyota: 'Revisa el catalizador y la sonda posterior; el consumo de aceite acelera el desgaste.',
    Honda: 'Revisa la sonda posterior y el catalizador; el consumo de aceite es un factor.',
    Nissan: 'Revisa fugas de escape y la sonda posterior.',
    Chevrolet: 'Revisa el catalizador y la sonda posterior.',
    Ford: 'Revisa la sonda posterior y fugas de escape.',
    Volkswagen: 'Revisa el catalizador y la sonda posterior.',
    Mazda: 'Revisa la sonda posterior y el catalizador.',
    Hyundai: 'Revisa la sonda posterior y el catalizador.',
  },
)

d(
  'P0430',
  'Eficiencia del catalizador por debajo del umbral (banco 2)',
  'Emisiones',
  'media',
  'El catalizador del banco 2 no alcanza la eficiencia esperada.',
  ['Testigo MIL', 'Olor a huevo podrido', 'Consumo alto'],
  ['Catalizador desgastado', 'Sonda O2 posterior', 'Fugas de escape', 'Mezcla incorrecta'],
  ['Revisar fugas', 'Comparar sondas', 'Corregir mezcla antes de cambiar el catalizador'],
  ['catalytic-converter', 'o2-sensor', 'exhaust'],
  'catalizador banco 2',
)

d(
  'P0440',
  'Fallo del sistema de control de vapores EVAP',
  'Emisiones',
  'baja',
  'El sistema EVAP no mantiene la presión esperada. Puede ser tan simple como el tapón de combustible.',
  ['Olor a gasolina', 'Testigo MIL', 'Dificultad para cargar combustible'],
  ['Tapón de combustible', 'Manguera EVAP', 'Válvula de purga', 'Válvula de venteo', 'Depósito'],
  ['Revisar el tapón', 'Inspeccionar mangueras', 'Hacer prueba de humo en el EVAP'],
  ['gas-cap', 'evap-purge-valve', 'evap-vent-valve'],
  'sistema EVAP fuga',
)

d(
  'P0442',
  'Fuga pequeña en el sistema EVAP',
  'Emisiones',
  'baja',
  'La ECU detecta una fuga pequeña en el sistema de vapores de combustible.',
  ['Testigo MIL', 'Olor a gasolina', 'Sin síntomas de conducción'],
  ['Tapón de combustible flojo o dañado', 'Manguera agrietada', 'Válvula de purga', 'Válvula de venteo'],
  ['Apretar o cambiar el tapón', 'Hacer prueba de humo', 'Revisar las válvulas EVAP'],
  ['gas-cap', 'evap-purge-valve', 'evap-vent-valve'],
  'fuga EVAP pequeña',
  {
    Toyota: 'Empieza por el tapón de combustible y las mangueras.',
    Honda: 'Revisa el tapón y la válvula de purga.',
    Chevrolet: 'Revisa la válvula de purga y el tapón.',
    Ford: 'Revisa la válvula de venteo y el tapón.',
  },
)

d(
  'P0446',
  'Circuito de la válvula de venteo EVAP',
  'Emisiones',
  'baja',
  'La válvula de venteo no responde como espera la ECU.',
  ['Testigo MIL', 'Olor a gasolina', 'Problemas para cargar combustible'],
  ['Válvula de venteo', 'Cableado', 'Filtro del carbón', 'Conector'],
  ['Probar la válvula', 'Revisar el cableado', 'Inspeccionar el canister'],
  ['evap-vent-valve', 'wiring'],
  'válvula venteo EVAP',
)

d(
  'P0455',
  'Fuga grande en el sistema EVAP',
  'Emisiones',
  'media',
  'La ECU detecta una fuga grande, a menudo porque el tapón está abierto o una manguera se desconectó.',
  ['Olor fuerte a gasolina', 'Testigo MIL', 'Sin síntomas de conducción'],
  ['Tapón abierto o ausente', 'Manguera desconectada', 'Válvula de purga atascada', 'Canister dañado'],
  ['Revisar el tapón', 'Inspeccionar mangueras', 'Prueba de humo'],
  ['gas-cap', 'evap-purge-valve', 'evap-vent-valve'],
  'fuga EVAP grande',
)

d(
  'P0456',
  'Fuga muy pequeña en el sistema EVAP',
  'Emisiones',
  'baja',
  'La ECU detecta una fuga mínima. Puede ser difícil de localizar sin prueba de humo.',
  ['Testigo MIL', 'Olor leve a gasolina'],
  ['Tapón', 'Manguera', 'Sello del depósito', 'Válvula'],
  ['Revisar el tapón', 'Prueba de humo', 'Revisar sellos'],
  ['gas-cap', 'evap-purge-valve'],
  'fuga EVAP muy pequeña',
)

d(
  'P0457',
  'Fuga EVAP detectada después de repostar',
  'Emisiones',
  'baja',
  'La fuga se detectó justo después de cargar combustible. Casi siempre es el tapón.',
  ['Testigo MIL', 'Olor a gasolina'],
  ['Tapón flojo', 'Tapón dañado', 'Manguera'],
  ['Revisar y apretar el tapón', 'Borrar el código y comprobar', 'Cambiar el tapón si no sella'],
  ['gas-cap'],
  'tapón combustible',
)

d(
  'P0500',
  'Sensor de velocidad del vehículo',
  'Transmisión',
  'media',
  'La ECU no recibe una señal válida de velocidad. Puede afectar el velocímetro y las marchas.',
  ['Velocímetro a cero', 'Cambios erráticos', 'Testigo MIL', 'ABS encendido'],
  ['Sensor de velocidad', 'Cableado', 'Rueda fónica', 'Módulo ABS'],
  ['Revisar el sensor y su conector', 'Comprobar la señal', 'Escanear el módulo ABS'],
  ['wheel-speed-sensor', 'wiring'],
  'sensor velocidad vehículo',
)

d(
  'P0505',
  'Fallo del control de ralentí',
  'Admisión',
  'media',
  'La ECU no logra mantener el régimen de ralentí deseado.',
  ['Ralentí alto o bajo', 'Motor que se apaga', 'Ralentí inestable'],
  ['Cuerpo de aceleración sucio', 'Válvula IAC', 'Fuga de vacío', 'Adaptación'],
  ['Limpiar el cuerpo de aceleración', 'Revisar la IAC', 'Buscar fugas de vacío', 'Hacer adaptación'],
  ['throttle-body', 'vacuum-hoses'],
  'control de ralentí',
)

d(
  'P0506',
  'Ralentí más bajo de lo esperado',
  'Admisión',
  'media',
  'El régimen de ralentí está por debajo del objetivo.',
  ['Ralentí bajo', 'Vibración', 'Motor que se apaga'],
  ['Cuerpo de aceleración sucio', 'Fuga de vacío', 'IAC', 'Filtro de aire'],
  ['Limpiar el cuerpo de aceleración', 'Revisar fugas', 'Comprobar la IAC'],
  ['throttle-body', 'vacuum-hoses', 'air-filter'],
  'ralentí bajo',
)

d(
  'P0507',
  'Ralentí más alto de lo esperado',
  'Admisión',
  'media',
  'El régimen de ralentí está por encima del objetivo.',
  ['Ralentí alto', 'Consumo alto', 'Motor que no baja de vueltas'],
  ['Fuga de vacío', 'Cuerpo de aceleración sucio', 'IAC atascada', 'Adaptación'],
  ['Buscar fugas de vacío', 'Limpiar el cuerpo de aceleración', 'Revisar la IAC'],
  ['vacuum-hoses', 'throttle-body'],
  'ralentí alto fuga vacío',
)

d(
  'P0521',
  'Rango de rendimiento del sensor de presión de aceite',
  'Motor',
  'alta',
  'La presión de aceite medida no es coherente con el régimen del motor.',
  ['Testigo de aceite', 'Ruido de motor', 'Presión baja'],
  ['Sensor de presión', 'Bomba de aceite', 'Nivel bajo', 'Cableado'],
  ['Comprobar el nivel de aceite', 'Medir presión con manómetro', 'Revisar el sensor'],
  ['oil-pressure-sensor', 'oil-change'],
  'presión de aceite',
)

d(
  'P0562',
  'Voltaje del sistema bajo',
  'Eléctrico',
  'alta',
  'La ECU detecta una tensión de alimentación por debajo de lo normal. Puede causar fallos eléctricos aleatorios.',
  ['Arranque difícil', 'Luces tenues', 'Testigos encendidos', 'Módulos que fallan'],
  ['Batería descargada', 'Alternador', 'Correa', 'Cableado o masa'],
  ['Medir voltaje en reposo y en marcha', 'Probar el alternador', 'Revisar bornes y masas'],
  ['battery', 'alternator', 'serpentine-belt', 'wiring'],
  'voltaje bajo batería alternador',
)

d(
  'P0563',
  'Voltaje del sistema alto',
  'Eléctrico',
  'alta',
  'La tensión de alimentación supera el máximo esperado. Puede dañar módulos.',
  ['Luces brillantes', 'Batería que hierve', 'Olor a ácido', 'Testigo MIL'],
  ['Regulador del alternador', 'Batería', 'Cableado'],
  ['Medir voltaje con motor en marcha', 'Probar el regulador', 'Revisar la batería'],
  ['alternator', 'battery'],
  'voltaje alto alternador',
)

d(
  'P0600',
  'Fallo de comunicación serial',
  'Red CAN',
  'media',
  'La ECU detecta un problema en su comunicación interna o con otro módulo.',
  ['Testigo MIL', 'Fallos intermitentes', 'Módulos que no responden'],
  ['Cableado CAN', 'Conector', 'Módulo', 'Batería'],
  ['Revisar la batería', 'Inspeccionar conectores', 'Escanear todos los módulos'],
  ['can-bus', 'wiring', 'battery'],
  'comunicación serial CAN',
)

d(
  'P0601',
  'Error de memoria del módulo de control',
  'Red CAN',
  'alta',
  'La ECU detecta un error en su memoria interna. Puede necesitar reprogramación o sustitución.',
  ['Testigo MIL', 'Motor en modo de emergencia', 'Fallos aleatorios'],
  ['Memoria de la ECU', 'Alimentación inestable', 'Reprogramación'],
  ['Revisar la alimentación y las masas', 'Escanear con equipo de taller', 'Consultar reprogramación'],
  ['ecu', 'wiring'],
  'memoria ECU',
)

d(
  'P0606',
  'Fallo del procesador del módulo de control',
  'Red CAN',
  'critica',
  'La ECU detecta un fallo interno del procesador. El motor puede entrar en modo de emergencia.',
  ['Motor en modo de emergencia', 'Testigo MIL', 'Fallo de comunicación'],
  ['ECU defectuosa', 'Alimentación', 'Masa', 'Reprogramación'],
  ['Revisar alimentación y masas', 'Escanear', 'Consultar reprogramación o sustitución'],
  ['ecu', 'wiring'],
  'procesador ECU',
)

d(
  'P0620',
  'Circuito de control del generador',
  'Eléctrico',
  'alta',
  'La ECU no puede controlar correctamente el alternador.',
  ['Batería que se descarga', 'Testigo de batería', 'Luces tenues'],
  ['Alternador', 'Regulador', 'Cableado', 'ECU'],
  ['Medir voltaje de carga', 'Probar el alternador', 'Revisar el cable de control'],
  ['alternator', 'wiring', 'battery'],
  'circuito generador alternador',
)

d(
  'P0700',
  'Aviso de fallo en el sistema de transmisión',
  'Transmisión',
  'alta',
  'El módulo de transmisión (TCM) detectó un fallo y pidió a la ECU encender el testigo. Hay que leer los códigos del TCM.',
  ['Testigo MIL', 'Modo de emergencia', 'Cambios bruscos', 'Transmisión que no cambia'],
  ['Fallo del TCM', 'Solenoide', 'Sensor de velocidad', 'Presión de aceite de transmisión'],
  ['Leer códigos del módulo de transmisión', 'Revisar el nivel y estado del aceite', 'Escanear el TCM'],
  ['transmission-fluid', 'transmission-solenoid', 'tcm'],
  'códigos transmisión',
  {
    Toyota: 'Lee los códigos del TCM; P0700 es solo un aviso.',
    Honda: 'Lee los códigos del TCM y revisa el aceite de transmisión.',
    Chevrolet: 'Lee los códigos del TCM; revisa el nivel de aceite.',
    Ford: 'Lee los códigos del TCM; revisa el aceite.',
  },
)

d(
  'P0705',
  'Circuito del sensor de rango de la transmisión',
  'Transmisión',
  'media',
  'La ECU no reconoce correctamente la posición de la palanca (P, R, N, D).',
  ['No arranca en P', 'Marcha atrás no enciende', 'Indicador de marcha errático'],
  ['Sensor de rango', 'Cableado', 'Ajuste del selector'],
  ['Revisar el sensor', 'Comprobar el ajuste', 'Inspeccionar el conector'],
  ['transmission-solenoid', 'wiring'],
  'sensor rango transmisión',
)

d(
  'P0715',
  'Sensor de velocidad de entrada de la transmisión',
  'Transmisión',
  'alta',
  'La transmisión no recibe una señal válida de velocidad de entrada.',
  ['Cambios erráticos', 'Modo de emergencia', 'Testigo MIL'],
  ['Sensor de entrada', 'Cableado', 'Rueda fónica', 'TCM'],
  ['Revisar el sensor', 'Comprobar la señal', 'Inspeccionar el conector'],
  ['transmission-solenoid', 'wiring'],
  'sensor velocidad transmisión',
)

d(
  'P0720',
  'Sensor de velocidad de salida de la transmisión',
  'Transmisión',
  'alta',
  'La transmisión no recibe una señal válida de velocidad de salida.',
  ['Velocímetro errático', 'Cambios erráticos', 'Modo de emergencia'],
  ['Sensor de salida', 'Cableado', 'Rueda fónica'],
  ['Revisar el sensor', 'Comprobar la señal', 'Inspeccionar el conector'],
  ['wheel-speed-sensor', 'wiring'],
  'sensor velocidad salida transmisión',
)

d(
  'P0740',
  'Circuito del embrague del convertidor de par',
  'Transmisión',
  'alta',
  'La ECU detecta un fallo en el control del embrague del convertidor.',
  ['Consumo alto', 'Vibración a velocidad constante', 'Testigo MIL', 'Sobrecalentamiento de transmisión'],
  ['Solenoide del convertidor', 'Cableado', 'Aceite contaminado', 'Convertidor'],
  ['Revisar el solenoide', 'Cambiar aceite si está contaminado', 'Escanear el TCM'],
  ['transmission-solenoid', 'transmission-fluid'],
  'embrague convertidor par',
)

d(
  'P0741',
  'Rendimiento del embrague del convertidor de par',
  'Transmisión',
  'alta',
  'El embrague no se acopla o desacopla como espera la ECU.',
  ['Vibración', 'Consumo alto', 'Sobrecalentamiento'],
  ['Solenoide', 'Convertidor desgastado', 'Aceite', 'Presión'],
  ['Revisar el solenoide', 'Comprobar la presión', 'Evaluar el convertidor'],
  ['transmission-solenoid', 'transmission-fluid'],
  'rendimiento convertidor par',
)

d(
  'P0750',
  'Solenoide de cambio A',
  'Transmisión',
  'alta',
  'La ECU detecta un fallo eléctrico en el solenoide de cambio A.',
  ['Cambios bruscos', 'Modo de emergencia', 'No cambia de marcha'],
  ['Solenoide', 'Cableado', 'Conector', 'TCM'],
  ['Medir la resistencia del solenoide', 'Revisar el conector', 'Escanear el TCM'],
  ['transmission-solenoid', 'wiring'],
  'solenoide cambio A',
)

d(
  'P0755',
  'Solenoide de cambio B',
  'Transmisión',
  'alta',
  'La ECU detecta un fallo eléctrico en el solenoide de cambio B.',
  ['Cambios bruscos', 'Modo de emergencia'],
  ['Solenoide', 'Cableado', 'Conector', 'TCM'],
  ['Medir resistencia', 'Revisar conector', 'Escanear TCM'],
  ['transmission-solenoid', 'wiring'],
  'solenoide cambio B',
)

d(
  'P0760',
  'Solenoide de cambio C',
  'Transmisión',
  'alta',
  'La ECU detecta un fallo eléctrico en el solenoide de cambio C.',
  ['Cambios bruscos', 'Modo de emergencia'],
  ['Solenoide', 'Cableado', 'Conector', 'TCM'],
  ['Medir resistencia', 'Revisar conector', 'Escanear TCM'],
  ['transmission-solenoid', 'wiring'],
  'solenoide cambio C',
)

d(
  'P0841',
  'Rango de presión del interruptor de presión de transmisión',
  'Transmisión',
  'alta',
  'La presión hidráulica de la transmisión no corresponde a la esperada.',
  ['Cambios erráticos', 'Modo de emergencia', 'Testigo MIL'],
  ['Aceite bajo o contaminado', 'Sensor de presión', 'Bomba de transmisión', 'Solenoide'],
  ['Revisar nivel y estado del aceite', 'Comprobar la presión', 'Escanear el TCM'],
  ['transmission-fluid', 'transmission-solenoid'],
  'presión transmisión',
)

d(
  'P2002',
  'Eficiencia del filtro de partículas diésel (DPF)',
  'Emisiones',
  'alta',
  'El DPF no filtra como debería. Puede estar saturado o tener un sensor defectuoso.',
  ['Pérdida de potencia', 'Humo negro', 'Regeneraciones frecuentes', 'Testigo MIL'],
  ['DPF saturado', 'Sensor de presión diferencial', 'Regeneración interrumpida', 'EGR', 'Combustible de mala calidad'],
  ['Revisar el sensor de presión diferencial', 'Forzar una regeneración si es seguro', 'Evaluar limpieza o sustitución del DPF'],
  ['dpf', 'egr-valve'],
  'filtro partículas diésel DPF',
  {
    Toyota: 'Revisa la regeneración y el sensor de presión diferencial.',
    Ford: 'Revisa la regeneración y el sensor de presión diferencial.',
    Volkswagen: 'Revisa el DPF, el sensor de presión y la EGR.',
  },
)

d(
  'P2004',
  'Control del colector de admisión (banco 1)',
  'Admisión',
  'media',
  'El colector de admisión variable no responde como espera la ECU.',
  ['Pérdida de potencia', 'Consumo alto', 'Testigo MIL'],
  ['Actuador del colector', 'Carbonilla', 'Vacío', 'Cableado'],
  ['Revisar el actuador', 'Comprobar el vacío', 'Limpiar el colector'],
  ['intake-manifold', 'vacuum-hoses'],
  'colector admisión variable',
)

d(
  'P2015',
  'Sensor de posición del colector de admisión',
  'Admisión',
  'media',
  'La posición del colector variable no es coherente.',
  ['Pérdida de potencia', 'Consumo alto', 'Testigo MIL'],
  ['Sensor', 'Actuador', 'Carbonilla', 'Cableado'],
  ['Revisar el sensor', 'Comprobar el actuador', 'Limpiar el colector'],
  ['intake-manifold', 'wiring'],
  'sensor colector admisión',
  {
    Volkswagen: 'Revisa el colector variable y su actuador; la carbonilla puede bloquearlo.',
    Audi: 'Revisa el colector variable y su actuador.',
  },
)

d(
  'P203B',
  'Nivel de reductor del sistema SCR',
  'Emisiones',
  'media',
  'El nivel de AdBlue/DEF es bajo o el sensor no lo detecta correctamente.',
  ['Testigo MIL', 'Aviso de AdBlue', 'Limitación de potencia'],
  ['Nivel bajo de AdBlue', 'Sensor de nivel', 'Calidad del líquido', 'Cableado'],
  ['Rellenar con AdBlue certificado', 'Revisar el sensor de nivel', 'Comprobar la calidad'],
  ['def-system', 'nox-sensor'],
  'nivel AdBlue DEF',
)

d(
  'P20B9',
  'Calentador del reductor SCR',
  'Emisiones',
  'media',
  'El calentador del depósito o de la línea de AdBlue no funciona correctamente.',
  ['Aviso de AdBlue', 'Limitación de potencia', 'Testigo MIL'],
  ['Calentador', 'Cableado', 'Fusible', 'Sensor de temperatura'],
  ['Revisar fusible', 'Medir el calentador', 'Inspeccionar el conector'],
  ['def-system', 'wiring'],
  'calentador AdBlue',
)

d(
  'P20EE',
  'Eficiencia del sistema SCR de NOx por debajo del umbral',
  'Emisiones',
  'alta',
  'El sistema de reducción catalítica selectiva no está reduciendo los NOx lo suficiente.',
  ['Testigo MIL', 'Limitación de potencia', 'Aviso de emisiones'],
  ['AdBlue agotado o de mala calidad', 'Sensor NOx', 'Inyector de urea', 'Catalizador SCR', 'Calentador'],
  ['Revisar nivel y calidad de AdBlue', 'Escanear el sensor NOx', 'Comprobar la dosificación'],
  ['def-system', 'nox-sensor', 'scr-catalyst'],
  'sistema SCR NOx',
  {
    Toyota: 'Revisa el nivel y la calidad de AdBlue y el sensor NOx.',
    Volkswagen: 'Revisa el sensor NOx, el inyector de urea y la calidad del AdBlue.',
  },
)

d(
  'P2073',
  'Fuga en el colector de admisión',
  'Admisión',
  'media',
  'La ECU detecta una fuga de aire no medida en la admisión.',
  ['Ralentí alto', 'Mezcla pobre', 'Silbido', 'Testigo MIL'],
  ['Junta del colector', 'Manguera agrietada', 'Tapa de válvulas', 'PCV'],
  ['Prueba de humo', 'Revisar juntas y mangueras', 'Comprobar la PCV'],
  ['intake-gasket', 'vacuum-hoses', 'pcv-valve'],
  'fuga colector admisión',
)

d(
  'P2100',
  'Circuito del actuador de la mariposa',
  'Admisión',
  'alta',
  'La ECU detecta un fallo eléctrico en el actuador del acelerador electrónico.',
  ['Modo de emergencia', 'Ralentí alto', 'Sin respuesta al acelerador', 'Testigo MIL'],
  ['Cuerpo de aceleración', 'Cableado', 'Conector', 'ECU'],
  ['Revisar el cuerpo de aceleración', 'Medir el actuador', 'Inspeccionar el arnés'],
  ['throttle-body', 'wiring'],
  'actuador mariposa',
)

d(
  'P2119',
  'Rango de control de la mariposa',
  'Admisión',
  'alta',
  'La mariposa no alcanza la posición solicitada. Puede quedar atascada.',
  ['Ralentí alto', 'Aceleración irregular', 'Modo de emergencia'],
  ['Carbonilla en la mariposa', 'Actuador', 'Muelle', 'Adaptación'],
  ['Limpiar la mariposa', 'Revisar el actuador', 'Hacer adaptación'],
  ['throttle-body', 'wiring'],
  'cuerpo aceleración mariposa',
)

d(
  'P2122',
  'Señal baja del sensor del pedal del acelerador',
  'Admisión',
  'alta',
  'La ECU recibe una señal baja del pedal. Puede limitar la potencia.',
  ['Sin respuesta al acelerador', 'Modo de emergencia', 'Testigo MIL'],
  ['Sensor del pedal', 'Cableado', 'Conector', 'ECU'],
  ['Revisar el conector', 'Medir las dos señales del pedal', 'Sustituir el pedal si es necesario'],
  ['accelerator-pedal', 'wiring'],
  'sensor pedal acelerador',
)

d(
  'P2135',
  'Correlación entre sensores de la mariposa',
  'Admisión',
  'alta',
  'Las dos señales del TPS no coinciden. La ECU limita la potencia por seguridad.',
  ['Modo de emergencia', 'Ralentí irregular', 'Aceleración limitada'],
  ['TPS', 'Cuerpo de aceleración', 'Cableado', 'Adaptación'],
  ['Revisar las dos señales', 'Limpiar o sustituir el cuerpo', 'Hacer adaptación'],
  ['throttle-body', 'wiring'],
  'correlación TPS',
)

d(
  'P2138',
  'Correlación entre sensores del pedal',
  'Admisión',
  'alta',
  'Las dos señales del pedal no coinciden. La ECU puede limitar la potencia.',
  ['Acelerador sin respuesta', 'Modo de emergencia', 'Testigo MIL'],
  ['Pedal', 'Cableado', 'Conector', 'ECU'],
  ['Revisar las dos señales', 'Inspeccionar el conector', 'Sustituir el pedal si es necesario'],
  ['accelerator-pedal', 'wiring'],
  'correlación pedal acelerador',
)

d(
  'P2187',
  'Mezcla pobre en ralentí (banco 1)',
  'Combustible',
  'alta',
  'La mezcla es pobre específicamente en ralentí, lo que suele indicar una fuga de vacío pequeña.',
  ['Ralentí inestable', 'Consumo alto', 'Tironeo', 'Testigo MIL'],
  ['Fuga de vacío', 'PCV', 'MAF', 'Inyectores'],
  ['Prueba de humo', 'Revisar la PCV', 'Comprobar los ajustes de combustible'],
  ['vacuum-hoses', 'pcv-valve', 'maf-sensor', 'injectors'],
  'mezcla pobre ralentí',
)

d(
  'P2188',
  'Mezcla rica en ralentí (banco 1)',
  'Combustible',
  'alta',
  'La mezcla es rica específicamente en ralentí.',
  ['Ralentí inestable', 'Olor a gasolina', 'Humo negro'],
  ['Inyector que gotea', 'Purga EVAP atascada', 'MAF', 'Presión de combustible'],
  ['Revisar la purga EVAP', 'Probar inyectores', 'Medir presión'],
  ['evap-purge-valve', 'injectors', 'fuel-pressure-regulator'],
  'mezcla rica ralentí',
)

d(
  'P2195',
  'Sonda O2 atascada en pobre (banco 1, sensor 1)',
  'Emisiones',
  'media',
  'La sonda delantera se queda en un valor bajo y no oscila como debería.',
  ['Mezcla pobre', 'Consumo alto', 'Testigo MIL'],
  ['Sonda O2 defectuosa', 'Fuga de vacío', 'Presión de combustible'],
  ['Revisar fugas', 'Observar la onda de la sonda', 'Sustituir la sonda si está atascada'],
  ['o2-sensor', 'vacuum-hoses', 'fuel-pump'],
  'sonda O2 atascada pobre',
)

d(
  'P2196',
  'Sonda O2 atascada en rica (banco 1, sensor 1)',
  'Emisiones',
  'media',
  'La sonda delantera se queda en un valor alto y no oscila como debería.',
  ['Mezcla rica', 'Humo negro', 'Consumo alto'],
  ['Sonda O2 defectuosa', 'Inyector que gotea', 'Presión alta'],
  ['Revisar inyectores', 'Medir presión', 'Sustituir la sonda si está atascada'],
  ['o2-sensor', 'injectors', 'fuel-pressure-regulator'],
  'sonda O2 atascada rica',
)

d(
  'P2261',
  'Válvula de descarga del turbo',
  'Admisión',
  'media',
  'La válvula de descarga no responde correctamente.',
  ['Pérdida de potencia', 'Silbido', 'Testigo MIL'],
  ['Válvula de descarga', 'Vacío', 'Cableado', 'Turbo'],
  ['Probar la válvula', 'Revisar el vacío', 'Inspeccionar el conector'],
  ['turbo-wastegate', 'vacuum-hoses'],
  'válvula descarga turbo',
)

d(
  'P2263',
  'Rendimiento del sistema de turbo',
  'Admisión',
  'alta',
  'El turbo no responde como espera la ECU. Puede haber fugas o un actuador defectuoso.',
  ['Pérdida de potencia', 'Humo negro', 'Silbido', 'Testigo MIL'],
  ['Fuga de admisión', 'Wastegate', 'Solenoide', 'Turbo desgastado'],
  ['Revisar fugas', 'Probar el wastegate', 'Medir presión de turbo'],
  ['turbo-wastegate', 'intercooler', 'boost-control-solenoid'],
  'rendimiento turbo',
)

d(
  'P2453',
  'Sensor de presión diferencial del DPF',
  'Emisiones',
  'alta',
  'El sensor que mide la saturación del DPF no entrega una señal válida.',
  ['Regeneraciones frecuentes', 'Pérdida de potencia', 'Testigo MIL'],
  ['Sensor de presión diferencial', 'Mangueras obstruidas', 'Cableado', 'DPF saturado'],
  ['Revisar las mangueras', 'Medir la señal', 'Comprobar la saturación del DPF'],
  ['dpf', 'wiring'],
  'sensor presión DPF',
)

d(
  'P2463',
  'Restricción del DPF',
  'Emisiones',
  'alta',
  'El DPF está saturado y no puede regenerarse correctamente.',
  ['Pérdida de potencia', 'Humo negro', 'Regeneraciones fallidas', 'Testigo MIL'],
  ['DPF saturado', 'Regeneración interrumpida', 'EGR', 'Sensor de presión'],
  ['Forzar regeneración si es seguro', 'Revisar EGR', 'Evaluar limpieza o sustitución'],
  ['dpf', 'egr-valve'],
  'DPF saturado',
)

d(
  'P24A4',
  'Restricción del DPF por encima del umbral',
  'Emisiones',
  'alta',
  'La restricción del filtro de partículas es demasiado alta.',
  ['Pérdida de potencia', 'Humo negro', 'Modo de emergencia'],
  ['DPF saturado', 'Sensor de presión', 'Regeneración fallida'],
  ['Revisar la presión diferencial', 'Forzar regeneración', 'Evaluar limpieza'],
  ['dpf'],
  'restricción DPF',
)

d(
  'B0001',
  'Circuito del airbag del conductor',
  'Airbag',
  'critica',
  'El módulo de airbag detecta un fallo en el circuito del conductor. El airbag podría no desplegarse.',
  ['Testigo de airbag', 'Airbag desactivado'],
  ['Conector bajo el asiento o volante', 'Clock spring', 'Cableado', 'Módulo SRS'],
  ['Desconectar la batería y esperar antes de intervenir', 'Revisar el conector', 'Escanear el módulo SRS'],
  ['airbag-clock-spring', 'wiring'],
  'airbag conductor',
)

d(
  'B0010',
  'Circuito del airbag del pasajero',
  'Airbag',
  'critica',
  'El módulo SRS detecta un fallo en el circuito del pasajero.',
  ['Testigo de airbag', 'Airbag desactivado'],
  ['Conector', 'Cableado', 'Módulo SRS', 'Sensor de ocupante'],
  ['Desconectar la batería y esperar', 'Revisar el conector', 'Escanear el SRS'],
  ['airbag-clock-spring', 'wiring'],
  'airbag pasajero',
)

d(
  'B0020',
  'Circuito del airbag lateral',
  'Airbag',
  'critica',
  'El módulo SRS detecta un fallo en un airbag lateral.',
  ['Testigo de airbag', 'Airbag lateral desactivado'],
  ['Conector del asiento', 'Cableado', 'Sensor lateral', 'Módulo SRS'],
  ['Desconectar la batería y esperar', 'Revisar conectores del asiento', 'Escanear el SRS'],
  ['airbag-clock-spring', 'wiring'],
  'airbag lateral',
)

d(
  'C0035',
  'Sensor de velocidad de la rueda delantera izquierda',
  'ABS',
  'media',
  'El módulo ABS no recibe una señal válida de la rueda delantera izquierda.',
  ['Testigo ABS', 'Testigo de control de tracción', 'Velocímetro errático'],
  ['Sensor de rueda', 'Rueda fónica', 'Cableado', 'Rodamiento'],
  ['Revisar el sensor y el conector', 'Inspeccionar la rueda fónica', 'Escanear el ABS'],
  ['wheel-speed-sensor', 'wiring'],
  'sensor ABS rueda delantera izquierda',
)

d(
  'C0040',
  'Sensor de velocidad de la rueda delantera derecha',
  'ABS',
  'media',
  'El módulo ABS no recibe una señal válida de la rueda delantera derecha.',
  ['Testigo ABS', 'Control de tracción desactivado'],
  ['Sensor de rueda', 'Rueda fónica', 'Cableado', 'Rodamiento'],
  ['Revisar el sensor', 'Inspeccionar la rueda fónica', 'Escanear el ABS'],
  ['wheel-speed-sensor', 'wiring'],
  'sensor ABS rueda delantera derecha',
)

d(
  'C0050',
  'Sensor de velocidad de la rueda trasera derecha',
  'ABS',
  'media',
  'El módulo ABS no recibe una señal válida de la rueda trasera derecha.',
  ['Testigo ABS', 'Control de tracción desactivado'],
  ['Sensor de rueda', 'Rueda fónica', 'Cableado', 'Rodamiento'],
  ['Revisar el sensor', 'Inspeccionar la rueda fónica', 'Escanear el ABS'],
  ['wheel-speed-sensor', 'wiring'],
  'sensor ABS rueda trasera derecha',
)

d(
  'C0055',
  'Sensor de velocidad de la rueda trasera izquierda',
  'ABS',
  'media',
  'El módulo ABS no recibe una señal válida de la rueda trasera izquierda.',
  ['Testigo ABS', 'Control de tracción desactivado'],
  ['Sensor de rueda', 'Rueda fónica', 'Cableado', 'Rodamiento'],
  ['Revisar el sensor', 'Inspeccionar la rueda fónica', 'Escanear el ABS'],
  ['wheel-speed-sensor', 'wiring'],
  'sensor ABS rueda trasera izquierda',
)

d(
  'U0100',
  'Pérdida de comunicación con la ECU del motor',
  'Red CAN',
  'critica',
  'Un módulo no puede comunicarse con la ECU del motor por el bus CAN.',
  ['No arranca', 'Testigos encendidos', 'Múltiples módulos sin comunicación'],
  ['Batería baja', 'Masa deficiente', 'Cableado CAN', 'ECU sin alimentación'],
  ['Revisar la batería y las masas', 'Medir la resistencia CAN', 'Escanear todos los módulos'],
  ['can-bus', 'battery', 'wiring', 'ecu'],
  'pérdida comunicación ECU',
)

d(
  'U0101',
  'Pérdida de comunicación con el módulo de transmisión',
  'Red CAN',
  'alta',
  'La ECU no puede comunicarse con el TCM.',
  ['Modo de emergencia', 'Cambios bruscos', 'Testigo MIL'],
  ['Batería', 'Masa', 'Cableado CAN', 'TCM'],
  ['Revisar la alimentación del TCM', 'Comprobar el bus CAN', 'Escanear'],
  ['can-bus', 'tcm', 'wiring'],
  'pérdida comunicación TCM',
)

d(
  'U0121',
  'Pérdida de comunicación con el módulo ABS',
  'Red CAN',
  'alta',
  'La ECU no puede comunicarse con el módulo ABS.',
  ['Testigo ABS', 'Control de tracción desactivado', 'Testigo MIL'],
  ['Batería', 'Masa', 'Cableado CAN', 'Módulo ABS'],
  ['Revisar la alimentación del ABS', 'Comprobar el bus CAN', 'Escanear'],
  ['can-bus', 'wiring'],
  'pérdida comunicación ABS',
)

d(
  'U0140',
  'Pérdida de comunicación con el módulo de carrocería',
  'Red CAN',
  'media',
  'La ECU no puede comunicarse con el BCM.',
  ['Luces o cierre centralizado con fallos', 'Testigo MIL', 'Módulos que no responden'],
  ['Batería', 'Masa', 'Cableado CAN', 'BCM'],
  ['Revisar la alimentación del BCM', 'Comprobar el bus', 'Escanear'],
  ['can-bus', 'wiring'],
  'pérdida comunicación BCM',
)

d(
  'U0155',
  'Pérdida de comunicación con el cuadro de instrumentos',
  'Red CAN',
  'media',
  'La ECU no puede comunicarse con el tablero de instrumentos.',
  ['Testigos apagados', 'Indicadores erráticos', 'Testigo MIL'],
  ['Batería', 'Masa', 'Cableado CAN', 'Cuadro'],
  ['Revisar la alimentación del cuadro', 'Comprobar el bus', 'Escanear'],
  ['can-bus', 'wiring'],
  'pérdida comunicación cuadro',
)

d(
  'U1000',
  'Fallo de comunicación de clase 2 (específico del fabricante)',
  'Red CAN',
  'media',
  'Un módulo perdió la comunicación en el bus de datos. El significado exacto depende del fabricante.',
  ['Testigos encendidos', 'Módulos que no responden', 'Fallos intermitentes'],
  ['Batería', 'Masa', 'Cableado CAN', 'Módulo defectuoso'],
  ['Revisar la batería y las masas', 'Escanear todos los módulos', 'Consultar el boletín del fabricante'],
  ['can-bus', 'wiring', 'battery'],
  'fallo comunicación módulo',
)

export const DTC_DATABASE: Record<string, DtcInfo> = Object.fromEntries(
  entries.map(([code, info]) => [
    code,
    {
      ...info,
      code,
      generic: isGenericDtc(code),
    },
  ]),
)

function isGenericDtc(code: string): boolean {
  const letter = code.charAt(0)
  const second = code.charAt(1)
  if (letter === 'P') return second === '0' || second === '2'
  return second === '0'
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '')
}

function systemFromCode(code: string): DtcSystem {
  switch (code.charAt(0)) {
    case 'C':
      return 'ABS'
    case 'B':
      return 'Airbag'
    case 'U':
      return 'Red CAN'
    default:
      return 'Motor'
  }
}

function fallbackDtc(code: string, vehicle?: Partial<{ make: string; model: string }>): DtcInfo {
  const system = systemFromCode(code)
  const isManufacturer = !isGenericDtc(code)
  return {
    code,
    title: `Código ${code}${isManufacturer ? ' (específico del fabricante)' : ''}`,
    system,
    severity: 'media',
    description: isManufacturer
      ? 'Este código no está en la base local. Es específico del fabricante o de un módulo concreto. Consulta el boletín técnico del vehículo y las lecturas en vivo antes de cambiar piezas.'
      : 'Este código no está en la base local. Revisa la descripción con un escáner de taller y comprueba los datos en vivo.',
    symptoms: ['Testigo MIL o testigo del sistema encendido', 'Comportamiento anómalo del vehículo'],
    causes: ['Falla específica del fabricante', 'Sensor o actuador del sistema', 'Cableado o conector', 'Módulo de control'],
    checks: [
      'Leer el código con un escáner que muestre la descripción del fabricante',
      'Revisar los datos en vivo relacionados con el sistema',
      'Inspeccionar conectores y cableado antes de sustituir piezas',
    ],
    components: ['taller-especializado', 'wiring'],
    ifixQuery: `${vehicle?.make ?? ''} ${code} reparación`.trim(),
    generic: false,
  }
}

function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function resolveBrandNote(
  notes: Record<string, string> | undefined,
  make: string | undefined,
): string | undefined {
  if (!notes || !make) return undefined
  const key = Object.keys(notes).find((brand) => {
    const a = norm(brand)
    const b = norm(make)
    return a === b || b.includes(a) || a.includes(b)
  })
  return key ? notes[key] : undefined
}

export function lookupDtc(
  codeInput: string,
  vehicle?: Partial<{ make: string; model: string; year: string }>,
): ResolvedDtc {
  const code = normalizeCode(codeInput)
  const info = DTC_DATABASE[code] ?? fallbackDtc(code, vehicle)
  const brandNote = resolveBrandNote(info.brandNotes, vehicle?.make)
  const vehicleNote =
    vehicle?.make && vehicle?.model
      ? findVehicleNote(vehicle.make, vehicle.model, vehicle.year ?? '', code)
      : undefined

  return {
    ...info,
    brandNote,
    vehicleNote,
  }
}

export function allDtcCodes(): string[] {
  return Object.keys(DTC_DATABASE).sort()
}
