import { useDb } from '#server/db/client'
import { projects, sessions } from '#server/db/schema'
import { sql } from 'drizzle-orm'
import { execSync } from 'child_process'
import path from 'path'

function resolveProjectName(cwd: string): string {
  try {
    const remote = execSync(`git -C "${cwd}" remote get-url origin`, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()
    const match = remote.match(/([^/]+?)(?:\.git)?$/)
    if (match?.[1]) return match[1]
  } catch {
    // not a git repo or no remote — fall through
  }

  const name = path.basename(cwd)
  if (!name) {
    throw createError({
      statusCode: 500,
      message: `Could not determine project name: path "${cwd}" has no basename and is not a git repo with a remote. Check that the path exists and is correct.`
    })
  }
  return name
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ sessionId?: string; cwd?: string }>(event)

  if (!body?.sessionId) {
    throw createError({ statusCode: 400, message: 'sessionId is required' })
  }
  if (!body?.cwd) {
    throw createError({ statusCode: 400, message: 'cwd is required' })
  }

  const { sessionId, cwd } = body

  const name = resolveProjectName(cwd)

  const db = useDb()

  // Find or create the project
  const [project] = await db
    .insert(projects)
    .values({ name })
    .onConflictDoUpdate({
      target: projects.name,
      set: { name: sql`EXCLUDED.name` }
    })
    .returning({ id: projects.id, name: projects.name })

  // Upsert the session with project_id, leaving all other columns untouched
  await db
    .insert(sessions)
    .values({ sessionId, name: '', projectId: project.id })
    .onConflictDoUpdate({
      target: sessions.sessionId,
      set: { projectId: project.id }
    })

  console.log(`[register] session=${sessionId} project="${name}" (${project.id})`)

  return { ok: true, projectId: project.id, projectName: name }
})
