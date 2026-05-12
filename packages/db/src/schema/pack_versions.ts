import { sql } from 'drizzle-orm'
import { pgTable, uuid, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { packVersionStatusEnum } from './enums'
import { packs } from './packs'
import { users } from './users'

export const packVersions = pgTable(
  'pack_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    packId: uuid('pack_id')
      .notNull()
      .references(() => packs.id, { onDelete: 'cascade' }),
    versionNumber: text('version_number').notNull(),
    status: packVersionStatusEnum('status').default('draft').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    changelog: text('changelog'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    uniqueIndex('pack_versions_pack_version_idx').on(table.packId, table.versionNumber),
    index('pack_versions_pack_status_idx').on(table.packId, table.status),
  ],
)

export type PackVersion = typeof packVersions.$inferSelect
export type NewPackVersion = typeof packVersions.$inferInsert
