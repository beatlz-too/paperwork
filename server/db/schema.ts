import { pgTable, text, integer, timestamp, uuid } from 'drizzle-orm/pg-core'

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: text('session_id').notNull().unique(),
  name: text('name').notNull().default(''),
  requestTokensTotal: integer('request_tokens_total').notNull().default(0),
  responseTokensTotal: integer('response_tokens_total').notNull().default(0),
  cacheReadTokensTotal: integer('cache_read_tokens_total').notNull().default(0),
  cacheCreationTokensTotal: integer('cache_creation_tokens_total').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
  projectId: uuid('project_id').references(() => projects.id)
})

export const prompts = pgTable('prompts', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: text('session_id').notNull().references(() => sessions.sessionId),
  promptId: text('prompt_id').notNull().default(''),
  promptTokens: integer('prompt_tokens').notNull().default(0),
  requestTokens: integer('request_tokens').notNull().default(0),
  responseTokens: integer('response_tokens').notNull().default(0),
  cacheReadTokens: integer('cache_read_tokens').notNull().default(0),
  cacheCreationTokens: integer('cache_creation_tokens').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export type Project = typeof projects.$inferSelect
export type Session = typeof sessions.$inferSelect
export type Prompt = typeof prompts.$inferSelect
