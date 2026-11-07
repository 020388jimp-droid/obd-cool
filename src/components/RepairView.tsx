import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  ChevronRight,
  ExternalLink,
  Search,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react'
import {
  guidesForComponents,
  searchRepairGuides,
  type RepairGuide,
} from '../data/repairGuides'
import { ifixSearchUrl } from '../data/ifix'
import { Badge, Card, EmptyState, Modal } from './ui'

export interface RepairTarget {
  title: string
  components: string[]
  query: string
}

function GuideDetail({
  guide,
  onClose,
  onSearchIfix,
}: {
  guide: RepairGuide | null
  onClose: () => void
  onSearchIfix: (query: string) => void
}) {
  if (!guide) return null
  return (
    <Modal open={Boolean(guide)} onClose={onClose} title={guide.name} subtitle={guide.system} wide>
      <div className="guide-meta">
        <Badge tone="accent">{guide.difficulty}</Badge>
        <Badge tone="neutral">{guide.time}</Badge>
      </div>
      <p>{guide.summary}</p>
      <h3>Herramientas necesarias</h3>
      <div className="chip-row">
        {guide.tools.map((tool) => (
          <Badge key={tool} tone="neutral">
            {tool}
          </Badge>
        ))}
      </div>
      <h3>Pasos</h3>
      <ol className="numbered-list">
        {guide.steps.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ol>
      {guide.warnings.length > 0 && (
        <div className="warning-box">
          <strong>Advertencias</strong>
          <ul>
            {guide.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
      <button type="button" className="button button--secondary" onClick={() => onSearchIfix(guide.ifixQuery)}>
        <ExternalLink size={16} /> Ver vídeos y más en iFixit
      </button>
    </Modal>
  )
}

export function RepairView({
  target,
  onClearTarget,
}: {
  target: RepairTarget | null
  onClearTarget: () => void
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<RepairGuide | null>(null)

  useEffect(() => {
    setQuery('')
  }, [target?.title])

  const targeted = useMemo(() => {
    if (!target) return []
    const fromComponents = guidesForComponents(target.components)
    const fromQuery = searchRepairGuides(target.query)
    return [...new Map([...fromComponents, ...fromQuery].map((guide) => [guide.id, guide])).values()]
  }, [target])

  const guides = target && query.trim() === '' ? targeted : searchRepairGuides(query)

  const handleIfixSearch = (ifixQuery: string) => {
    window.open(ifixSearchUrl(ifixQuery), '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <span className="eyebrow">Reparación</span>
          <h1>Guías y tutoriales</h1>
          <p className="view-head__lead">
            Repara tú mismo con instrucciones claras, herramientas necesarias y enlaces directos a los manuales y
            vídeos de iFixit.
          </p>
        </div>
      </header>

      {target && (
        <div className="repair-target">
          <Sparkles size={20} />
          <div>
            <span>Guías para tu diagnóstico</span>
            <strong>{target.title}</strong>
          </div>
          <button type="button" className="icon-button" onClick={onClearTarget} aria-label="Quitar filtro de diagnóstico">
            <X size={16} />
          </button>
        </div>
      )}

      <Card title="Buscar guías" subtitle="Componente, síntoma o código de fallo" icon={<Search size={18} />}>
        <div className="search-field search-field--big">
          <Search size={20} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ej: MAF, bujías, fuga de vacío, catalizador..."
          />
        </div>
        {target && query.trim() !== '' && (
          <p className="muted small">Buscando en todas las guías. Borra la búsqueda para volver a las recomendadas.</p>
        )}
      </Card>

      {guides.length === 0 ? (
        <EmptyState
          icon={<Wrench size={34} />}
          title="Ninguna guía coincide"
          description="Prueba con otros términos o busca directamente en iFixit."
          action={
            <a
              className="button button--secondary"
              href="https://es.ifixit.com/Device/Car_and_Truck"
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={16} /> Buscar en iFixit
            </a>
          }
        />
      ) : (
        <div className="guide-grid">
          {guides.map((guide) => (
            <button key={guide.id} type="button" className="guide-card" onClick={() => setSelected(guide)}>
              <div className="guide-card__head">
                <Wrench size={20} />
                <strong>{guide.name}</strong>
              </div>
              <p>{guide.summary}</p>
              <div className="guide-card__meta">
                <span>{guide.system}</span>
                <Badge tone="accent">{guide.difficulty}</Badge>
                <Badge tone="neutral">{guide.time}</Badge>
              </div>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      )}

      <GuideDetail guide={selected} onClose={() => setSelected(null)} onSearchIfix={handleIfixSearch} />

      <div className="ifix-strip">
        <BookOpen size={24} />
        <div>
          <h3>¿No encuentras lo que buscas?</h3>
          <p>La comunidad iFixit tiene miles de manuales para tu modelo exacto.</p>
        </div>
        <a
          className="button button--primary"
          href="https://es.ifixit.com/Device/Car_and_Truck"
          target="_blank"
          rel="noreferrer"
        >
          Ir a iFixit <ExternalLink size={16} />
        </a>
      </div>
    </div>
  )
}
