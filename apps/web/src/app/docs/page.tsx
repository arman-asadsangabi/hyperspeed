import Link from 'next/link'
import { BRAND } from '@hyperspeed/shared/brand'

export const dynamic = 'force-static'

const API_URL =
  process.env.NEXT_PUBLIC_API_APP_URL ?? process.env.API_APP_URL ?? 'https://api.hyperspeed.work'

export const metadata = {
  title: 'Docs — Hyperspeed',
  description: 'Authentication, endpoints, SDK, MCP server, and concepts.',
}

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-[var(--color-border-base)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-[var(--color-primary)]" aria-hidden />
            <span className="font-semibold tracking-tight text-[var(--color-ink)]">
              {BRAND.name}
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm text-[var(--color-slate-soft)]">
            <Link href="/docs" className="font-medium text-[var(--color-ink)]">
              Docs
            </Link>
            <Link href="/sign-in" className="hover:text-[var(--color-ink)]">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md bg-[var(--color-primary)] px-3.5 py-1.5 text-white shadow-sm transition hover:bg-[var(--color-primary-deep)]"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-12 space-y-6 text-sm">
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--color-slate-soft)]">
                Getting started
              </div>
              <ul className="space-y-1.5">
                <li>
                  <a
                    className="text-[var(--color-ink)] hover:text-[var(--color-primary)]"
                    href="#overview"
                  >
                    Overview
                  </a>
                </li>
                <li>
                  <a
                    className="text-[var(--color-ink)] hover:text-[var(--color-primary)]"
                    href="#quickstart"
                  >
                    Quickstart
                  </a>
                </li>
                <li>
                  <a
                    className="text-[var(--color-ink)] hover:text-[var(--color-primary)]"
                    href="#concepts"
                  >
                    Concepts
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--color-slate-soft)]">
                API reference
              </div>
              <ul className="space-y-1.5">
                <li>
                  <a
                    className="text-[var(--color-ink)] hover:text-[var(--color-primary)]"
                    href="#auth"
                  >
                    Authentication
                  </a>
                </li>
                <li>
                  <a
                    className="text-[var(--color-ink)] hover:text-[var(--color-primary)]"
                    href="#query"
                  >
                    POST /v1/query
                  </a>
                </li>
                <li>
                  <a
                    className="text-[var(--color-ink)] hover:text-[var(--color-primary)]"
                    href="#me"
                  >
                    GET /v1/me
                  </a>
                </li>
                <li>
                  <a
                    className="text-[var(--color-ink)] hover:text-[var(--color-primary)]"
                    href="#rate-limits"
                  >
                    Rate limits
                  </a>
                </li>
                <li>
                  <a
                    className="text-[var(--color-ink)] hover:text-[var(--color-primary)]"
                    href="#errors"
                  >
                    Errors
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--color-slate-soft)]">
                SDKs
              </div>
              <ul className="space-y-1.5">
                <li>
                  <a
                    className="text-[var(--color-ink)] hover:text-[var(--color-primary)]"
                    href="#sdk-ts"
                  >
                    TypeScript SDK
                  </a>
                </li>
                <li>
                  <a
                    className="text-[var(--color-ink)] hover:text-[var(--color-primary)]"
                    href="#mcp"
                  >
                    MCP server
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--color-slate-soft)]">
                Authoring
              </div>
              <ul className="space-y-1.5">
                <li>
                  <a
                    className="text-[var(--color-ink)] hover:text-[var(--color-primary)]"
                    href="#packs"
                  >
                    Pack lifecycle
                  </a>
                </li>
                <li>
                  <a
                    className="text-[var(--color-ink)] hover:text-[var(--color-primary)]"
                    href="#eval"
                  >
                    Evaluation gates
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </aside>

        <article className="space-y-12">
          <section id="overview">
            <p className="text-sm font-medium uppercase tracking-wider text-[var(--color-primary-deep)]">
              Documentation
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--color-ink)]">
              Build with Hyperspeed
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-[var(--color-slate-soft)]">
              Hyperspeed is expertise infrastructure for AI companies. Verified domain experts
              package their knowledge into structured memory packs. Your agents query those packs at
              runtime to inject specialist context.
            </p>
          </section>

          <section id="quickstart" className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              Quickstart
            </h2>
            <ol className="list-inside list-decimal space-y-3 text-sm text-[var(--color-ink)]">
              <li>
                <Link className="text-[var(--color-primary)] underline" href="/sign-up">
                  Create an account
                </Link>{' '}
                and an organization.
              </li>
              <li>
                License a pack from the catalog (or co-create one through the{' '}
                <Link className="text-[var(--color-primary)] underline" href="/design-partners">
                  design partner program
                </Link>
                ).
              </li>
              <li>
                Generate an API key in{' '}
                <span className="font-mono text-xs">Dashboard → API → Keys</span>. Each key is shown{' '}
                <em>once</em>; save it in a secret manager.
              </li>
              <li>POST your first query (see below).</li>
            </ol>
          </section>

          <section id="concepts" className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              Concepts
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Concept term="Pack">
                A container of structured expert knowledge for a domain (tax, legal, medical, etc.).
                Packs are versioned and immutable once published.
              </Concept>
              <Concept term="Entry">
                One unit of knowledge inside a pack. Six types: fact, heuristic, decision_rule,
                example, citation, meta_rule.
              </Concept>
              <Concept term="Version">
                A snapshot of pack entries. States: draft → in_review → published → archived.
                Published versions can&apos;t be edited.
              </Concept>
              <Concept term="License">
                A grant from a pack creator (licensor) to a customer (licensee) to query the pack at
                runtime. Tracks limits, expiration, and SLA tier.
              </Concept>
              <Concept term="Eval gate">
                Every version must pass an automated eval (overall ≥ 75, accuracy ≥ 80, citation
                coverage ≥ 60) before it can be published.
              </Concept>
              <Concept term="Credential">
                A verified attestation of a creator&apos;s expertise (CPA license, MD, JD, etc.).
                Authoring a pack requires at least one verified credential.
              </Concept>
            </dl>
          </section>

          <section id="auth" className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              Authentication
            </h2>
            <p className="text-sm text-[var(--color-ink)]">
              Every request must include a Bearer token in the <code>Authorization</code> header.
            </p>
            <Code>{`Authorization: Bearer hsk_live_aB7xK9...`}</Code>
            <p className="text-sm text-[var(--color-slate-soft)]">
              Keys are organization-scoped. Revoking a key (Dashboard → API → Keys → Revoke) takes
              effect within seconds.
            </p>
          </section>

          <section id="query" className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              POST /v1/query
            </h2>
            <p className="text-sm text-[var(--color-ink)]">
              Search pack entries by semantic similarity. Returns ranked entries with relevance
              scores. Multi-pack queries are supported via an array.
            </p>
            <h3 className="text-sm font-semibold text-[var(--color-ink)]">Request</h3>
            <Code>{`POST ${API_URL}/v1/query
Content-Type: application/json
Authorization: Bearer hsk_live_...

{
  "pack_id": "<uuid>",          // or [<uuid>, <uuid>, ...]
  "query": "What is the Section 179 limit for 2026?",
  "max_results": 5,             // optional, default 5, max 50
  "context": "...",             // optional, surrounding context
  "include_citations": true,    // optional, default true
  "include_metadata": true      // optional, default true
}`}</Code>
            <h3 className="text-sm font-semibold text-[var(--color-ink)]">Response</h3>
            <Code>{`{
  "query_id": "<uuid>",
  "results": [
    {
      "entry_id": "<uuid>",
      "entry_type": "fact",
      "title": "Section 179 limit 2026",
      "content": "In 2026 the limit is $1.16M ...",
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
}`}</Code>
          </section>

          <section id="me" className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              GET /v1/me
            </h2>
            <p className="text-sm text-[var(--color-ink)]">
              Returns the organization and API key associated with the request. Useful for debugging
              which key is being used.
            </p>
            <Code>{`GET ${API_URL}/v1/me
Authorization: Bearer hsk_live_...

→ {
  "organization": { "id": "...", "name": "Acme Corp", "slug": "acme" },
  "api_key": { "id": "...", "name": "Production", "tier": "startup", "scopes": [...], "prefix": "hsk_live_aB" }
}`}</Code>
          </section>

          <section id="rate-limits" className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              Rate limits
            </h2>
            <p className="text-sm text-[var(--color-ink)]">
              Enforced per organization. Response headers include
              <code className="rounded bg-[var(--color-primary-pale)] px-1">X-RateLimit-Limit</code>
              ,
              <code className="rounded bg-[var(--color-primary-pale)] px-1">
                X-RateLimit-Remaining
              </code>
              , and{' '}
              <code className="rounded bg-[var(--color-primary-pale)] px-1">X-RateLimit-Reset</code>
              .
            </p>
            <div className="overflow-hidden rounded-lg border border-[var(--color-border-base)] bg-white">
              <table className="w-full text-sm">
                <thead className="border-b border-[var(--color-border-base)] bg-[var(--color-primary-pale)]">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                      Tier
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                      Per minute
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-[var(--color-slate-soft)]">
                      Per day
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { t: 'Free', m: '100', d: '10,000' },
                    { t: 'Startup', m: '1,000', d: '1,000,000' },
                    { t: 'Enterprise', m: 'custom', d: 'custom' },
                  ].map((r) => (
                    <tr key={r.t} className="border-t border-[var(--color-border-base)]">
                      <td className="px-4 py-2 text-[var(--color-ink)]">{r.t}</td>
                      <td className="px-4 py-2 text-[var(--color-slate-soft)]">{r.m}</td>
                      <td className="px-4 py-2 text-[var(--color-slate-soft)]">{r.d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section id="errors" className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              Error envelope
            </h2>
            <p className="text-sm text-[var(--color-ink)]">
              All errors return a consistent envelope with a stable <code>code</code> string and a
              human-readable <code>message</code>.
            </p>
            <Code>{`{ "error": { "code": "rate_limit_minute", "message": "Rate limit (100/min) exceeded" } }`}</Code>
            <p className="text-sm text-[var(--color-slate-soft)]">
              Common codes: <code>missing_auth</code>, <code>invalid_key</code>,{' '}
              <code>forbidden</code>, <code>not_found</code>, <code>rate_limit_minute</code>,{' '}
              <code>rate_limit_day</code>, <code>invalid_request</code>,{' '}
              <code>internal_server_error</code>.
            </p>
          </section>

          <section id="sdk-ts" className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              TypeScript SDK
            </h2>
            <Code>{`npm install @hyperspeed/sdk
# or pnpm add @hyperspeed/sdk

import { Hyperspeed } from '@hyperspeed/sdk'

const client = new Hyperspeed({ apiKey: process.env.HYPERSPEED_API_KEY! })

const result = await client.query({
  packId: 'pack_abc',
  query: 'What is the Section 179 limit for 2026?',
  maxResults: 5,
})

for (const entry of result.results) {
  console.log(entry.title, entry.relevanceScore)
}`}</Code>
            <p className="text-sm text-[var(--color-slate-soft)]">
              Includes automatic exponential-backoff retry on 5xx + 429, per-request timeouts via
              AbortController, and an <code>onRequest</code> observability hook. Throws{' '}
              <code>HyperspeedError</code> on non-2xx responses with <code>status</code> /{' '}
              <code>code</code> / <code>message</code>.
            </p>
          </section>

          <section id="mcp" className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              MCP server
            </h2>
            <p className="text-sm text-[var(--color-ink)]">
              Drop Hyperspeed into any Model Context Protocol client (Claude Desktop, Cursor, etc.)
              as a tool provider.
            </p>
            <Code>{`{
  "mcpServers": {
    "hyperspeed": {
      "command": "npx",
      "args": ["-y", "@hyperspeed/mcp"],
      "env": {
        "HYPERSPEED_API_KEY": "hsk_live_...",
        "HYPERSPEED_PACK_IDS": "pack_uuid_1,pack_uuid_2"
      }
    }
  }
}`}</Code>
            <p className="text-sm text-[var(--color-slate-soft)]">
              Exposes two tools: <code>query_pack(query, pack_id?, max_results?)</code> and{' '}
              <code>list_packs()</code>.
            </p>
          </section>

          <section id="packs" className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              Pack lifecycle
            </h2>
            <p className="text-sm text-[var(--color-ink)]">
              Creators (with at least one verified credential) author packs through the dashboard
              editor. Each pack has versions that move through this state machine:
            </p>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {['draft', 'in_review', 'published', 'archived'].map((s, i, arr) => (
                <span key={s} className="flex items-center gap-2">
                  <code className="rounded-full bg-[var(--color-primary-pale)] px-3 py-1 text-[var(--color-primary-deep)]">
                    {s}
                  </code>
                  {i < arr.length - 1 ? (
                    <span className="text-[var(--color-slate-soft)]">→</span>
                  ) : null}
                </span>
              ))}
            </div>
            <p className="text-sm text-[var(--color-slate-soft)]">
              <strong>Published versions are immutable.</strong> Database triggers block any edit.
              To revise, open a new draft (patch / minor / major) — entries are copied from the
              latest published version and re-published after a fresh eval.
            </p>
          </section>

          <section id="eval" className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
              Evaluation gates
            </h2>
            <p className="text-sm text-[var(--color-ink)]">
              Every version must pass eval thresholds before it can be published. We run the version
              against a canonical test set (15 cases per domain for tax / legal / medical) using
              Claude as a judge across four dimensions:
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { d: 'Accuracy', t: '≥ 80', desc: 'Are stated facts correct?' },
                { d: 'Citation coverage', t: '≥ 60', desc: 'Are claims backed by sources?' },
                { d: 'Hallucination rate', t: '≤ 10', desc: 'Inverse — lower is better.' },
                { d: 'Response quality', t: '≥ 70', desc: 'Useful, structured, complete?' },
              ].map((d) => (
                <div
                  key={d.d}
                  className="rounded-lg border border-[var(--color-border-base)] bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[var(--color-ink)]">{d.d}</span>
                    <span className="font-mono text-xs text-[var(--color-primary-deep)]">
                      {d.t}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--color-slate-soft)]">{d.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-[var(--color-slate-soft)]">
              Overall score must be ≥ 75. Continuous eval re-runs weekly and flags packs whose score
              drops more than 5 points.
            </p>
          </section>

          <div className="border-t border-[var(--color-border-base)] pt-8 text-sm text-[var(--color-slate-soft)]">
            Need something not covered here? Email{' '}
            <a
              className="text-[var(--color-primary)] underline"
              href="mailto:hyperspeedsolutions@gmail.com"
            >
              hyperspeedsolutions@gmail.com
            </a>
            .
          </div>
        </article>
      </div>

      <footer className="border-t border-[var(--color-border-base)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm text-[var(--color-slate-soft)]">
          <span>
            &copy; {new Date().getFullYear()} {BRAND.name}
          </span>
          <Link href="/status" className="hover:text-[var(--color-ink)]">
            Status
          </Link>
        </div>
      </footer>
    </main>
  )
}

function Concept({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--color-border-base)] bg-white p-4">
      <dt className="text-sm font-semibold text-[var(--color-ink)]">{term}</dt>
      <dd className="mt-1 text-sm text-[var(--color-slate-soft)]">{children}</dd>
    </div>
  )
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-[var(--color-ink)] p-4 text-xs leading-relaxed text-white">
      <code>{children}</code>
    </pre>
  )
}
