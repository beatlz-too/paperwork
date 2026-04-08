/// <reference types="bun-types" />
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import * as schema from './schema'

let _db: ReturnType<typeof drizzle> | null = null

export function useDb() {
  if (_db) return _db
  const config = useRuntimeConfig()
  const client = new Database(config.databaseUrl)
  _db = drizzle(client, { schema })
  return _db
}
