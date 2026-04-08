/**
 * OpenTelemetry collector for Claude Code telemetry.
 *
 * Starts an OTLP/HTTP receiver (protobuf or JSON) and writes session + prompt
 * rows to a local SQLite database (via the DATABASE_URL env var and Drizzle ORM).
 *
 * Claude Code configuration (add to ~/.claude/settings.json):
 *   "env": {
 *     "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4318",
 *     "OTEL_EXPORTER_OTLP_PROTOCOL": "http/protobuf"
 *   }
 *
 * Usage:
 *   bun run scripts/otel-collector.ts
 */

import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

import { eq, sql } from 'drizzle-orm'
import path from 'path'
import { sessions, prompts } from '../server/db/schema'
import { getExportRequestProto, ServiceClientType } from '@opentelemetry/otlp-proto-exporter-base'

const PROJECT_NAME: string = process.argv[2] ?? path.basename(path.dirname(import.meta.dir))

// ---------------------------------------------------------------------------
// DB setup
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is not set.')
  process.exit(1)
}

const dbPath = resolve(DATABASE_URL)
mkdirSync(dirname(dbPath), { recursive: true })
const client = new Database(dbPath)
const db = drizzle(client, { schema: { sessions, prompts } })
const toolNameByPromptId = new Map<string, string>()

// ---------------------------------------------------------------------------
// OTLP span types (minimal subset we care about)
// ---------------------------------------------------------------------------

interface KeyValue {
  key: string
  // OTLP JSON mapping represents intValue as a string; protobuf decoding via
  // protobufjs also commonly yields strings when configured with `longs: String`.
  value: { stringValue?: string, intValue?: number | string, doubleValue?: number, boolValue?: boolean }
}

interface Span {
  traceId: string
  spanId: string
  parentSpanId?: string
  name: string
  startTimeUnixNano: string
  endTimeUnixNano?: string
  attributes?: KeyValue[]
  status?: { code?: number, message?: string }
}

interface ScopeSpans {
  spans?: Span[]
}

interface ResourceSpans {
  resource?: { attributes?: KeyValue[] }
  scopeSpans?: ScopeSpans[]
  instrumentationLibrarySpans?: ScopeSpans[]
}

interface OtlpTracesPayload {
  resourceSpans: ResourceSpans[]
}

// ---------------------------------------------------------------------------
// OTLP logs types
// ---------------------------------------------------------------------------

interface LogRecord {
  timeUnixNano: string
  body?: { stringValue?: string }
  attributes?: KeyValue[]
}

interface ScopeLogs {
  logRecords: LogRecord[]
}

interface ResourceLogs {
  resource?: { attributes?: KeyValue[] }
  scopeLogs: ScopeLogs[]
}

interface OtlpLogsPayload {
  resourceLogs: ResourceLogs[]
}

// ---------------------------------------------------------------------------
// OTLP metrics types
// ---------------------------------------------------------------------------

interface DataPoint {
  attributes?: KeyValue[]
  startTimeUnixNano?: string
  timeUnixNano?: string
  asDouble?: number
  asInt?: number | string
}

interface Metric {
  name: string
  sum?: { dataPoints: DataPoint[] }
  gauge?: { dataPoints: DataPoint[] }
  histogram?: { dataPoints: DataPoint[] }
}

interface ScopeMetrics {
  metrics: Metric[]
}

interface ResourceMetrics {
  resource?: { attributes?: KeyValue[] }
  scopeMetrics: ScopeMetrics[]
}

interface OtlpMetricsPayload {
  resourceMetrics: ResourceMetrics[]
}

// ---------------------------------------------------------------------------
// Attribute helpers
// ---------------------------------------------------------------------------

function attr(span: Span, key: string): string | number | undefined {
  const kv = span.attributes?.find(a => a.key === key)
  if (!kv) return undefined
  const v = kv.value
  if (v.stringValue !== undefined) return v.stringValue
  if (v.intValue !== undefined) return v.intValue
  if (v.doubleValue !== undefined) return v.doubleValue
  return undefined
}

function kvAttr(attrs: KeyValue[] | undefined, key: string): string | number | undefined {
  const kv = attrs?.find(a => a.key === key)
  if (!kv) return undefined
  const v = kv.value
  if (v.stringValue !== undefined) return v.stringValue
  if (v.intValue !== undefined) return v.intValue
  if (v.doubleValue !== undefined) return v.doubleValue
  return undefined
}

// ---------------------------------------------------------------------------
// Log record processing
// ---------------------------------------------------------------------------

