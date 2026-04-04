import { useDb } from '#server/db/client'
import { prompts } from '#server/db/schema'
import { eq, and, asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const sessionId = getRouterParam(event, 'sessionId')
  const promptId = getRouterParam(event, 'promptId')
  if (!sessionId || !promptId) throw createError({ statusCode: 400, message: 'sessionId and promptId required' })

  const db = useDb()
  return db
    .select()
    .from(prompts)
    .where(and(eq(prompts.sessionId, sessionId), eq(prompts.promptId, promptId)))
    .orderBy(asc(prompts.createdAt))
})
