'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and, eq, isNull, sql } from 'drizzle-orm'
import { z } from 'zod'
import {
  creatorProfiles,
  credentials,
  users,
  organizationMembers,
  type Credential,
  type CreatorProfile,
} from '@hyperspeed/db/schema'
import { CREDENTIAL_TYPES } from '@hyperspeed/shared/constants'
import { db } from '../db'
import { requireSessionUser } from '../auth/session'
import { withAudit } from '../audit'

export interface CreatorActionState {
  error?: string
  fieldErrors?: Record<string, string[]>
}

async function getOrCreateProfile(userId: string): Promise<CreatorProfile> {
  const [existing] = await db()
    .select()
    .from(creatorProfiles)
    .where(eq(creatorProfiles.userId, userId))
  if (existing) return existing
  const [created] = await db().insert(creatorProfiles).values({ userId }).returning()
  if (!created) throw new Error('Failed to create profile')
  return created
}

export async function getMyCreatorProfile(): Promise<{
  profile: CreatorProfile
  credentials: Credential[]
  isVerified: boolean
}> {
  const u = await requireSessionUser()
  const profile = await getOrCreateProfile(u.id)
  const creds = await db()
    .select()
    .from(credentials)
    .where(eq(credentials.creatorProfileId, profile.id))
    .orderBy(credentials.createdAt)
  const isVerified = creds.some(
    (c) =>
      c.verificationStatus === 'verified' &&
      (!c.expirationDate || new Date(c.expirationDate) > new Date()),
  )
  return { profile, credentials: creds, isVerified }
}

const profileSchema = z.object({
  displayName: z.string().min(1).max(120).optional(),
  bio: z.string().max(2000).optional(),
  professionalSummary: z.string().max(500).optional(),
  yearsExperience: z.coerce.number().int().min(0).max(80).optional(),
  linkedinUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  personalWebsite: z
    .string()
    .url()
    .optional()
    .or(z.literal('').transform(() => undefined)),
})

export async function updateCreatorProfile(
  _prev: CreatorActionState,
  formData: FormData,
): Promise<CreatorActionState> {
  const u = await requireSessionUser()
  const parsed = profileSchema.safeParse(Object.fromEntries(formData.entries()))
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const profile = await getOrCreateProfile(u.id)
  const before = profile
  const [after] = await db()
    .update(creatorProfiles)
    .set({ ...parsed.data, updatedAt: sql`now()` })
    .where(eq(creatorProfiles.id, profile.id))
    .returning()

  if (after) {
    const someOrg = await firstOrgIdForUser(u.id)
    if (someOrg) {
      await withAudit(
        { organizationId: someOrg, userId: u.id, ipAddress: await ip(), userAgent: await ua() },
        {
          entityType: 'creator_profile',
          entityId: profile.id,
          action: 'updated',
          beforeState: before,
          afterState: after,
        },
      )
    }
  }
  revalidatePath('/dashboard/creator')
  return {}
}

const credentialSchema = z.object({
  credentialType: z.enum(CREDENTIAL_TYPES),
  title: z.string().min(1).max(200),
  issuingOrganization: z.string().min(1).max(200),
  licenseNumber: z.string().max(120).optional(),
  issueDate: z.coerce.date().optional(),
  expirationDate: z.coerce.date().optional(),
  supportingDocumentUrl: z
    .string()
    .url()
    .optional()
    .or(z.literal('').transform(() => undefined)),
})

