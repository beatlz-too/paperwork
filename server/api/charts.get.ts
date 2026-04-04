import { getBreakdownChartData, getUsageChartData } from '#server/services/charts'
import type { UsageChartKind, UsageChartPage } from '#shared/types'

const PAGES: UsageChartPage[] = ['main', 'session', 'prompt']
const KINDS: UsageChartKind[] = ['stacked', 'breakdown']

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = String(query.page ?? 'main') as UsageChartPage
  const kind = String(query.kind ?? 'stacked') as UsageChartKind

  if (!PAGES.includes(page)) {
    throw createError({ statusCode: 400, message: 'page must be one of main, session, prompt' })
  }

  if (!KINDS.includes(kind)) {
    throw createError({ statusCode: 400, message: 'kind must be one of stacked, breakdown' })
  }

  const sessionId = query.sessionId ? String(query.sessionId) : undefined

  if (kind === 'breakdown') {
    return getBreakdownChartData({
      page,
      sessionId,
      promptId: query.promptId ? String(query.promptId) : undefined
    })
  }

  return getUsageChartData({
    page,
    sessionId,
    promptId: query.promptId ? String(query.promptId) : undefined
  })
})
