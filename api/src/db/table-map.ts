import { products } from './schema/products.js'
import { wideMetrics } from './schema/wide-metrics.js'
import { jsonDocuments } from './schema/json-documents.js'
import type { SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core'

// Maps table name string to Drizzle table object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const drizzleTableMap: Record<string, SQLiteTableWithColumns<any>> = {
  products,
  wide_metrics: wideMetrics,
  json_documents: jsonDocuments,
}

// Maps shared API column names (camelCase) to Drizzle JS property names
// (which are what Drizzle returns in query results)
export const columnNameMap: Record<string, Record<string, string>> = {
  products: {
    id: 'id',
    name: 'name',
    sku: 'sku',
    price: 'price',
    discountRate: 'discountRate',
    metadata: 'metadata',
  },
  wide_metrics: {
    id: 'id',
    label: 'label',
    region: 'region',
    category: 'category',
    metric1: 'metric1',
    metric2: 'metric2',
    metric3: 'metric3',
    metric4: 'metric4',
    metric5: 'metric5',
    metric6: 'metric6',
    optionalMetric1: 'optionalMetric1',
    optionalMetric2: 'optionalMetric2',
    tags: 'tags',
  },
  json_documents: {
    id: 'id',
    title: 'title',
    category: 'category',
    version: 'version',
    payload: 'payload',
    notes: 'notes',
  },
}
