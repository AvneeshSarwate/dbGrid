import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import {
  getTableMeta,
  getTableSummaries,
  createSchemas,
  updateSchemas,
} from '@dbgrid/shared'
import type { ApiSuccess, ApiError, TableMeta, TableSummary, RowData } from '@dbgrid/shared'
import { drizzleTableMap, columnNameMap } from '../db/table-map.js'

function success<T>(data: T): ApiSuccess<T> {
  return { ok: true, data }
}

function error(code: string, message: string, fieldErrors?: Record<string, string>): ApiError {
  return { ok: false, error: { code, message, fieldErrors } }
}

function resolveTable(tableName: string) {
  const meta = getTableMeta(tableName)
  const drizzleTable = drizzleTableMap[tableName]
  const colMap = columnNameMap[tableName]
  if (!meta || !drizzleTable || !colMap) return null
  return { meta, drizzleTable, colMap }
}

// Convert a DB row to API row based on column map
function dbRowToApiRow(row: Record<string, unknown>, colMap: Record<string, string>, tableName: string): RowData {
  const meta = getTableMeta(tableName)
  const result: Record<string, unknown> = {}
  for (const [apiName, drizzleName] of Object.entries(colMap)) {
    let val = row[drizzleName]
    // Ensure JSON columns are parsed objects, not strings
    const colMeta = meta?.columns.find(c => c.name === apiName)
    if (colMeta?.kind === 'json' && typeof val === 'string') {
      try { val = JSON.parse(val) } catch { /* keep as string */ }
    }
    result[apiName] = val
  }
  return result as RowData
}

// Convert API patch (camelCase) to DB values (snake_case)
function apiPatchToDbValues(patch: Record<string, unknown>, colMap: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [apiName, value] of Object.entries(patch)) {
    const dbName = colMap[apiName]
    if (dbName) {
      // JSON columns need to be stringified for SQLite text storage
      result[dbName] = typeof value === 'object' && value !== null ? JSON.stringify(value) : value
    }
  }
  return result
}

export default async function tableRoutes(fastify: FastifyInstance) {
  // GET /api/tables - list all tables
  fastify.get('/api/tables', async (): Promise<ApiSuccess<TableSummary[]>> => {
    return success(getTableSummaries())
  })

  // GET /api/tables/:tableName/meta - full table metadata
  fastify.get<{ Params: { tableName: string } }>(
    '/api/tables/:tableName/meta',
    async (request, reply) => {
      const resolved = resolveTable(request.params.tableName)
      if (!resolved) {
        reply.code(404)
        return error('NOT_FOUND', `Table "${request.params.tableName}" not found`)
      }
      return success<TableMeta>(resolved.meta)
    }
  )

  // GET /api/tables/:tableName/rows - get all rows
  fastify.get<{ Params: { tableName: string } }>(
    '/api/tables/:tableName/rows',
    async (request, reply) => {
      const resolved = resolveTable(request.params.tableName)
      if (!resolved) {
        reply.code(404)
        return error('NOT_FOUND', `Table "${request.params.tableName}" not found`)
      }

      const rawRows = fastify.db.select().from(resolved.drizzleTable).all()
      const rows = rawRows.map(row => dbRowToApiRow(row as Record<string, unknown>, resolved.colMap, request.params.tableName))
      return success(rows)
    }
  )

  // POST /api/tables/:tableName/rows - create row
  fastify.post<{ Params: { tableName: string }; Body: Record<string, unknown> }>(
    '/api/tables/:tableName/rows',
    async (request, reply) => {
      const resolved = resolveTable(request.params.tableName)
      if (!resolved) {
        reply.code(404)
        return error('NOT_FOUND', `Table "${request.params.tableName}" not found`)
      }

      const schema = createSchemas[request.params.tableName]
      if (!schema) {
        reply.code(500)
        return error('NO_SCHEMA', 'No create schema found')
      }

      const parsed = schema.safeParse(request.body)
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {}
        for (const issue of parsed.error.issues) {
          const path = issue.path.join('.')
          fieldErrors[path] = issue.message
        }
        reply.code(400)
        return error('VALIDATION_ERROR', 'Invalid input', fieldErrors)
      }

      const dbValues = apiPatchToDbValues(parsed.data as Record<string, unknown>, resolved.colMap)
      const result = fastify.db.insert(resolved.drizzleTable).values(dbValues).returning().get()
      const row = dbRowToApiRow(result as Record<string, unknown>, resolved.colMap, request.params.tableName)
      reply.code(201)
      return success(row)
    }
  )

  // PATCH /api/tables/:tableName/rows/:id - update row
  fastify.patch<{ Params: { tableName: string; id: string }; Body: Record<string, unknown> }>(
    '/api/tables/:tableName/rows/:id',
    async (request, reply) => {
      const resolved = resolveTable(request.params.tableName)
      if (!resolved) {
        reply.code(404)
        return error('NOT_FOUND', `Table "${request.params.tableName}" not found`)
      }

      const schema = updateSchemas[request.params.tableName]
      if (!schema) {
        reply.code(500)
        return error('NO_SCHEMA', 'No update schema found')
      }

      const parsed = schema.safeParse(request.body)
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {}
        for (const issue of parsed.error.issues) {
          const path = issue.path.join('.')
          fieldErrors[path] = issue.message
        }
        reply.code(400)
        return error('VALIDATION_ERROR', 'Invalid input', fieldErrors)
      }

      const id = parseInt(request.params.id, 10)
      if (isNaN(id)) {
        reply.code(400)
        return error('INVALID_ID', 'ID must be a number')
      }

      const idColumn = resolved.drizzleTable.id
      const dbValues = apiPatchToDbValues(parsed.data as Record<string, unknown>, resolved.colMap)

      if (Object.keys(dbValues).length === 0) {
        reply.code(400)
        return error('EMPTY_UPDATE', 'No fields to update')
      }

      const result = fastify.db
        .update(resolved.drizzleTable)
        .set(dbValues)
        .where(eq(idColumn, id))
        .returning()
        .get()

      if (!result) {
        reply.code(404)
        return error('NOT_FOUND', `Row ${id} not found`)
      }

      const row = dbRowToApiRow(result as Record<string, unknown>, resolved.colMap, request.params.tableName)
      return success(row)
    }
  )

  // DELETE /api/tables/:tableName/rows/:id - delete row
  fastify.delete<{ Params: { tableName: string; id: string } }>(
    '/api/tables/:tableName/rows/:id',
    async (request, reply) => {
      const resolved = resolveTable(request.params.tableName)
      if (!resolved) {
        reply.code(404)
        return error('NOT_FOUND', `Table "${request.params.tableName}" not found`)
      }

      const id = parseInt(request.params.id, 10)
      if (isNaN(id)) {
        reply.code(400)
        return error('INVALID_ID', 'ID must be a number')
      }

      const idColumn = resolved.drizzleTable.id
      const result = fastify.db
        .delete(resolved.drizzleTable)
        .where(eq(idColumn, id))
        .returning()
        .get()

      if (!result) {
        reply.code(404)
        return error('NOT_FOUND', `Row ${id} not found`)
      }

      return success({ deleted: true })
    }
  )
}
