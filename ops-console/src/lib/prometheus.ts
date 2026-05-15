import type { PrometheusResult } from '../types'

const PROM_BASE = '/prom'

export async function queryInstant(promql: string): Promise<PrometheusResult> {
  const url = `${PROM_BASE}/api/v1/query?query=${encodeURIComponent(promql)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Prometheus ${res.status}`)
  return res.json()
}

export async function queryRange(
  promql: string,
  startSec: number,
  endSec: number,
  stepSec: number
): Promise<PrometheusResult> {
  const params = new URLSearchParams({
    query: promql,
    start: String(startSec),
    end: String(endSec),
    step: String(stepSec),
  })
  const res = await fetch(`${PROM_BASE}/api/v1/query_range?${params}`)
  if (!res.ok) throw new Error(`Prometheus ${res.status}`)
  return res.json()
}

export function extractScalar(result: PrometheusResult): number {
  const r = result.data?.result?.[0]
  if (!r) return 0
  const raw = r.value?.[1]
  return raw ? parseFloat(raw) : 0
}

export function extractSeries(
  result: PrometheusResult
): Array<{ time: number; value: number; label: string }> {
  const series: Array<{ time: number; value: number; label: string }> = []
  for (const r of result.data?.result ?? []) {
    const label = Object.entries(r.metric)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ')
    for (const [time, value] of r.values ?? []) {
      series.push({ time: time * 1000, value: parseFloat(value), label })
    }
  }
  return series
}

// Queries reutilizables — precompiladas para que el copiloto las llame
// y para que la vista de Overview las use directamente.
export const PROMQL = {
  revenueToday: 'increase(orders_revenue_total[24h])',
  revenueLastHour: 'increase(orders_revenue_total[1h])',
  ordersTodayByStatus: 'increase(orders_total[24h])',
  activeSessions: 'sum(active_sessions)',
  activeSessionsByRole: 'active_sessions',
  authFailuresRate: 'rate(auth_failures_total[5m])',
  rateLimitHitsRate: 'rate(rate_limit_hits_total[5m])',
  httpReqRate: 'sum(rate(http_requests_total[5m]))',
  httpErrorRate:
    'sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))',
  latencyP95:
    'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))',
  latencyP99:
    'histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))',
}
