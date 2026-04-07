import type { TableJsonPayload, TableJsonTableName } from '../types/tables.interface'

export interface TableJsonColumn {
  accessorKey?: unknown
}

function normalizeValue(value: unknown): unknown {
  return value === undefined ? null : value
}

function columnKey(column: TableJsonColumn): string | null {
  if (column.accessorKey === undefined || column.accessorKey === null) return null
  return String(column.accessorKey)
}

export function getTablePayload<TableName extends TableJsonTableName>(
  tableName: TableName,
  rows: readonly object[],
  columns?: readonly TableJsonColumn[]
): TableJsonPayload<TableName> {
  const columnKeys = columns?.map(columnKey).filter((key): key is string => key !== null)

  return {
    [tableName]: {
      rows: rows.map((row) => {
        const rowRecord = row as Record<string, unknown>

        if (!columnKeys?.length) {
          return Object.fromEntries(
            Object.entries(rowRecord).map(([key, value]) => [key, normalizeValue(value)])
          )
        }

        return Object.fromEntries(
          columnKeys.map(key => [key, normalizeValue(rowRecord[key])])
        )
      })
    }
  } as unknown as TableJsonPayload<TableName>
}
