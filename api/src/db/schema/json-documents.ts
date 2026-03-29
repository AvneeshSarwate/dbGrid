import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core'

export const jsonDocuments = sqliteTable('json_documents', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  category: text('category').notNull(),
  version: real('version').notNull(),
  payload: text('payload', { mode: 'json' }).notNull(),
  notes: text('notes', { mode: 'json' }),
})
