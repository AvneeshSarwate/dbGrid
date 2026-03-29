import type { Db } from '../index.js'
import { wideMetrics } from '../schema/wide-metrics.js'

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
  let rowCount = 10000
  const rowsIdx = args.indexOf('--rows')
  if (rowsIdx !== -1 && args[rowsIdx + 1]) {
    rowCount = parseInt(args[rowsIdx + 1], 10)
  }

  const rand = seededRandom(ctx.seed)
  const regions = ['US-East', 'US-West', 'EU-North', 'EU-South', 'APAC', 'LATAM', 'MEA', 'CAN']
  const categories = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta']

  ctx.logger.log(`Generating ${rowCount} wide_metrics rows...`)

  const batchSize = 500
  for (let offset = 0; offset < rowCount; offset += batchSize) {
    const count = Math.min(batchSize, rowCount - offset)
    const rows = Array.from({ length: count }, (_, i) => ({
      label: `WM-${offset + i + 1}`,
      region: pick(regions, rand),
      category: pick(categories, rand),
      metric1: Math.round(rand() * 10000) / 100,
      metric2: Math.round(rand() * 10000) / 100,
      metric3: Math.round(rand() * 10000) / 100,
      metric4: Math.round(rand() * 10000) / 100,
      metric5: Math.round(rand() * 10000) / 100,
      metric6: Math.round(rand() * 10000) / 100,
      optionalMetric1: rand() > 0.3 ? Math.round(rand() * 5000) / 100 : null,
      optionalMetric2: rand() > 0.3 ? Math.round(rand() * 5000) / 100 : null,
      tags: rand() > 0.5 ? JSON.stringify({ priority: pick(['low', 'medium', 'high', 'critical'], rand) }) : null,
    }))
    ctx.db.insert(wideMetrics).values(rows).run()
  }

  ctx.logger.log(`Inserted ${rowCount} rows into wide_metrics.`)
}
