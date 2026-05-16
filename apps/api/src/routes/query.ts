import { Hono } from 'hono'
import { z } from 'zod'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import {
  packs,
  packVersions,
  packEntries,
  apiUsageEvents,
  type PackEntry,
} from '@hyperspeed/db/schema'
import { db } from '@hyperspeed/db/client'
import { authenticateApiKey, HttpError } from '../lib/auth'
import { checkRateLimit } from '../lib/rate_limit'

export const queryRouter = new Hono()

const querySchema = z.object({
  pack_id: z.union([z.string().uuid(), z.array(z.string().uuid()).min(1).max(20)]),
  query: z.string().min(1).max(2000),
  max_results: z.number().int().min(1).max(50).default(5),
  context: z.string().max(2000).optional(),
  include_citations: z.boolean().default(true),
  include_metadata: z.boolean().default(true),
})

queryRouter.post('/query', async (c) => {
  const start = Date.now()
  let auth
  try {
    auth = await authenticateApiKey(c.req.header('authorization') ?? null)
  } catch (e) {
    if (e instanceof HttpError)
      return c.json({ error: { code: e.code, message: e.message } }, e.status as 401)
    throw e
  }

  // Rate limit
  let rate
  try {
    rate = await checkRateLimit(auth.organization.id, auth.apiKey.tier)
  } catch (e) {
    if (e instanceof HttpError)
      return c.json({ error: { code: e.code, message: e.message } }, e.status as 429)
    throw e
  }

  const body = await c.req.json().catch(() => ({}))
  const parsed = querySchema.safeParse(body)
  if (!parsed.success)
    return c.json({ error: { code: 'invalid_request', message: parsed.error.message } }, 400)

  const packIds = Array.isArray(parsed.data.pack_id) ? parsed.data.pack_id : [parsed.data.pack_id]

  // Verify access: org must own the pack. Stage 6 expands this to licenses.
  const accessible = await db()
    .select({ id: packs.id })
    .from(packs)
    .where(and(inArray(packs.id, packIds), eq(packs.organizationId, auth.organization.id)))
  const accessibleIds = new Set(accessible.map((p) => p.id))
  const forbidden = packIds.filter((p) => !accessibleIds.has(p))
  if (forbidden.length > 0) {
    await logUsage({
      orgId: auth.organization.id,
      apiKeyId: auth.apiKey.id,
      endpoint: '/v1/query',
      packIds,
      latencyMs: Date.now() - start,
      statusCode: 403,
    })
    return c.json(
      { error: { code: 'forbidden', message: `No access to packs: ${forbidden.join(',')}` } },
      403,
    )
  }

  // Fetch latest published version per pack
  const versions = await db()
    .select()
    .from(packVersions)
    .where(and(inArray(packVersions.packId, packIds), eq(packVersions.status, 'published')))
    .orderBy(desc(packVersions.publishedAt))
  const latestByPack = new Map<string, string>()
  for (const v of versions) {
    if (!latestByPack.has(v.packId)) latestByPack.set(v.packId, v.id)
  }
  const versionIds = [...latestByPack.values()]

  // Vector search if embeddings exist; falls back to LIKE on title+content.
  const queryEmbedding = await embedQuery(parsed.data.query).catch(() => null)

  let entries: (PackEntry & { relevance: number; packId: string })[] = []
  let retrievalMethod: 'semantic' | 'keyword' = 'keyword'
  if (queryEmbedding && versionIds.length > 0) {
    const vec = `[${queryEmbedding.join(',')}]`
    try {
      const rows = await db().execute(sql`
        SELECT pe.*, pv.pack_id AS pack_id,
          1 - (pe.embedding <=> ${vec}::vector) AS relevance
        FROM ${packEntries} pe
        INNER JOIN ${packVersions} pv ON pv.id = pe.pack_version_id
        WHERE pv.id = ANY(${sql.raw(`ARRAY[${versionIds.map((v) => `'${v}'::uuid`).join(',')}]`)})
          AND pe.embedding IS NOT NULL
        ORDER BY pe.embedding <=> ${vec}::vector ASC
        LIMIT ${parsed.data.max_results}
      `)
      entries = rows as unknown as (PackEntry & { relevance: number; packId: string })[]
      retrievalMethod = 'semantic'
    } catch (err) {
      // pack_entries.embedding column not yet provisioned — degrade to keyword.
      // Logged once so we know to run the migration + backfill.
      console.warn('[query] vector search failed, falling back to keyword:', err)
    }
  }

  if (entries.length === 0 && versionIds.length > 0) {
    // Keyword fallback (also covers vector-search miss and the no-OPENAI_API_KEY case).
    const q = `%${parsed.data.query.toLowerCase()}%`
    const rows = await db()
      .select({ entry: packEntries, packId: packVersions.packId })
      .from(packEntries)
      .innerJoin(packVersions, eq(packEntries.packVersionId, packVersions.id))
      .where(
        and(
          inArray(packVersions.id, versionIds),
          sql`(lower(${packEntries.title}) like ${q} OR lower(${packEntries.content}) like ${q})`,
        ),
      )
      .limit(parsed.data.max_results)
    entries = rows.map((r) => ({ ...r.entry, packId: r.packId, relevance: 0.5 }))
  }

  const results = entries.map((e) => ({
    entry_id: e.id,
    entry_type: e.entryType,
    title: e.title,
    content: e.content,
    relevance_score: Math.max(0, Math.min(1, e.relevance ?? 0)),
    pack_id: e.packId,
    pack_version_id: e.packVersionId,
    tags: e.tags,
    structured_data: parsed.data.include_metadata ? e.structuredData : undefined,
  }))

  const latencyMs = Date.now() - start
  await logUsage({
    orgId: auth.organization.id,
    apiKeyId: auth.apiKey.id,
    endpoint: '/v1/query',
    packIds,
    latencyMs,
    statusCode: 200,
  })

  c.header('X-RateLimit-Limit', String(rate.limitPerMinute))
  c.header('X-RateLimit-Remaining', String(Math.max(0, rate.remainingMinute - 1)))
  c.header('X-RateLimit-Reset', String(Math.floor(rate.resetAt.getTime() / 1000)))

  return c.json({
    query_id: crypto.randomUUID(),
    results,
    metadata: parsed.data.include_metadata
      ? {
          packs_queried: packIds,
          retrieval_method: retrievalMethod,
          latency_ms: latencyMs,
        }
      : undefined,
  })
})

