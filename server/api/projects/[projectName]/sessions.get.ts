import { useDb } from '#server/db/client'
import { sessions } from '#server/db/schema'
import { desc, eq, isNull, or } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const projectName = decodeURIComponent(getRouterParam(event, 'projectName') ?? '')
  if (!projectName) throw createError({ statusCode: 400, message: 'projectName required' })

  const db = useDb()

  const condition = projectName === 'other'
    ? or(isNull(sessions.projectName), eq(sessions.projectName, ''))
    : eq(sessions.projectName, projectName)

  return db
    .select()
    .from(sessions)
    .where(condition)
    .orderBy(desc(sessions.lastUsedAt))
})
