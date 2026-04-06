import { getAreaChartData, getBreakdownChartData, getUsageChartData } from '#server/services/charts'
import type { UsageChartDimension, UsageChartKind, UsageChartPage } from '#shared/types'

const PAGES: UsageChartPage[] = ['main', 'session', 'prompt']
const KINDS: UsageChartKind[] = ['stacked', 'breakdown', 'area']
const DIMENSIONS: UsageChartDimension[] = ['session', 'project']

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = String(query.page ?? 'main') as UsageChartPage
  const kind = String(query.kind ?? 'stacked') as UsageChartKind
  const dimension = String(query.dimension ?? 'session') as UsageChartDimension

  if (!PAGES.includes(page)) {
    throw createError({ statusCode: 400, message: 'page must be one of main, session, prompt' })
  }

  if (!KINDS.includes(kind)) {
    throw createError({ statusCode: 400, message: 'kind must be one of stacked, breakdown, area' })
  }

  if (!DIMENSIONS.includes(dimension)) {
    throw createError({ statusCode: 400, message: 'dimension must be one of session, project' })
  }

  const sessionId = query.sessionId ? String(query.sessionId) : undefined
  const projectName = query.projectName ? decodeURIComponent(String(query.projectName)) : undefined

  if (kind === 'breakdown') {
    return getBreakdownChartData({
      page,
      sessionId,
      promptId: query.promptId ? String(query.promptId) : undefined,
      projectName
    })
  }

  if (kind === 'area') {
    return getAreaChartData({
      page,
      sessionId,
      promptId: query.promptId ? String(query.promptId) : undefined,
      projectName
    })
  }

  return getUsageChartData({
    page,
    sessionId,
    promptId: query.promptId ? String(query.promptId) : undefined,
    dimension,
    projectName
  })
})
