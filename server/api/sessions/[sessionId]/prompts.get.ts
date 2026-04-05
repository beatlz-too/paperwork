import { useDb } from '#server/db/client'
import { prompts } from '#server/db/schema'
import { eq, asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const sessionId = getRouterParam(event, 'sessionId')
  if (!sessionId) throw createError({ statusCode: 400, message: 'sessionId required' })

  const db = useDb()
  const rows = await db
    .select()
    .from(prompts)
    .where(eq(prompts.sessionId, sessionId))
    .orderBy(asc(prompts.createdAt))

  // Aggregate rows sharing the same prompt.id (stored in the prompt column)
  const map = new Map<string, {
    promptId: string
    apiCalls: number
    toolNames: string[]
    promptTokens: number
    responseTokens: number
    cacheReadTokens: number
    cacheCreationTokens: number
    createdAt: string
  }>()

  for (const row of rows) {
    const key = row.promptId
    const existing = map.get(key)
    if (existing) {
      existing.apiCalls++
      if (row.toolName && !existing.toolNames.includes(row.toolName)) {
        existing.toolNames.push(row.toolName)
      }
      existing.promptTokens += row.promptTokens
      existing.responseTokens += row.responseTokens
      existing.cacheReadTokens += row.cacheReadTokens
      existing.cacheCreationTokens += row.cacheCreationTokens
    } else {
      map.set(key, {
        promptId: key,
        apiCalls: 1,
        toolNames: row.toolName ? [row.toolName] : [],
        promptTokens: row.promptTokens,
        responseTokens: row.responseTokens,
        cacheReadTokens: row.cacheReadTokens,
        cacheCreationTokens: row.cacheCreationTokens,
        createdAt: row.createdAt.toISOString()
      })
    }
  }

  return [...map.values()]
})
