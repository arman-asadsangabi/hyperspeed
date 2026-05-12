/**
 * Hyperspeed TypeScript SDK
 *
 * @example
 * ```ts
 * import { Hyperspeed } from '@hyperspeed/sdk'
 *
 * const client = new Hyperspeed({ apiKey: process.env.HYPERSPEED_API_KEY! })
 * const result = await client.query({
 *   packId: 'pack_abc',
 *   query: 'What is the Section 179 limit for 2026?',
 * })
 * console.log(result.results)
 * ```
 */

export interface HyperspeedConfig {
  apiKey: string
  baseUrl?: string
  /** Max retries on 5xx + 429. Default 3. */
  maxRetries?: number
  /** Per-request timeout in ms. Default 30000. */
  timeoutMs?: number
  /** Optional observability hook called on every request completion. */
  onRequest?: (info: RequestInfo) => void
  fetch?: typeof globalThis.fetch
}

export interface RequestInfo {
  endpoint: string
  method: string
  status: number
  latencyMs: number
  attempt: number
}

export interface QueryParams {
  packId: string | string[]
  query: string
  maxResults?: number
  context?: string
  includeCitations?: boolean
  includeMetadata?: boolean
}

export interface QueryResult {
  queryId: string
  results: {
    entryId: string
    entryType: 'fact' | 'heuristic' | 'decision_rule' | 'example' | 'citation' | 'meta_rule'
    title: string
    content: string
    relevanceScore: number
    packId: string
    packVersionId: string
    tags: string[]
    structuredData?: Record<string, unknown> | null
  }[]
  metadata?: {
    packsQueried: string[]
    retrievalMethod: 'semantic' | 'keyword'
    latencyMs: number
  }
}

export class HyperspeedError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'HyperspeedError'
  }
}

const DEFAULT_BASE = 'https://hyperspeed-api.vercel.app'

export class Hyperspeed {
  private readonly baseUrl: string
  private readonly maxRetries: number
  private readonly timeoutMs: number
  private readonly fetchImpl: typeof globalThis.fetch

  constructor(private readonly config: HyperspeedConfig) {
    if (!config.apiKey || !config.apiKey.startsWith('hsk_')) {
      throw new Error('Hyperspeed: apiKey must start with "hsk_"')
    }
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE).replace(/\/$/, '')
    this.maxRetries = config.maxRetries ?? 3
    this.timeoutMs = config.timeoutMs ?? 30_000
    this.fetchImpl = config.fetch ?? globalThis.fetch
  }

  async query(params: QueryParams): Promise<QueryResult> {
    const body = {
      pack_id: params.packId,
      query: params.query,
      max_results: params.maxResults,
      context: params.context,
      include_citations: params.includeCitations,
      include_metadata: params.includeMetadata,
    }
    const data = await this.request<{
      query_id: string
      results: {
        entry_id: string
        entry_type: QueryResult['results'][number]['entryType']
        title: string
        content: string
        relevance_score: number
        pack_id: string
        pack_version_id: string
        tags: string[]
        structured_data?: Record<string, unknown> | null
      }[]
      metadata?: {
        packs_queried: string[]
        retrieval_method: 'semantic' | 'keyword'
        latency_ms: number
      }
    }>('POST', '/v1/query', body)

    return {
      queryId: data.query_id,
      results: data.results.map((r) => ({
        entryId: r.entry_id,
        entryType: r.entry_type,
        title: r.title,
        content: r.content,
        relevanceScore: r.relevance_score,
        packId: r.pack_id,
        packVersionId: r.pack_version_id,
        tags: r.tags,
        structuredData: r.structured_data,
      })),
      metadata: data.metadata
        ? {
            packsQueried: data.metadata.packs_queried,
            retrievalMethod: data.metadata.retrieval_method,
            latencyMs: data.metadata.latency_ms,
          }
        : undefined,
    }
  }

  async me(): Promise<{
    organization: { id: string; name: string; slug: string }
    apiKey: { id: string; name: string; tier: string; scopes: string[]; prefix: string }
  }> {
    const r = await this.request<{
      organization: { id: string; name: string; slug: string }
      api_key: { id: string; name: string; tier: string; scopes: string[]; prefix: string }
    }>('GET', '/v1/me')
    return { organization: r.organization, apiKey: r.api_key }
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let lastErr: unknown
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      const t0 = Date.now()
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.timeoutMs)
      try {
        const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': '@hyperspeed/sdk',
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        })
        const latencyMs = Date.now() - t0
        this.config.onRequest?.({ endpoint: path, method, status: res.status, latencyMs, attempt })

        if (res.ok) {
          return (await res.json()) as T
        }

        const text = await res.text()
        let code = 'http_error'
        let message = `HTTP ${res.status}`
        try {
          const j = JSON.parse(text) as { error?: { code?: string; message?: string } }
          if (j.error?.code) code = j.error.code
          if (j.error?.message) message = j.error.message
        } catch {
          if (text) message = text
        }

        if (res.status >= 500 || res.status === 429) {
          lastErr = new HyperspeedError(res.status, code, message)
          await this.sleep(this.backoffMs(attempt))
          continue
        }
        throw new HyperspeedError(res.status, code, message)
      } catch (err) {
        if (err instanceof HyperspeedError && err.status < 500 && err.status !== 429) throw err
        lastErr = err
        if (attempt < this.maxRetries) await this.sleep(this.backoffMs(attempt))
      } finally {
        clearTimeout(timer)
      }
    }
    if (lastErr instanceof Error) throw lastErr
    throw new HyperspeedError(0, 'unknown', 'Unknown error')
  }

  private backoffMs(attempt: number): number {
    return Math.min(8000, 250 * 2 ** (attempt - 1)) + Math.random() * 100
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms))
  }
}
