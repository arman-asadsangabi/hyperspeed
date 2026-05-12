import { sql } from 'drizzle-orm'
import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core'

/**
 * Mirror of `auth.users` from Supabase. Populated by trigger
 * `on_auth_user_created` (defined in the RLS migration).
 * Never write to this directly from app code — go through auth flows.
 *
 * `isPlatformAdmin` is set manually (SQL/dashboard) to staff who can
 * verify creator credentials and view all-tenant admin routes.
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  isPlatformAdmin: boolean('is_platform_admin').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
