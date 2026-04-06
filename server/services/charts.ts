import { and, asc, eq, isNull, or, sum } from 'drizzle-orm'
import { prompts, sessions } from '#server/db/schema'
import { useDb } from '#server/db/client'
import { ColorPalette } from '#shared/types/colors.enum'
import type {
  UsageAreaChartDataset,
  UsageAreaChartResponse,
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
  route?: string
}

type DailyTokenRow = {
  day: string
  prompt: number
  response: number
  cacheRead: number
  cacheCreation: number
}

const TOKEN_WEIGHTS: UsageChartWeights = {
  prompt: 1,
  response: 5,
  cacheRead: 0.1,
  // Claude's published prompt-caching baseline is 5-minute cache writes at 1.25x input.
  // The telemetry we store does not distinguish 5-minute vs 1-hour cache writes.
  cacheCreation: 1.25
}

const PALETTE = [
  ColorPalette.green,
  ColorPalette.blue,
  ColorPalette.purple,
  ColorPalette.pink,
  ColorPalette.orange
]

const AREA_COLORS = PALETTE
const TOKEN_ORDER: Array<keyof UsageChartWeights> = ['prompt', 'response', 'cacheRead', 'cacheCreation']
const TOKEN_LABELS: Record<keyof UsageChartWeights, string> = {
  prompt: 'Input',
  response: 'Output',
  cacheRead: 'Cache Read',
  cacheCreation: 'Cache Write'
}

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

function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10)
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

function aggregateAreaRows(rows: Array<{
  day: string
  prompt: number
  response: number
  cacheRead: number
  cacheCreation: number
}>): DailyTokenRow[] {
  const grouped = new Map<string, DailyTokenRow>()

  for (const row of rows) {
    const existing = grouped.get(row.day)
    if (existing) {
      existing.prompt += row.prompt
      existing.response += row.response
      existing.cacheRead += row.cacheRead
      existing.cacheCreation += row.cacheCreation
      continue
    }

    grouped.set(row.day, {
      day: row.day,
      prompt: row.prompt,
      response: row.response,
      cacheRead: row.cacheRead,
      cacheCreation: row.cacheCreation
    })
  }

  return [...grouped.values()].sort((a, b) => a.day.localeCompare(b.day))
}

