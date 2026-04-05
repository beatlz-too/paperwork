import { setSessionProjectName } from '#server/services/projects'

export default defineEventHandler(async (event) => {
  const sessionId = getRouterParam(event, 'sessionId')
  if (!sessionId) throw createError({ statusCode: 400, message: 'sessionId required' })

  const body = await readBody(event)
  const projectName = String(body?.projectName ?? '').trim()

  await setSessionProjectName(sessionId, projectName || null)

  return { ok: true }
})
