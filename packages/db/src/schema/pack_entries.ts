import { sql } from 'drizzle-orm'
import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { entryTypeEnum } from './enums'
import { packVersions } from './pack_versions'

export const packEntries = pgTable(
  'pack_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    packVersionId: uuid('pack_version_id')
      .notNull()
      .references(() => packVersions.id, { onDelete: 'cascade' }),
    entryType: entryTypeEnum('entry_type').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    structuredData: jsonb('structured_data').$type<Record<string, unknown> | null>(),
    tags: text('tags')
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    orderIndex: integer('order_index').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index('pack_entries_version_order_idx').on(table.packVersionId, table.orderIndex),
    index('pack_entries_type_idx').on(table.entryType),
  ],
)

export type PackEntry = typeof packEntries.$inferSelect
export type NewPackEntry = typeof packEntries.$inferInsert

export const entryCitations = pgTable(
  'entry_citations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    packEntryId: uuid('pack_entry_id')
      .notNull()
      .references(() => packEntries.id, { onDelete: 'cascade' }),
    citationEntryId: uuid('citation_entry_id')
      .notNull()
      .references(() => packEntries.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    uniqueIndex('entry_citations_pk').on(table.packEntryId, table.citationEntryId),
    index('entry_citations_citation_idx').on(table.citationEntryId),
  ],
)

export type EntryCitation = typeof entryCitations.$inferSelect
export type NewEntryCitation = typeof entryCitations.$inferInsert
