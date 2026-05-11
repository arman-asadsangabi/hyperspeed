'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { eq, and, isNull } from 'drizzle-orm'
import { createOrganizationSchema, emailSchema, slugSchema } from '@hyperspeed/shared/schemas'
import {
  organizations,
  organizationMembers,
  organizationInvitations,
  users,
} from '@hyperspeed/db/schema'
import { db } from '../db'
import {
  requireSessionUser,
  setActiveOrgCookie,
  clearActiveOrgCookie,
  getMyMemberships,
  hasRoleAtLeast,
} from './session'
import { withAudit } from '../audit'

export interface OrgActionState {
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function createOrganization(
  _prev: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  const sessionUser = await requireSessionUser()
  const parsed = createOrganizationSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    billingEmail: formData.get('billingEmail') || sessionUser.email,
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  try {
    const newOrg = await db().transaction(async (tx) => {
      const [org] = await tx
        .insert(organizations)
        .values({
          name: parsed.data.name,
          slug: parsed.data.slug,
          billingEmail: parsed.data.billingEmail,
        })
        .returning()
      if (!org) throw new Error('Failed to create organization')

      await tx.insert(organizationMembers).values({
        organizationId: org.id,
        userId: sessionUser.id,
        role: 'owner',
      })

      return org
    })

    await withAudit(
      {
        organizationId: newOrg.id,
        userId: sessionUser.id,
        ipAddress: await getRequestIp(),
        userAgent: await getRequestUserAgent(),
      },
      {
        entityType: 'organization',
        entityId: newOrg.id,
        action: 'created',
        afterState: newOrg,
      },
    )

    await setActiveOrgCookie(newOrg.id)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('organizations_slug_unique')) {
      return { fieldErrors: { slug: ['That slug is already taken'] } }
    }
    return { error: message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function switchActiveOrg(orgId: string): Promise<void> {
  const sessionUser = await requireSessionUser()
  const memberships = await getMyMemberships(sessionUser.id)
  if (!memberships.some((m) => m.organization.id === orgId)) {
    throw new Error('You are not a member of that organization')
  }
  await setActiveOrgCookie(orgId)
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

const inviteSchema = z.object({
  email: emailSchema,
  role: z.enum(['member', 'admin']).default('member'),
})

export async function inviteMember(
  orgId: string,
  _prev: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  const sessionUser = await requireSessionUser()
  if (!(await hasRoleAtLeast(orgId, sessionUser.id, 'admin'))) {
    return { error: 'Only admins can invite members' }
  }
  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)

  const [invitation] = await db()
    .insert(organizationInvitations)
    .values({
      organizationId: orgId,
      email: parsed.data.email,
      role: parsed.data.role,
      token,
      invitedBy: sessionUser.id,
      expiresAt,
    })
    .returning()

  if (!invitation) return { error: 'Failed to create invitation' }

  await withAudit(
    {
      organizationId: orgId,
      userId: sessionUser.id,
      ipAddress: await getRequestIp(),
      userAgent: await getRequestUserAgent(),
    },
    {
      entityType: 'invitation',
      entityId: invitation.id,
      action: 'created',
      afterState: { email: invitation.email, role: invitation.role },
    },
  )

  revalidatePath(`/dashboard/members`)
  return {}
}

const acceptInviteSchema = z.object({
  token: z.string().min(1),
  slug: slugSchema.optional(),
})

export async function acceptInvitation(
  _prev: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  const sessionUser = await requireSessionUser()
  const parsed = acceptInviteSchema.safeParse({ token: formData.get('token') })
  if (!parsed.success) return { fieldErrors: parsed.error.flatten().fieldErrors }

  const [invitation] = await db()
    .select()
    .from(organizationInvitations)
    .where(
      and(
        eq(organizationInvitations.token, parsed.data.token),
        isNull(organizationInvitations.acceptedAt),
      ),
    )

  if (!invitation) return { error: 'Invitation not found or already accepted' }
  if (invitation.expiresAt < new Date()) return { error: 'Invitation has expired' }
  if (invitation.email.toLowerCase() !== sessionUser.email.toLowerCase()) {
    return { error: 'This invitation was sent to a different email address' }
  }

  await db().transaction(async (tx) => {
    await tx
      .insert(organizationMembers)
      .values({
        organizationId: invitation.organizationId,
        userId: sessionUser.id,
        role: invitation.role as 'admin' | 'member' | 'owner',
        invitedBy: invitation.invitedBy,
      })
      .onConflictDoNothing()

    await tx
      .update(organizationInvitations)
      .set({ acceptedAt: new Date(), acceptedBy: sessionUser.id })
      .where(eq(organizationInvitations.id, invitation.id))
  })

  await withAudit(
    {
      organizationId: invitation.organizationId,
      userId: sessionUser.id,
      ipAddress: await getRequestIp(),
      userAgent: await getRequestUserAgent(),
    },
    {
      entityType: 'organization_member',
      entityId: sessionUser.id,
      action: 'joined',
      afterState: { role: invitation.role, viaInvitation: invitation.id },
    },
  )

  await setActiveOrgCookie(invitation.organizationId)
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function leaveOrganization(orgId: string): Promise<void> {
  const sessionUser = await requireSessionUser()

  await db()
    .delete(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, orgId),
        eq(organizationMembers.userId, sessionUser.id),
      ),
    )

  await withAudit(
    {
      organizationId: orgId,
      userId: sessionUser.id,
      ipAddress: await getRequestIp(),
      userAgent: await getRequestUserAgent(),
    },
    {
      entityType: 'organization_member',
      entityId: sessionUser.id,
      action: 'left',
    },
  )

  await clearActiveOrgCookie()
  revalidatePath('/', 'layout')
  redirect('/onboarding')
}

// Helpers — these dynamically read request context for audit logging.
async function getRequestIp(): Promise<string | null> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null
}

async function getRequestUserAgent(): Promise<string | null> {
  const h = await headers()
  return h.get('user-agent') ?? null
}

// Suppress unused-import warning if Drizzle's `users` import isn't used in this file later.
void users
