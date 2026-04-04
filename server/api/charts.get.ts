import { getUsageChartData } from '#server/services/charts'
import type { UsageChartPage } from '#shared/types'

const PAGES: UsageChartPage[] = ['main', 'session', 'prompt']

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = String(query.page ?? 'main') as UsageChartPage

  if (!PAGES.includes(page)) {
    throw createError({ statusCode: 400, message: 'page must be one of main, session, prompt' })
  }

  return getUsageChartData({
    page,
    sessionId: query.sessionId ? String(query.sessionId) : undefined,
    promptId: query.promptId ? String(query.promptId) : undefined
  })
})
