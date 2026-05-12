export const dynamic = 'force-static'

export default function DocsPage() {
  const baseUrl =
    process.env.API_APP_URL ??
    process.env.NEXT_PUBLIC_API_APP_URL ??
    'https://hyperspeed-api.vercel.app'

  return (
    <div className="prose max-w-3xl space-y-8 text-[var(--color-ink)]">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API documentation</h1>
        <p className="mt-1 text-sm text-[var(--color-slate-soft)]">
          Authentication, query endpoint, error handling.
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Quickstart</h2>
        <ol className="list-inside list-decimal space-y-2 text-sm">
          <li>
            Create an API key under{' '}
            <a className="text-[var(--color-primary)] underline" href="/dashboard/api/keys">
              API keys
            </a>
            . Copy it — you&apos;ll only see it once.
          </li>
          <li>
            POST a query to{' '}
            <code className="rounded bg-[var(--color-primary-pale)] px-1 py-0.5">
              {baseUrl}/v1/query
            </code>
            .
          </li>
          <li>
            The response includes ranked entries with relevance scores. Inject them into your
            AI&apos;s context.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Authentication</h2>
        <p className="text-sm">
          Pass your API key in the <code>Authorization</code> header:
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-[var(--color-ink)] p-4 text-xs text-white">
          {`Authorization: Bearer hsk_live_...`}
        </pre>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">POST /v1/query</h2>
        <p className="text-sm">Search pack entries by semantic similarity to a query.</p>
        <h3 className="mt-3 text-sm font-semibold">Request</h3>
        <pre className="mt-1 overflow-x-auto rounded-lg bg-[var(--color-ink)] p-4 text-xs text-white">
          {`POST ${baseUrl}/v1/query
Content-Type: application/json
Authorization: Bearer hsk_live_...

{
  "pack_id": "<uuid>",          // or array of UUIDs
  "query": "Section 179 limit for 2026?",
  "max_results": 5,              // optional, default 5, max 50
  "include_citations": true,     // optional, default true
  "include_metadata": true       // optional, default true
}`}
        </pre>
        <h3 className="mt-3 text-sm font-semibold">Response</h3>
        <pre className="mt-1 overflow-x-auto rounded-lg bg-[var(--color-ink)] p-4 text-xs text-white">
          {`{
  "query_id": "<uuid>",
  "results": [
    {
      "entry_id": "<uuid>",
      "entry_type": "fact",
      "title": "Section 179 limit 2026",
      "content": "...",
      "relevance_score": 0.91,
      "pack_id": "<uuid>",
      "pack_version_id": "<uuid>",
      "tags": ["tax", "2026"]
    }
  ],
  "metadata": {
    "packs_queried": ["..."],
    "retrieval_method": "semantic",
    "latency_ms": 142
  }
}`}
        </pre>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">GET /v1/me</h2>
        <p className="text-sm">
          Returns the org + key info for the authenticated request. Useful for debugging.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Rate limits</h2>
        <p className="text-sm">Per organization, by tier:</p>
        <ul className="list-inside list-disc text-sm">
          <li>Free: 100 req/min, 10,000 req/day</li>
          <li>Startup: 1,000 req/min, 1,000,000 req/day</li>
          <li>Enterprise: custom</li>
        </ul>
        <p className="mt-2 text-sm">
          Responses include <code>X-RateLimit-*</code> headers.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">SDK (TypeScript)</h2>
        <pre className="overflow-x-auto rounded-lg bg-[var(--color-ink)] p-4 text-xs text-white">
          {`npm install @hyperspeed/sdk

import { Hyperspeed } from '@hyperspeed/sdk'
const client = new Hyperspeed({ apiKey: process.env.HYPERSPEED_API_KEY })
const result = await client.query({ packId, query: '...' })
console.log(result.results)`}
        </pre>
      </section>
    </div>
  )
}
