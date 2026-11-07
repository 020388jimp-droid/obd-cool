import { useEffect, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, Loader2, X } from 'lucide-react'
import type { Toast } from '../hooks/useObd'
import type { DiagnosisSeverity } from '../lib/diagnosis/types'

export type Tone = 'neutral' | 'accent' | 'ok' | 'warn' | 'danger' | 'info'

export function Card({
  title,
  subtitle,
  icon,
  actions,
  children,
  className = '',
  tone = 'neutral',
}: {
  title?: string
  subtitle?: string
  icon?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  tone?: Tone
}) {
  return (
    <section className={`card card--${tone} ${className}`.trim()}>
      {(title || actions) && (
        <header className="card__header">
          <div className="card__heading">
            {icon && <span className="card__icon">{icon}</span>}
            <div>
              {title && <h2 className="card__title">{title}</h2>}
              {subtitle && <p className="card__subtitle">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="card__actions">{actions}</div>}
        </header>
      )}
      <div className="card__body">{children}</div>
    </section>
  )
}

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return <span className={`badge badge--${tone} ${className}`.trim()}>{children}</span>
}

const SEVERITY_LABEL: Record<DiagnosisSeverity, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
}

const SEVERITY_TONE: Record<DiagnosisSeverity, Tone> = {
  baja: 'ok',
  media: 'info',
  alta: 'warn',
  critica: 'danger',
}

export function SeverityBadge({ severity }: { severity: DiagnosisSeverity }) {
  return <Badge tone={SEVERITY_TONE[severity]}>{SEVERITY_LABEL[severity]}</Badge>
}

export function Spinner({ size = 16 }: { size?: number }) {
  return <Loader2 size={size} className="spin" aria-hidden="true" />
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <div className="empty__action">{action}</div>}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={onClose}>
      <div
        className={`modal__panel ${wide ? 'modal__panel--wide' : ''}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal__header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>
  )
}

export function Sparkline({
  values,
  tone = 'accent',
}: {
  values: number[]
  tone?: 'accent' | 'ok' | 'warn' | 'danger'
}) {
  const width = 120
  const height = 34
  if (values.length === 0) {
    return <svg className={`spark spark--${tone}`} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" />
  }
  const data = values.length === 1 ? [values[0]!, values[0]!] : values
  const min = Math.min(...data)
  const max = Math.max(...data)
  const span = max - min || 1
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width
      const y = height - 3 - ((value - min) / span) * (height - 6)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg className={`spark spark--${tone}`} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline points={points} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ProgressBar({
  value,
  max = 100,
  tone = 'accent',
}: {
  value: number
  max?: number
  tone?: 'accent' | 'ok' | 'warn' | 'danger'
}) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className={`progress progress--${tone}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={max}>
      <span style={{ width: `${percent}%` }} />
    </div>
  )
}

export function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`}>
          {toast.type === 'ok' && <CheckCircle2 size={18} />}
          {toast.type === 'error' && <AlertTriangle size={18} />}
          {toast.type === 'info' && <Info size={18} />}
          <span>{toast.text}</span>
          <button type="button" className="toast__close" onClick={() => onDismiss(toast.id)} aria-label="Cerrar aviso">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

export function Note({ children, tone = 'info' }: { children: ReactNode; tone?: Tone }) {
  return <div className={`note note--${tone}`}>{children}</div>
}

export function KeyValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="kv">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
