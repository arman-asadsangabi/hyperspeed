import { sql } from 'drizzle-orm'
import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  numeric,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { apiKeys } from './api_keys'
import { packs } from './packs'
import { users } from './users'

export const apiUsageEvents = pgTable(
  'api_usage_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    apiKeyId: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
    endpoint: text('endpoint').notNull(),
    packIds: uuid('pack_ids')
      .array()
      .default(sql`'{}'::uuid[]`)
      .notNull(),
    queryTokens: integer('query_tokens').default(0).notNull(),
    responseTokens: integer('response_tokens').default(0).notNull(),
    latencyMs: integer('latency_ms').default(0).notNull(),
    statusCode: integer('status_code').default(200).notNull(),
    billableUnits: numeric('billable_units', { precision: 12, scale: 6 }).default('1').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index('api_usage_org_created_idx').on(table.organizationId, table.createdAt),
    index('api_usage_key_idx').on(table.apiKeyId),
  ],
)

export const creatorRevenueEvents = pgTable(
  'creator_revenue_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    creatorUserId: uuid('creator_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    packId: uuid('pack_id')
      .notNull()
      .references(() => packs.id, { onDelete: 'cascade' }),
    apiUsageEventId: uuid('api_usage_event_id').references(() => apiUsageEvents.id, {
      onDelete: 'set null',
    }),
    amountCents: integer('amount_cents').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index('creator_revenue_creator_idx').on(table.creatorUserId, table.createdAt),
    index('creator_revenue_pack_idx').on(table.packId),
  ],
)

export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' })
    .unique(),
  planType: text('plan_type').default('free').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  billingCycleStart: timestamp('billing_cycle_start', { withTimezone: true }),
  includedQueries: bigint('included_queries', { mode: 'number' }).default(10000).notNull(),
  overagePriceCents: integer('overage_price_cents').default(1).notNull(),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

export type ApiUsageEvent = typeof apiUsageEvents.$inferSelect
export type CreatorRevenueEvent = typeof creatorRevenueEvents.$inferSelect
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect
