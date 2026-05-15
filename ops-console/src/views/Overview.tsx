import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { Kpi } from '../components/Kpi'
import { queryInstant, queryRange, extractScalar, PROMQL } from '../lib/prometheus'
import { getErrorCount } from '../lib/elasticsearch'

interface Snapshot {
  revenue: number
  sessions: number
  errorRatePct: number
  errorCount1h: number
}

interface Point {
  time: string
  value: number
}

export function Overview() {
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [revenueSeries, setRevenueSeries] = useState<Point[]>([])
  const [latencySeries, setLatencySeries] = useState<Point[]>([])

  async function refresh() {
    try {
      const [rev, sess, err, errCount] = await Promise.all([
        queryInstant(PROMQL.revenueToday),
        queryInstant(PROMQL.activeSessions),
        queryInstant(PROMQL.httpErrorRate),
        getErrorCount(1),
      ])
      setSnap({
        revenue: extractScalar(rev),
        sessions: extractScalar(sess),
        errorRatePct: extractScalar(err) * 100,
        errorCount1h: errCount,
      })
    } catch (e) {
      console.error(e)
    }

    try {
      const end = Math.floor(Date.now() / 1000)
      const start = end - 60 * 60 * 24
      const step = 300

      const [rev, lat] = await Promise.all([
        queryRange(`increase(orders_revenue_total[5m])`, start, end, step),
        queryRange(PROMQL.latencyP95, start, end, step),
      ])

      const revPts: Point[] = []
      const latPts: Point[] = []
      const fmt = (sec: number) =>
        new Date(sec * 1000).toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        })

      for (const [t, v] of rev.data?.result?.[0]?.values ?? []) {
        revPts.push({ time: fmt(t), value: parseFloat(v) })
      }
      for (const [t, v] of lat.data?.result?.[0]?.values ?? []) {
        latPts.push({ time: fmt(t), value: parseFloat(v) * 1000 })
      }
      setRevenueSeries(revPts)
      setLatencySeries(latPts)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 10_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-litahi-muted mt-1">
          Estado operacional de la tienda Li Tahi+ · actualización cada 10s
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Kpi
          label="Revenue 24h"
          value={snap ? `${snap.revenue.toFixed(2)} €` : '—'}
          tone="positive"
          loading={!snap}
        />
        <Kpi
          label="Sesiones activas"
          value={snap ? String(Math.round(snap.sessions)) : '—'}
          tone="neutral"
          loading={!snap}
        />
        <Kpi
          label="Error rate"
          value={snap ? `${snap.errorRatePct.toFixed(2)} %` : '—'}
          tone={snap && snap.errorRatePct > 1 ? 'negative' : 'positive'}
          loading={!snap}
        />
        <Kpi
          label="Errores última hora"
          value={snap ? String(snap.errorCount1h) : '—'}
          tone={snap && snap.errorCount1h > 5 ? 'negative' : 'neutral'}
          loading={!snap}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="mb-3">
            <h2 className="font-semibold">Revenue 24h</h2>
            <p className="text-xs text-litahi-muted">Euros generados cada 5 minutos</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries}>
                <defs>
                  <linearGradient id="grad-rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1f2937" vertical={false} />
                <XAxis dataKey="time" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #1f2937',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#grad-rev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="mb-3">
            <h2 className="font-semibold">Latencia p95</h2>
            <p className="text-xs text-litahi-muted">Milisegundos · ventana 5 min</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={latencySeries}>
                <CartesianGrid stroke="#1f2937" vertical={false} />
                <XAxis dataKey="time" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111827',
                    border: '1px solid #1f2937',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