async function processLogRecord(record: LogRecord, resourceAttrs?: KeyValue[]): Promise<void> {
  const attrs = record.attributes ?? []

  if (DEBUG) {
    console.log('[debug] log record:', JSON.stringify({ body: record.body, attributes: attrs, resourceAttrs }, null, 2))
  }

  const eventName = String(kvAttr(attrs, 'event.name') ?? '')
  const sessionId = String(
    kvAttr(attrs, 'session.id')
    ?? kvAttr(resourceAttrs, 'session.id')
    ?? ''
  )
  const promptId = String(kvAttr(attrs, 'prompt.id') ?? '')
  const toolName = String(kvAttr(attrs, 'tool_name') ?? '')

  if (eventName === 'tool_decision' || eventName === 'tool_result') {
    if (promptId && toolName) toolNameByPromptId.set(promptId, toolName)
    return
  }

  if (eventName !== 'api_request') return
  if (!sessionId) return

  const inputTokens = Number(kvAttr(attrs, 'input_tokens') ?? 0)
  const outputTokens = Number(kvAttr(attrs, 'output_tokens') ?? 0)
  const cacheReadTokens = Number(kvAttr(attrs, 'cache_read_tokens') ?? 0)
  const cacheCreationTokens = Number(kvAttr(attrs, 'cache_creation_tokens') ?? 0)
  const model = String(kvAttr(attrs, 'model') ?? '')
  const resolvedToolName = toolName || (
    promptId
      ? toolNameByPromptId.get(promptId) ?? ''
      : ''
  )

  if (promptId && resolvedToolName) {
    toolNameByPromptId.set(promptId, resolvedToolName)
  }

  const createdAt = nanosToDate(record.timeUnixNano)

  await db
    .insert(sessions)
    .values({ sessionId, name: '', projectName: PROJECT_NAME, createdAt, lastUsedAt: createdAt })
    .onConflictDoUpdate({
      target: sessions.sessionId,
      set: { lastUsedAt: sql`MAX(sessions.last_used_at, EXCLUDED.last_used_at)` }
    })

  await db
    .update(sessions)
    .set({
      requestTokensTotal: sql`${sessions.requestTokensTotal} + ${inputTokens}`,
      responseTokensTotal: sql`${sessions.responseTokensTotal} + ${outputTokens}`,
      cacheReadTokensTotal: sql`${sessions.cacheReadTokensTotal} + ${cacheReadTokens}`,
      cacheCreationTokensTotal: sql`${sessions.cacheCreationTokensTotal} + ${cacheCreationTokens}`,
      lastUsedAt: createdAt
    })
    .where(eq(sessions.sessionId, sessionId))

  await db.insert(prompts).values({
    sessionId,
    promptId,
    toolName: resolvedToolName,
    promptTokens: inputTokens,
    requestTokens: inputTokens,
    responseTokens: outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    createdAt
  })

  console.log(`[log] session=${sessionId} model=${model} input=${inputTokens} output=${outputTokens} cache_read=${cacheReadTokens} cache_creation=${cacheCreationTokens}`)
}

// ---------------------------------------------------------------------------
// Metrics processing
// ---------------------------------------------------------------------------

async function processMetrics(payload: OtlpMetricsPayload): Promise<void> {
  for (const rm of payload.resourceMetrics ?? []) {
    for (const sm of rm.scopeMetrics ?? []) {
      for (const metric of sm.metrics ?? []) {
        if (DEBUG) {
          console.log('[debug] metric:', JSON.stringify({ name: metric.name, dataPoints: (metric.sum ?? metric.gauge)?.dataPoints }, null, 2))
        }

        const dataPoints = metric.sum?.dataPoints ?? metric.gauge?.dataPoints ?? []

        for (const dp of dataPoints) {
          const sessionId = String(kvAttr(dp.attributes, 'session.id') ?? '')
          if (!sessionId) continue

          if (metric.name === 'claude_code.tokens.input' || metric.name === 'gen_ai.client.token.usage') {
            const val = Number(dp.asInt ?? dp.asDouble ?? 0)
            if (val === 0) continue
            console.log(`[metric] ${metric.name} session=${sessionId} value=${val}`)
          }
        }
      }
    }
  }
}

function nanosToDate(nanos: string): Date {
  return new Date(Number(BigInt(nanos) / 1_000_000n))
}

// ---------------------------------------------------------------------------
// Span processing
// ---------------------------------------------------------------------------

