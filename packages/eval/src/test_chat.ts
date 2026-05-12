import { ANTHROPIC_MODEL, getAnthropic } from './anthropic'

export interface PackEntryForChat {
  id: string
  entryType: string
  title: string
  content: string
}

export interface TestChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface TestChatResult {
  reply: string
  citedEntryIds: string[]
}

/**
 * Run a single turn of the pack-test chat. The pack entries are stuffed into
 * the system prompt and Claude is asked to cite them via [entry:UUID] tags.
 */
export async function runPackChatTurn(params: {
  domain: string
  entries: PackEntryForChat[]
  history: TestChatTurn[]
  message: string
}): Promise<TestChatResult> {
  const client = getAnthropic()

  const entryBundle =
    params.entries.length === 0
      ? '(this pack has no entries yet)'
      : params.entries
          .slice(0, 200)
          .map(
            (e) =>
              `<entry id="${e.id}" type="${e.entryType}">\n<title>${e.title}</title>\n<content>${e.content}</content>\n</entry>`,
          )
          .join('\n\n')

  const systemPrompt = `You are a specialist in ${params.domain}. Answer the user's question using ONLY the pack entries below — if the pack doesn't cover something, say so clearly and don't fall back to general knowledge.

When you use information from a specific entry, cite it inline as [entry:<id>]. Cite every claim that came from an entry.

Pack entries:
${entryBundle}`

  const message = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 1500,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      ...params.history.map((t) => ({ role: t.role, content: t.content })),
      { role: 'user' as const, content: params.message },
    ],
  })

  const reply = message.content.map((b) => ('text' in b ? b.text : '')).join('')
  const cited = new Set<string>()
  for (const m of reply.matchAll(/\[entry:([a-f0-9-]{36})\]/g)) {
    cited.add(m[1]!)
  }
  return { reply, citedEntryIds: [...cited] }
}
