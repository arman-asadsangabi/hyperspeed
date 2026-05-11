import { pgEnum } from 'drizzle-orm/pg-core'
import { ORG_ROLES, ORG_PLANS } from '@hyperspeed/shared/constants'

export const orgRoleEnum = pgEnum('org_role', ORG_ROLES)
export const orgPlanEnum = pgEnum('org_plan', ORG_PLANS)
