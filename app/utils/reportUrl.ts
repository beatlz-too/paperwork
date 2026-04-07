import type { TableJsonTableName } from '#shared/types/tables.interface'

export function buildReportUrl(tableName: TableJsonTableName, params: Record<string, string | null | undefined>): string {
  const query = new URLSearchParams({ table: tableName })

  for (const [key, value] of Object.entries(params)) {
    if (!value) continue
    query.set(key, value)
  }

  return `/report?${query.toString()}`
}
