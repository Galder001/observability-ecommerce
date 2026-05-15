export type View = 'overview' | 'activity' | 'worldmap' | 'assistant'

export interface KpiCard {
  label: string
  value: string
  delta?: string
  tone: 'positive' | 'negative' | 'neutral'
}

export interface LogEntry {
  timestamp: string
  level: string
  message: string
  requestId?: string
  route?: string
  method?: string
  statusCode?: number
  ip?: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'thinking'
  content: string
  metadata?: {
    category?: string
    promql?: string[]
    logQueries?: string[]
    durationMs?: number
  }
}

export interface PrometheusResult {
  status: 'success' | 'error'
  data?: {
    resultType: string
    result: Array<{
      metric: Record<string, string>
      value?: [number, string]
      values?: Array<[number, string]>
    }>
  }
}
