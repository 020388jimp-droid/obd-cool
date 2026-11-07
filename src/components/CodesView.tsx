import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Filter,
  ListChecks,
  ScanLine,
  Search,
  ShieldAlert,
  Snowflake,
  Trash2,
  Wrench,
} from 'lucide-react'
import { getRepairGuide } from '../data/repairGuides'
import { ifixQueryForVehicle, ifixSearchUrl } from '../data/ifix'
import { PID_BY_KEY } from '../data/pids'
import type { CodeWithStatus, ObdApi } from '../hooks/useObd'
import type { DtcStatus, VehicleInfo } from '../lib/obd/types'
import type { DiagnosisSeverity } from '../lib/diagnosis/types'
import { Badge, Card, EmptyState, Modal, Note, SeverityBadge } from './ui'

const STATUS_LABEL: Record<DtcStatus, string> = {
  stored: 'Almacenado',
  pending: 'Pendiente',
  permanent: 'Permanente',
}

const STATUS_TONE: Record<DtcStatus, 'info' | 'warn' | 'danger'> = {
  stored: 'info',
  pending: 'warn',
  permanent: 'danger',
}

function codeSeverity(severity: string): DiagnosisSeverity {
  return severity === 'critica' || severity === 'alta' || severity === 'media' || severity === 'baja'
    ? severity
    : 'baja'
}

