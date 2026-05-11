import type { OrgRole, OrgPlan, PackStatus, EntryType } from './constants'

export interface User {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Organization {
  id: string
  name: string
  slug: string
  billingEmail: string
  plan: OrgPlan
  createdAt: Date
  updatedAt: Date
}

export interface OrganizationMember {
  id: string
  organizationId: string
  userId: string
  role: OrgRole
  invitedBy: string | null
  joinedAt: Date
}

export interface RequestContext {
  user: User
  organization: Organization
  role: OrgRole
  ipAddress: string | null
  userAgent: string | null
}

export interface AuditLogEntry {
  id: string
  organizationId: string
  userId: string | null
  entityType: string
  entityId: string
  action: string
  diff: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export interface PaginationParams {
  cursor?: string
  limit?: number
}

export interface PaginatedResponse<T> {
  items: T[]
  nextCursor: string | null
  total?: number
}

export type { OrgRole, OrgPlan, PackStatus, EntryType }
