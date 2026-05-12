import { sql } from 'drizzle-orm'
import { pgTable, pgEnum, uuid, text, bigint, timestamp, index } from 'drizzle-orm/pg-core'
import { DOC_EXTRACTION_STATUSES } from '@hyperspeed/shared/constants'
import { organizations } from './organizations'
import { packs } from './packs'
import { users } from './users'

export const docExtractionStatusEnum = pgEnum('doc_extraction_status', DOC_EXTRACTION_STATUSES)

export const sourceDocuments = pgTable(
  'source_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    packId: uuid('pack_id').references(() => packs.id, { onDelete: 'set null' }),
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => users.id, { onDelete: 'set null' }),
    filename: text('filename').notNull(),
    fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }).notNull(),
    mimeType: text('mime_type').notNull(),
    storagePath: text('storage_path').notNull(),
    extractedText: text('extracted_text'),
    textExtractionStatus: docExtractionStatusEnum('text_extraction_status')
      .default('pending')
      .notNull(),
    extractionError: text('extraction_error'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index('source_docs_org_idx').on(table.organizationId),
    index('source_docs_pack_idx').on(table.packId),
    index('source_docs_status_idx').on(table.textExtractionStatus),
  ],
)

export type SourceDocument = typeof sourceDocuments.$inferSelect
export type NewSourceDocument = typeof sourceDocuments.$inferInsert
