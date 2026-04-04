import { useDb } from '#server/db/client'
import { sessions } from '#server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const sessionId = getRouterParam(event, 'sessionId')
  if (!sessionId) throw createError({ statusCode: 400, message: 'sessionId required' })

  const body = await readBody(event)
  const name = String(body?.name ?? '').trim()

  await useDb()
    .update(sessions)
    .set({ name })
    .where(eq(sessions.sessionId, sessionId))

  return { ok: true }
})
