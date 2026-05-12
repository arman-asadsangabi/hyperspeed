import { sql } from 'drizzle-orm'
import { pgEnum, pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './users'

export const apiKeyTierEnum = pgEnum('api_key_tier', ['free', 'startup', 'enterprise'])

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    keyPrefix: text('key_prefix').notNull(),
    keyHash: text('key_hash').notNull(),
    tier: apiKeyTierEnum('tier').default('free').notNull(),
    scopes: text('scopes')
      .array()
      .default(sql`'{query,list_packs}'::text[]`)
      .notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index('api_keys_org_idx').on(table.organizationId),
    index('api_keys_prefix_idx').on(table.keyPrefix),
  ],
)

export type ApiKey = typeof apiKeys.$inferSelect
export type NewApiKey = typeof apiKeys.$inferInsert
