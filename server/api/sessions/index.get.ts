import { useDb } from '#server/db/client'
import { sessions } from '#server/db/schema'
import { desc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = useDb()
  return db
    .select()
    .from(sessions)
    .orderBy(desc(sessions.lastUsedAt))
})
