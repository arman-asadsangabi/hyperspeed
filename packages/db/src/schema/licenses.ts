import { sql } from 'drizzle-orm'
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { packs } from './packs'
import { users } from './users'

export const licenseTypeEnum = pgEnum('license_type', [
  'subscription',
  'one_time',
  'enterprise_unlimited',
])
export const slaTierEnum = pgEnum('sla_tier', ['standard', 'priority', 'dedicated'])
export const licenseStatusEnum = pgEnum('license_status', [
  'pending',
  'active',
  'paused',
  'expired',
  'terminated',
])

export const bundles = pgTable('bundles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  createdByOrganizationId: uuid('created_by_organization_id').references(() => organizations.id, {
    onDelete: 'set null',
  }),
  isPublic: boolean('is_public').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

export const bundlePacks = pgTable('bundle_packs', {
  bundleId: uuid('bundle_id')
    .notNull()
    .references(() => bundles.id, { onDelete: 'cascade' }),
  packId: uuid('pack_id')
    .notNull()
    .references(() => packs.id, { onDelete: 'cascade' }),
})

export const licenses = pgTable(
  'licenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    licenseeOrganizationId: uuid('licensee_organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    licensorOrganizationId: uuid('licensor_organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    packId: uuid('pack_id').references(() => packs.id, { onDelete: 'cascade' }),
    bundleId: uuid('bundle_id').references(() => bundles.id, { onDelete: 'cascade' }),
    licenseType: licenseTypeEnum('license_type').default('subscription').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    seats: integer('seats'),
    monthlyQueryLimit: integer('monthly_query_limit'),
    slaTier: slaTierEnum('sla_tier').default('standard').notNull(),
    terms: jsonb('terms').$type<Record<string, unknown> | null>(),
    status: licenseStatusEnum('status').default('active').notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index('licenses_licensee_idx').on(table.licenseeOrganizationId, table.status),
    index('licenses_licensor_idx').on(table.licensorOrganizationId),
    index('licenses_pack_idx').on(table.packId),
  ],
)

export type Bundle = typeof bundles.$inferSelect
export type License = typeof licenses.$inferSelect
