import { z } from 'zod'
import { ENTRY_TYPES } from '@hyperspeed/shared/constants'
import { ANTHROPIC_MODEL, getAnthropic } from './anthropic'

const proposedEntrySchema = z.object({
  entryType: z.enum(ENTRY_TYPES),
  title: z.string().min(1).max(280),
  content: z.string().min(1).max(50000),
  structuredData: z.record(z.unknown()).optional().nullable(),
  confidence: z.enum(['low', 'medium', 'high']).default('medium'),
  sourceExcerpt: z.string().max(2000).optional(),
  suggestedTags: z.array(z.string()).default([]),
})

export type ProposedEntryDraft = z.infer<typeof proposedEntrySchema>

export interface ExtractParams {
  domain: string
  documentText: string
  documentName: string
  existingEntries: { entryType: string; title: string }[]
  maxEntries?: number
}

export async function extractPackEntries(params: ExtractParams): Promise<ProposedEntryDraft[]> {
  const client = getAnthropic()
  const max = params.maxEntries ?? 25

  const existingSummary =
    params.existingEntries.length > 0
      ? params.existingEntries
          .slice(0, 50)
          .map((e) => `- (${e.entryType}) ${e.title}`)
          .join('\n')
      : '(none)'

  const systemPrompt = `You extract structured knowledge from professional documents in the ${params.domain} domain. Call the record_entries tool exactly once with all extracted entries.

Entry-type guide:
- fact: a specific true statement (numbers, dates, definitions)
- heuristic: a rule of thumb (if-then with confidence)
- decision_rule: a structured branching procedure
- example: a worked scenario with reasoning
- citation: a source reference (use sourceExcerpt as the cited passage)
- meta_rule: a scope/disclaimer/escalation rule

Quality rules:
- Each entry must add information that's NOT already in the existing entries list.
- Be specific: prefer "$1.16M for 2026" over "the deduction limit". Quote numbers and dates exactly.
- Skip prose-only paragraphs that don't translate into a fact/rule/example.
- Aim for ${max} entries or fewer. Quality > quantity.
- Pass entries: [] if the document has no extractable expert knowledge.`

  const userPrompt = `Document: ${params.documentName}

Existing entries already in this pack:
${existingSummary}

Document content:
${params.documentText.slice(0, 200_000)}`

  // Streaming is required when max_tokens × estimated generation time exceeds
  // Anthropic's 10-min precheck threshold. 32k output tokens × dense input
  // trips it. Streaming avoids the precheck and lets the SDK accumulate the
  // tool_use input as it arrives.
  const stream = client.messages.stream({
    model: ANTHROPIC_MODEL,
    max_tokens: 32000,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [
      {
        name: 'record_entries',
        description: 'Record the extracted pack entries from the document.',
        input_schema: {
          type: 'object',
          properties: {
            entries: {
              type: 'array',
              description: 'List of extracted knowledge entries.',
              items: {
                type: 'object',
                properties: {
                  entryType: {
                    type: 'string',
                    enum: [...ENTRY_TYPES],
                    description: 'Type of entry.',
                  },
                  title: {
                    type: 'string',
                    description: 'Concise title, max 120 chars.',
                  },
                  content: {
                    type: 'string',
                    description: 'Markdown body — concrete, specific, actionable.',
                  },
                  structuredData: {
                    type: ['object', 'null'],
                    description: 'Optional structured fields per type.',
                  },
                  confidence: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    description: 'Confidence level for this entry.',
                  },
                  sourceExcerpt: {
                    type: 'string',
                    description: 'Verbatim passage this came from (max 500 chars).',
                  },
                  suggestedTags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Tags suggested for this entry.',
                  },
                },
                required: ['entryType', 'title', 'content', 'confidence', 'suggestedTags'],
              },
            },
          },
          required: ['entries'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'record_entries' },
    messages: [{ role: 'user', content: userPrompt }],
  })
  const message = await stream.finalMessage()

  // The model is forced to call record_entries — the tool_use block contains validated JSON.
  const toolUse = message.content.find((b) => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') {
    throw new Error('Model did not call record_entries')
  }
  if (message.stop_reason === 'max_tokens') {
    throw new Error(
      'Extraction hit the max_tokens cap before the tool call could finish. Document is too dense — split it into smaller files and re-ingest.',
    )
  }
  const input = toolUse.input as { entries?: unknown }
  const raw = Array.isArray(input.entries) ? input.entries : []

  const parsed: ProposedEntryDraft[] = []
  for (const item of raw) {
    const result = proposedEntrySchema.safeParse(item)
    if (result.success) parsed.push(result.data)
  }
  return parsed
}
