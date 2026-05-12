import { sql } from 'drizzle-orm'
import { pgTable, uuid, text, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { organizations } from './organizations'
import { users } from './users'
import { categories } from './categories'
import { tags } from './tags'

export const packs = pgTable(
  'packs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    targetUseCase: text('target_use_case'),
    coverImageUrl: text('cover_image_url'),
    isArchived: boolean('is_archived').default(false).notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
  (table) => [
    uniqueIndex('packs_org_slug_idx').on(table.organizationId, table.slug),
    index('packs_org_archived_idx').on(table.organizationId, table.isArchived),
    index('packs_category_idx').on(table.categoryId),
  ],
)

export type Pack = typeof packs.$inferSelect
export type NewPack = typeof packs.$inferInsert

export const packTags = pgTable(
  'pack_tags',
  {
    packId: uuid('pack_id')
      .notNull()
      .references(() => packs.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => [
    uniqueIndex('pack_tags_pk').on(table.packId, table.tagId),
    index('pack_tags_tag_idx').on(table.tagId),
  ],
)

export type PackTag = typeof packTags.$inferSelect
export type NewPackTag = typeof packTags.$inferInsert
