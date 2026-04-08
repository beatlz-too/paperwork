import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'
import { migrate } from 'drizzle-orm/bun-sqlite/migrator'
import { mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const DATABASE_URL = process.env.DATABASE_URL ?? './data/paperwork.db'
const dbPath = resolve(DATABASE_URL)

mkdirSync(dirname(dbPath), { recursive: true })

const client = new Database(dbPath)
const db = drizzle(client)

migrate(db, { migrationsFolder: './server/db/migrations' })
console.log('Migrations complete.')

client.close()
