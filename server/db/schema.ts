import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * Session rollup records.
 *
 * Each row represents one Claude Code session and stores the aggregate token totals
 * we use for the overview, project, and session pages.
 */
export const sessions = pgTable('sessions', {
  /** Internal database primary key. */
  id: uuid('id').primaryKey().defaultRandom(),
  /** Stable session identifier used in URLs and API responses. */
  sessionId: text('session_id').notNull().unique(),
  /** Optional human-friendly session name. */
  name: text('name').notNull().default(''),
  /** Optional project grouping assigned to the session. */
  projectName: text('project_name'),
  /** Total input tokens across all prompts in the session. */
  requestTokensTotal: integer('request_tokens_total').notNull().default(0),
  /** Total output tokens across all prompts in the session. */
  responseTokensTotal: integer('response_tokens_total').notNull().default(0),
  /** Total cache-read tokens across all prompts in the session. */
  cacheReadTokensTotal: integer('cache_read_tokens_total').notNull().default(0),
  /** Total cache-write tokens across all prompts in the session. */
  cacheCreationTokensTotal: integer('cache_creation_tokens_total').notNull().default(0),
  /** Session creation time. */
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  /** Most recent prompt activity time for the session. */
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow()
}, table => ({
  projectNameIdx: index('sessions_project_name_idx').on(table.projectName)
}))

/**
 * Prompt-level API call records.
 *
 * Each row represents one API call inside a session prompt and stores the raw
 * per-call token usage that powers the prompt detail page.
 */
export const prompts = pgTable('prompts', {
  /** Internal database primary key. */
  id: uuid('id').primaryKey().defaultRandom(),
  /** Session identifier this prompt belongs to. */
  sessionId: text('session_id').notNull().references(() => sessions.sessionId),
  /** Stable prompt identifier used in URLs and API responses. */
  promptId: text('prompt_id').notNull().default(''),
  /** Tool name used for the API call. */
  toolName: text('tool_name').notNull().default(''),
  /** Input tokens attributed to the prompt itself. */
  promptTokens: integer('prompt_tokens').notNull().default(0),
  /** Raw request tokens for the API call. */
  requestTokens: integer('request_tokens').notNull().default(0),
  /** Raw response tokens for the API call. */
  responseTokens: integer('response_tokens').notNull().default(0),
  /** Cache-read tokens for the API call. */
  cacheReadTokens: integer('cache_read_tokens').notNull().default(0),
  /** Cache-write tokens for the API call. */
  cacheCreationTokens: integer('cache_creation_tokens').notNull().default(0),
  /** API call creation time. */
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export type Session = typeof sessions.$inferSelect
export type Prompt = typeof prompts.$inferSelect
