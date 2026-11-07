import { useState } from 'react'
import { CheckCircle2, Save, Wrench } from 'lucide-react'
import { VEHICLE_MAKES, MODELS_BY_MAKE, VEHICLE_YEARS, ENGINE_OPTIONS, describeVehicle } from '../data/vehicles'
import { decodeVin } from '../data/vin'
import type { VehicleInfo } from '../lib/obd/types'
import { Card, Note } from './ui'

export function VehicleView({
  vehicle,
  onSave,
}: {
  vehicle: VehicleInfo
  onSave: (vehicle: VehicleInfo) => void
}) {
  const [form, setForm] = useState<VehicleInfo>(vehicle)
  const [vin, setVin] = useState(vehicle.vin)
  const [vinMessage, setVinMessage] = useState('')

  const handleVinDecode = () => {
    const decoded = decodeVin(vin)
    setVinMessage(decoded.message)
    if (decoded.valid && decoded.make) {
      setForm((current) => ({
        ...current,
        make: decoded.make!,
        year: decoded.year ? String(decoded.year) : current.year,
      }))
    }
  }

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <span className="eyebrow">Vehículo</span>
          <h1>Configuración</h1>
          <p className="view-head__lead">
            Configurar marca, modelo y año permite a OBD COOL filtrar notas técnicas específicas, realizar diagnósticos
            locales más precisos y elegir los mejores enlaces de reparación.
          </p>
        </div>
      </header>

      <Card title="Decodificar VIN" subtitle="Escribe el número de bastidor para autocompletar" icon={<CheckCircle2 size={18} />}>
        <div className="input-group">
          <input
            className="input"
            value={vin}
            onChange={(e) => setVin(e.target.value.toUpperCase())}
            placeholder="Introduce los 17 caracteres del VIN..."
            maxLength={17}
          />
          <button type="button" className="button button--secondary" onClick={handleVinDecode}>
            Decodificar
          </button>
        </div>
        {vinMessage && <Note tone="info">{vinMessage}</Note>}
      </Card>

      <Card title="Datos del vehículo" icon={<Wrench size={18} />}>
        <div className="form-grid">
          <label>
            Marca
            <select
              className="select"
              value={form.make}
              onChange={(e) => setForm((c) => ({ ...c, make: e.target.value, model: '' }))}
            >
              <option value="">Selecciona...</option>
              {VEHICLE_MAKES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label>
            Modelo
            <select className="select" value={form.model} onChange={(e) => setForm((c) => ({ ...c, model: e.target.value }))}>
              <option value="">Selecciona...</option>
              {(MODELS_BY_MAKE[form.make] ?? []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label>
            Año
            <select className="select" value={form.year} onChange={(e) => setForm((c) => ({ ...c, year: e.target.value }))}>
              <option value="">Selecciona...</option>
              {VEHICLE_YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <label>
            Motor / Tipo
            <select className="select" value={form.engine} onChange={(e) => setForm((c) => ({ ...c, engine: e.target.value }))}>
              {ENGINE_OPTIONS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          className="button button--primary"
          onClick={() => onSave({ ...form, vin })}
        >
          <Save size={16} /> Guardar configuración
        </button>
      </Card>

      <Note tone="neutral">
        <strong>Vehículo actual:</strong> {describeVehicle(form)}
      </Note>
    </div>
  )
}
