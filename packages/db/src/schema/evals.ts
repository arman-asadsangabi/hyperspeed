import { sql } from 'drizzle-orm'
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  integer,
  numeric,
  boolean,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { categories } from './categories'
import { packs } from './packs'
import { packVersions } from './pack_versions'
import { users } from './users'

export const testDifficultyEnum = pgEnum('test_difficulty', ['easy', 'medium', 'hard'])
export const evalRunStatusEnum = pgEnum('eval_run_status', [
  'pending',
  'running',
  'completed',
  'failed',
])
export const evalAlertTypeEnum = pgEnum('eval_alert_type', [
  'score_drop',
  'critical_failure',
  'test_set_updated',
])

export const testSets = pgTable(
  'test_sets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    description: text('description'),
    version: integer('version').default(1).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [index('test_sets_category_idx').on(table.categoryId)],
)

export const testCases = pgTable(
  'test_cases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    testSetId: uuid('test_set_id')
      .notNull()
      .references(() => testSets.id, { onDelete: 'cascade' }),
    prompt: text('prompt').notNull(),
    expectedTopics: text('expected_topics')
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    expectedCitations: text('expected_citations')
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    difficulty: testDifficultyEnum('difficulty').default('medium').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [index('test_cases_set_idx').on(table.testSetId)],
)

export const evalRuns = pgTable(
  'eval_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    packVersionId: uuid('pack_version_id')
      .notNull()
      .references(() => packVersions.id, { onDelete: 'cascade' }),
    testSetId: uuid('test_set_id')
      .notNull()
      .references(() => testSets.id, { onDelete: 'cascade' }),
    modelName: text('model_name').notNull(),
    judgeModel: text('judge_model').notNull(),
    status: evalRunStatusEnum('status').default('pending').notNull(),
    overallScore: numeric('overall_score', { precision: 5, scale: 2 }),
    dimensionScores: jsonb('dimension_scores').$type<Record<string, number> | null>(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index('eval_runs_version_idx').on(table.packVersionId, table.createdAt),
    index('eval_runs_set_idx').on(table.testSetId),
  ],
)

export const evalResults = pgTable(
  'eval_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    evalRunId: uuid('eval_run_id')
      .notNull()
      .references(() => evalRuns.id, { onDelete: 'cascade' }),
    testCaseId: uuid('test_case_id')
      .notNull()
      .references(() => testCases.id, { onDelete: 'cascade' }),
    response: text('response').notNull(),
    citationsUsed: text('citations_used')
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    judgeScores: jsonb('judge_scores').$type<Record<string, number> | null>(),
    judgeReasoning: text('judge_reasoning'),
    latencyMs: integer('latency_ms'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [index('eval_results_run_idx').on(table.evalRunId)],
)

export const evalAlerts = pgTable(
  'eval_alerts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    packId: uuid('pack_id')
      .notNull()
      .references(() => packs.id, { onDelete: 'cascade' }),
    packVersionId: uuid('pack_version_id').references(() => packVersions.id, {
      onDelete: 'cascade',
    }),
    alertType: evalAlertTypeEnum('alert_type').notNull(),
    previousScore: numeric('previous_score', { precision: 5, scale: 2 }),
    currentScore: numeric('current_score', { precision: 5, scale: 2 }),
    scoreDelta: numeric('score_delta', { precision: 5, scale: 2 }),
    message: text('message'),
    resolved: boolean('resolved').default(false).notNull(),
    resolvedBy: uuid('resolved_by').references(() => users.id, { onDelete: 'set null' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index('eval_alerts_pack_resolved_idx').on(table.packId, table.resolved),
    uniqueIndex('eval_alerts_unique_unresolved')
      .on(table.packId, table.alertType)
      .where(sql`resolved = false`),
  ],
)

export type TestSet = typeof testSets.$inferSelect
export type TestCase = typeof testCases.$inferSelect
export type EvalRun = typeof evalRuns.$inferSelect
export type EvalResult = typeof evalResults.$inferSelect
export type EvalAlert = typeof evalAlerts.$inferSelect
