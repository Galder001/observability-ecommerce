// Orquestador del copiloto.
// Pipeline:  pregunta del usuario
//            -> CLASIFICADOR (Ollama) decide intent
//            -> EJECUTOR (código) lanza consultas reales a Prom/ES según intent
//            -> REDACTOR (Ollama) redacta respuesta natural con esos datos
//
// Este patrón es más fiable que tool use puro con modelos pequeños:
// el modelo solo decide y redacta, nunca construye queries sensibles.

import { classify, writeAnswer, type Intent } from './ollama'
import { queryInstant, extractScalar, PROMQL } from './prometheus'
import { searchLogs, getErrorCount } from './elasticsearch'
import type { ChatMessage } from '../types'

interface AskResult {
  answer: string
  metadata: ChatMessage['metadata']
}

async function executeForIntent(
  intent: Intent,
  hoursBack: number,
  requestId?: string
): Promise<{ data: Record<string, any>; promql: string[]; logQueries: string[] }> {
  const data: Record<string, any> = {}
  const promql: string[] = []
  const logQueries: string[] = []

  switch (intent) {
    case 'revenue': {
      promql.push(PROMQL.revenueToday, PROMQL.revenueLastHour)
      const [today, hour] = await Promise.all([
        queryInstant(PROMQL.revenueToday),
        queryInstant(PROMQL.revenueLastHour),
      ])
      data.revenueLast24h_EUR = extractScalar(today).toFixed(2)
      data.revenueLastHour_EUR = extractScalar(hour).toFixed(2)
      break
    }
    case 'orders': {
      promql.push(PROMQL.ordersTodayByStatus)
      const r = await queryInstant(PROMQL.ordersTodayByStatus)
      data.ordersByStatus = (r.data?.result ?? []).map((s) => ({
        status: s.metric.status ?? 'unknown',
        count: parseFloat(s.value?.[1] ?? '0').toFixed(0),
      }))
      break
    }
    case 'errors': {
      promql.push(PROMQL.httpErrorRate)
      logQueries.push(`level:error OR statusCode:>=500 (últimas ${hoursBack}h)`)
      const [rate, errCount, errLogs] = await Promise.all([
        queryInstant(PROMQL.httpErrorRate),
        getErrorCount(hoursBack),
        searchLogs({ level: 'error', hoursBack, size: 10 }),
      ])
      data.errorRatePct = (extractScalar(rate) * 100).toFixed(2)
      data.errorCount = errCount
      data.sampleErrors = errLogs.slice(0, 5).map((l) => ({
        time: l.timestamp,
        route: l.route,
        status: l.statusCode,
        message: l.message?.slice(0, 120),
      }))
      break
    }
    case 'latency': {
      promql.push(PROMQL.latencyP95, PROMQL.latencyP99)
      const [p95, p99] = await Promise.all([
        queryInstant(PROMQL.latencyP95),
        queryInstant(PROMQL.latencyP99),
      ])
      data.latencyP95_ms = (extractScalar(p95) * 1000).toFixed(0)
      data.latencyP99_ms = (extractScalar(p99) * 1000).toFixed(0)
      break
    }
    case 'security': {
      promql.push(PROMQL.authFailuresRate, PROMQL.rateLimitHitsRate)
      const [auth, rl] = await Promise.all([
        queryInstant(PROMQL.authFailuresRate),
        queryInstant(PROMQL.rateLimitHitsRate),
      ])
      data.authFailuresPerSec = extractScalar(auth).toFixed(3)
      data.rateLimitHitsPerSec = extractScalar(rl).toFixed(3)
      data.bruteForceAlertActive = extractScalar(auth) > 0.08
      break
    }
    case 'sessions': {
      promql.push(PROMQL.activeSessions, PROMQL.activeSessionsByRole)
      const [total, byRole] = await Promise.all([
        queryInstant(PROMQL.activeSessions),
        queryInstant(PROMQL.activeSessionsByRole),
      ])
      data.totalActive = extractScalar(total).toFixed(0)
      data.byRole = (byRole.data?.result ?? []).map((s) => ({
        role: s.metric.role ?? 'unknown',
        count: parseFloat(s.value?.[1] ?? '0').toFixed(0),
      }))
      break
    }
    case 'trace_request': {
      if (!requestId) {
        data.error = 'No se ha detectado un requestId en la pregunta'
        break
      }
      logQueries.push(`requestId:${requestId}`)
      const logs = await searchLogs({ requestId, size: 50 })
      data.requestId = requestId
      data.traceCount = logs.length
      data.trace = logs.map((l) => ({
        time: l.timestamp,
        level: l.level,
        message: l.message?.slice(0, 150),
        status: l.statusCode,
      }))
      break
    }
    case 'general':
    default: {
      // Snapshot de salud general
      promql.push(PROMQL.httpReqRate, PROMQL.httpErrorRate, PROMQL.latencyP95)
      const [reqRate, errRate, p95] = await Promise.all([
        queryInstant(PROMQL.httpReqRate),
        queryInstant(PROMQL.httpErrorRate),
        queryInstant(PROMQL.latencyP95),
      ])
      data.requestsPerSec = extractScalar(reqRate).toFixed(2)
      data.errorRatePct = (extractScalar(errRate) * 100).toFixed(2)
      data.latencyP95_ms = (extractScalar(p95) * 1000).toFixed(0)
      break
    }
  }

  return { data, promql, logQueries }
}

export async function ask(userMessage: string): Promise<AskResult> {
  const t0 = performance.now()
  const intent = await classify(userMessage)
  const { data, promql, logQueries } = await executeForIntent(
    intent.intent,
    intent.hoursBack ?? 24,
    intent.requestId
  )
  const answer = await writeAnswer(userMessage, data)
  const t1 = performance.now()

  return {
    answer,
    metadata: {
      category: intent.intent,
      promql,
      logQueries,
      durationMs: Math.round(t1 - t0),
    },
  }
}
