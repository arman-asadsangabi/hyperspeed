import { Hono } from 'hono'

const VERSION = '0.0.0'

export const healthRouter = new Hono()

healthRouter.get('/health', (c) => {
  return c.json({
    status: 'ok',
    version: VERSION,
    timestamp: new Date().toISOString(),
    uptime: typeof process !== 'undefined' ? process.uptime() : null,
  })
})

healthRouter.get('/ready', (c) => {
  return c.json({ status: 'ready' })
})
