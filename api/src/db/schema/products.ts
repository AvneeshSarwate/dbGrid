import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core'

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sku: text('sku').notNull(),
  price: real('price').notNull(),
  discountRate: real('discount_rate'),
  metadata: text('metadata', { mode: 'json' }),
})
