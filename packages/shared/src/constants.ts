export const ORG_ROLES = ['owner', 'admin', 'member'] as const
export type OrgRole = (typeof ORG_ROLES)[number]

export const ORG_PLANS = ['free', 'startup', 'enterprise'] as const
export type OrgPlan = (typeof ORG_PLANS)[number]

export const PACK_STATUSES = ['draft', 'in_review', 'published', 'archived'] as const
export type PackStatus = (typeof PACK_STATUSES)[number]

export const ENTRY_TYPES = [
  'fact',
  'heuristic',
  'decision_rule',
  'example',
  'citation',
  'meta_rule',
] as const
export type EntryType = (typeof ENTRY_TYPES)[number]

export const CREDENTIAL_TYPES = [
  'professional_license',
  'employment',
  'academic_degree',
  'certification',
  'publication',
] as const
export type CredentialType = (typeof CREDENTIAL_TYPES)[number]

export const VERIFICATION_STATUSES = ['pending', 'verified', 'rejected', 'expired'] as const
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]

export const DOC_EXTRACTION_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const
export type DocExtractionStatus = (typeof DOC_EXTRACTION_STATUSES)[number]

export const ROLE_HIERARCHY: Record<OrgRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
}

export function hasRoleAtLeast(userRole: OrgRole, required: OrgRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required]
}

export const ENV = {
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  isTest: process.env.NODE_ENV === 'test',
} as const