queryRouter.get('/me', async (c) => {
  try {
    const auth = await authenticateApiKey(c.req.header('authorization') ?? null)
    return c.json({
      organization: {
        id: auth.organization.id,
        name: auth.organization.name,
        slug: auth.organization.slug,
      },
      api_key: {
        id: auth.apiKey.id,
        name: auth.apiKey.name,
        tier: auth.apiKey.tier,
        scopes: auth.apiKey.scopes,
        prefix: auth.apiKey.keyPrefix,
      },
    })
  } catch (e) {
    if (e instanceof HttpError)
      return c.json({ error: { code: e.code, message: e.message } }, e.status as 401)
    throw e
  }
})

async function logUsage(params: {
  orgId: string
  apiKeyId: string
  endpoint: string
  packIds: string[]
  latencyMs: number
  statusCode: number
}): Promise<void> {
  try {
    await db().insert(apiUsageEvents).values({
      organizationId: params.orgId,
      apiKeyId: params.apiKeyId,
      endpoint: params.endpoint,
      packIds: params.packIds,
      latencyMs: params.latencyMs,
      statusCode: params.statusCode,
      billableUnits: '1',
    })
  } catch {
    // Don't fail the request on logging errors
  }
}

async function embedQuery(text: string): Promise<number[] | null> {
  if (!process.env.OPENAI_API_KEY) return null
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text.slice(0, 8000) }),
  })
  if (!res.ok) return null
  const json = (await res.json()) as { data?: { embedding: number[] }[] }
  return json.data?.[0]?.embedding ?? null
}
