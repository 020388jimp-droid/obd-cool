import { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Gauge,
  Pause,
  Play,
  SlidersHorizontal,
  Zap,
} from 'lucide-react'
import { LIVE_PID_KEYS, PID_BY_KEY } from '../data/pids'
import type { ObdApi } from '../hooks/useObd'
import { Card, Note, Sparkline } from './ui'

export function LiveView({ obd }: { obd: ObdApi }) {
  const connected = obd.connection.status === 'ready'
  const [keys, setKeys] = useState<string[]>([...obd.liveKeys])
  const [pickerOpen, setPickerOpen] = useState(false)

  const toggleKey = (key: string) => {
    setKeys((current) => {
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
      if (obd.polling) {
        obd.startLive(next)
      }
      return next
    })
  }

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <span className="eyebrow">Sensores en vivo</span>
          <h1>Lectura PID en tiempo real</h1>
          <p className="view-head__lead">
            Observa las revoluciones, temperatura, ajustes de combustible y flujo de aire. Los valores anómalos suelen
            delatar fugas de vacío, termostatos abiertos o sensores descalibrados.
          </p>
        </div>
        <div className="view-head__actions">
          <button
            type="button"
            className={`button ${obd.polling ? 'button--danger' : 'button--primary'}`}
            onClick={() => {
              if (obd.polling) obd.stopLive()
              else obd.startLive(keys)
            }}
            disabled={!connected}
          >
            {obd.polling ? <Pause size={16} /> : <Play size={16} />}
            {obd.polling ? 'Detener lectura' : 'Iniciar lectura'}
          </button>
          <button type="button" className="button button--secondary" onClick={() => setPickerOpen((value) => !value)}>
            <SlidersHorizontal size={16} /> PIDs ({keys.length})
          </button>
        </div>
      </header>

      {!connected && (
        <Note tone="warn">
          <AlertTriangle size={16} /> Conecta el ELM327 o inicia el simulador para ver sensores en vivo.
        </Note>
      )}

      {pickerOpen && (
        <Card
          title="Seleccionar PIDs a consultar"
          subtitle="Elige qué sensores monitorizar en el bucle principal"
          icon={<Gauge size={18} />}
          actions={
            <button
              type="button"
              className="text-button"
              onClick={() => {
                const all = [...LIVE_PID_KEYS]
                setKeys(all)
                if (obd.polling) obd.startLive(all)
              }}
            >
              Seleccionar todos
            </button>
          }
        >
          <div className="pid-picker-grid">
            {LIVE_PID_KEYS.map((key) => {
              const def = PID_BY_KEY[key]
              if (!def) return null
              const active = keys.includes(key)
              return (
                <button
                  key={key}
                  type="button"
                  className={`pid-chip ${active ? 'is-active' : ''}`}
                  onClick={() => toggleKey(key)}
                >
                  <span className="pid-dot" />
                  <span>{def.name}</span>
                  <small>{def.unit}</small>
                </button>
              )
            })}
          </div>
        </Card>
      )}

      <div className="gauge-grid">
        {keys.map((key) => {
          const def = PID_BY_KEY[key]
          const liveValue = obd.live[key]
          if (!def) return null
          const val = liveValue?.value ?? 0
          const history = liveValue?.history ?? []

          return (
            <div key={key} className="gauge-card">
              <div className="gauge-card__head">
                <strong>{def.name}</strong>
                <span className="badge badge--neutral">{def.shortName}</span>
              </div>
              <div className="gauge-card__value">
                <strong>{val.toFixed(def.decimals)}</strong>
                <small>{def.unit}</small>
              </div>
              <div className="gauge-card__spark">
                <Sparkline values={history} tone="accent" />
              </div>
              <div className="gauge-card__footer">
                <small>Normal: {def.normal}</small>
                {liveValue && (
                  <span className="live-pill">
                    <Activity size={12} />
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Note tone="info">
        <Zap size={16} /> Los ajustes de combustible (STFT y LTFT) cercanos a 0 % indican una mezcla ideal. Valores de
        LTFT superiores a +10 % sugieren mezcla pobre (fuga de aire o baja presión), mientras que valores inferiores a -10
        % indican mezcla rica (inyector con fuga o exceso de presión).
      </Note>
    </div>
  )
}
