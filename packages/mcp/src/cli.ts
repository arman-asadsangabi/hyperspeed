#!/usr/bin/env node
import { runStdio } from './index'

const apiKey = process.env.HYPERSPEED_API_KEY
if (!apiKey) {
  console.error('HYPERSPEED_API_KEY env var is required')
  process.exit(1)
}

const packIds = process.env.HYPERSPEED_PACK_IDS?.split(',')
  .map((s) => s.trim())
  .filter(Boolean)
const baseUrl = process.env.HYPERSPEED_BASE_URL

runStdio({ apiKey, packIds, baseUrl }).catch((err) => {
  console.error('MCP server failed:', err)
  process.exit(1)
})
