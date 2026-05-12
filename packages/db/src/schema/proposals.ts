import { sql } from 'drizzle-orm'
import { pgEnum, pgTable, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core'
import { entryTypeEnum } from './enums'
import { packVersions } from './pack_versions'
import { sourceDocuments } from './source_documents'
import { packEntries } from './pack_entries'

export const proposalConfidenceEnum = pgEnum('proposal_confidence', ['low', 'medium', 'high'])
export const proposalStatusEnum = pgEnum('proposal_status', [
  'pending_review',
  'accepted',
  'edited',
  'rejected',
])

/**
 * Outputs of the AI ingestion pipeline (Phase 3.2). Each row is a
 * candidate pack entry awaiting reviewer acceptance.
 */
export const proposedEntries = pgTable(
  'proposed_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    packVersionId: uuid('pack_version_id')
      .notNull()
      .references(() => packVersions.id, { onDelete: 'cascade' }),
    sourceDocumentId: uuid('source_document_id').references(() => sourceDocuments.id, {
      onDelete: 'set null',
    }),
    entryType: entryTypeEnum('entry_type').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    structuredData: jsonb('structured_data').$type<Record<string, unknown> | null>(),
    confidence: proposalConfidenceEnum('confidence').default('medium').notNull(),
    sourceExcerpt: text('source_excerpt'),
    suggestedTags: text('suggested_tags')
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    status: proposalStatusEnum('status').default('pending_review').notNull(),
    acceptedAsEntryId: uuid('accepted_as_entry_id').references(() => packEntries.id, {
      onDelete: 'set null',
    }),
    rejectionReason: text('rejection_reason'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index('proposed_entries_version_idx').on(table.packVersionId),
    index('proposed_entries_status_idx').on(table.status),
  ],
)

export type ProposedEntry = typeof proposedEntries.$inferSelect
export type NewProposedEntry = typeof proposedEntries.$inferInsert
