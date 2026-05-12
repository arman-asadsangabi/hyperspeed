import { z } from 'zod'
import { ENTRY_TYPES } from '@hyperspeed/shared/constants'
import { ANTHROPIC_MODEL, getAnthropic, parseJsonFromResponse } from './anthropic'

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

  const systemPrompt = `You extract structured knowledge from professional documents in the ${params.domain} domain.

Output strict JSON only — no prose, no preamble, no code fences. The output must be a JSON array of objects.

Each object must match this schema:
{
  "entryType": "fact" | "heuristic" | "decision_rule" | "example" | "citation" | "meta_rule",
  "title": "concise title (max 120 chars)",
  "content": "markdown body — concrete, specific, actionable",
  "structuredData": null | object  // optional structured fields per type
  "confidence": "low" | "medium" | "high",
  "sourceExcerpt": "the verbatim passage this came from (max 500 chars)",
  "suggestedTags": ["tag1", "tag2"]
}

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
- Output [] if the document has no extractable expert knowledge.`

  const userPrompt = `Document: ${params.documentName}

Existing entries already in this pack:
${existingSummary}

Document content:
${params.documentText.slice(0, 200_000)}`

  const message = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 8000,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  })

  const text = message.content.map((block) => ('text' in block ? block.text : '')).join('')
  const raw = parseJsonFromResponse<unknown>(text)
  if (!Array.isArray(raw)) throw new Error('Expected a JSON array of entries')

  const parsed: ProposedEntryDraft[] = []
  for (const item of raw) {
    const result = proposedEntrySchema.safeParse(item)
    if (result.success) parsed.push(result.data)
  }
  return parsed
}
