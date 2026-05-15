import type { KpiCard } from '../types'

interface Props extends KpiCard {
  loading?: boolean
}

export function Kpi({ label, value, delta, tone, loading }: Props) {
  const toneClass =
    tone === 'positive'
      ? 'text-litahi-success'
      : tone === 'negative'
      ? 'text-litahi-danger'
      : 'text-litahi-muted'

  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wider text-litahi-muted mb-2">
        {label}
      </div>
      <div className="text-3xl font-semibold mb-1">
        {loading ? <span className="text-litahi-muted">···</span> : value}
      </div>
      {delta && <div className={`text-xs ${toneClass}`}>{delta}</div>}
    </div>
  )
}
