import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

declare global {
  var __hyperspeedSql: ReturnType<typeof postgres> | undefined
}

function getClient() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')

  if (process.env.NODE_ENV === 'production') {
    return postgres(url, { prepare: false, max: 10 })
  }

  globalThis.__hyperspeedSql ??= postgres(url, { prepare: false, max: 5 })
  return globalThis.__hyperspeedSql
}

let _db: ReturnType<typeof drizzle<typeof schema>> | undefined

export function db() {
  if (!_db) _db = drizzle(getClient(), { schema, logger: process.env.NODE_ENV === 'development' })
  return _db
}

export { schema }
export type Database = ReturnType<typeof db>
