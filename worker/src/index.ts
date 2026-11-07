interface Env {
  GEMINI_API_KEY?: string
  GEMINI_MODEL?: string
  ALLOWED_ORIGINS?: string
  RATE_LIMIT_PER_MINUTE?: string
}

interface SanitizedRequest {
  vehicle: { make: string; model: string; year: string; engine: string }
  codes: Array<{ code: string; title: string; severity: string; system: string }>
  snapshot: Record<string, number>
  symptoms: string[]
  freezeFrame: { code?: string; values: Record<string, number> } | null
}

const DEFAULT_MODEL = 'gemini-2.5-flash'
const MAX_BODY_BYTES = 32 * 1024
const ALLOWED_COMPONENTS = new Set([
  'maf-sensor',
  'vacuum-hoses',
  'intake-gasket',
  'pcv-valve',
  'air-filter',
  'iat-sensor',
  'throttle-body',
  'spark-plugs',
  'ignition-coils',
  'injectors',
  'fuel-filter',
  'fuel-pump',
  'fuel-pressure-regulator',
  'o2-sensor',
  'catalytic-converter',
  'exhaust',
  'coolant',
  'thermostat',
  'coolant-temp-sensor',
  'radiator-fan',
  'water-pump',
  'head-gasket',
  'battery',
  'alternator',
  'serpentine-belt',
  'wiring',
  'can-bus',
  'ecu',
  'crankshaft-sensor',
  'camshaft-sensor',
  'vvt-solenoid',
  'timing-chain',
  'oil-change',
  'oil-pressure-sensor',
  'compression',
  'knock-sensor',
  'egr-valve',
  'evap-purge-valve',
  'evap-vent-valve',
  'gas-cap',
  'turbo-wastegate',
  'intercooler',
  'boost-control-solenoid',
  'dpf',
  'def-system',
  'nox-sensor',
  'scr-catalyst',
  'intake-manifold',
  'accelerator-pedal',
  'transmission-fluid',
  'transmission-solenoid',
  'tcm',
  'wheel-speed-sensor',
  'airbag-clock-spring',
  'taller-especializado',
])

const buckets = new Map<string, number[]>()

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin')
  const allowed = (env.ALLOWED_ORIGINS || '*')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  let allowOrigin = ''
  if (allowed.includes('*')) allowOrigin = '*'
  else if (origin && allowed.includes(origin)) allowOrigin = origin

  if (!allowOrigin) return {}
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function json(
  request: Request,
  env: Env,
  body: unknown,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(request, env),
    },
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 100) / 100 : null
}

function sanitize(body: unknown): SanitizedRequest | null {
  if (!isRecord(body)) return null

  const vehicleRaw = isRecord(body.vehicle) ? body.vehicle : {}
  const codesRaw = Array.isArray(body.codes) ? body.codes : []
  const snapshotRaw = isRecord(body.snapshot) ? body.snapshot : {}
  const symptomsRaw = Array.isArray(body.symptoms) ? body.symptoms : []

  const codes = codesRaw
    .filter(isRecord)
    .map((code) => ({
      code: text(code.code, 8).toUpperCase(),
      title: text(code.title, 160),
      severity: text(code.severity, 12),
      system: text(code.system, 40),
    }))
    .filter((code) => /^[PCBU][0-3][0-9A-F]{3}$/.test(code.code))
    .slice(0, 40)

  const snapshot: Record<string, number> = {}
  for (const [key, raw] of Object.entries(snapshotRaw).slice(0, 40)) {
    const parsed = number(raw)
    if (parsed !== null && /^[a-zA-Z0-9_]{1,24}$/.test(key)) snapshot[key] = parsed
  }

  const symptoms = symptomsRaw
    .map((symptom) => text(symptom, 60))
    .filter(Boolean)
    .slice(0, 20)

  let freezeFrame: SanitizedRequest['freezeFrame'] = null
  if (isRecord(body.freezeFrame)) {
    const values: Record<string, number> = {}
    const valuesRaw = isRecord(body.freezeFrame.values) ? body.freezeFrame.values : {}
    for (const [key, raw] of Object.entries(valuesRaw).slice(0, 30)) {
      const parsed = number(raw)
      if (parsed !== null && /^[a-zA-Z0-9_]{1,24}$/.test(key)) values[key] = parsed
    }
    freezeFrame = {
      code: text(body.freezeFrame.code, 8) || undefined,
      values,
    }
  }

  return {
    vehicle: {
      make: text(vehicleRaw.make, 40),
      model: text(vehicleRaw.model, 40),
      year: text(vehicleRaw.year, 8),
      engine: text(vehicleRaw.engine, 40),
    },
    codes,
    snapshot,
    symptoms,
    freezeFrame,
  }
}

