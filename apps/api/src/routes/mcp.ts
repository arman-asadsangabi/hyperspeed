/**
 * MCP Streamable HTTP endpoint — lets ChatGPT (and any other MCP-aware
 * client that doesn't run local stdio servers) talk to Hyperspeed.
 *
 * Wire format: JSON-RPC 2.0 over a single POST. Stateless — no session ID
 * threading, no SSE. ChatGPT's connector framework calls this URL with the
 * user-pasted `hsk_*` API key as a Bearer token; we authenticate the same
 * way as /v1/query.
 *
 * Tools:
 *   - search(query)            → ChatGPT deep-research convention; ranked hits
 *   - fetch(id)                → ChatGPT deep-research convention; full entry
 *   - query_pack(query, pack_id?) → richer manual tool, mirrors the stdio MCP
 */
import { Hono } from 'hono'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { packs, packVersions, packEntries, type PackEntry } from '@hyperspeed/db/schema'
import { db } from '@hyperspeed/db/client'
import { authenticateApiKey, HttpError } from '../lib/auth'
import { requireActiveSubscription } from '../lib/billing_gate'

export const mcpRouter = new Hono()

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id?: string | number | null
  method: string
  params?: Record<string, unknown>
}

interface JsonRpcSuccess {
  jsonrpc: '2.0'
  id: string | number | null
  result: unknown
}

interface JsonRpcError {
  jsonrpc: '2.0'
  id: string | number | null
  error: { code: number; message: string; data?: unknown }
}

const PROTOCOL_VERSION = '2025-06-18'
const SERVER_INFO = { name: 'hyperspeed-mcp-http', version: '0.0.1' }

const TOOLS = [
  {
    name: 'search',
    description:
      "Search the user's accessible Hyperspeed packs by semantic similarity. Returns a list of matching entries with id/title/text. Use whenever the user asks a domain question their pack might answer.",
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The natural-language question' },
      },
      required: ['query'],
    },
  },
  {
    name: 'fetch',
    description: 'Fetch a single pack entry by id (the id returned from search).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Entry id returned from search' },
      },
      required: ['id'],
    },
  },
  {
    name: 'query_pack',
    description:
      'Lower-level search with explicit pack_id and result count. Use when the user wants to scope to a specific pack.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        pack_id: { type: 'string', description: 'Optional pack UUID; defaults to all org packs' },
        max_results: { type: 'integer', minimum: 1, maximum: 50 },
      },
      required: ['query'],
    },
  },
]

