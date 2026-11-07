import type { FreezeFrame, VehicleInfo } from '../obd/types'
import type { ResolvedDtc } from '../../data/dtcDatabase'

export type DiagnosisConfidence = number
export type DiagnosisSeverity = 'baja' | 'media' | 'alta' | 'critica'
export type DiagnosisSource = 'local' | 'ai'

export interface SymptomOption {
  id: string
  label: string
  description?: string
  urgent?: boolean
}

export const SYMPTOM_OPTIONS: SymptomOption[] = [
  { id: 'no-start', label: 'No arranca', description: 'El motor gira pero no enciende o no hace intento.' },
  { id: 'hard-start', label: 'Arranque difícil', description: 'Tarda en encender, sobre todo en frío.' },
  { id: 'rough-idle', label: 'Ralentí inestable', description: 'Vibra o baja y sube de vueltas estando detenido.' },
  { id: 'stall', label: 'Se apaga solo', description: 'El motor se detiene sin orden.' },
  { id: 'misfire', label: 'Tironeo / fallo de motor', description: 'Falta de suavidad al acelerar.' },
  { id: 'power-loss', label: 'Pérdida de potencia', description: 'El coche no responde o le cuesta subir.' },
  { id: 'high-consumption', label: 'Consumo alto', description: 'Gasta más combustible de lo normal.' },
  { id: 'overheat', label: 'Sobrecalentamiento', description: 'La aguja sube o sale vapor.', urgent: true },
  {
    id: 'mil-flashing',
    label: 'Testigo MIL parpadea',
    description: 'El testigo del motor parpadea: riesgo de dañar el catalizador.',
    urgent: true,
  },
  { id: 'white-smoke', label: 'Humo blanco', description: 'Humo espeso y persistente por el escape.' },
  { id: 'black-smoke', label: 'Humo negro', description: 'Humo oscuro, típico de mezcla rica.' },
  { id: 'blue-smoke', label: 'Humo azul', description: 'Posible consumo de aceite.' },
  { id: 'fuel-smell', label: 'Olor a gasolina', description: 'Olor fuerte cerca del motor o del depósito.' },
  { id: 'knocking', label: 'Cascabeleo', description: 'Ruido de metal al acelerar.' },
  { id: 'coolant-loss', label: 'Pérdida de refrigerante', description: 'Baja el nivel sin fuga visible.' },
  { id: 'oil-loss', label: 'Consumo de aceite', description: 'Hay que rellenar entre cambios.' },
  { id: 'vibration', label: 'Vibración', description: 'Vibra al ralentí o en marcha.' },
  { id: 'no-shift', label: 'Transmisión no cambia', description: 'Se queda en una marcha o da tirones.' },
  { id: 'abs-light', label: 'Testigo ABS', description: 'Luz de ABS o control de tracción encendida.' },
  { id: 'airbag-light', label: 'Testigo de airbag', description: 'Luz SRS encendida.' },
  { id: 'battery-light', label: 'Testigo de batería', description: 'Luz de carga encendida.' },
  { id: 'electrical', label: 'Fallas eléctricas intermitentes', description: 'Luces, módulos o mandos que fallan.' },
]

export interface DiagnosisContext {
  vehicle: VehicleInfo
  codes: ResolvedDtc[]
  snapshot: Record<string, number>
  symptoms: string[]
  freezeFrame: FreezeFrame | null
}

export interface DiagnosisHypothesis {
  id: string
  title: string
  confidence: DiagnosisConfidence
  severity: DiagnosisSeverity
  system: string
  summary: string
  evidence: string[]
  checks: string[]
  components: string[]
  ifixQuery: string
  source: DiagnosisSource
}

export interface DiagnosisNote {
  kind: 'brand' | 'model' | 'data'
  code?: string
  text: string
}

export interface DiagnosisResult {
  summary: string
  urgency: DiagnosisSeverity
  safety: string[]
  hypotheses: DiagnosisHypothesis[]
  notes: DiagnosisNote[]
  source: DiagnosisSource
  generatedAt: number
  model?: string
  freezeFrame?: FreezeFrame | null
}

export interface AiDiagnosisRequest {
  vehicle: VehicleInfo
  codes: Array<{ code: string; title: string; severity: string; system: string }>
  snapshot: Record<string, number>
  symptoms: string[]
  freezeFrame: FreezeFrame | null
  locale: 'es'
}

export interface AiDiagnosisResponse {
  summary: string
  urgency: DiagnosisSeverity
  safety: string[]
  hypotheses: Array<{
    title: string
    confidence: number
    severity: DiagnosisSeverity
    system: string
    summary: string
    evidence: string[]
    checks: string[]
    components: string[]
    ifixQuery: string
  }>
  notes?: string[]
  model?: string
}
