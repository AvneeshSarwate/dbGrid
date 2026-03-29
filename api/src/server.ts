import { buildApp } from './app.js'

const PORT = parseInt(process.env.PORT || '3001', 10)

async function start() {
  const app = await buildApp()
  await app.listen({ port: PORT, host: '0.0.0.0' })
}

start().catch(err => {
  console.error(err)
  process.exit(1)
})
