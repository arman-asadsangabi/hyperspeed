import { sql } from 'drizzle-orm'
import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { credentialTypeEnum, verificationStatusEnum } from './enums'
import { users } from './users'

/**
 * One row per user who creates packs. `is_verified` is NOT stored —
 * it's computed via the SQL function `public.creator_is_verified(uuid)`
 * defined in migration 0004.
 */
export const creatorProfiles = pgTable(
  'creator_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    displayName: text('display_name'),
    bio: text('bio'),
    professionalSummary: text('professional_summary'),
    yearsExperience: integer('years_experience'),
    linkedinUrl: text('linkedin_url'),
    personalWebsite: text('personal_website'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [uniqueIndex('creator_profiles_user_idx').on(table.userId)],
)

export type CreatorProfile = typeof creatorProfiles.$inferSelect
export type NewCreatorProfile = typeof creatorProfiles.$inferInsert

export const credentials = pgTable(
  'credentials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    creatorProfileId: uuid('creator_profile_id')
      .notNull()
      .references(() => creatorProfiles.id, { onDelete: 'cascade' }),
    credentialType: credentialTypeEnum('credential_type').notNull(),
    title: text('title').notNull(),
    issuingOrganization: text('issuing_organization').notNull(),
    licenseNumber: text('license_number'),
    issueDate: date('issue_date'),
    expirationDate: date('expiration_date'),
    verificationStatus: verificationStatusEnum('verification_status').default('pending').notNull(),
    verificationSource: text('verification_source'),
    verificationNotes: text('verification_notes'),
    verifiedBy: uuid('verified_by').references(() => users.id, { onDelete: 'set null' }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    supportingDocumentUrl: text('supporting_document_url'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    index('credentials_profile_idx').on(table.creatorProfileId),
    index('credentials_status_idx').on(table.verificationStatus),
  ],
)

export type Credential = typeof credentials.$inferSelect
export type NewCredential = typeof credentials.$inferInsert
