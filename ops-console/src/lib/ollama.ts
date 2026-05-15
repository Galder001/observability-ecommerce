const OLLAMA_BASE = '/ollama'
const MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.1:8b'

interface OllamaResponse {
  message: { role: string; content: string }
  done: boolean
}

async function chat(
  messages: Array<{ role: string; content: string }>,
  options: { temperature?: number; format?: string } = {}
): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.2,
      },
      ...(options.format ? { format: options.format } : {}),
    }),
  })
  if (!res.ok) throw new Error(`Ollama ${res.status}`)
  const data: OllamaResponse = await res.json()
  return data.message.content
}

// CAPA 1: clasificador de intención
// Decide qué tipo de pregunta es. Devolvemos JSON estructurado.
export type Intent =
  | 'revenue'
  | 'orders'
  | 'errors'
  | 'latency'
  | 'security'
  | 'sessions'
  | 'trace_request'
  | 'general'

export interface ClassifiedIntent {
  intent: Intent
  requestId?: string
  hoursBack?: number
}

const CLASSIFIER_SYSTEM = `Eres un clasificador de intenciones para un panel de observabilidad de e-commerce.
Tu único trabajo es leer la pregunta del usuario y devolver UN ÚNICO objeto JSON con esta forma exacta:
{ "intent": "<categoria>", "hoursBack": <numero>, "requestId": "<id o null>" }

Categorías válidas para "intent":
- "revenue": preguntas sobre ventas, ingresos, dinero, facturación
- "orders": preguntas sobre pedidos, compras, transacciones
- "errors": preguntas sobre errores, fallos, problemas, status 500
- "latency": preguntas sobre velocidad, lentitud, rendimiento, latencia, tiempos
- "security": preguntas sobre ataques, fuerza bruta, rate limit, intentos de login
- "sessions": preguntas sobre usuarios activos, sesiones, conectados
- "trace_request": el usuario pide trazar un requestId concreto
- "general": cualquier otra cosa

"hoursBack" es un entero entre 1 y 168. Si no se menciona ventana temporal, usa 24.
"requestId" solo si el usuario escribe un UUID o pide trazar una petición; si no, null.

Responde ÚNICAMENTE con el JSON. Nada más. Sin explicaciones. Sin markdown.`

export async function classify(userMessage: string): Promise<ClassifiedIntent> {
  try {
    const raw = await chat(
      [
        { role: 'system', content: CLASSIFIER_SYSTEM },
        { role: 'user', content: userMessage },
      ],
      { temperature: 0, format: 'json' }
    )
    const parsed = JSON.parse(raw)
    return {
      intent: (parsed.intent as Intent) ?? 'general',
      hoursBack: typeof parsed.hoursBack === 'number' ? parsed.hoursBack : 24,
      requestId:
        typeof parsed.requestId === 'string' && parsed.requestId.length > 8
          ? parsed.requestId
          : undefined,
    }
  } catch {
    return { intent: 'general', hoursBack: 24 }
  }
}

// CAPA 3: redactor de respuesta final
// Recibe los datos ya consultados y los convierte en una respuesta natural.
const WRITER_SYSTEM = `Eres el asistente operacional de Li Tahi+, un e-commerce.
Acabas de consultar datos en tiempo real de Prometheus y Elasticsearch.
Te paso los datos JSON. Tu trabajo: responder al usuario en español, de forma natural y concisa.

Reglas:
- Máximo 4 frases.
- Si hay números, dilos con unidades (euros, peticiones, ms).
- Si detectas un problema (errores, latencia alta, posible ataque), dilo claramente al inicio.
- Si todo está bien, dilo sin alarmar.
- No inventes datos. Si los datos están vacíos, di que no hay información.
- No menciones "Prometheus" ni "Elasticsearch" — el usuario no necesita saberlo.
- Habla como un compañero del equipo, no como un robot.`

export async function writeAnswer(
  userMessage: string,
  data: Record<string, any>
): Promise<string> {
  const payload = JSON.stringify(data, null, 2)
  return chat(
    [
      { role: 'system', content: WRITER_SYSTEM },
      {
        role: 'user',
        content: `Pregunta del usuario: "${userMessage}"\n\nDatos consultados:\n${payload}`,
      },
    ],
    { temperature: 0.4 }
  )
}

export async function checkOllamaReady(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`)
    return res.ok
  } catch {
    return false
  }
}
