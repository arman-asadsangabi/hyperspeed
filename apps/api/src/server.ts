import { serve } from '@hono/node-server'
import { app } from './app'

const PORT = Number(process.env.PORT ?? 3001)

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`🚀 Hyperspeed API listening on http://localhost:${info.port}`)
})
