import { existsSync } from 'fs'
import { resolve } from 'path'
import { runMigrations } from '../src/db/migrate.js'
import { createDb } from '../src/db/index.js'

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.error('Usage: npm run db:generate <DB_NAME> <SCRIPT_PATH> [...SCRIPT_ARGS]')
    console.error('Example: npm run db:generate demo.db ./api/src/db/generators/basic.ts --rows 100')
    process.exit(1)
  }

  const dbName = args[0]
  const scriptPath = args[1]
  const scriptArgs = args.slice(2)

  const dbPath = resolve(dbName)
  const force = scriptArgs.includes('--force')

  if (existsSync(dbPath) && !force) {
    console.error(`Database "${dbPath}" already exists. Use --force to overwrite.`)
    process.exit(1)
  }

  // Run migrations to create tables
  console.log(`Creating database: ${dbPath}`)
  runMigrations(dbPath)

  // Connect with Drizzle
  const db = createDb(dbPath)

  // Parse seed from args
  let seed = 42
  const seedIdx = scriptArgs.indexOf('--seed')
  if (seedIdx !== -1 && scriptArgs[seedIdx + 1]) {
    seed = parseInt(scriptArgs[seedIdx + 1], 10)
  }

  // Load and execute generator script
  const absScriptPath = resolve(scriptPath)
  console.log(`Running generator: ${absScriptPath}`)
  const generator = await import(absScriptPath)

  await generator.run(
    { db, seed, logger: console },
    scriptArgs
  )

  console.log('Done!')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