function buildAreaChart(rows: DailyTokenRow[], page: UsageChartPage): UsageAreaChartResponse {
  const sortedRows = [...rows].sort((a, b) => a.day.localeCompare(b.day))
  const labels = sortedRows.map(row => row.day)
  const totals = sortedRows.map(row => weightTokens(row))

  const datasets: UsageAreaChartDataset[] = TOKEN_ORDER.map((token, index) => {
    const color = AREA_COLORS[index % AREA_COLORS.length]!

    return {
      label: TOKEN_LABELS[token],
      data: sortedRows.map((row, rowIndex) => {
        const weightedValue = row[token] * TOKEN_WEIGHTS[token]
        const total = totals[rowIndex] ?? 0
        return total === 0 ? 0 : (weightedValue / total) * 100
      }),
      borderColor: color,
      backgroundColor: rgba(color, 0.3),
      fill: true,
      tension: 0.28,
      pointRadius: 0,
      pointHoverRadius: 4,
      borderWidth: 2,
      stack: 'tokens',
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

function buildChart(rows: ChartRow[], page: UsageChartPage): UsageChartResponse {
  const sortedRows = [...rows].sort((a, b) => a.at.getTime() - b.at.getTime())
  const labels = sortedRows.map(row => formatLabel(row.at))

  const datasets: UsageChartDataset[] = sortedRows.map((row, index) => {
    const color = PALETTE[index % PALETTE.length]!

    return {
      label: row.label,
      data: labels.map((_, labelIndex) => labelIndex >= index ? row.weightedTokens : 0),
      route: row.route,
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

function projectCondition(projectName: string) {
  return projectName === 'other'
    ? or(isNull(sessions.projectName), eq(sessions.projectName, ''))
    : eq(sessions.projectName, projectName)
}

async function loadMainRows(projectName?: string): Promise<ChartRow[]> {
  const db = useDb()
  const rows = await db
    .select()
    .from(sessions)
    .where(projectName ? projectCondition(projectName) : undefined)
    .orderBy(asc(sessions.createdAt))

  return rows.map(row => ({
    label: row.name || row.sessionId.slice(0, 8),
    at: row.lastUsedAt,
    route: `/sessions/${row.sessionId}`,
    weightedTokens: weightTokens({
      prompt: row.requestTokensTotal,
      response: row.responseTokensTotal,
      cacheRead: row.cacheReadTokensTotal,
      cacheCreation: row.cacheCreationTokensTotal
    })
  }))
}

async function loadMainAreaRows(projectName?: string): Promise<DailyTokenRow[]> {
  const db = useDb()
  const rows = await db
    .select()
    .from(sessions)
    .where(projectName ? projectCondition(projectName) : undefined)
    .orderBy(asc(sessions.lastUsedAt))

  return aggregateAreaRows(rows.map(row => ({
    day: formatDay(row.lastUsedAt),
    prompt: row.requestTokensTotal,
    response: row.responseTokensTotal,
    cacheRead: row.cacheReadTokensTotal,
    cacheCreation: row.cacheCreationTokensTotal
  })))
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
    } else {
      grouped.set(key, { weightedTokens: wt, at: row.lastUsedAt })
    }
  }

  return [...grouped.entries()].map(([label, { weightedTokens, at }]) => ({
    label,
    at,
    route: `/projects/${encodeURIComponent(label)}`,
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
    promptId: string
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
      promptId: row.promptId,
      createdAt: row.createdAt,
      promptTokens: row.promptTokens,
      responseTokens: row.responseTokens,
      cacheReadTokens: row.cacheReadTokens,
      cacheCreationTokens: row.cacheCreationTokens
    })
  }

  return [...aggregated.values()].map((row, index) => ({
    label: `Prompt #${index + 1}`,
    at: row.createdAt,
    route: `/sessions/${sessionId}/prompts/${row.promptId}`,
    weightedTokens: weightTokens({
      prompt: row.promptTokens,
      response: row.responseTokens,
      cacheRead: row.cacheReadTokens,
      cacheCreation: row.cacheCreationTokens
    })
  }))
}

async function loadSessionAreaRows(sessionId: string): Promise<DailyTokenRow[]> {
  const db = useDb()
  const rows = await db
    .select()
    .from(prompts)
    .where(eq(prompts.sessionId, sessionId))
    .orderBy(asc(prompts.createdAt))

  return aggregateAreaRows(rows.map(row => ({
    day: formatDay(row.createdAt),
    prompt: row.promptTokens,
    response: row.responseTokens,
    cacheRead: row.cacheReadTokens,
    cacheCreation: row.cacheCreationTokens
  })))
}

async function loadPromptRows(sessionId: string, promptId: string): Promise<ChartRow[]> {
  const db = useDb()
  const rows = await db
    .select()
    .from(prompts)
    .where(and(eq(prompts.sessionId, sessionId), eq(prompts.promptId, promptId)))
    .orderBy(asc(prompts.createdAt))

  return rows.map((row, index) => ({
    label: `API Call #${index + 1}`,
    at: row.createdAt,
    weightedTokens: weightTokens({
      prompt: row.promptTokens,
      response: row.responseTokens,
      cacheRead: row.cacheReadTokens,
      cacheCreation: row.cacheCreationTokens
    })
  }))
}

async function loadPromptAreaRows(sessionId: string, promptId: string): Promise<DailyTokenRow[]> {
  const db = useDb()
  const rows = await db
    .select()
    .from(prompts)
    .where(and(eq(prompts.sessionId, sessionId), eq(prompts.promptId, promptId)))
    .orderBy(asc(prompts.createdAt))

  return aggregateAreaRows(rows.map(row => ({
    day: formatDay(row.createdAt),
    prompt: row.promptTokens,
    response: row.responseTokens,
    cacheRead: row.cacheReadTokens,
    cacheCreation: row.cacheCreationTokens
  })))
}

const BREAKDOWN_LABELS = ['Input', 'Output', 'Cache Read', 'Cache Write']
const BREAKDOWN_COLORS = ['#2563eb', '#0f766e', '#16a34a', '#ca8a04']

async function loadBreakdownTotals(page: UsageChartPage, sessionId?: string, promptId?: string, projectName?: string): Promise<number[]> {
  const db = useDb()

  if (page === 'main') {
    const [row] = await db.select({
      promptTotal: sum(sessions.requestTokensTotal),
      responseTotal: sum(sessions.responseTokensTotal),
      cacheReadTotal: sum(sessions.cacheReadTokensTotal),
      cacheCreationTotal: sum(sessions.cacheCreationTokensTotal)
    })
      .from(sessions)
      .where(projectName ? projectCondition(projectName) : undefined)

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
  projectName?: string
}): Promise<BreakdownChartResponse> {
  const data = await loadBreakdownTotals(params.page, params.sessionId, params.promptId, params.projectName)

  return {
    page: params.page,
    labels: BREAKDOWN_LABELS,
    datasets: [{
      label: 'Input-equivalent weighted tokens',
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

export async function getAreaChartData(params: {
  page: UsageChartPage
  sessionId?: string
  promptId?: string
  projectName?: string
}): Promise<UsageAreaChartResponse> {
  if (params.page === 'main') {
    return buildAreaChart(await loadMainAreaRows(params.projectName), 'main')
  }

  if (params.page === 'session') {
    if (!params.sessionId) throw createError({ statusCode: 400, message: 'sessionId required' })
    return buildAreaChart(await loadSessionAreaRows(params.sessionId), 'session')
  }

  if (!params.sessionId || !params.promptId) {
    throw createError({ statusCode: 400, message: 'sessionId and promptId required' })
  }

  return buildAreaChart(await loadPromptAreaRows(params.sessionId, params.promptId), 'prompt')
}

export async function getUsageChartData(params: {
  page: UsageChartPage
  sessionId?: string
  promptId?: string
  dimension?: UsageChartDimension
  projectName?: string
}): Promise<UsageChartResponse> {
  if (params.page === 'main') {
    const rows = params.dimension === 'project'
      ? await loadMainProjectRows()
      : await loadMainRows(params.projectName)
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
