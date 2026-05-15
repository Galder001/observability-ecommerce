import type { LogEntry } from '../types'

const ES_BASE = '/es'

// Filebeat suele crear índices con prefijos rotativos.
// Usamos un wildcard para cubrir distintas convenciones.
const INDEX_PATTERN = 'filebeat-*,logs-*,*-logs*'

interface EsHit {
  _source: {
    '@timestamp'?: string
    timestamp?: string
    level?: string
    message?: string
    fields?: Record<string, any>
    requestId?: string
    route?: string
    method?: string
    statusCode?: number
    ip?: string
  }
}

interface EsResponse {
  hits: {
    total: { value: number }
    hits: EsHit[]
  }
}

function normalize(hit: EsHit): LogEntry {
  const src = hit._source
  const fields = src.fields ?? {}
  return {
    timestamp: src['@timestamp'] ?? src.timestamp ?? '',
    level: src.level ?? fields.level ?? 'info',
    message: src.message ?? '',
    requestId: src.requestId ?? fields.requestId,
    route: src.route ?? fields.route,
    method: src.method ?? fields.method,
    statusCode: src.statusCode ?? fields.statusCode,
    ip: src.ip ?? fields.ip,
  }
}

export async function searchLogs(params: {
  query?: string
  level?: string
  requestId?: string
  hoursBack?: number
  size?: number
}): Promise<LogEntry[]> {
  const filters: any[] = []
  const must: any[] = []

  if (params.requestId) {
    must.push({
      bool: {
        should: [
          { match: { 'fields.requestId': params.requestId } },
          { match: { requestId: params.requestId } },
        ],
      },
    })
  }
  if (params.level) {
    must.push({
      bool: {
        should: [
          { match: { level: params.level } },
          { match: { 'fields.level': params.level } },
        ],
      },
    })
  }
  if (params.query) {
    must.push({
      query_string: {
        query: params.query,
        default_field: 'message',
      },
    })
  }
  if (params.hoursBack) {
    filters.push({
      range: {
        '@timestamp': { gte: `now-${params.hoursBack}h` },
      },
    })
  }

  const body = {
    size: params.size ?? 50,
    sort: [{ '@timestamp': { order: 'desc' } }],
    query: {
      bool: {
        must: must.length ? must : [{ match_all: {} }],
        filter: filters,
      },
    },
  }

  try {
    const res = await fetch(`${ES_BASE}/${INDEX_PATTERN}/_search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return []
    const data: EsResponse = await res.json()
    return data.hits.hits.map(normalize)
  } catch {
    return []
  }
}

export async function getErrorCount(hoursBack = 1): Promise<number> {
  const body = {
    size: 0,
    query: {
      bool: {
        filter: [{ range: { '@timestamp': { gte: `now-${hoursBack}h` } } }],
        should: [
          { match: { level: 'error' } },
          { match: { 'fields.level': 'error' } },
          { range: { statusCode: { gte: 500 } } },
          { range: { 'fields.statusCode': { gte: 500 } } },
        ],
        minimum_should_match: 1,
      },
    },
  }
  try {
    const res = await fetch(`${ES_BASE}/${INDEX_PATTERN}/_search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return 0
    const data: EsResponse = await res.json()
    return data.hits.total.value
  } catch {
    return 0
  }
}
