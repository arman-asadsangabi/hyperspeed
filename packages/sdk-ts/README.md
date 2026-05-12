# @hyperspeed/sdk

TypeScript SDK for the Hyperspeed runtime API.

## Install

```bash
npm install @hyperspeed/sdk
# or pnpm / yarn / bun
```

## Quickstart

```ts
import { Hyperspeed } from '@hyperspeed/sdk'

const client = new Hyperspeed({ apiKey: process.env.HYPERSPEED_API_KEY! })

const result = await client.query({
  packId: 'pack_abc',
  query: 'What is the Section 179 deduction limit in 2026?',
  maxResults: 5,
})

for (const entry of result.results) {
  console.log(`${entry.title} (relevance ${entry.relevanceScore})`)
  console.log(entry.content)
}
```

## Multi-pack query

```ts
await client.query({
  packId: ['pack_tax_v2', 'pack_legal_v1'],
  query: '...',
})
```

## Configuration

```ts
new Hyperspeed({
  apiKey: '...',
  baseUrl: 'https://api.hyperspeed.dev', // override default
  maxRetries: 5,
  timeoutMs: 60_000,
  onRequest: ({ endpoint, status, latencyMs, attempt }) => {
    console.log(`${endpoint} → ${status} in ${latencyMs}ms (attempt ${attempt})`)
  },
})
```

## Errors

All non-2xx responses throw `HyperspeedError` with `status`, `code`, and `message`. 5xx and 429
errors are auto-retried with exponential backoff.

## Auth verification

```ts
const me = await client.me()
console.log(me.organization.name, me.apiKey.tier)
```
