# Hyperspeed — Engineering Context for Claude Code

Persistent context for every Claude Code session in this repo. **Read this first.**
Update it as you finish each phase with new decisions, gotchas, and conventions.

---

## What this is

Hyperspeed is B2B expertise infrastructure for AI companies. Verified domain experts
(CPAs, lawyers, doctors, etc.) package their knowledge into structured "memory packs."
AI companies license those packs via API to inject specialist context into their
agents at runtime.

Business model: enterprise contracts ($50K–$2M ACV) + design partner program
($25–50K co-creation) + runtime API (pay-per-call).

## Build phases

The build runs in 10 stages over multiple sessions:

1. **Foundation** — monorepo, auth, multi-tenancy, audit logging (in progress)
2. **Pack data model** — packs, versions, entries, creator profiles, doc storage
3. **Authoring tools** — editor, AI-assisted ingestion, linting, live preview
4. **Eval pipeline** — test sets, judge, eval-gated publishing
5. **Runtime API** — query endpoint, embeddings, SDK, billing
6. **Enterprise console** — licensing, SSO, usage analytics
7. **Design partners** — application, project workspace, custom delivery
8. **Creator pipeline** — invite-only onboarding, Connect payouts
9. **MCP server** — pack resources/tools exposed via MCP
10. **Production readiness** — SOC 2, HIPAA, observability, load testing

Current state: **Phase 1.1 (monorepo scaffolding) complete.** Phase 1.2 (Supabase
schema + auth) blocked on user creating Supabase project.

## Architecture (high level)

```
apps/web      Next.js 15 marketing site, creator portal, enterprise console
apps/api      Hono API (deployed to Vercel) — runtime query endpoint lives here
packages/db   Drizzle ORM schema, client, migrations
packages/shared  Types, Zod schemas, brand constants, shared utils
packages/eval Eval pipeline + Anthropic/OpenAI client wrappers (Stage 4)
```

apps/web and apps/api consume packages as TypeScript source (no build step
between workspace packages — Next.js transpiles via `transpilePackages`, Hono
runs via `tsx`).

## Tech stack

| Concern        | Choice                          | Why                                                                |
| -------------- | ------------------------------- | ------------------------------------------------------------------ |
| Monorepo       | Turborepo + pnpm 11             | Task graph caching, workspace deps                                 |
| Web app        | Next.js 15 + React 19           | App Router, server components, typed routes                        |
| API runtime    | Hono on Vercel                  | Faster cold starts than Next API routes; same deploy target as web |
| Styling        | Tailwind v4 (CSS-first)         | No JS config file; CSS vars for theme                              |
| UI components  | shadcn/ui (new-york style)      | Owned source, not a black-box dep                                  |
| DB             | Supabase Postgres + pgvector    | Auth + storage + DB + RLS in one (Stage 1.2)                       |
| ORM            | Drizzle                         | SQL-first, type-safe, lightweight                                  |
| Auth           | Supabase Auth (`@supabase/ssr`) | Email + OAuth; defer WorkOS SSO to Stage 6                         |
| Email          | Resend                          | Simple, good DX                                                    |
| AI providers   | Anthropic + OpenAI              | Claude for reasoning/judging; OpenAI for embeds                    |
| Job queue      | Vercel Cron + DB-backed queue   | Defer Inngest until throughput justifies it                        |
| Rate limiting  | Postgres counter table          | Defer Upstash Redis until p95 demands it                           |
| Error tracking | Sentry                          | Added in Stage 2, not 1                                            |