function isRateLimited(request: Request, env: Env): boolean {
  const limit = Math.max(1, Math.min(120, Number.parseInt(env.RATE_LIMIT_PER_MINUTE || '12', 10) || 12))
  const key = request.headers.get('CF-Connecting-IP') || 'local'
  const now = Date.now()
  const recent = (buckets.get(key) || []).filter((timestamp) => now - timestamp < 60_000)
  if (recent.length >= limit) {
    buckets.set(key, recent)
    return true
  }
  recent.push(now)
  buckets.set(key, recent)
  if (buckets.size > 2000) {
    for (const [bucketKey, timestamps] of buckets) {
      if (timestamps.every((timestamp) => now - timestamp >= 60_000)) buckets.delete(bucketKey)
    }
  }
  return false
}

function buildPrompt(input: SanitizedRequest): string {
  return [
    'Eres un técnico automotriz experto en diagnóstico OBD-II. Analiza el caso y devuelve SOLO un objeto JSON válido, sin markdown.',
    '',
    'Contexto del vehículo:',
    JSON.stringify(input.vehicle),
    '',
    'Códigos DTC detectados:',
    JSON.stringify(input.codes),
    '',
    'Síntomas declarados por el conductor:',
    JSON.stringify(input.symptoms),
    '',
    'Datos de sensores en vivo (unidades: rpm, km/h, °C, %, g/s, V, kPa, L/h):',
    JSON.stringify(input.snapshot),
    '',
    'Fotograma congelado (si existe):',
    JSON.stringify(input.freezeFrame),
    '',
    'Reglas obligatorias:',
    '- Responde en español claro, para un conductor no experto.',
    '- No inventes códigos ni datos que no estén en el contexto.',
    '- Prioriza la seguridad: si hay riesgo de daño grave, indícalo primero.',
    '- No recomiendes borrar códigos antes de diagnosticar. Borrar sin reparar puede ocultar fallos y afectar la inspección de emisiones.',
    '- Usa los datos en vivo para confirmar o descartar hipótesis; si faltan, dilo.',
    '- Máximo 6 hipótesis, ordenadas de mayor a menor confianza.',
    '- Cada hipótesis debe tener entre 1 y 4 comprobaciones concretas y seguras.',
    '- Los componentes deben ser slugs de esta lista:',
    Array.from(ALLOWED_COMPONENTS).join(', '),
    '- ifixQuery debe ser una búsqueda corta en español para iFixit (por ejemplo: "fuga de vacío admisión").',
    '- La confianza es un número 0-100. No es una probabilidad estadística; es tu grado de sospecha.',
    '',
    'Formato exacto:',
    JSON.stringify({
      summary: 'resumen de 2-4 frases',
      urgency: 'baja|media|alta|critica',
      safety: ['advertencia 1', 'advertencia 2'],
      hypotheses: [
        {
          title: 'causa probable',
          confidence: 0,
          severity: 'baja|media|alta|critica',
          system: 'Admisión|Combustible|Encendido|Emisiones|Refrigeración|Eléctrico|Transmisión|ABS|Airbag|Red CAN|Motor',
          summary: 'explicación breve',
          evidence: ['dato concreto del contexto'],
          checks: ['comprobación segura'],
          components: ['slug-de-la-lista'],
          ifixQuery: 'búsqueda para iFixit',
        },
      ],
      notes: ['nota útil o limitación del análisis'],
    }),
  ].join('\n')
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    finishReason?: string
  }>
  promptFeedback?: { blockReason?: string }
  error?: { message?: string }
}

interface AiHypothesis {
  title: string
  confidence: number
  severity: string
  system: string
  summary: string
  evidence: string[]
  checks: string[]
  components: string[]
  ifixQuery: string
}

function stringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim().slice(0, 280))
    .slice(0, max)
}

