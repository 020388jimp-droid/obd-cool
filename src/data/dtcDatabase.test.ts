import { describe, expect, it } from 'vitest'
import { DTC_DATABASE, allDtcCodes, lookupDtc } from './dtcDatabase'

describe('base de datos DTC', () => {
  it('encuentra un código conocido sin distinguir mayúsculas', () => {
    const result = lookupDtc('p0300')
    expect(result.code).toBe('P0300')
    expect(result.title).toContain('Fallo de combustión')
    expect(result.generic).toBe(true)
    expect(result.components.length).toBeGreaterThan(0)
  })

  it('marca los códigos específicos del fabricante como no genéricos', () => {
    const result = lookupDtc('P1171')
    expect(result.generic).toBe(false)
    expect(result.title).toContain('específico del fabricante')
    expect(result.severity).toBe('media')
  })

  it('clasifica el sistema según la letra del código', () => {
    expect(lookupDtc('P0300').system).toBe('Encendido')
    expect(lookupDtc('C0035').system).toBe('ABS')
    expect(lookupDtc('B0001').system).toBe('Airbag')
    expect(lookupDtc('U0100').system).toBe('Red CAN')
    expect(lookupDtc('X1234').system).toBe('Motor')
  })

  it('añade una nota de marca cuando hay coincidencia', () => {
    const result = lookupDtc('P0171', { make: 'toyota' })
    expect(result.brandNote).toContain('colector')
  })

  it('no añade nota de marca para marcas sin datos', () => {
    const result = lookupDtc('P0171', { make: 'MarcaInventada' })
    expect(result.brandNote).toBeUndefined()
  })

  it('añade una nota de modelo y año cuando existe', () => {
    const result = lookupDtc('P0420', { make: 'Toyota', model: 'Corolla', year: '2005' })
    expect(result.vehicleNote).toContain('catalizador')
  })

  it('no añade nota de modelo si el año está fuera del rango conocido', () => {
    const result = lookupDtc('P0420', { make: 'Toyota', model: 'Corolla', year: '1998' })
    expect(result.vehicleNote).toBeUndefined()
  })

  it('no añade nota de modelo si falta el modelo', () => {
    const result = lookupDtc('P0420', { make: 'Toyota', year: '2005' })
    expect(result.vehicleNote).toBeUndefined()
  })

  it('expone el catálogo ordenado y con códigos esperados', () => {
    const list = allDtcCodes()
    expect(list).toContain('P0300')
    expect(list).toContain('P0420')
    expect([...list].sort()).toEqual(list)
    expect(DTC_DATABASE.P0171?.title).toContain('Mezcla demasiado pobre')
  })
})
