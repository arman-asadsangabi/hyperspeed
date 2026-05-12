# @hyperspeed/mcp

Model Context Protocol server for Hyperspeed packs. Lets any MCP-aware client (Claude Desktop, Cursor, etc.) call the Hyperspeed runtime API as tools.

## Install

Configure in your client's `mcpServers` block:

```json
{
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
}
```

## Tools

- `query_pack(query, pack_id?, max_results?)` — search pack entries by semantic similarity
- `list_packs()` — show the configured pack IDs and authenticated org

## Environment

- `HYPERSPEED_API_KEY` (required)
- `HYPERSPEED_PACK_IDS` (optional, comma-separated default pack IDs)
- `HYPERSPEED_BASE_URL` (optional, override `https://hyperspeed-api.vercel.app`)
