import { sql } from 'drizzle-orm'
import { pgEnum, pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core'
import { packVersions } from './pack_versions'
import { packEntries } from './pack_entries'

export const lintCheckTypeEnum = pgEnum('lint_check_type', [
  'vague_claim',
  'missing_citation',
  'outdated_date',
  'contradiction',
  'coverage_gap',
])
export const lintSeverityEnum = pgEnum('lint_severity', ['info', 'warning', 'error'])

export const lintResults = pgTable(
  'lint_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    packVersionId: uuid('pack_version_id')
      .notNull()
      .references(() => packVersions.id, { onDelete: 'cascade' }),
    entryId: uuid('entry_id').references(() => packEntries.id, { onDelete: 'cascade' }),
    checkType: lintCheckTypeEnum('check_type').notNull(),
    severity: lintSeverityEnum('severity').default('warning').notNull(),
    message: text('message').notNull(),
    suggestedFix: text('suggested_fix'),
    resolved: boolean('resolved').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index('lint_results_version_resolved_idx').on(table.packVersionId, table.resolved),
    index('lint_results_check_idx').on(table.checkType),
  ],
)

export type LintResult = typeof lintResults.$inferSelect
export type NewLintResult = typeof lintResults.$inferInsert
