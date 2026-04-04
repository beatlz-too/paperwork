import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const migrationsDir = join(import.meta.dir, '../server/db/migrations')

const files = readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort()

for (const file of files) {
  const migration = readFileSync(join(migrationsDir, file), 'utf-8')
  console.log(`Running migration: ${file}`)

  const proc = Bun.spawn(
    ['docker', 'exec', '-i', 'supabase-db', 'psql', '-U', 'postgres', '-d', 'postgres'],
    {
      stdin: new TextEncoder().encode(migration),
      stdout: 'inherit',
      stderr: 'inherit'
    }
  )

  const exitCode = await proc.exited
  if (exitCode !== 0) {
    console.error(`Migration failed: ${file}`)
    process.exit(exitCode)
  }

  console.log(`Done: ${file}`)
}

console.log('All migrations complete.')
