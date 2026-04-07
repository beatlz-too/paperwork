import reportPromptTemplate from '../docs/report.prompt.md?raw'
import apiCallsSchema from '../schemas/api-calls.schema.json'
import projectsSchema from '../schemas/projects.schema.json'
import promptsSchema from '../schemas/prompts.schema.json'
import sessionsSchema from '../schemas/sessions.schema.json'
import { getTablePayload, type TableJsonColumn } from './getTablePayload'
import type { TableJsonTableName } from '../types/tables.interface'

const tableSchemas = {
  sessions: sessionsSchema,
  projects: projectsSchema,
  prompts: promptsSchema,
  apiCalls: apiCallsSchema
} satisfies Record<TableJsonTableName, unknown>

export function buildReportPrompt(tableName: string, tableSchema: string, tableData: string): string {
  return reportPromptTemplate
    .replaceAll('{{ table_name }}', tableName)
    .replaceAll('{{ table_schema }}', tableSchema)
    .replaceAll('{{ table_data }}', tableData)
}

export function formatMarkdownCodeBlock(language: string, content: string): string {
  return ['```' + language, content, '```'].join('\n')
}

function formatJsonCodeBlock(value: unknown): string {
  return formatMarkdownCodeBlock('json', JSON.stringify(value, null, 2))
}

export function createTableReportPrompt<TableName extends TableJsonTableName>(
  tableName: TableName,
  rows: readonly object[],
  columns?: readonly TableJsonColumn[]
): string {
  const payload = getTablePayload(tableName, rows, columns)
  const schema = tableSchemas[tableName]

  return buildReportPrompt(
    tableName,
    formatJsonCodeBlock(schema),
    formatJsonCodeBlock(payload)
  )
}
