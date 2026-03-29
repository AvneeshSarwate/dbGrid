import type { Db } from '../index.js'
import { jsonDocuments } from '../schema/json-documents.js'

type GeneratorContext = {
  db: Db
  seed: number
  logger: typeof console
}

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)]
}

function generateNestedJson(rand: () => number, depth: number): unknown {
  if (depth <= 0) {
    return rand() > 0.5 ? Math.round(rand() * 1000) : `val-${Math.floor(rand() * 100)}`
  }
  const obj: Record<string, unknown> = {}
  const keys = Math.floor(rand() * 4) + 2
  for (let i = 0; i < keys; i++) {
    const key = `field_${Math.floor(rand() * 100)}`
    obj[key] = rand() > 0.4
      ? generateNestedJson(rand, depth - 1)
      : Array.from({ length: Math.floor(rand() * 3) + 1 }, () => generateNestedJson(rand, depth - 2))
  }
  return obj
}

export async function run(ctx: GeneratorContext, args: string[]) {
  let rowCount = 500
  let depth = 3

  const rowsIdx = args.indexOf('--rows')
  if (rowsIdx !== -1 && args[rowsIdx + 1]) {
    rowCount = parseInt(args[rowsIdx + 1], 10)
  }
  const depthIdx = args.indexOf('--depth')
  if (depthIdx !== -1 && args[depthIdx + 1]) {
    depth = parseInt(args[depthIdx + 1], 10)
  }

  const rand = seededRandom(ctx.seed)
  const docCategories = ['report', 'config', 'template', 'spec', 'manifest', 'schema']

  ctx.logger.log(`Generating ${rowCount} json_documents rows (depth=${depth})...`)

  const batchSize = 200
  for (let offset = 0; offset < rowCount; offset += batchSize) {
    const count = Math.min(batchSize, rowCount - offset)
    const rows = Array.from({ length: count }, (_, i) => ({
      title: `Doc-${offset + i + 1}`,
      category: pick(docCategories, rand),
      version: Math.floor(rand() * 20) + 1,
      payload: JSON.stringify(generateNestedJson(rand, depth)),
      notes: rand() > 0.4 ? JSON.stringify({ author: `User${Math.floor(rand() * 20)}`, status: pick(['draft', 'review', 'published'], rand) }) : null,
    }))
    ctx.db.insert(jsonDocuments).values(rows).run()
  }

  ctx.logger.log(`Inserted ${rowCount} rows into json_documents.`)
}
