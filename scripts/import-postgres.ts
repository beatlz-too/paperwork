/**
 * Import legacy telemetry data from Postgres into the local SQLite database.
 *
 * Usage:
 *   SOURCE_DATABASE_URL=postgresql://user:pass@host:5432/db bun run db:import:postgres
 *
 * Optional flags:
 *   --source <url>  Postgres connection string. Overrides SOURCE_DATABASE_URL.
 *   --target <path>  SQLite database path. Defaults to ./data/paperwork.db.
 *   --force         Clear existing rows from the target SQLite database first.
 *
 * The script expects the source database to contain the `sessions` and `prompts`
 * tables created by the older Postgres version of Paperwork.
 */

/// <reference types="bun-types" />

import postgres from 'postgres'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { prompts, sessions } from '../server/db/schema'

type DatabaseValue = string | number | Date

interface SourceSessionRow {
  id: string
  session_id: string
  name: string
  project_name: string | null
  request_tokens_total: number
  response_tokens_total: number
  cache_read_tokens_total: number
  cache_creation_tokens_total: number
  created_at: DatabaseValue
  last_used_at: DatabaseValue
}

interface SourcePromptRow {
  id: string
  session_id: string
  prompt_id: string
  tool_name: string
  prompt_tokens: number
  request_tokens: number
  response_tokens: number
  cache_read_tokens: number
  cache_creation_tokens: number
  created_at: DatabaseValue
}

interface ParsedArgs {
  sourceUrl?: string
  targetPath: string
  force: boolean
}

function parseArgs(argv: string[]): ParsedArgs {
  let sourceUrl = process.env.SOURCE_DATABASE_URL
  let targetPath = './data/paperwork.db'
  let force = false

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--source') {
      sourceUrl = argv[++i]
      continue
    }
    if (arg === '--target') {
      targetPath = argv[++i] ?? targetPath
      continue
    }
    if (arg === '--force') {
      force = true
      continue
    }
    if (arg === '--help' || arg === '-h') {
      printUsageAndExit(0)
    }
  }

  return { sourceUrl, targetPath, force }
}

function printUsageAndExit(exitCode: number): never {
  console.log([
    'Usage:',
    '  SOURCE_DATABASE_URL=postgresql://... bun run db:import:postgres',
    '',
    'Options:',
    '  --source <url>  Override SOURCE_DATABASE_URL',
    '  --target <path> Override ./data/paperwork.db',
    '  --force         Clear the target SQLite tables before importing'
  ].join('\n'))
  process.exit(exitCode)
}

function toDate(value: DatabaseValue): Date {
  return value instanceof Date ? value : new Date(value)
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

const { sourceUrl, targetPath, force } = parseArgs(process.argv.slice(2))

if (!sourceUrl) {
  console.error('ERROR: provide SOURCE_DATABASE_URL or pass --source <url>.')
  process.exit(1)
}

const dbPath = resolve(targetPath)
mkdirSync(dirname(dbPath), { recursive: true })

const client = new Database(dbPath)
client.exec('PRAGMA foreign_keys = ON')

const db = drizzle(client, { schema: { sessions, prompts } })
const source = postgres(sourceUrl, { max: 1 })

try {
  migrate(db, { migrationsFolder: './server/db/migrations' })

  const existingSessionCount = client.prepare('select count(*) as count from sessions').get() as { count?: number } | undefined
  const existingPromptCount = client.prepare('select count(*) as count from prompts').get() as { count?: number } | undefined

  const hasExistingRows = (existingSessionCount?.count ?? 0) > 0 || (existingPromptCount?.count ?? 0) > 0
  if (hasExistingRows && !force) {
    console.error([
      `ERROR: ${dbPath} already contains data.`,
      'Refusing to import into a non-empty SQLite database.',
      'Re-run with --force to clear the target tables first.'
    ].join('\n'))
    process.exit(1)
  }

  console.log(`Reading Postgres data from ${sourceUrl}`)
  const sourceSessions = await source<SourceSessionRow[]>`
    select
      id,
      session_id,
      name,
      project_name,
      request_tokens_total,
      response_tokens_total,
      cache_read_tokens_total,
      cache_creation_tokens_total,
      created_at,
      last_used_at
    from sessions
    order by created_at asc
  `

  const sourcePrompts = await source<SourcePromptRow[]>`
    select
      id,
      session_id,
      prompt_id,
      tool_name,
      prompt_tokens,
      request_tokens,
      response_tokens,
      cache_read_tokens,
      cache_creation_tokens,
      created_at
    from prompts
    order by created_at asc
  `

  const sessionRows = sourceSessions.map(row => ({
    id: row.id,
    sessionId: row.session_id,
    name: row.name ?? '',
    projectName: row.project_name,
    requestTokensTotal: row.request_tokens_total ?? 0,
    responseTokensTotal: row.response_tokens_total ?? 0,
    cacheReadTokensTotal: row.cache_read_tokens_total ?? 0,
    cacheCreationTokensTotal: row.cache_creation_tokens_total ?? 0,
    createdAt: toDate(row.created_at),
    lastUsedAt: toDate(row.last_used_at)
  }))

  const promptRows = sourcePrompts.map(row => ({
    id: row.id,
    sessionId: row.session_id,
    promptId: row.prompt_id ?? '',
    toolName: row.tool_name ?? '',
    promptTokens: row.prompt_tokens ?? 0,
    requestTokens: row.request_tokens ?? 0,
    responseTokens: row.response_tokens ?? 0,
    cacheReadTokens: row.cache_read_tokens ?? 0,
    cacheCreationTokens: row.cache_creation_tokens ?? 0,
    createdAt: toDate(row.created_at)
  }))

  console.log(`Found ${sessionRows.length} sessions and ${promptRows.length} prompts in Postgres.`)

  client.exec('BEGIN')
  try {
    if (force) {
      client.prepare('delete from prompts').run()
      client.prepare('delete from sessions').run()
    }

    for (const batch of chunk(sessionRows, 250)) {
      db.insert(sessions).values(batch).run()
    }

    for (const batch of chunk(promptRows, 250)) {
      db.insert(prompts).values(batch).run()
    }

    client.exec('COMMIT')
  } catch (error) {
    client.exec('ROLLBACK')
    throw error
  }

  console.log(`Imported ${sessionRows.length} sessions and ${promptRows.length} prompts into ${dbPath}`)
} finally {
  await source.end({ timeout: 5 })
  client.close()
}
