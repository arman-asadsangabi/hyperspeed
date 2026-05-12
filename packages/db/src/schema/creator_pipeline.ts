import { sql } from 'drizzle-orm'
import { pgEnum, pgTable, uuid, text, integer, date, timestamp, index } from 'drizzle-orm/pg-core'
import { users } from './users'

export const payoutStatusEnum = pgEnum('payout_status', [
  'pending',
  'processing',
  'completed',
  'failed',
])

export const creatorInvitations = pgTable(
  'creator_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    inviteCode: text('invite_code').notNull().unique(),
    email: text('email'),
    targetDomain: text('target_domain'),
    invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
    acceptedBy: uuid('accepted_by').references(() => users.id, { onDelete: 'set null' }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index('creator_invitations_code_idx').on(table.inviteCode),
    index('creator_invitations_email_idx').on(table.email),
  ],
)

export type CreatorInvitation = typeof creatorInvitations.$inferSelect
export type CreatorPayout = typeof creatorPayouts.$inferSelect

export const creatorPayouts = pgTable(
  'creator_payouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    creatorUserId: uuid('creator_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    grossRevenueCents: integer('gross_revenue_cents').default(0).notNull(),
    platformFeeCents: integer('platform_fee_cents').default(0).notNull(),
    netPayoutCents: integer('net_payout_cents').default(0).notNull(),
    stripeTransferId: text('stripe_transfer_id'),
    status: payoutStatusEnum('status').default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('creator_payouts_creator_period_idx').on(table.creatorUserId, table.periodStart),
  ],
)