**Deliberately deferred** (don't add until a customer requires it): Inngest,
Upstash Redis, WorkOS SSO, Stripe Connect, Mintlify docs, Vanta/Drata SOC 2
tooling. The plan calls for these eventually; we hold off to keep vendor sprawl
manageable pre-seed.

## Brand

- Primary blue: `#2563EB`
- Deep blue: `#1E40AF`
- Light blue: `#DBEAFE`
- Pale blue: `#EFF6FF`
- Ink (body text): `#0F172A`
- Slate (secondary): `#475569`
- Border: `#CBD5E1`
- Font: Inter (Geist fallback)

Defined in [packages/shared/src/brand.ts](packages/shared/src/brand.ts) and
mirrored as CSS variables in [apps/web/src/app/globals.css](apps/web/src/app/globals.css).

## Architecture principles (non-negotiable)

1. **API-first.** All data access through API endpoints, never direct DB queries
   from web UI. The query endpoint in Stage 5 IS the product.
2. **Multi-tenant from day one.** Every record belongs to an organization;
   queries scope to `organization_id`; RLS enforces it server-side too.
3. **Audit-logged.** Every state change writes an `audit_log` row via the
   `withAudit()` wrapper (see Phase 1.4). Don't bypass it.
4. **Eval-driven.** Every pack version has eval scores. Publishing is gated.
5. **Versioned.** Published pack versions are immutable. New versions = new rows.
6. **RLS-enforced.** Row-Level Security on every table.
7. **Type-safe end to end.** Drizzle types flow into API into UI via shared package.

## Running things

```bash
pnpm install           # install all workspace deps
pnpm dev               # dev mode for all apps (turbo runs them in parallel)
pnpm build             # build everything
pnpm typecheck         # tsc --noEmit across all packages
pnpm lint              # eslint across all packages
pnpm format            # prettier --write
pnpm format:check      # prettier --check (run in CI)
```

Per-package dev:

```bash
pnpm --filter @hyperspeed/web dev    # web only on :3000
pnpm --filter @hyperspeed/api dev    # api only on :3001
```

Claude Code preview servers (different ports to avoid colliding with `~/hyperspeed-landing`):

- `hyperspeed-monorepo-web` on `:3010`
- `hyperspeed-monorepo-api` on `:3011`

Both configured in `~/.claude/launch.json` (user-level, not project-level).

## Commit conventions

Conventional Commits, enforced via commitlint pre-commit hook:

```
feat(scope): add new feature
fix(scope): fix bug
docs(scope): update docs
refactor(scope): refactor code
chore(scope): housekeeping
ci(scope): CI changes
test(scope): tests
```

Scopes used so far: `repo`, `web`, `api`, `db`, `shared`, `eval`, `ci`.

## Multi-tenancy (Phase 1.3 — pending)

Pattern:

- User has an active org cookie (`hyperspeed_org_id`).
- API middleware reads cookie, verifies session + membership, attaches
  `{ user, organization, role }` to context.
- Every query MUST filter on `organization_id`. Never trust client-supplied IDs.
- Use `requirePermission('admin' | 'owner')` helper for protected routes.

## Audit logging (Phase 1.4 — pending)

```ts
const updatedPack = await withAudit(
  ctx,
  'pack',
  packId,
  'updated',
  () => db.update(packs).set({ name }).where(...).returning(),
  { beforeState: existingPack, getAfterState: (r) => r[0] },
)
```

Wrap every mutation. Audit fires even if the operation throws (with the
attempted-state captured). Don't bypass it.

## Conventions

- TS strict mode + `noUncheckedIndexedAccess` + `verbatimModuleSyntax`.
- No `.ts` extensions in import specifiers (bundler resolution handles it).
- `pnpm` workspace deps: `"@hyperspeed/foo": "workspace:*"`.
- Errors from API endpoints use the envelope: `{ error: { code, message } }`.
- Zod schemas live in `packages/shared/src/schemas.ts` and are shared between
  web and api.

## Things known to break / gotchas

- **Vercel cold starts** will fight the < 200ms p95 target in Stage 5. If
  measurements come in over budget, move the query endpoint to Edge Runtime
  (Hono works there) before considering a different platform.
- **The user's `~/hyperspeed-landing`** is a separate older project; the
  preview tool defaulted to it because of `~/.claude/launch.json`. We added new
  entries with `hyperspeed-monorepo-*` names to avoid collisions.
- **Drizzle + Supabase pooler**: use port 6543 (pooler, `prepare: false`) for
  application queries; use port 5432 (direct) only for `drizzle-kit` migrations.

## What's blocked on the user

- Supabase project creation (Phase 1.2)
- GitHub remote (manual `gh repo create` or web UI)
- Vercel project deploy (needs Vercel CLI login + GitHub auth)
- Anthropic + OpenAI + Resend API keys (Phases 2.4 / 3.2 / 4 / 5)

## Decision log

- **2026-05-11** — Chose Hono on Vercel over two-Next.js-apps. Hono runs as a
  Vercel function via `hono/vercel` adapter. Keeps deployment uniform, gets
  faster cold starts than Next.js API routes, and gives us a path to Edge
  Runtime if Stage 5 latency demands it.
- **2026-05-11** — Deferred Inngest, Upstash, WorkOS, Sentry from Stage 1.
  Each will get added when its specific failure mode (job queue scaling, rate
  limit hot paths, enterprise SSO, error volume) actually appears.
- **2026-05-11** — Tailwind v4 (beta) chosen over v3. CSS-first config is
  simpler for a multi-app monorepo and works fine with shadcn/ui.
