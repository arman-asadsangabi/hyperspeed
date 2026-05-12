import { z } from 'zod'
import { ORG_ROLES, ORG_PLANS, PACK_STATUSES, ENTRY_TYPES } from './constants'

export const uuidSchema = z.string().uuid()
export const emailSchema = z.string().email().toLowerCase().trim()
export const slugSchema = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9-]+$/, 'lowercase letters, numbers, and hyphens only')

export const orgRoleSchema = z.enum(ORG_ROLES)
export const orgPlanSchema = z.enum(ORG_PLANS)
export const packStatusSchema = z.enum(PACK_STATUSES)
export const entryTypeSchema = z.enum(ENTRY_TYPES)

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  slug: slugSchema,
  billingEmail: emailSchema,
})
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>

export const updateOrganizationSchema = createOrganizationSchema.partial()
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: orgRoleSchema.default('member'),
})
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
})

export const auditLogFilterSchema = z.object({
  userId: uuidSchema.optional(),
  entityType: z.string().optional(),
  action: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  ...paginationSchema.shape,
})

// -----------------------------------------------------------------------------
// Stage 2 — Pack data model
// -----------------------------------------------------------------------------

export const createPackSchema = z.object({
  name: z.string().min(2).max(120),
  slug: slugSchema,
  description: z.string().max(2000).optional(),
  categoryId: uuidSchema.optional(),
  targetUseCase: z.string().max(500).optional(),
})
export type CreatePackInput = z.infer<typeof createPackSchema>

export const updatePackSchema = createPackSchema.partial()
export type UpdatePackInput = z.infer<typeof updatePackSchema>

export const listPacksFilterSchema = z.object({
  archived: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === 'true' ? true : v === 'false' ? false : undefined)),
  categoryId: uuidSchema.optional(),
  q: z.string().max(120).optional(),
  ...paginationSchema.shape,
})

export const createPackVersionSchema = z.object({
  basedOnVersionId: uuidSchema.optional(),
  changelogType: z.enum(['major', 'minor', 'patch']).default('patch'),
  changelog: z.string().max(2000).optional(),
})
export type CreatePackVersionInput = z.infer<typeof createPackVersionSchema>
