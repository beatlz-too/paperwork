import { useDb } from '#server/db/client'
import { sessions, projects } from '#server/db/schema'
import { desc, eq } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = useDb()
  return db
    .select({
      id: sessions.id,
      sessionId: sessions.sessionId,
      name: sessions.name,
      projectId: sessions.projectId,
      projectName: projects.name,
      requestTokensTotal: sessions.requestTokensTotal,
      responseTokensTotal: sessions.responseTokensTotal,
      cacheReadTokensTotal: sessions.cacheReadTokensTotal,
      cacheCreationTokensTotal: sessions.cacheCreationTokensTotal,
      createdAt: sessions.createdAt,
      lastUsedAt: sessions.lastUsedAt
    })
    .from(sessions)
    .leftJoin(projects, eq(sessions.projectId, projects.id))
    .orderBy(desc(sessions.lastUsedAt))
})
