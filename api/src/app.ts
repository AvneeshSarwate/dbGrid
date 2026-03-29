import Fastify from 'fastify'
import cors from '@fastify/cors'
import dbPlugin from './plugins/db.js'
import tableRoutes from './routes/tables.js'

export async function buildApp() {
  const app = Fastify({ logger: true })

  await app.register(cors, { origin: true })
  await app.register(dbPlugin)
  await app.register(tableRoutes)

  return app
}
