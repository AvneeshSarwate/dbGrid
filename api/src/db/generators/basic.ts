import type { Db } from '../index.js'
import { products } from '../schema/products.js'
import { wideMetrics } from '../schema/wide-metrics.js'
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

export async function run(ctx: GeneratorContext, args: string[]) {
  let rowCount = 100
  const rowsIdx = args.indexOf('--rows')
  if (rowsIdx !== -1 && args[rowsIdx + 1]) {
    rowCount = parseInt(args[rowsIdx + 1], 10)
  }

  const rand = seededRandom(ctx.seed)

  ctx.logger.log(`Generating ${rowCount} rows for each table...`)

  // Products
  const productRows = Array.from({ length: rowCount }, (_, i) => ({
    name: `Product ${i + 1}`,
    sku: `SKU-${String(i + 1).padStart(5, '0')}`,
    price: Math.round(rand() * 10000) / 100,
    discountRate: rand() > 0.5 ? Math.round(rand() * 50) / 100 : null,
    metadata: rand() > 0.6 ? JSON.stringify({ color: pick(['red', 'blue', 'green', 'black'], rand), weight: Math.round(rand() * 100) / 10 }) : null,
  }))
  ctx.db.insert(products).values(productRows).run()

  // Wide Metrics
  const regions = ['US-East', 'US-West', 'EU', 'APAC', 'LATAM']
  const categories = ['Alpha', 'Beta', 'Gamma', 'Delta']
  const wideRows = Array.from({ length: rowCount }, (_, i) => ({
    label: `Metric Set ${i + 1}`,
    region: pick(regions, rand),
    category: pick(categories, rand),
    metric1: Math.round(rand() * 1000) / 10,
    metric2: Math.round(rand() * 1000) / 10,
    metric3: Math.round(rand() * 1000) / 10,
    metric4: Math.round(rand() * 1000) / 10,
    metric5: Math.round(rand() * 1000) / 10,
    metric6: Math.round(rand() * 1000) / 10,
    optionalMetric1: rand() > 0.4 ? Math.round(rand() * 500) / 10 : null,
    optionalMetric2: rand() > 0.4 ? Math.round(rand() * 500) / 10 : null,
    tags: rand() > 0.5 ? JSON.stringify({ priority: pick(['low', 'medium', 'high'], rand) }) : null,
  }))
  ctx.db.insert(wideMetrics).values(wideRows).run()

  // JSON Documents
  const docCategories = ['report', 'config', 'template', 'spec']
  const jsonRows = Array.from({ length: rowCount }, (_, i) => ({
    title: `Document ${i + 1}`,
    category: pick(docCategories, rand),
    version: Math.floor(rand() * 10) + 1,
    payload: JSON.stringify({
      type: pick(['article', 'dataset', 'schema'], rand),
      items: Array.from({ length: Math.floor(rand() * 5) + 1 }, () => ({
        key: `k${Math.floor(rand() * 1000)}`,
        value: Math.round(rand() * 100),
      })),
    }),
    notes: rand() > 0.5 ? JSON.stringify({ author: `User ${Math.floor(rand() * 10)}`, reviewed: rand() > 0.5 }) : null,
  }))
  ctx.db.insert(jsonDocuments).values(jsonRows).run()

  ctx.logger.log(`Inserted ${rowCount} rows into each of 3 tables.`)
}
