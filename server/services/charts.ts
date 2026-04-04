import { and, asc, eq, sum } from 'drizzle-orm'
import { prompts, sessions } from '#server/db/schema'
import { useDb } from '#server/db/client'
import type {
  BreakdownChartResponse,
  UsageChartDataset,
  UsageChartDimension,
  UsageChartPage,
  UsageChartResponse,
  UsageChartWeights
} from '#shared/types'

type ChartRow = {
  label: string
  at: Date
  weightedTokens: number
}

const TOKEN_WEIGHTS: UsageChartWeights = {
  prompt: 1,
  response: 5,
  cacheRead: 0.1,
  cacheCreation: 0.5
}

const PALETTE = [
  '#0f766e',
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#16a34a',
  '#ca8a04',
  '#475569'
]

function rgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const value = normalized.length === 3
    ? normalized.split('').map(ch => ch + ch).join('')
    : normalized

  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function formatLabel(date: Date): string {
  return date.toISOString()
}

function weightTokens(values: {
  prompt?: number
  response?: number
  cacheRead?: number
  cacheCreation?: number
}): number {
  return (values.prompt ?? 0) * TOKEN_WEIGHTS.prompt
    + (values.response ?? 0) * TOKEN_WEIGHTS.response
    + (values.cacheRead ?? 0) * TOKEN_WEIGHTS.cacheRead
    + (values.cacheCreation ?? 0) * TOKEN_WEIGHTS.cacheCreation
}

function buildChart(rows: ChartRow[], page: UsageChartPage): UsageChartResponse {
  const sortedRows = [...rows].sort((a, b) => a.at.getTime() - b.at.getTime())
  const labels = sortedRows.map(row => formatLabel(row.at))

  const datasets: UsageChartDataset[] = sortedRows.map((row, index) => {
    const color = PALETTE[index % PALETTE.length]!

    return {
      label: row.label,
      data: labels.map((_, labelIndex) => labelIndex >= index ? row.weightedTokens : 0),
      borderColor: color,
      backgroundColor: rgba(color, 0.18),
      stack: 'usage',
      borderWidth: 1,
      borderRadius: 4,
      borderSkipped: false
    }
  })

  return {
    page,
    labels,
    datasets,
    weights: TOKEN_WEIGHTS
  }
}

async function loadMainRows(): Promise<ChartRow[]> {
  const db = useDb()
  const rows = await db.select().from(sessions).orderBy(asc(sessions.createdAt))

  return rows.map(row => ({
    label: row.name || row.sessionId.slice(0, 8),
    at: row.lastUsedAt,
    weightedTokens: weightTokens({
      prompt: row.requestTokensTotal,
      response: row.responseTokensTotal,
      cacheRead: row.cacheReadTokensTotal,
      cacheCreation: row.cacheCreationTokensTotal
    })
  }))
}

async function loadMainProjectRows(): Promise<ChartRow[]> {
  const db = useDb()
  const rows = await db.select().from(sessions).orderBy(asc(sessions.createdAt))

  const grouped = new Map<string, { weightedTokens: number, at: Date }>()

  for (const row of rows) {
    const key = row.projectName?.trim() || 'other'
    const wt = weightTokens({
      prompt: row.requestTokensTotal,
      response: row.responseTokensTotal,
      cacheRead: row.cacheReadTokensTotal,
      cacheCreation: row.cacheCreationTokensTotal
    })
    const existing = grouped.get(key)
    if (existing) {
      existing.weightedTokens += wt
      if (row.lastUsedAt > existing.at) existing.at = row.lastUsedAt
    }
    else {
      grouped.set(key, { weightedTokens: wt, at: row.lastUsedAt })
    }
  }

  return [...grouped.entries()].map(([label, { weightedTokens, at }]) => ({
    label,
    at,
    weightedTokens
  }))
}

async function loadSessionRows(sessionId: string): Promise<ChartRow[]> {
  const db = useDb()
  const rows = await db
    .select()
    .from(prompts)
    .where(eq(prompts.sessionId, sessionId))
    .orderBy(asc(prompts.createdAt))

  const aggregated = new Map<string, {
    createdAt: Date
    promptTokens: number
    responseTokens: number
    cacheReadTokens: number
    cacheCreationTokens: number
  }>()

  for (const row of rows) {
    const existing = aggregated.get(row.promptId)
    if (existing) {
      existing.promptTokens += row.promptTokens
      existing.responseTokens += row.responseTokens
      existing.cacheReadTokens += row.cacheReadTokens
      existing.cacheCreationTokens += row.cacheCreationTokens
      if (row.createdAt < existing.createdAt) existing.createdAt = row.createdAt
      continue
    }

    aggregated.set(row.promptId, {
      createdAt: row.createdAt,
      promptTokens: row.promptTokens,
      responseTokens: row.responseTokens,
      cacheReadTokens: row.cacheReadTokens,
      cacheCreationTokens: row.cacheCreationTokens
    })
  }

  return [...aggregated.values()].map((row, index) => ({
    label: `Prompt#${index + 1}`,
    at: row.createdAt,
    weightedTokens: weightTokens({
      prompt: row.promptTokens,
      response: row.responseTokens,
      cacheRead: row.cacheReadTokens,
      cacheCreation: row.cacheCreationTokens
    })
  }))
}

