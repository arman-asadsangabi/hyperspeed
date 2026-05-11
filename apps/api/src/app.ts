import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { requestId } from 'hono/request-id'
import { secureHeaders } from 'hono/secure-headers'
import { HTTPException } from 'hono/http-exception'
import { corsMiddleware } from './middleware/cors'
import { healthRouter } from './routes/health'

export const app = new Hono()

app.use('*', requestId())
app.use('*', secureHeaders())
app.use('*', corsMiddleware())

if (process.env.NODE_ENV !== 'test') {
  app.use('*', logger())
}

app.route('/', healthRouter)

app.route(
  '/v1',
  new Hono().get('/', (c) => c.json({ message: 'Hyperspeed API v1' })),
)

app.notFound((c) => c.json({ error: { code: 'not_found', message: 'Route not found' } }, 404))

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: { code: 'http_error', message: err.message } }, err.status)
  }
  console.error('Unhandled error:', err)
  return c.json(
    {
      error: {
        code: 'internal_server_error',
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      },
    },
    500,
  )
})

export type AppType = typeof app
