import { sql } from 'drizzle-orm'
import { pgTable, uuid, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { orgRoleEnum } from './enums'
import { users } from './users'
import { organizations } from './organizations'

export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: orgRoleEnum('role').default('member').notNull(),
    invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    uniqueIndex('org_members_unique_idx').on(table.organizationId, table.userId),
    index('org_members_user_idx').on(table.userId),
  ],
)

export type OrganizationMember = typeof organizationMembers.$inferSelect
export type NewOrganizationMember = typeof organizationMembers.$inferInsert
