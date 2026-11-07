import { describe, expect, it } from 'vitest'
import { decodeVin } from './vin'

describe('decodificador de VIN', () => {
  it('reconoce el Toyota Corolla del simulador', () => {
    const result = decodeVin('1NXBR32E45Z123456')
    expect(result.valid).toBe(true)
    expect(result.make).toBe('Toyota')
    expect(result.year).toBe(2005)
    expect(result.message).toContain('Toyota')
  })

  it('admite minúsculas y espacios alrededor', () => {
    const result = decodeVin('  1nxbr32e45z123456  ')
    expect(result.valid).toBe(true)
    expect(result.make).toBe('Toyota')
  })

  it('rechaza un VIN que no tiene 17 caracteres', () => {
    const result = decodeVin('1NXBR32E45')
    expect(result.valid).toBe(false)
    expect(result.message).toContain('17 caracteres')
  })

  it('rechaza un VIN con caracteres prohibidos que deja la longitud incorrecta', () => {
    const result = decodeVin('1NXBR32E45Z12345O')
    expect(result.valid).toBe(false)
  })

  it('marca como válido un VIN de fabricante desconocido y avisa', () => {
    const result = decodeVin('9ZZZZZZZZZZZZZZZZ')
    expect(result.valid).toBe(true)
    expect(result.make).toBeUndefined()
    expect(result.message).toContain('No reconocí')
  })

  it('no inventa el año cuando el código no está en la tabla', () => {
    const result = decodeVin('1NXBR32E4UZ123456')
    expect(result.valid).toBe(true)
    expect(result.year).toBeUndefined()
  })
})
