import { describe, expect, it } from 'vitest'
import { PID_BY_CODE } from '../../data/pids'
import {
  decodeDtcPair,
  decodePidValue,
  encodeDtcPair,
  isErrorResponse,
  normalizeHexResponse,
  parseDtcResponse,
  parseMonitorStatus,
  parsePidBytes,
  parseSupportedPids,
} from './elm327'

describe('códigos DTC', () => {
  it.each(['P0300', 'P0171', 'P0420', 'P0301', 'C0035', 'B0001', 'U0100'])(
    'codifica y decodifica %s sin pérdidas',
    (code) => {
      const [first, second] = encodeDtcPair(code)
      expect(decodeDtcPair(first, second)).toBe(code)
    },
  )

  it('decodifica el par de bytes de P0300', () => {
    expect(decodeDtcPair(0x03, 0x00)).toBe('P0300')
  })

  it('interpreta una respuesta de códigos almacenados e ignora los rellenos', () => {
    const result = parseDtcResponse('43 01 71 03 00 00 00 00', 'stored')
    expect(result.map((record) => record.code)).toEqual(['P0171', 'P0300'])
    expect(result.every((record) => record.status === 'stored')).toBe(true)
  })

  it('acepta respuestas con encabezado de módulo y prompt', () => {
    const result = parseDtcResponse('7E8: 43 01 71 03 00 00 00 00\r\r>', 'stored')
    expect(result.map((record) => record.code)).toEqual(['P0171', 'P0300'])
  })

  it('usa el servicio correcto para códigos pendientes y permanentes', () => {
    expect(parseDtcResponse('47 03 01 00 00 00', 'pending').map((record) => record.code)).toEqual(['P0301'])
    expect(parseDtcResponse('4A 04 20 00 00 00', 'permanent').map((record) => record.code)).toEqual(['P0420'])
  })

  it('descarta líneas sin el servicio esperado', () => {
    expect(parseDtcResponse('41 0C 1A F8', 'stored')).toEqual([])
  })
})

describe('lectura de PID', () => {
  it('extrae los bytes del PID 0C (RPM)', () => {
    const bytes = parsePidBytes('41 0C 1A F8', 0x01, '0C')
    expect(bytes).toEqual([0x1a, 0xf8])
    expect(decodePidValue(PID_BY_CODE['0C']!, bytes!)).toBe(1726)
  })

  it('ignora la línea de otro PID hasta encontrar el solicitado', () => {
    const bytes = parsePidBytes('41 0D 00\r41 0C 0F A0', 0x01, '0C')
    expect(bytes).toEqual([0x0f, 0xa0])
    expect(decodePidValue(PID_BY_CODE['0C']!, bytes!)).toBe(1000)
  })

  it('devuelve null si el PID no aparece', () => {
    expect(parsePidBytes('41 0D 32', 0x01, '0C')).toBeNull()
  })

  it('rechaza una lectura con menos bytes de los necesarios', () => {
    expect(decodePidValue(PID_BY_CODE['0C']!, [0x1a])).toBeNull()
  })

  it('decodifica la temperatura del refrigerante y el voltaje', () => {
    const coolant = parsePidBytes('41 05 7B', 0x01, '05')
    expect(decodePidValue(PID_BY_CODE['05']!, coolant!)).toBe(83)

    const voltage = parsePidBytes('41 42 36 B0', 0x01, '42')
    expect(decodePidValue(PID_BY_CODE['42']!, voltage!)).toBeCloseTo(14, 1)
  })
})

describe('estado del monitor', () => {
  it('detecta el testigo MIL y los monitores listos', () => {
    const status = parseMonitorStatus('41 01 83 00 65 00')
    expect(status).not.toBeNull()
    expect(status!.milOn).toBe(true)
    expect(status!.dtcCount).toBe(3)
    expect(status!.readiness).toEqual({ misfire: true, fuelSystem: true, components: true })
  })

  it('marca los monitores no completados cuando el byte está a uno', () => {
    const status = parseMonitorStatus('41 01 00 07 65 00')
    expect(status!.milOn).toBe(false)
    expect(status!.readiness).toEqual({ misfire: false, fuelSystem: false, components: false })
  })

  it('devuelve null si faltan datos', () => {
    expect(parseMonitorStatus('NO DATA')).toBeNull()
  })
})

describe('PIDs soportados', () => {
  it('interpreta el último bit del bloque como el PID siguiente', () => {
    expect(parseSupportedPids('41 00 00 00 00 01', 0x00)).toContain('20')
    expect(parseSupportedPids('41 20 00 00 00 01', 0x20)).toContain('40')
  })

  it('devuelve varios PIDs cuando hay varios bits activos', () => {
    expect(parseSupportedPids('41 00 C0 00 00 00', 0x00)).toEqual(['01', '02'])
  })

  it('devuelve una lista vacía si no hay datos', () => {
    expect(parseSupportedPids('NO DATA', 0x00)).toEqual([])
  })
})

describe('utilidades de respuesta', () => {
  it('limpia prefijos de módulo y el prompt', () => {
    expect(normalizeHexResponse('7E8: 41 0C 1A F8\r\r>')).toEqual(['41 0C 1A F8'])
  })

  it('detecta respuestas de error del adaptador', () => {
    expect(isErrorResponse('?')).toBe(true)
    expect(isErrorResponse('CAN ERROR')).toBe(true)
    expect(isErrorResponse('UNABLE TO CONNECT')).toBe(true)
    expect(isErrorResponse('41 0C 1A F8')).toBe(false)
  })
})
