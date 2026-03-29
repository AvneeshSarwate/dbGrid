import Database from 'better-sqlite3'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function runMigrations(dbPath: string) {
  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')

  const migrationSql = readFileSync(
    join(__dirname, 'migrations', '0000_init.sql'),
    'utf-8'
  )

  sqlite.exec(migrationSql)
  sqlite.close()
}
