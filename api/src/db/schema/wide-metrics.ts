import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core'

export const wideMetrics = sqliteTable('wide_metrics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  label: text('label').notNull(),
  region: text('region').notNull(),
  category: text('category').notNull(),
  metric1: real('metric1').notNull(),
  metric2: real('metric2').notNull(),
  metric3: real('metric3').notNull(),
  metric4: real('metric4').notNull(),
  metric5: real('metric5').notNull(),
  metric6: real('metric6').notNull(),
  optionalMetric1: real('optional_metric1'),
  optionalMetric2: real('optional_metric2'),
  tags: text('tags', { mode: 'json' }),
})