function normalizeAi(raw: unknown, model: string): Record<string, unknown> | null {
  if (!isRecord(raw)) return null
  const hypothesesRaw = Array.isArray(raw.hypotheses) ? raw.hypotheses : []
  const hypotheses: AiHypothesis[] = []

  for (const item of hypothesesRaw.slice(0, 6)) {
    if (!isRecord(item)) continue
    const title = text(item.title, 120)
    if (!title) continue
    const components = stringList(item.components, 8).filter((component) => ALLOWED_COMPONENTS.has(component))
    hypotheses.push({
      title,
      confidence: Math.max(5, Math.min(95, Math.round(Number(item.confidence) || 50))),
      severity: ['baja', 'media', 'alta', 'critica'].includes(String(item.severity)) ? String(item.severity) : 'media',
      system: text(item.system, 40) || 'Motor',
      summary: text(item.summary, 600),
      evidence: stringList(item.evidence, 4),
      checks: stringList(item.checks, 4),
      components,
      ifixQuery: text(item.ifixQuery, 80) || title,
    })
  }

  if (hypotheses.length === 0) return null

  return {
    summary: text(raw.summary, 900),
    urgency: ['baja', 'media', 'alta', 'critica'].includes(String(raw.urgency)) ? String(raw.urgency) : 'media',
    safety: stringList(raw.safety, 6),
    hypotheses,
    notes: stringList(raw.notes, 6),
    model,
  }
}

function parseModelText(textValue: string): unknown {
  const cleaned = textValue
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/i, '')
    .trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

async function diagnose(request: Request, env: Env): Promise<Response> {
  if (!env.GEMINI_API_KEY) {
    return json(
      request,
      env,
      { error: 'La IA no está configurada. Usa el análisis local o configura GEMINI_API_KEY.' },
      503,
    )
  }

  const contentLength = Number.parseInt(request.headers.get('Content-Length') || '0', 10)
  if (contentLength > MAX_BODY_BYTES) {
    return json(request, env, { error: 'La solicitud es demasiado grande.' }, 413)
  }

  if (isRateLimited(request, env)) {
    return json(request, env, { error: 'Demasiadas solicitudes. Espera un minuto y vuelve a intentar.' }, 429)
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json(request, env, { error: 'JSON inválido.' }, 400)
  }

  const input = sanitize(body)
  if (!input) return json(request, env, { error: 'Solicitud inválida.' }, 400)
  if (input.codes.length === 0 && input.symptoms.length === 0 && Object.keys(input.snapshot).length === 0) {
    return json(request, env, { error: 'Envía al menos un código, un síntoma o datos en vivo.' }, 400)
  }

  const model = env.GEMINI_MODEL || DEFAULT_MODEL
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25_000)

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: 'Eres un asistente de diagnóstico automotriz. Tu prioridad es la seguridad del conductor y del vehículo. No inventes datos. Devuelve JSON válido.',
              },
            ],
          },
          contents: [{ role: 'user', parts: [{ text: buildPrompt(input) }] }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.9,
            maxOutputTokens: 3072,
            responseMimeType: 'application/json',
          },
        }),
      },
    )

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '')
      console.error('Gemini error', upstream.status, detail.slice(0, 500))
      if (upstream.status === 429) {
        return json(request, env, { error: 'La cuota gratuita de Gemini está agotada. Usa el análisis local.' }, 429)
      }
      return json(request, env, { error: 'El servicio de IA no está disponible ahora mismo.' }, 502)
    }

    const data = (await upstream.json()) as GeminiResponse
    if (data.promptFeedback?.blockReason) {
      return json(request, env, { error: 'La IA bloqueó la solicitud por seguridad.' }, 422)
    }
    const modelText = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || ''
    if (!modelText) {
      return json(request, env, { error: 'La IA no devolvió contenido. Inténtalo de nuevo.' }, 502)
    }

    const normalized = normalizeAi(parseModelText(modelText), model)
    if (!normalized) {
      return json(request, env, { error: 'La IA devolvió un formato no válido. Usa el análisis local.' }, 502)
    }

    return json(request, env, normalized)
  } catch (error) {
    console.error('AI proxy failure', (error as Error).message)
    return json(request, env, { error: 'No se pudo contactar con la IA. Usa el análisis local.' }, 502)
  } finally {
    clearTimeout(timer)
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) })
    }

    if (url.pathname === '/api/health' || (url.pathname === '/api/diagnose' && request.method === 'GET')) {
      return json(request, env, {
        ok: Boolean(env.GEMINI_API_KEY),
        model: env.GEMINI_MODEL || DEFAULT_MODEL,
        service: 'obd-cool-ai',
      })
    }

    if (url.pathname === '/api/diagnose' && request.method === 'POST') {
      return diagnose(request, env)
    }

    if (url.pathname === '/') {
      return json(request, env, {
        service: 'OBD COOL AI proxy',
        endpoints: ['GET /api/health', 'POST /api/diagnose'],
      })
    }

    return json(request, env, { error: 'Ruta no encontrada.' }, 404)
  },
}