export async function submitCredential(
  _prev: CreatorActionState,
  formData: FormData,
): Promise<CreatorActionState> {
  const u = await requireSessionUser()
  const data = Object.fromEntries(formData.entries())
  // Strip empty strings so optional fields don't fail validation
  for (const k of Object.keys(data)) if (data[k] === '') delete data[k as keyof typeof data]
  const parsed = credentialSchema.safeParse(data)
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const profile = await getOrCreateProfile(u.id)
  const [c] = await db()
    .insert(credentials)
    .values({
      creatorProfileId: profile.id,
      credentialType: parsed.data.credentialType,
      title: parsed.data.title,
      issuingOrganization: parsed.data.issuingOrganization,
      licenseNumber: parsed.data.licenseNumber,
      issueDate: parsed.data.issueDate?.toISOString().slice(0, 10),
      expirationDate: parsed.data.expirationDate?.toISOString().slice(0, 10),
      supportingDocumentUrl: parsed.data.supportingDocumentUrl,
    })
    .returning()

  if (c) {
    const someOrg = await firstOrgIdForUser(u.id)
    if (someOrg) {
      await withAudit(
        { organizationId: someOrg, userId: u.id, ipAddress: await ip(), userAgent: await ua() },
        {
          entityType: 'credential',
          entityId: c.id,
          action: 'submitted',
          afterState: { type: c.credentialType, title: c.title },
        },
      )
    }
  }
  revalidatePath('/dashboard/creator')
  return {}
}

export async function deletePendingCredential(credentialId: string): Promise<void> {
  const u = await requireSessionUser()
  const profile = await getOrCreateProfile(u.id)
  await db()
    .delete(credentials)
    .where(
      and(
        eq(credentials.id, credentialId),
        eq(credentials.creatorProfileId, profile.id),
        eq(credentials.verificationStatus, 'pending'),
      ),
    )
  revalidatePath('/dashboard/creator')
}

// ----- platform-admin actions -----

async function requirePlatformAdmin() {
  const u = await requireSessionUser()
  const [row] = await db()
    .select({ p: users.isPlatformAdmin })
    .from(users)
    .where(eq(users.id, u.id))
  if (!row?.p) throw new Error('Platform admin only')
  return u
}

export async function adminListPendingCredentials() {
  await requirePlatformAdmin()
  return db()
    .select({
      credential: credentials,
      profile: creatorProfiles,
      user: { id: users.id, email: users.email, fullName: users.fullName },
    })
    .from(credentials)
    .innerJoin(creatorProfiles, eq(credentials.creatorProfileId, creatorProfiles.id))
    .innerJoin(users, eq(creatorProfiles.userId, users.id))
    .where(eq(credentials.verificationStatus, 'pending'))
    .orderBy(credentials.createdAt)
}

export async function adminVerifyCredential(credentialId: string, notes?: string): Promise<void> {
  const admin = await requirePlatformAdmin()
  await db()
    .update(credentials)
    .set({
      verificationStatus: 'verified',
      verifiedBy: admin.id,
      verifiedAt: new Date(),
      verificationSource: 'manual_review',
      verificationNotes: notes ?? null,
    })
    .where(and(eq(credentials.id, credentialId), eq(credentials.verificationStatus, 'pending')))
  revalidatePath('/dashboard/admin/credentials')
}

export async function adminRejectCredential(credentialId: string, reason: string): Promise<void> {
  const admin = await requirePlatformAdmin()
  await db()
    .update(credentials)
    .set({
      verificationStatus: 'rejected',
      verifiedBy: admin.id,
      verifiedAt: new Date(),
      verificationSource: 'manual_review',
      verificationNotes: reason,
    })
    .where(and(eq(credentials.id, credentialId), eq(credentials.verificationStatus, 'pending')))
  revalidatePath('/dashboard/admin/credentials')
}

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const [row] = await db()
    .select({ p: users.isPlatformAdmin })
    .from(users)
    .where(eq(users.id, userId))
  return Boolean(row?.p)
}

async function firstOrgIdForUser(userId: string): Promise<string | null> {
  const [row] = await db()
    .select({ id: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId))
    .limit(1)
  return row?.id ?? null
}

async function ip(): Promise<string | null> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
}
async function ua(): Promise<string | null> {
  const h = await headers()
  return h.get('user-agent') ?? null
}

// referenced to avoid unused-var warning on isNull import (used for nullable checks elsewhere)
void isNull
