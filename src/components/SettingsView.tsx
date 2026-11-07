import { useState } from 'react'
import {
  BrainCircuit,
  CheckCircle2,
  ExternalLink,
  Info,
  RefreshCw,
  Settings,
  ShieldCheck,
  Trash2,
  Wifi,
  WifiOff,
} from 'lucide-react'
import type { AppSettings } from '../lib/storage'
import type { ObdApi } from '../hooks/useObd'
import { ifixBaseUrl } from '../data/ifix'
import { Badge, Card, Note } from './ui'

export function SettingsView({
  settings,
  onChange,
  obd,
  aiStatus,
  onCheckAi,
  onClearData,
}: {
  settings: AppSettings
  onChange: (settings: AppSettings) => void
  obd: ObdApi
  aiStatus: 'checking' | 'available' | 'unavailable'
  onCheckAi: () => void
  onClearData: () => void
}) {
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <span className="eyebrow">Ajustes</span>
          <h1>Preferencias y privacidad</h1>
          <p className="view-head__lead">
            Personaliza la frecuencia de lectura, activa o desactiva la IA y consulta cómo se protegen tus datos.
          </p>
        </div>
      </header>

      <Card title="Diagnóstico con IA" icon={<BrainCircuit size={18} />}>
        <div className="setting-row">
          <div>
            <strong>Segunda opinión con Gemini</strong>
            <p>Envía códigos, síntomas y sensores al Worker de Cloudflare. Nunca se envía el VIN completo.</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.aiEnabled}
              onChange={(e) => onChange({ ...settings, aiEnabled: e.target.checked })}
            />
            <span />
          </label>
        </div>
        <div className="setting-row">
          <div>
            <strong>Estado del servicio</strong>
            <p>
              {aiStatus === 'available'
                ? 'La IA está disponible y lista para usarse.'
                : aiStatus === 'checking'
                  ? 'Comprobando disponibilidad...'
                  : 'La IA no está configurada. El motor local seguirá funcionando.'}
            </p>
          </div>
          <div className="setting-row__actions">
            {aiStatus === 'available' ? (
              <Badge tone="ok">
                <Wifi size={12} /> Disponible
              </Badge>
            ) : aiStatus === 'checking' ? (
              <Badge tone="info">
                <RefreshCw size={12} className="spin" /> Comprobando
              </Badge>
            ) : (
              <Badge tone="warn">
                <WifiOff size={12} /> No disponible
              </Badge>
            )}
            <button type="button" className="button button--tiny button--ghost" onClick={onCheckAi}>
              <RefreshCw size={14} /> Comprobar
            </button>
          </div>
        </div>
        <Note tone="info">
          <Info size={16} /> El motor local siempre está activo. Si la IA falla o supera su cuota gratuita, OBD COOL
          muestra el análisis local sin interrumpirte.
        </Note>
      </Card>

      <Card title="Lectura de sensores" icon={<Settings size={18} />}>
        <div className="setting-row">
          <div>
            <strong>Frecuencia de actualización</strong>
            <p>Más frecuencia ofrece datos más vivos, pero satura el ELM327 en algunos vehículos.</p>
          </div>
          <select
            className="select select--small"
            value={settings.pollingMs}
            onChange={(e) => onChange({ ...settings, pollingMs: Number(e.target.value) })}
          >
            <option value={1000}>1 segundo</option>
            <option value={1500}>1,5 segundos</option>
            <option value={2000}>2 segundos</option>
            <option value={3000}>3 segundos</option>
          </select>
        </div>
        <div className="setting-row">
          <div>
            <strong>Mostrar registro ELM327</strong>
            <p>Útil para depurar adaptadores que no responden. Puede incluir datos técnicos del vehículo.</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.showRawLogs}
              onChange={(e) => onChange({ ...settings, showRawLogs: e.target.checked })}
            />
            <span />
          </label>
        </div>
      </Card>

      {settings.showRawLogs && (
        <Card title="Registro ELM327" subtitle="Últimas tramas enviadas y recibidas" icon={<Info size={18} />}>
          {obd.logs.length === 0 ? (
            <p className="muted">Sin actividad todavía. Conecta y lee códigos para generar un registro.</p>
          ) : (
            <div className="log-list">
              {obd.logs.slice(0, 80).map((entry, index) => (
                <div key={`${entry.at}-${index}`} className={`log-line log-line--${entry.direction}`}>
                  <span>{entry.direction === 'tx' ? '→' : entry.direction === 'rx' ? '←' : 'ℹ'}</span>
                  <code>{entry.text}</code>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card title="Privacidad" icon={<ShieldCheck size={18} />}>
        <ul className="bullet-list">
          <li>Los datos del vehículo y los códigos se guardan únicamente en este navegador (localStorage).</li>
          <li>El VIN completo nunca se envía a la IA. Solo se usan marca, modelo, año, motor, códigos y sensores.</li>
          <li>La conexión con Gemini pasa por un Worker de Cloudflare con límite de peticiones.</li>
          <li>No se crean cuentas ni se sube información a servidores de OBD COOL.</li>
        </ul>
      </Card>

      <Card title="Datos locales" icon={<Trash2 size={18} />}>
        {confirmReset ? (
          <div className="danger-zone">
            <p>Se borrarán el vehículo, los ajustes y el historial local. Los códigos del coche no se modifican.</p>
            <div className="danger-zone__actions">
              <button type="button" className="button button--ghost" onClick={() => setConfirmReset(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="button button--danger"
                onClick={() => {
                  onClearData()
                  setConfirmReset(false)
                }}
              >
                <Trash2 size={16} /> Borrar datos locales
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="button button--danger" onClick={() => setConfirmReset(true)}>
            <Trash2 size={16} /> Borrar datos locales
          </button>
        )}
      </Card>

      <Card title="Acerca de OBD COOL" icon={<CheckCircle2 size={18} />}>
        <p>
          OBD COOL es una app gratuita y de código abierto para leer códigos OBD-II, interpretar fallos y enlazar
          reparaciones con iFixit. Funciona con ELM327 Bluetooth BLE o clásico y también en modo simulador.
        </p>
        <div className="about-links">
          <a className="button button--ghost" href={ifixBaseUrl()} target="_blank" rel="noreferrer">
            <ExternalLink size={16} /> Manuales de coche en iFixit
          </a>
        </div>
        <p className="muted small">
          Versión 1.0.0 · Hecho con React, Vite, Capacitor y Cloudflare Workers. Sin costes de licencia.
        </p>
        <Note tone="warn">
          <ShieldCheck size={16} /> Este software es orientativo. No sustituye el diagnóstico profesional, el manual del
          fabricante ni las normas de seguridad del vehículo.
        </Note>
      </Card>
    </div>
  )
}
