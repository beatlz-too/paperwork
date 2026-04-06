/**
 * Rows copied from the sessions overview table.
 *
 * This mirrors the visible table columns, not the underlying database schema.
 */
export interface SessionsTableJsonRow {
  /** Project name shown in the table. */
  projectName: string | null
  /** Session name shown in the table. */
  name: string
  /** Stable session identifier displayed in the table. */
  sessionId: string
  /** Total input tokens for the session. */
  requestTokensTotal: number
  /** Total output tokens for the session. */
  responseTokensTotal: number
  /** Total cache-read tokens for the session. */
  cacheReadTokensTotal: number
  /** Total cache-write tokens for the session. */
  cacheCreationTokensTotal: number
  /** Session creation timestamp. */
  createdAt: string
  /** Most recent activity timestamp for the session. */
  lastUsedAt: string
}

/**
 * Rows copied from the grouped projects table.
 *
 * This mirrors the visible table columns, not the underlying database schema.
 */
export interface ProjectsTableJsonRow {
  /** Project name shown in the table. */
  projectName: string
  /** Number of sessions in the project group. */
  sessionCount: number
  /** Total input tokens across the project group. */
  requestTokensTotal: number
  /** Total output tokens across the project group. */
  responseTokensTotal: number
  /** Total cache-read tokens across the project group. */
  cacheReadTokensTotal: number
  /** Total cache-write tokens across the project group. */
  cacheCreationTokensTotal: number
  /** Earliest session creation time in the group. */
  createdAt: string
  /** Most recent activity time in the group. */
  lastUsedAt: string
}

/**
 * Rows copied from the session prompt table.
 *
 * This mirrors the visible table columns, not the underlying database schema.
 */
export interface PromptsTableJsonRow {
  /** 1-based prompt number shown in the table. */
  promptNumber: number
  /** Stable prompt identifier shown in the table. */
  promptId: string
  /** Number of API calls included in the prompt. */
  apiCalls: number
  /** Tool names used by the prompt. */
  toolNames: string[]
  /** Input tokens attributed to the prompt. */
  promptTokens: number
  /** Output tokens attributed to the prompt. */
  responseTokens: number
  /** Cache-read tokens attributed to the prompt. */
  cacheReadTokens: number
  /** Cache-write tokens attributed to the prompt. */
  cacheCreationTokens: number
  /** Prompt creation timestamp. */
  createdAt: string
}

/**
 * Rows copied from the per-prompt API call table.
 *
 * This mirrors the visible table columns, not the underlying database schema.
 */
export interface ApiCallsTableJsonRow {
  /** 1-based API call number shown in the table. */
  callNumber: number
  /** API call creation timestamp. */
  createdAt: string
  /** Tool name shown for the call. */
  toolName: string | null
  /** Input tokens for the call. */
  promptTokens: number
  /** Output tokens for the call. */
  responseTokens: number
  /** Cache-read tokens for the call. */
  cacheReadTokens: number
  /** Cache-write tokens for the call. */
  cacheCreationTokens: number
}

/**
 * Clipboard payload for one copied table.
 *
 * Example:
 * {
 *   sessions: {
 *     rows: [...]
 *   }
 * }
 */
export interface TableJsonTable<Row> {
  rows: Row[]
}

/**
 * Available table names in the UI.
 */
export type TableJsonTableName = 'sessions' | 'projects' | 'prompts' | 'apiCalls'

/**
 * Mapping from table name to the copied row shape for that table.
 */
export interface TableJsonTableMap {
  sessions: TableJsonTable<SessionsTableJsonRow>
  projects: TableJsonTable<ProjectsTableJsonRow>
  prompts: TableJsonTable<PromptsTableJsonRow>
  apiCalls: TableJsonTable<ApiCallsTableJsonRow>
}

/**
 * The full clipboard payload returned by the copy helper.
 */
export type TableJsonPayload<TableName extends TableJsonTableName = TableJsonTableName> = {
  [K in TableName]: TableJsonTableMap[K]
}
