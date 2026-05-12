import { pgEnum } from 'drizzle-orm/pg-core'
import { ORG_ROLES, ORG_PLANS, ENTRY_TYPES, PACK_STATUSES } from '@hyperspeed/shared/constants'

export const orgRoleEnum = pgEnum('org_role', ORG_ROLES)
export const orgPlanEnum = pgEnum('org_plan', ORG_PLANS)
export const entryTypeEnum = pgEnum('entry_type', ENTRY_TYPES)
export const packVersionStatusEnum = pgEnum('pack_version_status', PACK_STATUSES)
