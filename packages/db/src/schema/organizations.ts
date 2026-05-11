import { sql } from 'drizzle-orm'
import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { orgPlanEnum } from './enums'
import { users } from './users'

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    billingEmail: text('billing_email').notNull(),
    plan: orgPlanEnum('plan').default('free').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [index('organizations_slug_idx').on(table.slug)],
)

export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert

export const organizationInvitations = pgTable(
  'organization_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role').notNull(),
    token: text('token').notNull().unique(),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    acceptedBy: uuid('accepted_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index('org_invitations_org_idx').on(table.organizationId),
    index('org_invitations_email_idx').on(table.email),
  ],
)

export type OrganizationInvitation = typeof organizationInvitations.$inferSelect
export type NewOrganizationInvitation = typeof organizationInvitations.$inferInsert
