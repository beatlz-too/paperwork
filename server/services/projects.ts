import { and, asc, eq, isNotNull, sql } from 'drizzle-orm'
import { sessions } from '#server/db/schema'
import { useDb } from '#server/db/client'

export async function listProjectNames(): Promise<string[]> {
  const db = useDb()
  const rows = await db
    .selectDistinct({
      projectName: sessions.projectName
    })
    .from(sessions)
    .where(
      and(
        isNotNull(sessions.projectName),
        sql`trim(${sessions.projectName}) <> ''`
      )
    )
    .orderBy(asc(sessions.projectName))

  return [...new Set(
    rows
      .map(row => row.projectName?.trim())
      .filter((value): value is string => Boolean(value))
  )].sort((a, b) => a.localeCompare(b))
}

export async function setSessionProjectName(sessionId: string, projectName: string | null): Promise<void> {
  const db = useDb()
  await db
    .update(sessions)
    .set({ projectName })
    .where(eq(sessions.sessionId, sessionId))
}