mcpRouter.post('/mcp', async (c) => {
  let body: JsonRpcRequest
  try {
    body = (await c.req.json()) as JsonRpcRequest
  } catch {
    return c.json<JsonRpcError>(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      400,
    )
  }

  const reqId = body.id ?? null

  // The MCP protocol allows initialize/tools/list before auth in some clients;
  // be permissive: we authenticate on tool calls.
  if (body.method === 'initialize') {
    return c.json<JsonRpcSuccess>({
      jsonrpc: '2.0',
      id: reqId,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      },
    })
  }

  if (body.method === 'notifications/initialized') {
    // Notifications never get a response.
    return c.body(null, 204)
  }

  if (body.method === 'tools/list') {
    return c.json<JsonRpcSuccess>({
      jsonrpc: '2.0',
      id: reqId,
      result: { tools: TOOLS },
    })
  }

  if (body.method === 'ping') {
    return c.json<JsonRpcSuccess>({ jsonrpc: '2.0', id: reqId, result: {} })
  }

  if (body.method === 'tools/call') {
    const params = (body.params ?? {}) as { name?: string; arguments?: Record<string, unknown> }
    const toolName = params.name ?? ''
    const args = params.arguments ?? {}

    // Auth required for tool calls.
    let auth
    try {
      auth = await authenticateApiKey(c.req.header('authorization') ?? null)
    } catch (e) {
      if (e instanceof HttpError) {
        return c.json<JsonRpcError>(
          { jsonrpc: '2.0', id: reqId, error: { code: -32001, message: e.message } },
          200,
        )
      }
      throw e
    }

    // Subscription gate
    try {
      await requireActiveSubscription(auth.organization.id)
    } catch (e) {
      if (e instanceof HttpError) {
        return c.json<JsonRpcError>(
          { jsonrpc: '2.0', id: reqId, error: { code: -32002, message: e.message } },
          200,
        )
      }
      throw e
    }

    try {
      if (toolName === 'search') {
        const query = typeof args.query === 'string' ? args.query : ''
        if (!query) throw new Error('search requires "query"')
        const hits = await runSearch(auth.organization.id, query, null, 8)
        const results = hits.map((h) => ({
          id: h.id,
          title: h.title,
          text: h.content.slice(0, 800),
          url: `https://hyperspeed.work/dashboard/packs/${h.packId}/versions/${h.packVersionId}`,
          metadata: {
            entry_type: h.entryType,
            relevance: h.relevance,
            tags: h.tags,
            pack_id: h.packId,
          },
        }))
        return c.json<JsonRpcSuccess>({
          jsonrpc: '2.0',
          id: reqId,
          result: {
            content: [{ type: 'text', text: JSON.stringify({ results }) }],
          },
        })
      }

      if (toolName === 'fetch') {
        const id = typeof args.id === 'string' ? args.id : ''
        if (!id) throw new Error('fetch requires "id"')
        const entry = await fetchEntry(auth.organization.id, id)
        if (!entry) {
          return c.json<JsonRpcSuccess>({
            jsonrpc: '2.0',
            id: reqId,
            result: {
              content: [{ type: 'text', text: JSON.stringify({ error: 'not_found' }) }],
              isError: true,
            },
          })
        }
        return c.json<JsonRpcSuccess>({
          jsonrpc: '2.0',
          id: reqId,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  id: entry.id,
                  title: entry.title,
                  text: entry.content,
                  url: `https://hyperspeed.work/dashboard/packs/${entry.packId}/versions/${entry.packVersionId}`,
                  metadata: {
                    entry_type: entry.entryType,
                    tags: entry.tags,
                    structured_data: entry.structuredData,
                  },
                }),
              },
            ],
          },
        })
      }

      if (toolName === 'query_pack') {
        const query = typeof args.query === 'string' ? args.query : ''
        const packId = typeof args.pack_id === 'string' ? args.pack_id : null
        const maxResults = typeof args.max_results === 'number' ? args.max_results : 5
        if (!query) throw new Error('query_pack requires "query"')
        const hits = await runSearch(auth.organization.id, query, packId, maxResults)
        const formatted =
          hits
            .map(
              (h, i) =>
                `[${i + 1}] (${h.entryType}, relevance ${h.relevance.toFixed(2)})\n${h.title}\n${h.content}`,
            )
            .join('\n\n---\n\n') || '(no results)'
        return c.json<JsonRpcSuccess>({
          jsonrpc: '2.0',
          id: reqId,
          result: { content: [{ type: 'text', text: formatted }] },
        })
      }

      return c.json<JsonRpcError>(
        {
          jsonrpc: '2.0',
          id: reqId,
          error: { code: -32601, message: `Unknown tool: ${toolName}` },
        },
        200,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return c.json<JsonRpcSuccess>({
        jsonrpc: '2.0',
        id: reqId,
        result: {
          content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
          isError: true,
        },
      })
    }
  }

  // Unknown method.
  return c.json<JsonRpcError>(
    {
      jsonrpc: '2.0',
      id: reqId,
      error: { code: -32601, message: `Method not found: ${body.method}` },
    },
    200,
  )
})

// Some clients pre-flight with GET; respond with a small advertisement.
mcpRouter.get('/mcp', (c) =>
  c.json({
    transport: 'streamable-http',
    protocolVersion: PROTOCOL_VERSION,
    server: SERVER_INFO,
    tools: TOOLS.map((t) => t.name),
  }),
)

// --- helpers ---------------------------------------------------------------

