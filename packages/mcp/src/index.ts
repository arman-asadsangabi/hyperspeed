/**
 * Hyperspeed MCP server. Exposes the runtime query API as:
 *   - Tool: query_pack(query, max_results?) — returns ranked entries
 *   - Tool: list_packs() — returns accessible packs
 *
 * Usage from a client (e.g. Claude Desktop config):
 *
 *   {
 *     "mcpServers": {
 *       "hyperspeed": {
 *         "command": "npx",
 *         "args": ["-y", "@hyperspeed/mcp"],
 *         "env": {
 *           "HYPERSPEED_API_KEY": "hsk_live_..."
 *         }
 *       }
 *     }
 *   }
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { Hyperspeed } from '@hyperspeed/sdk'

export interface ServerOptions {
  apiKey: string
  packIds?: string[]
  baseUrl?: string
}

export function createServer(options: ServerOptions): Server {
  const client = new Hyperspeed({ apiKey: options.apiKey, baseUrl: options.baseUrl })

  const server = new Server(
    { name: '@hyperspeed/mcp', version: '0.0.1' },
    { capabilities: { tools: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: [
      {
        name: 'query_pack',
        description:
          'Search Hyperspeed pack entries by semantic similarity. Returns ranked entries with content, type, citations, and relevance scores. Use this whenever you need authoritative domain expertise.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The question or topic to search for' },
            pack_id: {
              type: 'string',
              description: 'Specific pack ID to search; omit to use the default-configured pack',
            },
            max_results: {
              type: 'integer',
              description: 'Max number of entries to return (default 5, max 50)',
              minimum: 1,
              maximum: 50,
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'list_packs',
        description: 'List packs accessible to the configured API key',
        inputSchema: { type: 'object', properties: {} },
      },
    ],
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name
    const args = (request.params.arguments ?? {}) as Record<string, unknown>

    if (name === 'query_pack') {
      const query = typeof args.query === 'string' ? args.query : ''
      // Default to querying every configured pack — lets users add packs to
      // HYPERSPEED_PACK_IDS without per-call routing. Specific pack still wins
      // when passed in args.
      const packId: string | string[] | undefined =
        typeof args.pack_id === 'string'
          ? args.pack_id
          : options.packIds && options.packIds.length > 0
            ? options.packIds
            : undefined
      const maxResults = typeof args.max_results === 'number' ? args.max_results : 5
      if (!packId)
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: 'No pack_id provided and no default configured. Pass pack_id explicitly.',
            },
          ],
        }
      const result = await client.query({ packId, query, maxResults })
      const formatted =
        result.results
          .map(
            (r: (typeof result.results)[number], i: number) =>
              `[${i + 1}] (${r.entryType}, relevance ${r.relevanceScore.toFixed(2)})\n${r.title}\n${r.content}`,
          )
          .join('\n\n---\n\n') || '(no results)'
      return { content: [{ type: 'text', text: formatted }] }
    }

    if (name === 'list_packs') {
      const me = await client.me()
      return {
        content: [
          {
            type: 'text',
            text: `Authenticated as ${me.organization.name}. Configured pack IDs: ${
              (options.packIds ?? []).join(', ') || 'none — pass pack_id explicitly'
            }.`,
          },
        ],
      }
    }

    return {
      isError: true,
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
    }
  })

  return server
}

export async function runStdio(options: ServerOptions): Promise<void> {
  const server = createServer(options)
  const transport = new StdioServerTransport()
  await server.connect(transport)
}