async function processSpan(span: Span, _resourceAttrs?: KeyValue[]): Promise<void> {
  const spanName = span.name

  // ------------------------------------------------------------------
  // Session lifecycle spans
  // ------------------------------------------------------------------
  if (spanName === 'session' || spanName === 'claude_code.session') {
    const sessionId = String(attr(span, 'session.id') ?? attr(span, 'claude.session_id') ?? '')
    const name = String(attr(span, 'session.name') ?? attr(span, 'claude.session_name') ?? '')

    if (!sessionId) return

    const startedAt = nanosToDate(span.startTimeUnixNano)

    await db
      .insert(sessions)
      .values({ sessionId, name, projectName: PROJECT_NAME, createdAt: startedAt, lastUsedAt: startedAt })
      .onConflictDoUpdate({
        target: sessions.sessionId,
        set: {
          name: sql`EXCLUDED.name`,
          lastUsedAt: sql`EXCLUDED.last_used_at`
        }
      })

    console.log(`[session] upserted session ${sessionId} "${name}"`)
    return
  }

  // ------------------------------------------------------------------
  // Per-prompt / LLM call spans
  // ------------------------------------------------------------------
  const inputTokens
    = Number(attr(span, 'gen_ai.usage.input_tokens') ?? attr(span, 'llm.usage.prompt_tokens') ?? 0)
  const outputTokens
    = Number(attr(span, 'gen_ai.usage.output_tokens') ?? attr(span, 'llm.usage.completion_tokens') ?? 0)

  if (inputTokens === 0 && outputTokens === 0) return

  const sessionId = String(
    attr(span, 'session.id')
    ?? attr(span, 'claude.session_id')
    ?? attr(span, 'gen_ai.claude.session_id')
    ?? ''
  )
  if (!sessionId) return

  const promptText = String(
    attr(span, 'gen_ai.prompt')
    ?? attr(span, 'llm.prompts')
    ?? attr(span, 'input.value')
    ?? ''
  )

  const createdAt = nanosToDate(span.startTimeUnixNano)

  await db
    .insert(sessions)
    .values({ sessionId, name: '', projectName: PROJECT_NAME, createdAt, lastUsedAt: createdAt })
    .onConflictDoUpdate({
      target: sessions.sessionId,
      set: {
        requestTokensTotal: sql`sessions.request_tokens_total + EXCLUDED.request_tokens_total`,
        responseTokensTotal: sql`sessions.response_tokens_total + EXCLUDED.response_tokens_total`,
        lastUsedAt: sql`MAX(sessions.last_used_at, EXCLUDED.last_used_at)`
      }
    })

  await db
    .update(sessions)
    .set({
      requestTokensTotal: sql`${sessions.requestTokensTotal} + ${inputTokens}`,
      responseTokensTotal: sql`${sessions.responseTokensTotal} + ${outputTokens}`,
      lastUsedAt: createdAt
    })
    .where(eq(sessions.sessionId, sessionId))

  await db.insert(prompts).values({
    sessionId,
    prompt: promptText,
    promptTokens: inputTokens,
    requestTokens: inputTokens,
    responseTokens: outputTokens,
    createdAt
  })

  console.log(
    `[prompt] session=${sessionId} input=${inputTokens} output=${outputTokens} prompt="${promptText.slice(0, 60)}"`
  )
}

// ---------------------------------------------------------------------------
// HTTP server (OTLP/HTTP protobuf or JSON)
// ---------------------------------------------------------------------------

const PORT = Number(process.env.OTEL_COLLECTOR_PORT ?? 4318)
const DEBUG = process.env.DEBUG_OTEL_COLLECTOR === '1' || process.env.DEBUG === '1'

const ExportTraceServiceRequest = getExportRequestProto(ServiceClientType.SPANS)

function extractSpans(body: OtlpTracesPayload): Array<{ span: Span, resourceAttrs?: KeyValue[] }> {
  const resourceSpans = body.resourceSpans ?? []
  const result: Array<{ span: Span, resourceAttrs?: KeyValue[] }> = []

  for (const rs of resourceSpans) {
    const resourceAttrs = rs.resource?.attributes
    const scopeSpans = rs.scopeSpans ?? rs.instrumentationLibrarySpans ?? []
    for (const ss of scopeSpans) {
      for (const span of ss.spans ?? []) {
        result.push({ span, resourceAttrs })
      }
    }
  }

  return result
}

