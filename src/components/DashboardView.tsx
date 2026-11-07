import {
  Activity,
  ArrowUpRight,
  Bluetooth,
  Car,
  ChevronRight,
  CircleHelp,
  Gauge,
  ListChecks,
  PlugZap,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react'
import type { CodeWithStatus, ObdApi } from '../hooks/useObd'
import type { DiagnosisResult } from '../lib/diagnosis/types'
import { describeVehicle } from '../data/vehicles'
import type { VehicleInfo } from '../lib/obd/types'
import type { ViewId } from '../types'
import { Badge, Card, ProgressBar, SeverityBadge } from './ui'

function timeAgo(timestamp: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 60) return `hace ${seconds} s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`
  return `hace ${Math.round(minutes / 60)} h`
}

export function DashboardView({
  obd,
  vehicle,
  diagnosis,
  onOpenConnection,
  onNavigate,
  onSelectCode,
}: {
  obd: ObdApi
  vehicle: VehicleInfo
  diagnosis: DiagnosisResult | null
  onOpenConnection: () => void
  onNavigate: (view: ViewId) => void
  onSelectCode: (code: CodeWithStatus) => void
}) {
  const connected = obd.connection.status === 'ready'
  const liveCount = Object.keys(obd.live).length
  const critical = obd.codes.filter((code) => code.severity === 'critica' || code.severity === 'alta')
  const topCodes = [...critical, ...obd.codes.filter((code) => !critical.includes(code))].slice(0, 4)

  return (
    <div className="view view--dashboard">
      <header className="view-head">
        <div>
          <span className="eyebrow">Panel de diagnóstico</span>
          <h1>Hola, conductor.</h1>
          <p className="view-head__lead">
            {connected
              ? `Estás conectado a ${obd.connection.deviceName}. Todo listo para revisar ${describeVehicle(vehicle)}.`
              : 'Conecta tu ELM327 o usa el simulador para explorar la app sin coche.'}
          </p>
        </div>
        <div className="view-head__actions">
          <button type="button" className="button button--primary" onClick={onOpenConnection}>
            {connected ? <Bluetooth size={16} /> : <PlugZap size={16} />}
            {connected ? 'Cambiar conexión' : 'Conectar ELM327'}
          </button>
        </div>
      </header>

      <section className="hero-card">
        <div className="hero-card__content">
          <span className="hero-card__tag">
            <ShieldCheck size={14} /> Diagnóstico guiado
          </span>
          <h2>Lee el código. Entiende la causa. Encuentra la reparación.</h2>
          <p>
            OBD COOL cruza los códigos DTC con tu marca y modelo, revisa sensores en vivo y te lleva al manual o vídeo
            exacto de iFixit. La IA es opcional: el motor local funciona sin internet.
          </p>
          <div className="hero-card__actions">
            <button type="button" className="button button--primary" onClick={() => void obd.readCodes()} disabled={!connected || obd.busy !== null}>
              <ScanLine size={16} /> Leer códigos
            </button>
            <button type="button" className="button button--secondary" onClick={() => onNavigate('live')}>
              <Gauge size={16} /> Ver sensores
            </button>
            <button type="button" className="button button--ghost" onClick={() => onNavigate('diagnosis')}>
              <Sparkles size={16} /> Diagnosticar
            </button>
          </div>
        </div>
        <div className="hero-card__visual" aria-hidden="true">
          <div className="hero-ring hero-ring--outer" />
          <div className="hero-ring hero-ring--inner" />
          <div className="hero-car">
            <Car size={64} strokeWidth={1.2} />
          </div>
          <span className="hero-pulse hero-pulse--one" />
          <span className="hero-pulse hero-pulse--two" />
        </div>
      </section>

      <div className="stat-grid">
        <button type="button" className="stat-card" onClick={onOpenConnection}>
          <span className={`stat-card__icon ${connected ? 'is-ok' : ''}`}>
            {connected ? <Bluetooth size={20} /> : <PlugZap size={20} />}
          </span>
          <span className="stat-card__label">Conexión</span>
          <strong>{connected ? 'Lista' : obd.connection.status === 'connecting' ? 'Conectando…' : 'Sin conectar'}</strong>
          <small>{obd.firmware || 'ELM327 / BLE'}</small>
        </button>
        <button type="button" className="stat-card" onClick={() => onNavigate('vehicle')}>
          <span className="stat-card__icon">
            <Car size={20} />
          </span>
          <span className="stat-card__label">Vehículo</span>
          <strong>{vehicle.make || 'Sin configurar'}</strong>
          <small>{vehicle.model ? `${vehicle.model}${vehicle.year ? ` · ${vehicle.year}` : ''}` : 'Añade marca y modelo'}</small>
        </button>
        <button type="button" className="stat-card" onClick={() => onNavigate('codes')}>
          <span className={`stat-card__icon ${obd.codes.length > 0 ? 'is-warn' : ''}`}>
            <ListChecks size={20} />
          </span>
          <span className="stat-card__label">Códigos</span>
          <strong>{obd.codes.length}</strong>
          <small>{obd.codes.length === 0 ? 'Sin códigos guardados' : `${critical.length} de prioridad alta`}</small>
        </button>
        <button type="button" className="stat-card" onClick={() => onNavigate('live')}>
          <span className={`stat-card__icon ${obd.polling ? 'is-live' : ''}`}>
            <Activity size={20} />
          </span>
          <span className="stat-card__label">Sensores</span>
          <strong>{liveCount}</strong>
          <small>{obd.polling ? 'Leyendo en vivo' : liveCount > 0 ? 'Última captura' : 'Sin datos todavía'}</small>
        </button>
      </div>

      <div className="dashboard-grid">
        <Card
          title="Prioridad de revisión"
          subtitle={obd.codes.length > 0 ? 'Ordenado por severidad y relevancia' : 'Aún no hay códigos leídos'}
          icon={<ListChecks size={18} />}
          actions={
            <button type="button" className="text-button" onClick={() => onNavigate('codes')}>
              Ver todos <ChevronRight size={14} />
            </button>
          }
        >
          {topCodes.length === 0 ? (
            <div className="mini-empty">
              <ShieldCheck size={28} />
              <div>
                <strong>Sin códigos de falla</strong>
                <p>Conecta el adaptador y pulsa “Leer códigos”. Si hay un testigo encendido, no lo ignores.</p>
              </div>
            </div>
          ) : (
            <ul className="priority-list">
              {topCodes.map((code) => (
                <li key={code.code}>
                  <button type="button" className="priority-item" onClick={() => onSelectCode(code)}>
                    <span className={`code-pill code-pill--${code.severity}`}>{code.code}</span>
                    <span className="priority-item__body">
                      <strong>{code.title}</strong>
                      <small>
                        {code.system} · {code.statuses.join(' / ')}
                      </small>
                    </span>
                    <SeverityBadge severity={code.severity === 'info' ? 'baja' : code.severity} />
                    <ChevronRight size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Último diagnóstico"
          subtitle={diagnosis ? `Generado ${timeAgo(diagnosis.generatedAt)}` : 'Aún no has analizado el vehículo'}
          icon={<Sparkles size={18} />}
          actions={
            <button type="button" className="text-button" onClick={() => onNavigate('diagnosis')}>
              Abrir <ChevronRight size={14} />
            </button>
          }
        >
          {diagnosis ? (
            <div className="diagnosis-preview">
              <div className="diagnosis-preview__head">
                <Badge tone={diagnosis.source === 'ai' ? 'accent' : 'info'}>
                  {diagnosis.source === 'ai' ? 'IA + local' : 'Motor local'}
                </Badge>
                <SeverityBadge severity={diagnosis.urgency} />
              </div>
              <p>{diagnosis.summary}</p>
              {diagnosis.hypotheses[0] && (
                <div className="diagnosis-preview__top">
                  <span>{diagnosis.hypotheses[0].title}</span>
                  <strong>{diagnosis.hypotheses[0].confidence}%</strong>
                  <ProgressBar value={diagnosis.hypotheses[0].confidence} tone="accent" />
                </div>
              )}
            </div>
          ) : (
            <div className="mini-empty">
              <Sparkles size={28} />
              <div>
                <strong>Diagnóstico en 2 pasos</strong>
                <p>Lee los códigos, marca los síntomas y deja que el motor local priorice las causas.</p>
              </div>
            </div>
          )}
        </Card>

        <Card title="Acciones rápidas" subtitle="Todo lo que necesitas, a un toque" icon={<ArrowUpRight size={18} />}>
          <div className="quick-grid">
            <button type="button" className="quick-action" onClick={() => onNavigate('codes')}>
              <ScanLine size={20} />
              <span>
                <strong>Leer códigos</strong>
                <small>DTC almacenados, pendientes y permanentes</small>
              </span>
            </button>
            <button type="button" className="quick-action" onClick={() => onNavigate('live')}>
              <Gauge size={20} />
              <span>
                <strong>Sensores en vivo</strong>
                <small>RPM, temperatura, mezcla, MAF y más</small>
              </span>
            </button>
            <button type="button" className="quick-action" onClick={() => onNavigate('repair')}>
              <Wrench size={20} />
              <span>
                <strong>Cómo repararlo</strong>
                <small>Guías paso a paso y vídeos de iFixit</small>
              </span>
            </button>
            <button type="button" className="quick-action" onClick={() => onNavigate('vehicle')}>
              <Car size={20} />
              <span>
                <strong>Mi vehículo</strong>
                <small>Marca, modelo, año y VIN</small>
              </span>
            </button>
          </div>
        </Card>

        <Card title="Cómo funciona" subtitle="Sin humo: así se usa OBD COOL" icon={<CircleHelp size={18} />}>
          <ol className="steps-list">
            <li>
              <span>1</span>
              <div>
                <strong>Conecta</strong>
                <p>Enchufa el ELM327, enciende el contacto y elige Bluetooth BLE o clásico.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Lee y observa</strong>
                <p>Guarda los códigos, revisa el fotograma congelado y los sensores en vivo.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Diagnostica y repara</strong>
                <p>Compara hipótesis, revisa la seguridad y abre la guía exacta en iFixit.</p>
              </div>
            </li>
          </ol>
        </Card>
      </div>

      <div className="disclaimer-strip">
        <ShieldCheck size={18} />
        <p>
          OBD COOL es una ayuda orientativa. No sustituye el manual del fabricante ni una inspección física. No borres
          códigos antes de diagnosticar: puedes ocultar la causa y afectar la prueba de emisiones.
        </p>
      </div>
    </div>
  )
}