async function loadPromptRows(sessionId: string, promptId: string): Promise<ChartRow[]> {
  const db = useDb()
  const rows = await db
    .select()
    .from(prompts)
    .where(and(eq(prompts.sessionId, sessionId), eq(prompts.promptId, promptId)))
    .orderBy(asc(prompts.createdAt))

  return rows.map((row, index) => ({
    label: `ApiCall#${index + 1}`,
    at: row.createdAt,
    weightedTokens: weightTokens({
      prompt: row.promptTokens,
      response: row.responseTokens,
      cacheRead: row.cacheReadTokens,
      cacheCreation: row.cacheCreationTokens
    })
  }))
}

const BREAKDOWN_LABELS = ['Input', 'Output', 'Cache Read', 'Cache Write']
const BREAKDOWN_COLORS = ['#2563eb', '#0f766e', '#16a34a', '#ca8a04']

async function loadBreakdownTotals(page: UsageChartPage, sessionId?: string, promptId?: string): Promise<number[]> {
  const db = useDb()

  if (page === 'main') {
    const [row] = await db.select({
      promptTotal: sum(sessions.requestTokensTotal),
      responseTotal: sum(sessions.responseTokensTotal),
      cacheReadTotal: sum(sessions.cacheReadTokensTotal),
      cacheCreationTotal: sum(sessions.cacheCreationTokensTotal)
    }).from(sessions)

    return [
      (Number(row?.promptTotal ?? 0)) * TOKEN_WEIGHTS.prompt,
      (Number(row?.responseTotal ?? 0)) * TOKEN_WEIGHTS.response,
      (Number(row?.cacheReadTotal ?? 0)) * TOKEN_WEIGHTS.cacheRead,
      (Number(row?.cacheCreationTotal ?? 0)) * TOKEN_WEIGHTS.cacheCreation
    ]
  }

  const condition = page === 'prompt'
    ? and(eq(prompts.sessionId, sessionId!), eq(prompts.promptId, promptId!))
    : eq(prompts.sessionId, sessionId!)

  const [row] = await db.select({
    promptTotal: sum(prompts.promptTokens),
    responseTotal: sum(prompts.responseTokens),
    cacheReadTotal: sum(prompts.cacheReadTokens),
    cacheCreationTotal: sum(prompts.cacheCreationTokens)
  }).from(prompts).where(condition)

  return [
    (Number(row?.promptTotal ?? 0)) * TOKEN_WEIGHTS.prompt,
    (Number(row?.responseTotal ?? 0)) * TOKEN_WEIGHTS.response,
    (Number(row?.cacheReadTotal ?? 0)) * TOKEN_WEIGHTS.cacheRead,
    (Number(row?.cacheCreationTotal ?? 0)) * TOKEN_WEIGHTS.cacheCreation
  ]
}

export async function getBreakdownChartData(params: {
  page: UsageChartPage
  sessionId?: string
  promptId?: string
}): Promise<BreakdownChartResponse> {
  const data = await loadBreakdownTotals(params.page, params.sessionId, params.promptId)

  return {
    page: params.page,
    labels: BREAKDOWN_LABELS,
    datasets: [{
      label: 'Weighted Tokens',
      data,
      borderColor: BREAKDOWN_COLORS,
      backgroundColor: BREAKDOWN_COLORS.map(c => rgba(c, 0.18)),
      borderWidth: 1,
      borderRadius: 4,
      borderSkipped: false
    }],
    weights: TOKEN_WEIGHTS
  }
}

export async function getUsageChartData(params: {
  page: UsageChartPage
  sessionId?: string
  promptId?: string
  dimension?: UsageChartDimension
}): Promise<UsageChartResponse> {
  if (params.page === 'main') {
    const rows = params.dimension === 'project'
      ? await loadMainProjectRows()
      : await loadMainRows()
    return buildChart(rows, 'main')
  }

  if (params.page === 'session') {
    if (!params.sessionId) throw createError({ statusCode: 400, message: 'sessionId required' })
    return buildChart(await loadSessionRows(params.sessionId), 'session')
  }

  if (!params.sessionId || !params.promptId) {
    throw createError({ statusCode: 400, message: 'sessionId and promptId required' })
  }

  return buildChart(await loadPromptRows(params.sessionId, params.promptId), 'prompt')
}