function parseOtlpTracesFromBuffer(
  buf: ArrayBuffer,
  contentType: string
): { ok: true, body: OtlpTracesPayload } | { ok: false, error: string } {
  const u8 = new Uint8Array(buf)

  if (contentType.includes('json')) {
    try {
      const text = new TextDecoder().decode(u8)
      return { ok: true, body: JSON.parse(text) as OtlpTracesPayload }
    } catch (e) {
      return { ok: false, error: `invalid JSON (${String((e as Error)?.message ?? e)})` }
    }
  }

  try {
    const msg = ExportTraceServiceRequest.decode(u8)
    const obj = ExportTraceServiceRequest.toObject(msg, {
      longs: String,
      enums: Number,
      defaults: false
    }) as unknown as OtlpTracesPayload
    return { ok: true, body: obj }
  } catch (e) {
    try {
      const text = new TextDecoder().decode(u8)
      return { ok: true, body: JSON.parse(text) as OtlpTracesPayload }
    } catch {
      return { ok: false, error: `invalid protobuf/JSON (${String((e as Error)?.message ?? e)})` }
    }
  }
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url)

    if (req.method === 'POST' && url.pathname === '/v1/traces') {
      const contentType = (req.headers.get('content-type') ?? '').toLowerCase()
      const buf = await req.arrayBuffer()

      const parsed = parseOtlpTracesFromBuffer(buf, contentType)
      if (!parsed.ok) {
        console.error(
          `[otel] rejected /v1/traces payload: ${parsed.error}; content-type="${contentType || '(missing)'}" bytes=${buf.byteLength}`
        )
        console.error(
          `[otel] hint: set Claude Code OTEL_EXPORTER_OTLP_PROTOCOL to "http/protobuf" (recommended) or "http/json" to match this collector`
        )
        return new Response('Bad Request: invalid OTLP payload', { status: 400 })
      }

      const spans = extractSpans(parsed.body)

      if (DEBUG) {
        console.log(`[otel] received /v1/traces spans=${spans.length} content-type="${contentType || '(missing)'}" bytes=${buf.byteLength}`)
        for (const { span } of spans) {
          console.log('[debug] span:', JSON.stringify({ name: span.name, attributes: span.attributes }, null, 2))
        }
      }

      const results = await Promise.allSettled(spans.map(({ span, resourceAttrs }) => processSpan(span, resourceAttrs)))
      for (const r of results) {
        if (r.status === 'rejected') {
          console.error('[otel] span processing failed:', r.reason)
        }
      }

      return new Response(JSON.stringify({}), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'POST' && url.pathname === '/v1/logs') {
      const text = await req.text()
      try {
        const payload = JSON.parse(text) as OtlpLogsPayload
        const records: Array<{ record: LogRecord, resourceAttrs?: KeyValue[] }> = []
        for (const rl of payload.resourceLogs ?? []) {
          for (const sl of rl.scopeLogs ?? []) {
            for (const record of sl.logRecords ?? []) {
              records.push({ record, resourceAttrs: rl.resource?.attributes })
            }
          }
        }
        if (DEBUG) console.log(`[otel] received /v1/logs records=${records.length}`)
        const results = await Promise.allSettled(records.map(({ record, resourceAttrs }) => processLogRecord(record, resourceAttrs)))
        for (const r of results) {
          if (r.status === 'rejected') console.error('[otel] log record processing failed:', r.reason)
        }
      } catch (e) {
        console.error('[otel] failed to parse /v1/logs:', e)
      }
      return new Response(JSON.stringify({}), { headers: { 'Content-Type': 'application/json' } })
    }

    if (req.method === 'POST' && url.pathname === '/v1/metrics') {
      const text = await req.text()
      try {
        const payload = JSON.parse(text) as OtlpMetricsPayload
        await processMetrics(payload)
      } catch (e) {
        console.error('[otel] failed to parse /v1/metrics:', e)
      }
      return new Response(JSON.stringify({}), { headers: { 'Content-Type': 'application/json' } })
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      return new Response('ok')
    }

    const fallbackBody = await req.text().catch(() => '')
    console.log(`[otel] unhandled ${req.method} ${url.pathname} bytes=${fallbackBody.length}`)
    return new Response('Not Found', { status: 404 })
  }
})

console.log(`OTel collector listening on http://localhost:${PORT}`)
console.log(`Project: ${PROJECT_NAME}${process.argv[2] ? '' : ' (default — pass a name as argument to override)'}`)
console.log('Waiting for Claude Code telemetry spans...')

process.on('SIGINT', () => {
  console.log('\nShutting down...')
  server.stop()
  client.close()
  process.exit(0)
})
