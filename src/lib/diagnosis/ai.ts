import type { AiDiagnosisRequest, AiDiagnosisResponse, DiagnosisContext, DiagnosisResult, DiagnosisSeverity } from './types'

const DEFAULT_ENDPOINT = '/api/diagnose'

function endpoint(): string {
  return (import.meta.env.VITE_AI_ENDPOINT || DEFAULT_ENDPOINT).replace(/\/+$/, '')
}

function severity(value: string | undefined): DiagnosisSeverity {
  if (value === 'baja' || value === 'media' || value === 'alta' || value === 'critica') return value
  return 'media'
}

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

function stringList(value: unknown, max = 6): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim().slice(0, 280))
    .slice(0, max)
}

export function buildAiRequest(ctx: DiagnosisContext): AiDiagnosisRequest {
  return {
    vehicle: {
      make: ctx.vehicle.make.slice(0, 40),
      model: ctx.vehicle.model.slice(0, 40),
      year: ctx.vehicle.year.slice(0, 8),
      engine: ctx.vehicle.engine.slice(0, 40),
      // El VIN completo no se envía a la IA por privacidad: solo el vehículo declarado.
      vin: '',
    },
    codes: ctx.codes.slice(0, 40).map((code) => ({
      code: code.code,
      title: code.title,
      severity: code.severity,
      system: code.system,
    })),
    snapshot: Object.fromEntries(
      Object.entries(ctx.snapshot)
        .filter(([, value]) => Number.isFinite(value))
        .slice(0, 40)
        .map(([key, value]) => [key, Math.round(value * 100) / 100]),
    ),
    symptoms: ctx.symptoms.slice(0, 20),
    freezeFrame: ctx.freezeFrame,
    locale: 'es',
  }
}

export async function requestAiDiagnosis(ctx: DiagnosisContext): Promise<DiagnosisResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)
  try {
    const response = await fetch(endpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildAiRequest(ctx)),
      signal: controller.signal,
      credentials: 'omit',
    })

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('La IA gratuita alcanzó su límite por minuto. Espera un momento o usa el análisis local.')
      }
      if (response.status === 503) {
        throw new Error('La IA no está configurada en este despliegue. Puedes usar el análisis local.')
      }
      throw new Error(`La IA respondió con error ${response.status}.`)
    }

    const data = (await response.json()) as AiDiagnosisResponse
    if (!data || typeof data.summary !== 'string' || !Array.isArray(data.hypotheses)) {
      throw new Error('La IA devolvió una respuesta incompleta.')
    }

    const hypotheses = data.hypotheses
      .filter((item) => item && typeof item.title === 'string' && item.title.trim().length > 0)
      .slice(0, 6)
      .map((item, index) => ({
        id: `ai-${slug(item.title) || index}`,
        title: item.title.trim().slice(0, 120),
        confidence: Math.max(5, Math.min(95, Math.round(Number(item.confidence) || 50))),
        severity: severity(item.severity),
        system: (item.system || 'Motor').slice(0, 40),
        summary: (item.summary || '').slice(0, 600),
        evidence: stringList(item.evidence),
        checks: stringList(item.checks),
        components: stringList(item.components, 8),
        ifixQuery: (item.ifixQuery || item.title).slice(0, 80),
        source: 'ai' as const,
      }))

    if (hypotheses.length === 0) {
      throw new Error('La IA no generó hipótesis utilizables.')
    }

    return {
      summary: data.summary.slice(0, 900),
      urgency: severity(data.urgency),
      safety: stringList(data.safety, 8),
      hypotheses,
      notes: stringList(data.notes, 8).map((text) => ({ kind: 'data' as const, text })),
      source: 'ai',
      generatedAt: Date.now(),
      model: data.model,
      freezeFrame: ctx.freezeFrame,
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('La IA tardó demasiado en responder. Se usará el análisis local.')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}

export async function checkAiHealth(): Promise<{ ok: boolean; model?: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 5000)
  try {
    const response = await fetch(endpoint(), {
      method: 'GET',
      signal: controller.signal,
      credentials: 'omit',
    })
    if (!response.ok) return { ok: false }
    const data = (await response.json()) as { ok?: boolean; model?: string }
    return { ok: Boolean(data.ok), model: data.model }
  } catch {
    return { ok: false }
  } finally {
    clearTimeout(timer)
  }
}
