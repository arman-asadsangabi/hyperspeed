# Hyperspeed

B2B expertise infrastructure for AI companies.

Verified domain experts package their knowledge into structured memory packs.
AI companies license those packs via API to inject specialist context into
their agents at runtime.

## Status

Pre-launch. Phase 1.1 (monorepo scaffolding) complete. See [CLAUDE.md](CLAUDE.md)
for the full engineering context and current build phase.

## Quickstart

```bash
pnpm install
pnpm dev
```

- Web app: http://localhost:3000
- API: http://localhost:3001/health

## Repo layout

```
apps/
  web/        Next.js 15 marketing site, creator portal, enterprise console
  api/        Hono API (Vercel) — runtime query endpoint
packages/
  shared/     Types, Zod schemas, brand constants
  db/         Drizzle schema and client (Supabase Postgres)
  eval/       Eval pipeline (Stage 4)
```

## Scripts

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `pnpm dev`          | Run all apps in dev mode in parallel  |
| `pnpm build`        | Build all apps                        |
| `pnpm typecheck`    | TypeScript checks across all packages |
| `pnpm lint`         | ESLint across all packages            |
| `pnpm format`       | Prettier write                        |
| `pnpm format:check` | Prettier check (used in CI)           |

## Environment

Copy `.env.example` to `.env.local` in each app and fill in values. See
[CLAUDE.md](CLAUDE.md#what's-blocked-on-the-user) for required external services.

## License

UNLICENSED — proprietary. Not for redistribution.
