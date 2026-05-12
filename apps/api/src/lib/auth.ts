import { eq, and, isNull, sql } from 'drizzle-orm'
import { apiKeys, type ApiKey, organizations, type Organization } from '@hyperspeed/db/schema'
import { db } from '@hyperspeed/db/client'
import { hashAsync, compareAsync } from './bcrypt'

const KEY_PREFIX = 'hsk_live_'

export async function generateApiKey(): Promise<{ key: string; prefix: string; hash: string }> {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let suffix = ''
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  for (const b of bytes) suffix += alphabet[b % alphabet.length]
  const key = `${KEY_PREFIX}${suffix}`
  const prefix = key.slice(0, 12)
  const hash = await hashAsync(key)
  return { key, prefix, hash }
}

export interface AuthedRequest {
  apiKey: ApiKey
  organization: Organization
}

export async function authenticateApiKey(authorization: string | null): Promise<AuthedRequest> {
  if (!authorization || !authorization.startsWith('Bearer '))
    throw new HttpError(401, 'missing_auth', 'Missing Authorization: Bearer <key> header')
  const key = authorization.slice(7).trim()
  if (!key.startsWith(KEY_PREFIX)) throw new HttpError(401, 'invalid_key', 'Invalid API key format')

  const prefix = key.slice(0, 12)
  const candidates = await db()
    .select({ key: apiKeys, org: organizations })
    .from(apiKeys)
    .innerJoin(organizations, eq(apiKeys.organizationId, organizations.id))
    .where(and(eq(apiKeys.keyPrefix, prefix), isNull(apiKeys.revokedAt)))

  for (const c of candidates) {
    if (c.key.expiresAt && c.key.expiresAt < new Date()) continue
    if (await compareAsync(key, c.key.keyHash)) {
      await db()
        .update(apiKeys)
        .set({ lastUsedAt: sql`now()` })
        .where(eq(apiKeys.id, c.key.id))
        .catch(() => undefined)
      return { apiKey: c.key, organization: c.org }
    }
  }
  throw new HttpError(401, 'invalid_key', 'API key not recognized')
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
  }
}
