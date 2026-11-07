import { describe, expect, it } from 'vitest'
import { ifixBaseUrl, ifixQueryForVehicle, ifixSearchUrl } from './ifix'

describe('enlaces a iFixit', () => {
  it('usa la sección de coches como destino por defecto', () => {
    expect(ifixBaseUrl()).toBe('https://es.ifixit.com/Device/Car_and_Truck')
  })

  it('construye una búsqueda codificada', () => {
    expect(ifixSearchUrl('fuga de vacío')).toBe('https://es.ifixit.com/Search?query=fuga%20de%20vac%C3%ADo')
  })

  it('recorta los espacios de la consulta', () => {
    expect(ifixSearchUrl('  bujías  ')).toBe('https://es.ifixit.com/Search?query=buj%C3%ADas')
  })

  it('vuelve a la portada cuando la consulta está vacía', () => {
    expect(ifixSearchUrl('   ')).toBe(ifixBaseUrl())
  })

  it('combina vehículo y consulta en orden lógico', () => {
    expect(ifixQueryForVehicle('bujías', { make: 'Toyota', model: 'Corolla', year: '2005' })).toBe(
      'Toyota Corolla 2005 bujías',
    )
  })

  it('omite los datos de vehículo que faltan', () => {
    expect(ifixQueryForVehicle('fuga de vacío', { make: 'Toyota', model: '', year: '' })).toBe('Toyota fuga de vacío')
    expect(ifixQueryForVehicle('embrague', {})).toBe('embrague')
  })
})
