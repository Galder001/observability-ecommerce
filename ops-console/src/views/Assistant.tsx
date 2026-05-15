import { useEffect, useRef, useState } from 'react'
import { Send, Sparkles, Loader2 } from 'lucide-react'
import { ask } from '../lib/copilot'
import type { ChatMessage } from '../types'

const SUGGESTIONS = [
  '¿Cuánto hemos vendido hoy?',
  '¿Hay algún error preocupante ahora mismo?',
  '¿Cómo está la latencia del checkout?',
  '¿Estamos sufriendo algún ataque de fuerza bruta?',
  '¿Cuántos usuarios hay conectados?',
]

export function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'system',
      content:
        'Soy el copiloto operacional de Li Tahi+. Pregúntame en lenguaje natural sobre métricas, errores, seguridad o tráfico — consulto Prometheus y Elasticsearch en tiempo real.',
    },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text: string) {
    if (!text.trim() || busy) return
    setInput('')
    setBusy(true)
    setMessages((m) => [...m, { role: 'user', content: text }])
    setMessages((m) => [...m, { role: 'thinking', content: 'Consultando métricas y logs...' }])

    try {
      const { answer, metadata } = await ask(text)
      setMessages((m) => {
        const trimmed = m.filter((x) => x.role !== 'thinking')
        return [...trimmed, { role: 'assistant', content: answer, metadata }]
      })
    } catch (e: any) {
      setMessages((m) => {
        const trimmed = m.filter((x) => x.role !== 'thinking')
        return [
          ...trimmed,
          {
            role: 'assistant',
            content: `Error consultando el sistema: ${e?.message ?? 'desconocido'}. Comprueba que Ollama esté arrancado y que el modelo esté descargado.`,
          },
        ]
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="px-8 py-5 border-b border-litahi-border">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Sparkles className="text-litahi-accent" size={22} />
          Copilot
        </h1>
        <p className="text-sm text-litahi-muted mt-1">
          Asistente operacional con consulta en vivo de Prometheus y Elasticsearch · Ollama local
        </p>
      </header>

      <div className="flex-1 overflow-auto px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((m, i) => (
            <Bubble key={i} msg={m} />
          ))}
          <div ref={endRef} />
        </div>

        {messages.length === 1 && (
          <div className="max-w-3xl mx-auto mt-8">
            <p className="text-xs uppercase tracking-wider text-litahi-muted mb-3">
              Prueba con
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-sm px-4 py-3 rounded-md border border-litahi-border hover:border-litahi-accent hover:bg-litahi-surface transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-litahi-border p-4 bg-litahi-surface">
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            className="input flex-1"
            placeholder="Escribe tu pregunta..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
            disabled={busy}
          />
          <button
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Enviar
          </button>
        </div>
      </div>
    </div>
  )
}

function Bubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === 'system') {
    return (
      <div className="text-center text-sm text-litahi-muted py-4">
        {msg.content}
      </div>
    )
  }
  if (msg.role === 'thinking') {
    return (
      <div className="flex items-center gap-2 text-sm text-litahi-muted">
        <Loader2 size={14} className="animate-spin" />
        {msg.content}
      </div>
    )
  }
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-litahi-accent text-white'
            : 'bg-litahi-surface border border-litahi-border'
        }`}
      >
        <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
        {msg.metadata && (
          <div className="mt-3 pt-3 border-t border-litahi-border/50 text-xs text-litahi-muted space-y-1">
            <div>
              <span className="font-mono uppercase tracking-wider">intent:</span>{' '}
              <span className="text-litahi-accent">{msg.metadata.category}</span>
              {msg.metadata.durationMs !== undefined && (
                <span className="ml-3">{msg.metadata.durationMs} ms</span>
              )}
            </div>
            {msg.metadata.promql && msg.metadata.promql.length > 0 && (
              <details>
                <summary className="cursor-pointer hover:text-litahi-text">
                  Consultas PromQL ejecutadas ({msg.metadata.promql.length})
                </summary>
                <div className="mt-1 space-y-1">
                  {msg.metadata.promql.map((q, i) => (
                    <code
                      key={i}
                      className="block bg-litahi-bg px-2 py-1 rounded font-mono text-[10px]"
                    >
                      {q}
                    </code>
                  ))}
                </div>
              </details>
            )}
            {msg.metadata.logQueries && msg.metadata.logQueries.length > 0 && (
              <details>
                <summary className="cursor-pointer hover:text-litahi-text">
                  Búsquedas de logs ({msg.metadata.logQueries.length})
                </summary>
                <div className="mt-1 space-y-1">
                  {msg.metadata.logQueries.map((q, i) => (
                    <code
                      key={i}
                      className="block bg-litahi-bg px-2 py-1 rounded font-mono text-[10px]"
                    >
                      {q}
                    </code>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