function CodeDetailModal({
  code,
  vehicle,
  onClose,
  onOpenRepair,
  onDiagnose,
}: {
  code: CodeWithStatus | null
  vehicle: VehicleInfo
  onClose: () => void
  onOpenRepair: (target: { title: string; components: string[]; query: string }) => void
  onDiagnose: () => void
}) {
  if (!code) return null
  const guides = [...new Set(code.components)].map((id) => getRepairGuide(id)).filter(Boolean)
  const url = ifixSearchUrl(ifixQueryForVehicle(code.ifixQuery, vehicle))

  return (
    <Modal
      open={Boolean(code)}
      onClose={onClose}
      title={`${code.code} · ${code.title}`}
      subtitle={`${code.system} · ${code.statuses.map((status) => STATUS_LABEL[status]).join(' / ')}`}
      wide
      footer={
        <div className="modal__footer-row">
          <a className="button button--ghost" href={url} target="_blank" rel="noreferrer">
            <ExternalLink size={16} /> Abrir en iFixit
          </a>
          <div className="modal__footer-actions">
            <button type="button" className="button button--secondary" onClick={onDiagnose}>
              <ListChecks size={16} /> Diagnosticar
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={() => {
                onOpenRepair({ title: `${code.code} · ${code.title}`, components: code.components, query: code.ifixQuery })
                onClose()
              }}
            >
              <Wrench size={16} /> Cómo repararlo
            </button>
          </div>
        </div>
      }
    >
      <div className="detail-top">
        <span className={`code-pill code-pill--${code.severity}`}>{code.code}</span>
        <SeverityBadge severity={codeSeverity(code.severity)} />
        <Badge tone="neutral">{code.generic ? 'Código genérico' : 'Código de fabricante'}</Badge>
        {code.statuses.includes('permanent') && <Badge tone="danger">No se borra con OBD</Badge>}
      </div>

      <p className="detail-description">{code.description}</p>

      {code.brandNote && (
        <Note tone="accent">
          <strong>Nota para {vehicle.make || 'tu marca'}:</strong> {code.brandNote}
        </Note>
      )}
      {code.vehicleNote && (
        <Note tone="warn">
          <strong>Histórico del modelo:</strong> {code.vehicleNote}
        </Note>
      )}

      <div className="detail-grid">
        <div>
          <h3>Síntomas habituales</h3>
          <ul className="bullet-list">
            {code.symptoms.map((symptom) => (
              <li key={symptom}>{symptom}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Causas probables</h3>
          <ul className="bullet-list">
            {code.causes.map((cause) => (
              <li key={cause}>{cause}</li>
            ))}
          </ul>
        </div>
      </div>

      <h3>Comprobaciones recomendadas</h3>
      <ol className="numbered-list">
        {code.checks.map((check) => (
          <li key={check}>{check}</li>
        ))}
      </ol>

      {guides.length > 0 && (
        <>
          <h3>Guías relacionadas</h3>
          <div className="chip-row">
            {guides.map((guide) => (
              <button
                key={guide!.id}
                type="button"
                className="chip chip--button"
                onClick={() => {
                  onOpenRepair({ title: guide!.name, components: [guide!.id], query: guide!.ifixQuery })
                  onClose()
                }}
              >
                <Wrench size={14} /> {guide!.name}
              </button>
            ))}
          </div>
        </>
      )}

      <Note tone="info">
        <ShieldAlert size={16} /> Un código indica el circuito o sistema afectado, no siempre la pieza exacta. Confirma
        con pruebas antes de cambiar componentes.
      </Note>
    </Modal>
  )
}

export function CodesView({
  obd,
  vehicle,
  selected,
  onSelect,
  onCloseSelected,
  onOpenRepair,
  onDiagnose,
}: {
  obd: ObdApi
  vehicle: VehicleInfo
  selected: CodeWithStatus | null
  onSelect: (code: CodeWithStatus) => void
  onCloseSelected: () => void
  onOpenRepair: (target: { title: string; components: string[]; query: string }) => void
  onDiagnose: () => void
}) {
  const [statusFilter, setStatusFilter] = useState<'all' | DtcStatus>('all')
  const [severityFilter, setSeverityFilter] = useState<'all' | DiagnosisSeverity>('all')
  const [query, setQuery] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const connected = obd.connection.status === 'ready'

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return obd.codes.filter((code) => {
      if (statusFilter !== 'all' && !code.statuses.includes(statusFilter)) return false
      if (severityFilter !== 'all' && code.severity !== severityFilter) return false
      if (!needle) return true
      return `${code.code} ${code.title} ${code.description} ${code.system}`.toLowerCase().includes(needle)
    })
  }, [obd.codes, query, severityFilter, statusFilter])

  const freezeEntries = obd.freezeFrame
    ? Object.entries(obd.freezeFrame.values)
        .map(([key, value]) => ({ key, value, definition: PID_BY_KEY[key] }))
        .filter((entry) => Boolean(entry.definition))
    : []

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <span className="eyebrow">Códigos de falla</span>
          <h1>Qué dice tu coche</h1>
          <p className="view-head__lead">
            Lee los códigos almacenados, pendientes y permanentes. El estado “permanente” no se borra con el comando
            OBD: solo desaparece cuando el vehículo confirma la reparación.
          </p>
        </div>
        <div className="view-head__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => void obd.readCodes()}
            disabled={!connected || obd.busy !== null}
          >
            <ScanLine size={16} /> {obd.busy === 'codes' ? 'Leyendo…' : 'Leer códigos'}
          </button>
          <button
            type="button"
            className="button button--danger"
            onClick={() => setConfirmClear(true)}
            disabled={!connected || obd.busy !== null || obd.codes.length === 0}
          >
            <Trash2 size={16} /> Borrar códigos
          </button>
        </div>
      </header>

      {!connected && (
        <Note tone="warn">
          <AlertTriangle size={16} /> Conecta el ELM327 para leer o borrar códigos. Mientras tanto puedes probar el
          simulador desde “Conectar”.
        </Note>
      )}

      <div className="codes-summary-grid">
        <Card title="Estado del testigo" icon={<CheckCircle2 size={18} />}>
          <div className="mil-card">
            <span className={`mil-light ${obd.monitor?.milOn ? 'is-on' : ''}`} />
            <div>
              <strong>{obd.monitor?.milOn ? 'MIL encendido' : 'MIL apagado'}</strong>
              <p>
                {obd.monitor
                  ? `${obd.monitor.dtcCount} código${obd.monitor.dtcCount === 1 ? '' : 's'} informado${obd.monitor.dtcCount === 1 ? '' : 's'} por la ECU`
                  : 'Lee los códigos para consultar el estado del testigo.'}
              </p>
            </div>
          </div>
          {obd.monitor && (
            <div className="readiness">
              <span className={obd.monitor.readiness.misfire ? 'is-ok' : 'is-pending'}>Fallo de combustión</span>
              <span className={obd.monitor.readiness.fuelSystem ? 'is-ok' : 'is-pending'}>Sistema de combustible</span>
              <span className={obd.monitor.readiness.components ? 'is-ok' : 'is-pending'}>Componentes</span>
            </div>
          )}
        </Card>

        <Card title="Conteo rápido" icon={<ListChecks size={18} />}>
          <div className="count-grid">
            <div>
              <strong>{obd.codes.length}</strong>
              <span>Total</span>
            </div>
            <div>
              <strong>{obd.codes.filter((code) => code.severity === 'critica' || code.severity === 'alta').length}</strong>
              <span>Prioridad alta</span>
            </div>
            <div>
              <strong>{obd.codes.filter((code) => code.statuses.includes('pending')).length}</strong>
              <span>Pendientes</span>
            </div>
            <div>
              <strong>{obd.codes.filter((code) => code.statuses.includes('permanent')).length}</strong>
              <span>Permanentes</span>
            </div>
          </div>
        </Card>
      </div>

      <Card
        title="Códigos detectados"
        subtitle={obd.codes.length > 0 ? 'Toca un código para ver causas, pruebas y guías' : 'Sin códigos por ahora'}
        icon={<Filter size={18} />}
        actions={
          <div className="filters">
            <label className="search-field">
              <Search size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar código o sistema"
                aria-label="Buscar código"
              />
            </label>
            <select
              className="select select--small"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | DtcStatus)}
              aria-label="Filtrar por estado"
            >
              <option value="all">Todos los estados</option>
              <option value="stored">Almacenados</option>
              <option value="pending">Pendientes</option>
              <option value="permanent">Permanentes</option>
            </select>
            <select
              className="select select--small"
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value as 'all' | DiagnosisSeverity)}
              aria-label="Filtrar por severidad"
            >
              <option value="all">Toda severidad</option>
              <option value="critica">Crítica</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>
        }
      >
        {obd.codes.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 size={34} />}
            title="No hay códigos guardados"
            description={
              connected
                ? 'Pulsa “Leer códigos”. Si el testigo está encendido y no aparece nada, comprueba que el contacto esté en posición II y que el adaptador sea compatible.'
                : 'Conecta el ELM327 o abre el simulador para ver una lectura de ejemplo.'
            }
            action={
              <button type="button" className="button button--primary" onClick={() => void obd.readCodes()} disabled={!connected}>
                <ScanLine size={16} /> Leer ahora
              </button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Search size={34} />}
            title="Ningún código coincide"
            description="Prueba a quitar filtros o cambiar la búsqueda."
            action={
              <button
                type="button"
                className="button button--ghost"
                onClick={() => {
                  setQuery('')
                  setStatusFilter('all')
                  setSeverityFilter('all')
                }}
              >
                Limpiar filtros
              </button>
            }
          />
        ) : (
          <ul className="code-list">
            {filtered.map((code) => (
              <li key={code.code}>
                <button type="button" className="code-card" onClick={() => onSelect(code)}>
                  <span className={`code-pill code-pill--${code.severity}`}>{code.code}</span>
                  <span className="code-card__body">
                    <span className="code-card__title">{code.title}</span>
                    <span className="code-card__description">{code.description}</span>
                    <span className="code-card__meta">
                      <span>{code.system}</span>
                      {code.statuses.map((status) => (
                        <Badge key={status} tone={STATUS_TONE[status]}>
                          {STATUS_LABEL[status]}
                        </Badge>
                      ))}
                      {code.brandNote && <Badge tone="accent">Nota de marca</Badge>}
                      {code.vehicleNote && <Badge tone="warn">Histórico del modelo</Badge>}
                    </span>
                  </span>
                  <SeverityBadge severity={codeSeverity(code.severity)} />
                  <ChevronRight size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {obd.freezeFrame && freezeEntries.length > 0 && (
        <Card
          title="Fotograma congelado"
          subtitle={`Datos capturados cuando apareció ${obd.freezeFrame.code ?? 'el fallo'}`}
          icon={<Snowflake size={18} />}
        >
          <div className="freeze-grid">
            {freezeEntries.map(({ key, value, definition }) => (
              <div key={key} className="freeze-item">
                <span>{definition!.shortName}</span>
                <strong>
                  {value.toFixed(definition!.decimals)} {definition!.unit}
                </strong>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Note tone="danger">
        <AlertTriangle size={16} /> Borrar códigos no repara el coche. Antes de borrar, guarda una captura o exporta el
        informe: si el fallo vuelve, perderás la información del fotograma congelado.
      </Note>

      <CodeDetailModal
        code={selected}
        vehicle={vehicle}
        onClose={onCloseSelected}
        onOpenRepair={onOpenRepair}
        onDiagnose={() => {
          onCloseSelected()
          onDiagnose()
        }}
      />

      <Modal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="¿Borrar todos los códigos?"
        subtitle="Esta acción envía el comando OBD 04 al vehículo."
        footer={
          <div className="modal__footer-row">
            <span className="modal__footer-note">Los códigos permanentes no se pueden borrar con OBD.</span>
            <div className="modal__footer-actions">
              <button type="button" className="button button--ghost" onClick={() => setConfirmClear(false)}>
                Cancelar
              </button>
              <button
                type="button"
                className="button button--danger"
                onClick={() => {
                  setConfirmClear(false)
                  void obd.clearCodes()
                }}
              >
                <Trash2 size={16} /> Sí, borrar
              </button>
            </div>
          </div>
        }
      >
        <Note tone="danger">
          <ShieldAlert size={16} /> No borres antes de diagnosticar. El borrado también reinicia los monitores de
          emisiones y puede hacer que no pases la inspección hasta completar los ciclos de conducción.
        </Note>
        <p>
          Si el fallo sigue presente, el código volverá. Si necesitas conservar la información, toma una captura del
          fotograma congelado y de los sensores antes de continuar.
        </p>
        <div className="confirm-list">
          <span>
            <CheckCircle2 size={15} /> Códigos detectados: {obd.codes.length}
          </span>
          <span>
            <CheckCircle2 size={15} /> Testigo MIL: {obd.monitor?.milOn ? 'encendido' : 'apagado o sin datos'}
          </span>
        </div>
      </Modal>
    </div>
  )
}
