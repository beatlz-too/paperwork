import type { AggregatedPrompt, Prompt, ProjectSummary, Session } from '#shared/types'
import type { ApiCallTableRow, PromptTableRow } from './tableColumns'

export function buildProjectData(sessions: readonly Session[]): ProjectSummary[] {
  const grouped = new Map<string, ProjectSummary>()

  for (const session of sessions) {
    const key = session.projectName?.trim() || 'other'
    const existing = grouped.get(key)

    if (existing) {
      existing.sessionCount++
      existing.requestTokensTotal += session.requestTokensTotal
      existing.responseTokensTotal += session.responseTokensTotal
      existing.cacheReadTokensTotal += session.cacheReadTokensTotal
      existing.cacheCreationTokensTotal += session.cacheCreationTokensTotal
      if (session.lastUsedAt > existing.lastUsedAt) existing.lastUsedAt = session.lastUsedAt
      if (session.createdAt < existing.createdAt) existing.createdAt = session.createdAt
    } else {
      grouped.set(key, {
        projectName: key,
        sessionCount: 1,
        requestTokensTotal: session.requestTokensTotal,
        responseTokensTotal: session.responseTokensTotal,
        cacheReadTokensTotal: session.cacheReadTokensTotal,
        cacheCreationTokensTotal: session.cacheCreationTokensTotal,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt
      })
    }
  }

  return [...grouped.values()].sort((a, b) =>
    new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
  )
}

export function buildPromptRows(prompts: readonly AggregatedPrompt[]): PromptTableRow[] {
  return prompts.map((prompt, index) => ({
    ...prompt,
    promptNumber: index + 1
  }))
}

export function buildApiCallRows(apiCalls: readonly Prompt[]): ApiCallTableRow[] {
  return apiCalls.map((row, index) => ({
    ...row,
    callNumber: index + 1
  }))
}
