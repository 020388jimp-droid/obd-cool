import { describe, expect, it } from 'vitest'
import { lookupDtc } from '../../data/dtcDatabase'
import type { VehicleInfo } from '../obd/types'
import { runLocalDiagnosis } from './engine'
import type { DiagnosisContext } from './types'

const VEHICLE: VehicleInfo = {
  make: 'Toyota',
  model: 'Corolla',
  year: '2005',
  engine: '1.8 gasolina',
  vin: '1NXBR32E45Z123456',
}

function context(overrides: Partial<DiagnosisContext> = {}): DiagnosisContext {
  return {
    vehicle: VEHICLE,
    codes: [],
    snapshot: {},
    symptoms: [],
    freezeFrame: null,
    ...overrides,
  }
}

function codes(...list: string[]) {
  return list.map((code) => lookupDtc(code, VEHICLE))
}

describe('motor de diagnóstico local', () => {
  it('cruza fallos de combustión, mezcla pobre y catalizador', () => {
    const result = runLocalDiagnosis(
      context({
        codes: codes('P0300', 'P0171', 'P0301', 'P0420'),
        snapshot: { rpm: 780, ltft1: 14, stft1: 12, maf: 3.1, coolant: 86, voltage: 13.9 },
      }),
    )

    const ids = result.hypotheses.map((hypothesis) => hypothesis.id)
    expect(ids).toContain('ignition-misfire')
    expect(ids).toContain('vacuum-leak')
    expect(ids).toContain('catalyst-aged')
    expect(result.hypotheses.length).toBeLessThanOrEqual(6)
    expect(result.urgency).toBe('critica')
    expect(result.summary).toContain('Toyota')
    expect(result.safety.join(' ')).toContain('catalizador')
    expect(result.notes.some((note) => note.kind === 'model')).toBe(true)
    expect(result.notes.some((note) => note.kind === 'brand')).toBe(true)
  })

  it('eleva la urgencia cuando el testigo MIL parpadea', () => {
    const result = runLocalDiagnosis(
      context({
        codes: codes('P0300', 'P0301'),
        symptoms: ['mil-flashing'],
        snapshot: { rpm: 720 },
      }),
    )

    expect(result.urgency).toBe('critica')
    const misfire = result.hypotheses.find((hypothesis) => hypothesis.id === 'ignition-misfire')
    expect(misfire).toBeDefined()
    expect(misfire!.severity).toBe('critica')
    expect(result.safety.join(' ')).toContain('detén el motor')
  })

  it('detecta mezcla rica y prioriza el inyector', () => {
    const result = runLocalDiagnosis(
      context({
        codes: codes('P0172'),
        snapshot: { ltft1: -18, stft1: -9, maf: 4.2 },
      }),
    )

    const ids = result.hypotheses.map((hypothesis) => hypothesis.id)
    expect(ids).toContain('injector-leak')
    expect(result.hypotheses[0]!.id).toBe('injector-leak')
    expect(result.urgency).toBe('alta')
  })

  it('detecta un termostato abierto con el motor ya caliente', () => {
    const result = runLocalDiagnosis(
      context({
        snapshot: { coolant: 62, runTime: 900, rpm: 800 },
      }),
    )

    const ids = result.hypotheses.map((hypothesis) => hypothesis.id)
    expect(ids).toContain('thermostat-stuck')
  })

  it('usa los síntomas cuando no hay códigos y avisa del sobrecalentamiento', () => {
    const result = runLocalDiagnosis(
      context({
        symptoms: ['overheat', 'coolant-loss'],
        snapshot: { coolant: 118 },
      }),
    )

    expect(result.hypotheses.map((hypothesis) => hypothesis.id)).toContain('general-overheat')
    expect(result.urgency).toBe('critica')
    expect(result.safety.join(' ')).toContain('No abras el tapón del refrigerante')
  })

  it('genera hipótesis generales para un ralentí inestable sin códigos', () => {
    const result = runLocalDiagnosis(context({ symptoms: ['rough-idle', 'vibration'] }))
    expect(result.hypotheses.map((hypothesis) => hypothesis.id)).toContain('general-idle')
    expect(result.summary).toContain('síntomas')
  })

  it('devuelve un resultado orientativo cuando no hay códigos ni síntomas', () => {
    const result = runLocalDiagnosis(context())
    expect(result.hypotheses).toHaveLength(0)
    expect(result.summary).toContain('No se detectaron códigos')
    expect(result.notes.some((note) => note.kind === 'data')).toBe(true)
  })

  it('mantiene las confianzas dentro de rango y ordenadas', () => {
    const result = runLocalDiagnosis(
      context({
        codes: codes('P0300', 'P0171', 'P0420', 'P0128', 'P0442'),
        snapshot: { coolant: 60, runTime: 600, ltft1: 25, voltage: 11.8 },
      }),
    )

    const confidences = result.hypotheses.map((hypothesis) => hypothesis.confidence)
    expect(confidences).toEqual([...confidences].sort((a, b) => b - a))
    expect(confidences.every((confidence) => confidence >= 5 && confidence <= 95)).toBe(true)
    expect(result.safety.length).toBeGreaterThanOrEqual(2)
  })
})
