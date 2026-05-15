import { useEffect, useState } from 'react'
import { RefreshCw, Search } from 'lucide-react'
import { searchLogs } from '../lib/elasticsearch'
import type { LogEntry } from '../types'

function statusColor(code?: number): string {
  if (!code) return 'text-litahi-muted'
  if (code >= 500) return 'text-litahi-danger'
  if (code >= 400) return 'text-litahi-warning'
  if (code >= 300) return 'text-blue-400'
  return 'text-litahi-success'
}

function levelBadge(level: string): string {
  switch (level.toLowerCase()) {
    case 'error':
      return 'bg-litahi-danger/15 text-litahi-danger'
    case 'warn':
    case 'warning':
      return 'bg-litahi-warning/15 text-litahi-warning'
    default:
      return 'bg-litahi-border text-litahi-muted'
  }
}

export function Activity() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState('')
  const [auto, setAuto] = useState(true)
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      if (selectedId) {
        const traced = await searchLogs({ requestId: selectedId, size: 100 })
        setLogs(traced)
      } else {
        const recent = await searchLogs({
          query: filter || undefined,
          hoursBack: 1,
          size: 50,
        })
        setLogs(recent)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [filter, selectedId])

  useEffect(() => {
    if (!auto || selectedId) return
    const id = setInterval(load, 5_000)
    return () => clearInterval(id)
  }, [auto, filter, selectedId])

  return (
    <div className="p-8">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Activity</h1>
          <p className="text-sm text-litahi-muted mt-1">
            {selectedId
              ? `Traza completa de la petición ${selectedId}`
              : 'Últimas 50 peticiones registradas · refresco automático'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedId && (
            <button
              className="btn-ghost text-sm"
              onClick={() => setSelectedId(null)}
            >
              ← Volver al stream
            </button>
          )}
          <button
            className="btn-ghost text-sm flex items-center gap-1"
            onClick={() => setAuto(!auto)}
          >
            <RefreshCw
              size={14}
              className={auto ? 'animate-spin-slow text-litahi-accent' : ''}
            />
            {auto ? 'Pausar' : 'Reanudar'}
          </button>
        </div>
      </header>

      <div className="mb-4 relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-litahi-muted"
        />
        <input
          className="input pl-9 w-full"
          placeholder="Filtrar: texto libre, ej. error, /api/orders, 500..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-litahi-bg text-litahi-muted text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Hora</th>
              <th className="text-left px-4 py-3 font-medium">Nivel</th>
              <th className="text-left px-4 py-3 font-medium">Método</th>
              <th className="text-left px-4 py-3 font-medium">Ruta</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Request ID</th>
              <th className="text-left px-4 py-3 font-medium">Mensaje</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-litahi-muted">
                  {loading ? 'Cargando logs...' : 'Sin resultados'}
                </td>
              </tr>
            )}
            {logs.map((l, i) => (
              <tr
                key={`${l.timestamp}-${i}`}
                className="border-t border-litahi-border hover:bg-litahi-bg cursor-pointer"
                onClick={() => l.requestId && setSelectedId(l.requestId)}
              >
                <td className="px-4 py-2.5 font-mono text-xs text-litahi-muted whitespace-nowrap">
                  {new Date(l.timestamp).toLocaleTimeString('es-ES')}
                </td>
                <td className="px-4 py-2.5">
                  <span className={`badge ${levelBadge(l.level)}`}>
                    {l.level}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">
                  {l.method ?? '—'}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">
                  {l.route ?? '—'}
                </td>
                <td
                  className={`px-4 py-2.5 font-mono text-xs ${statusColor(
                    l.statusCode
                  )}`}
                >
                  {l.statusCode ?? '—'}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-litahi-accent">
                  {l.requestId ? l.requestId.slice(0, 8) + '...' : '—'}
                </td>
                <td className="px-4 py-2.5 text-litahi-muted truncate max-w-md">
                  {l.message}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-litahi-muted mt-3">
        💡 Click en cualquier fila con request ID para ver la traza completa de esa petición.
      </p>
    </div>
  )
}
