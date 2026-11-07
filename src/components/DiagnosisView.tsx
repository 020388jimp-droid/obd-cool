import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { SYMPTOM_OPTIONS, type DiagnosisResult } from '../lib/diagnosis/types'
import { ifixQueryForVehicle, ifixSearchUrl } from '../data/ifix'
import type { ObdApi } from '../hooks/useObd'
import type { VehicleInfo } from '../lib/obd/types'
import { Badge, Card, EmptyState, Note, ProgressBar, SeverityBadge } from './ui'

export function DiagnosisView({
  obd,
  vehicle,
  diagnosis,
  diagnosing,
  symptoms,
  onToggleSymptom,
  onClearSymptoms,
  onRunDiagnosis,
  onOpenRepair,
  aiAvailable,
}: {
  obd: ObdApi
  vehicle: VehicleInfo
  diagnosis: DiagnosisResult | null
  diagnosing: boolean
  symptoms: string[]
  onToggleSymptom: (id: string) => void
  onClearSymptoms: () => void
  onRunDiagnosis: (mode: 'local' | 'ai') => void
  onOpenRepair: (target: { title: string; components: string[]; query: string }) => void
  aiAvailable: boolean
}) {
  const selectedSymptoms = symptoms
  const snapshot = obd.snapshot()

  return (
    <div className="view">
      <header className="view-head">
        <div>
          <span className="eyebrow">Diagnóstico inteligente</span>
          <h1>Causas, hipótesis y guía</h1>
          <p className="view-head__lead">
            Marca los síntomas que notas en el coche y combina los códigos y datos en vivo para priorizar las causas más
            probables. Elige entre el motor local sin internet o la segunda opinión de Gemini.
          </p>
        </div>
        <div className="view-head__actions">
          <button
            type="button"
            className="button button--secondary"
            onClick={() => onRunDiagnosis('local')}
            disabled={diagnosing}
          >
            <Sparkles size={16} /> Analizar (Local)
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => onRunDiagnosis('ai')}
            disabled={diagnosing || !aiAvailable}
            title={aiAvailable ? 'Consultar con Gemini' : 'Configura GEMINI_API_KEY en el Worker para usar la IA'}
          >
            <BrainCircuit size={16} /> Analizar con IA
          </button>
        </div>
      </header>

      <Card
        title="1. Selecciona los síntomas que notas"
        subtitle="Esto ayuda al motor de reglas a afinar las hipótesis cuando hay pocos códigos"
        icon={<CheckCircle2 size={18} />}
        actions={
          selectedSymptoms.length > 0 ? (
            <button type="button" className="text-button" onClick={onClearSymptoms}>
              Limpiar selección
            </button>
          ) : undefined
        }
      >
        <div className="symptom-grid">
          {SYMPTOM_OPTIONS.map((option) => {
            const active = selectedSymptoms.includes(option.id)
            return (
              <button
                key={option.id}
                type="button"
                className={`symptom-chip ${active ? 'is-active' : ''} ${option.urgent ? 'is-urgent' : ''}`}
                onClick={() => onToggleSymptom(option.id)}
              >
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </button>
            )
          })}
        </div>
        <div className="symptom-footer">
          <span>Códigos activos: <strong>{obd.codes.length}</strong></span>
          <span>Sensores en vivo: <strong>{Object.keys(snapshot).length}</strong></span>
          <span>Síntomas elegidos: <strong>{selectedSymptoms.length}</strong></span>
        </div>
      </Card>

      {!diagnosis ? (
        <EmptyState
          icon={<Sparkles size={36} />}
          title="Aún no has ejecutado el diagnóstico"
          description="Pulsa “Analizar (Local)” para calcular las hipótesis en base a tus códigos, sensores y síntomas."
          action={
            <button type="button" className="button button--primary" onClick={() => onRunDiagnosis('local')} disabled={diagnosing}>
              <Sparkles size={16} /> Ejecutar primer análisis
            </button>
          }
        />
      ) : (
        <div className="diagnosis-results">
          <Card
            title="Resultado del análisis"
            subtitle={`Generado con ${diagnosis.source === 'ai' ? `IA (${diagnosis.model || 'Gemini'})` : 'el motor de reglas local'}`}
            icon={<ShieldCheck size={18} />}
            actions={<SeverityBadge severity={diagnosis.urgency} />}
          >
            <p className="diagnosis-summary">{diagnosis.summary}</p>
            {diagnosis.safety.length > 0 && (
              <div className="safety-box">
                <strong>
                  <AlertTriangle size={16} /> Advertencias de seguridad
                </strong>
                <ul>
                  {diagnosis.safety.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card
            title="Hipótesis ordenadas por probabilidad"
            subtitle="Comprueba cada causa antes de sustituir componentes"
            icon={<Sparkles size={18} />}
          >
            <div className="hypothesis-list">
              {diagnosis.hypotheses.map((hypothesis, index) => {
                const url = ifixSearchUrl(ifixQueryForVehicle(hypothesis.ifixQuery, vehicle))
                return (
                  <div key={hypothesis.id} className="hypothesis-card">
                    <div className="hypothesis-card__head">
                      <div>
                        <span className="hypothesis-card__rank">#{index + 1}</span>
                        <h3>{hypothesis.title}</h3>
                        <span className="hypothesis-card__system">{hypothesis.system}</span>
                      </div>
                      <div className="hypothesis-card__confidence">
                        <strong>{hypothesis.confidence}%</strong>
                        <ProgressBar value={hypothesis.confidence} tone="accent" />
                      </div>
                    </div>

                    <p>{hypothesis.summary}</p>

                    {hypothesis.evidence.length > 0 && (
                      <div className="hypothesis-section">
                        <strong>Evidencia:</strong>
                        <div className="chip-row">
                          {hypothesis.evidence.map((item) => (
                            <Badge key={item} tone="neutral">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {hypothesis.checks.length > 0 && (
                      <div className="hypothesis-section">
                        <strong>Comprobaciones recomendadas:</strong>
                        <ol className="numbered-list">
                          {hypothesis.checks.map((check) => (
                            <li key={check}>{check}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    <div className="hypothesis-actions">
                      <button
                        type="button"
                        className="button button--primary"
                        onClick={() =>
                          onOpenRepair({
                            title: hypothesis.title,
                            components: hypothesis.components,
                            query: hypothesis.ifixQuery,
                          })
                        }
                      >
                        <Wrench size={16} /> Cómo repararlo
                      </button>
                      <a className="button button--ghost" href={url} target="_blank" rel="noreferrer">
                        <ExternalLink size={16} /> Buscar en iFixit
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      <Note tone="info">
        <ShieldCheck size={16} /> El motor local funciona completamente offline. La IA opcional requiere conexión y se
        conecta de forma segura a través del Worker de Cloudflare sin enviar tu VIN.
      </Note>
    </div>
  )
}
