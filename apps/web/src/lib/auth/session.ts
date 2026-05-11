import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '../supabase/server'
import { db } from '../db'
import {
  organizationMembers,
  organizations,
  users,
  type OrganizationMember,
  type Organization,
  type User,
} from '@hyperspeed/db/schema'
import { eq, and } from 'drizzle-orm'
import type { OrgRole } from '@hyperspeed/shared/constants'

export const ACTIVE_ORG_COOKIE = 'hyperspeed_org_id'

export interface SessionUser {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
}

export interface OrgContext {
  user: User
  organization: Organization
  member: OrganizationMember
  role: OrgRole
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) return null
  return {
    id: user.id,
    email: user.email,
    fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
    avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
  }
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) redirect('/sign-in')
  return user
}

export async function getMyMemberships(userId: string) {
  return db()
    .select({
      member: organizationMembers,
      organization: organizations,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .where(eq(organizationMembers.userId, userId))
}

export async function getActiveOrgId(): Promise<string | null> {
  const store = await cookies()
  return store.get(ACTIVE_ORG_COOKIE)?.value ?? null
}

export async function setActiveOrgCookie(orgId: string): Promise<void> {
  const store = await cookies()
  store.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}

export async function clearActiveOrgCookie(): Promise<void> {
  const store = await cookies()
  store.delete(ACTIVE_ORG_COOKIE)
}

export async function getOrgContext(): Promise<OrgContext | null> {
  const sessionUser = await getSessionUser()
  if (!sessionUser) return null

  const activeOrgId = await getActiveOrgId()
  const memberships = await getMyMemberships(sessionUser.id)
  if (memberships.length === 0) return null

  let membership = activeOrgId
    ? memberships.find((m) => m.organization.id === activeOrgId)
    : undefined
  membership ??= memberships[0]
  if (!membership) return null

  if (membership.organization.id !== activeOrgId) {
    await setActiveOrgCookie(membership.organization.id)
  }

  const [userRow] = await db().select().from(users).where(eq(users.id, sessionUser.id))
  if (!userRow) return null

  return {
    user: userRow,
    organization: membership.organization,
    member: membership.member,
    role: membership.member.role,
  }
}

export async function requireOrgContext(): Promise<OrgContext> {
  const ctx = await getOrgContext()
  if (!ctx) redirect('/onboarding')
  return ctx
}

export async function hasRoleAtLeast(
  orgId: string,
  userId: string,
  min: OrgRole,
): Promise<boolean> {
  const [m] = await db()
    .select()
    .from(organizationMembers)
    .where(
      and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, userId)),
    )
  if (!m) return false
  const rank = { member: 1, admin: 2, owner: 3 } as const
  return rank[m.role] >= rank[min]
}
