import { cors } from 'hono/cors'
import { env } from '../lib/env'

export function corsMiddleware() {
  return cors({
    origin: (origin) => {
      const allowed = [env().WEB_APP_URL, 'http://localhost:3000']
      if (!origin) return allowed[0] ?? null
      return allowed.includes(origin) ? origin : null
    },
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposeHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    credentials: true,
    maxAge: 600,
  })
}
