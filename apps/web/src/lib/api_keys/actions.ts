'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { apiKeys, type ApiKey } from '@hyperspeed/db/schema'
import { db } from '../db'
import { hasRoleAtLeast, requireOrgContext } from '../auth/session'
import { withAudit } from '../audit'

const KEY_PREFIX = 'hsk_live_'

async function hashKey(key: string): Promise<string> {
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  const enc = new TextEncoder()
  const data = new Uint8Array(salt.length + key.length)
  data.set(salt)
  data.set(enc.encode(key), salt.length)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const toHex = (b: Uint8Array | ArrayBuffer) =>
    [...new Uint8Array(b instanceof ArrayBuffer ? b : b.buffer)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  return `${toHex(salt)}:${toHex(digest)}`
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const ctx = await requireOrgContext()
  return db()
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.organizationId, ctx.organization.id), isNull(apiKeys.revokedAt)))
    .orderBy(desc(apiKeys.createdAt))
}

/**
 * Create a new API key. Returns the raw key — it's the ONLY time it's revealed.
 */
export async function createApiKey(
  name: string,
  tier: 'free' | 'startup' | 'enterprise' = 'free',
): Promise<{ key: string; row: ApiKey } | { error: string }> {
  const ctx = await requireOrgContext()
  if (!(await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin')))
    return { error: 'Only admins can create API keys' }

  // Generate key
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let suffix = ''
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  for (const b of bytes) suffix += alphabet[b % alphabet.length]
  const key = `${KEY_PREFIX}${suffix}`
  const prefix = key.slice(0, 12)
  const keyHash = await hashKey(key)

  const [row] = await db()
    .insert(apiKeys)
    .values({
      organizationId: ctx.organization.id,
      name: name || 'Unnamed key',
      keyPrefix: prefix,
      keyHash,
      tier,
      createdBy: ctx.user.id,
    })
    .returning()
  if (!row) return { error: 'Insert failed' }

  await withAudit(
    {
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      ipAddress: await ip(),
      userAgent: await ua(),
    },
    {
      entityType: 'api_key',
      entityId: row.id,
      action: 'created',
      afterState: { name: row.name, tier: row.tier },
    },
  )

  revalidatePath('/dashboard/api')
  return { key, row }
}

export async function revokeApiKey(keyId: string): Promise<void> {
  const ctx = await requireOrgContext()
  if (!(await hasRoleAtLeast(ctx.organization.id, ctx.user.id, 'admin'))) return
  await db()
    .update(apiKeys)
    .set({ revokedAt: sql`now()` })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.organizationId, ctx.organization.id)))

  await withAudit(
    {
      organizationId: ctx.organization.id,
      userId: ctx.user.id,
      ipAddress: await ip(),
      userAgent: await ua(),
    },
    { entityType: 'api_key', entityId: keyId, action: 'revoked' },
  )
  revalidatePath('/dashboard/api')
}

async function ip(): Promise<string | null> {
  const h = await headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
}
async function ua(): Promise<string | null> {
  const h = await headers()
  return h.get('user-agent') ?? null
}
