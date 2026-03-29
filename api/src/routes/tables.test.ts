import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../app.js'
import { runMigrations } from '../db/migrate.js'
import { createDb } from '../db/index.js'
import { products } from '../db/schema/products.js'
import { unlinkSync, existsSync } from 'fs'
import { join } from 'path'
import type { FastifyInstance } from 'fastify'

const TEST_DB = join(import.meta.dirname, '../../test-api.db')

let app: FastifyInstance

beforeAll(async () => {
  // Clean up any existing test db
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB)

  // Create and seed
  runMigrations(TEST_DB)
  const db = createDb(TEST_DB)
  db.insert(products).values([
    { name: 'Test Product', sku: 'TP-001', price: 9.99, discountRate: null, metadata: null },
    { name: 'Test Product 2', sku: 'TP-002', price: 19.99, discountRate: 0.1, metadata: JSON.stringify({ color: 'red' }) },
  ]).run()

  process.env.DB_PATH = TEST_DB
  app = await buildApp()
  await app.ready()
})

afterAll(async () => {
  await app.close()
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB)
})

describe('GET /api/tables', () => {
  it('returns list of tables', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tables' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.ok).toBe(true)
    expect(body.data).toHaveLength(3)
    expect(body.data[0].name).toBe('products')
  })
})

describe('GET /api/tables/:tableName/meta', () => {
  it('returns table metadata', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tables/products/meta' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.ok).toBe(true)
    expect(body.data.name).toBe('products')
    expect(body.data.columns).toHaveLength(6)
  })

  it('returns 404 for unknown table', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tables/nonexistent/meta' })
    expect(res.statusCode).toBe(404)
  })
})

describe('GET /api/tables/:tableName/rows', () => {
  it('returns rows', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/tables/products/rows' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.ok).toBe(true)
    expect(body.data.length).toBeGreaterThanOrEqual(2)
    expect(body.data[0]).toHaveProperty('id')
    expect(body.data[0]).toHaveProperty('name')
  })
})

describe('POST /api/tables/:tableName/rows', () => {
  it('creates a valid row', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tables/products/rows',
      payload: { name: 'New Product', sku: 'NP-001', price: 29.99 },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.ok).toBe(true)
    expect(body.data.name).toBe('New Product')
    expect(body.data.id).toBeDefined()
  })

  it('rejects invalid create (missing required)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/tables/products/rows',
      payload: { name: 'No SKU' },
    })
    expect(res.statusCode).toBe(400)
    const body = res.json()
    expect(body.ok).toBe(false)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('PATCH /api/tables/:tableName/rows/:id', () => {
  it('updates a number field', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tables/products/rows/1',
      payload: { price: 99.99 },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.ok).toBe(true)
    expect(body.data.price).toBe(99.99)
  })

  it('rejects invalid number', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tables/products/rows/1',
      payload: { price: 'not-a-number' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('updates JSON field', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/tables/products/rows/1',
      payload: { metadata: { size: 'large' } },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.ok).toBe(true)
    expect(body.data.metadata).toEqual({ size: 'large' })
  })
})

describe('DELETE /api/tables/:tableName/rows/:id', () => {
  it('deletes a row', async () => {
    // Create a row to delete
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/tables/products/rows',
      payload: { name: 'To Delete', sku: 'DEL-001', price: 1 },
    })
    const id = createRes.json().data.id

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/tables/products/rows/${id}`,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().ok).toBe(true)
  })

  it('returns 404 for nonexistent row', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/tables/products/rows/99999',
    })
    expect(res.statusCode).toBe(404)
  })
})
