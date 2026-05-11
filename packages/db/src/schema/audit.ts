import { sql } from 'drizzle-orm'
import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core'
import { users } from './users'
import { organizations } from './organizations'

/**
 * Every mutation in the app writes a row here via `withAudit()`.
 * Grows fast — TODO: switch to native PG partitioning by month before
 * production traffic; for now relies on the org_created index for queries.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    action: text('action').notNull(),
    diff: jsonb('diff').$type<Record<string, unknown> | null>(),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index('audit_org_created_idx').on(table.organizationId, table.createdAt),
    index('audit_entity_idx').on(table.entityType, table.entityId),
    index('audit_user_idx').on(table.userId),
  ],
)

export type AuditLog = typeof auditLog.$inferSelect
export type NewAuditLog = typeof auditLog.$inferInsert