interface Hit {
  id: string
  packVersionId: string
  packId: string
  entryType: string
  title: string
  content: string
  tags: string[]
  relevance: number
  structuredData: Record<string, unknown> | null
}

async function runSearch(
  orgId: string,
  query: string,
  scopePackId: string | null,
  maxResults: number,
): Promise<Hit[]> {
  // Resolve pack scope: explicit pack_id (verified to belong to org) or all org packs.
  let packIds: string[]
  if (scopePackId) {
    const owned = await db()
      .select({ id: packs.id })
      .from(packs)
      .where(and(eq(packs.id, scopePackId), eq(packs.organizationId, orgId)))
    if (owned.length === 0) throw new Error(`No access to pack ${scopePackId}`)
    packIds = [scopePackId]
  } else {
    const owned = await db()
      .select({ id: packs.id })
      .from(packs)
      .where(eq(packs.organizationId, orgId))
    packIds = owned.map((p) => p.id)
    if (packIds.length === 0) return []
  }

  // Latest published version per pack
  const versions = await db()
    .select({ id: packVersions.id, packId: packVersions.packId })
    .from(packVersions)
    .where(and(inArray(packVersions.packId, packIds), eq(packVersions.status, 'published')))
  const versionIds = [...new Set(versions.map((v) => v.id))]
  if (versionIds.length === 0) return []

  // Try semantic; fall back to keyword.
  const queryEmbedding = await embedQuery(query).catch(() => null)
  let rows: Array<PackEntry & { relevance: number; packId: string }> = []
  if (queryEmbedding) {
    const vec = `[${queryEmbedding.join(',')}]`
    try {
      const raw = await db().execute(sql`
        SELECT pe.*, pv.pack_id AS pack_id,
          1 - (pe.embedding <=> ${vec}::vector) AS relevance
        FROM ${packEntries} pe
        INNER JOIN ${packVersions} pv ON pv.id = pe.pack_version_id
        WHERE pv.id = ANY(${sql.raw(`ARRAY[${versionIds.map((v) => `'${v}'::uuid`).join(',')}]`)})
          AND pe.embedding IS NOT NULL
        ORDER BY pe.embedding <=> ${vec}::vector ASC
        LIMIT ${maxResults}
      `)
      rows = raw as unknown as Array<PackEntry & { relevance: number; packId: string }>
    } catch {
      rows = []
    }
  }
  if (rows.length === 0) {
    const q = `%${query.toLowerCase()}%`
    const fallback = await db()
      .select({ entry: packEntries, packId: packVersions.packId })
      .from(packEntries)
      .innerJoin(packVersions, eq(packEntries.packVersionId, packVersions.id))
      .where(
        and(
          inArray(packVersions.id, versionIds),
          sql`(lower(${packEntries.title}) like ${q} OR lower(${packEntries.content}) like ${q})`,
        ),
      )
      .limit(maxResults)
    rows = fallback.map((r) => ({ ...r.entry, packId: r.packId, relevance: 0.5 }))
  }

  return rows.map((r) => ({
    id: r.id,
    packVersionId: r.packVersionId,
    packId: r.packId,
    entryType: r.entryType,
    title: r.title,
    content: r.content,
    tags: r.tags,
    relevance: Math.max(0, Math.min(1, r.relevance ?? 0)),
    structuredData: r.structuredData ?? null,
  }))
}

async function fetchEntry(orgId: string, entryId: string) {
  const [row] = await db()
    .select({ entry: packEntries, packId: packVersions.packId, orgId: packs.organizationId })
    .from(packEntries)
    .innerJoin(packVersions, eq(packEntries.packVersionId, packVersions.id))
    .innerJoin(packs, eq(packVersions.packId, packs.id))
    .where(eq(packEntries.id, entryId))
  if (!row || row.orgId !== orgId) return null
  return {
    id: row.entry.id,
    packVersionId: row.entry.packVersionId,
    packId: row.packId,
    entryType: row.entry.entryType,
    title: row.entry.title,
    content: row.entry.content,
    tags: row.entry.tags,
    structuredData: row.entry.structuredData,
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
