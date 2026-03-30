import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { createDb, type Db } from '../db/index.js'

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
  }
}

export default fp(async function dbPlugin(fastify: FastifyInstance) {
  const dbPath = process.env.DB_PATH || '../demo.db'
  const db = createDb(dbPath)
  fastify.decorate('db', db)
})
