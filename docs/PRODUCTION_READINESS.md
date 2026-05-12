# Production readiness (Stage 10)

This doc tracks the pre-launch checklist for SOC 2 Type II, HIPAA, and operational
readiness. Most items are _operational/contractual_ rather than code; this file lives
in the repo so reviews can verify the platform side is in place.

## Code-level controls (in place)

- **Encryption at rest** — Supabase Postgres + Storage encrypt at rest by default.
- **TLS 1.3** — Vercel default for all routes; HTTPS enforced.
- **RLS on every table** — see migrations `0001`, `0003`, `0005`, `0008`, `0010`,
  `0012`, `0014`, `0016`. Every public table has `ENABLE + FORCE ROW LEVEL SECURITY`.
- **API keys** — SHA-256 + 16-byte salt hashing (`apps/api/src/lib/bcrypt.ts`); raw
  key shown ONCE on creation, never recoverable. Per-key revocation.
- **Audit log** — every state-changing mutation flows through `withAudit()` (Phase 1.4).
  No INSERT/UPDATE/DELETE RLS policies on `audit_log` — service-role-only writes.
- **Multi-tenant isolation** — `requireOrgContext()` + `is_member_of()` /
  `has_role_at_least()` SECURITY DEFINER helpers prevent cross-org leaks at both the
  app layer and the DB layer.
- **Immutable published versions** — DB trigger (`pack_versions_immutable`,
  `pack_entries_immutable_iud`) blocks mutations on `status = 'published'` rows.
- **Eval-gated publishing** — `publishVersion` calls `checkEvalGate` which enforces
  overall ≥ 75 and per-dimension thresholds (Phase 4.4).

## Operational items still to configure

| Item                                                    | When                            | Owner              |
| ------------------------------------------------------- | ------------------------------- | ------------------ |
| Sentry DSN env var                                      | Before first customer           | Eng                |
| Vanta or Drata onboarding                               | Pre-seed close                  | Founders           |
| Information security policy doc                         | SOC 2 Type II prep              | Founders + counsel |
| Incident response runbook                               | Before public launch            | Eng                |
| Change management process (PR review SLA, deploy gates) | Before public launch            | Eng                |
| Access review cadence (monthly)                         | SOC 2 Type II prep              | Founders           |
| HIPAA BAA template                                      | First healthcare design partner | Counsel            |
| Designated security officer (named in code/RACI)        | SOC 2 Type II prep              | Founders           |
| Data retention policy per pack category                 | Before public launch            | Counsel + Eng      |

## Observability

- `apps/web/src/lib/observability.ts` exposes `captureException` and
  `captureBreadcrumb` — no-op until `SENTRY_DSN` is set, then lazy-loads
  `@sentry/nextjs`.
- Vercel built-in analytics provides p50/p95 latency, error rate, request volume.
- Status page lives at `/status` — probes API health + DB connectivity on each load.

## Scheduled jobs (Vercel Cron)

Configured in `apps/web/vercel.json`:

- `*/15 * * * *` — `/api/cron/embed-backfill` (Phase 5.3): embed new pack entries
  via OpenAI; gracefully skips when `OPENAI_API_KEY` missing.
- `0 2 * * 0` — `/api/cron/eval-drift` (Phase 4.5): re-runs canonical test sets
  weekly and flags packs whose overall score dropped > 5 points.
- `0 6 1 * *` — `/api/cron/creator-payouts` (Phase 8.2): monthly aggregation of
  `creator_revenue_events` into pending `creator_payouts` rows. Stripe Connect
  transfer step runs when `STRIPE_SECRET_KEY` is configured.

All crons require `Authorization: Bearer ${CRON_SECRET}` — Vercel auto-sets this.

## Load testing checklist (pre-launch)

- [ ] k6 / Artillery soak test: 50 RPS sustained for 6 hours
- [ ] Spike test: 0 → 1000 RPS in 30s
- [ ] pgvector HNSW recall validation (ef_search tuning vs. latency)
- [ ] PgBouncer / pooler limits exercised
- [ ] CDN cache hit rate for static pack metadata

## Customer success runbook

- Internal admin pages live under `/dashboard/admin/*` (gated on
  `users.is_platform_admin`). Today: credential review, application queue,
  creator invitations. Add a `/dashboard/admin/customers` health-score view in
  the same pattern when the first paying customer signs.
