import type { Config } from 'drizzle-kit'

const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL

if (!url) {
  throw new Error('DATABASE_URL or DIRECT_DATABASE_URL must be set for drizzle-kit')
}

export default {
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
  verbose: true,
  strict: true,
  schemaFilter: ['public'],
} satisfies Config
