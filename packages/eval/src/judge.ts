import { z } from 'zod'
import { ANTHROPIC_JUDGE_MODEL, getAnthropic, parseJsonFromResponse } from './anthropic'

export const judgeScoreSchema = z.object({
  accuracy: z.number().min(0).max(100),
  citation_coverage: z.number().min(0).max(100),
  hallucination_rate: z.number().min(0).max(100),
  response_quality: z.number().min(0).max(100),
  reasoning: z.string().max(2000),
})
export type JudgeScores = z.infer<typeof judgeScoreSchema>

export interface JudgeParams {
  domain: string
  prompt: string
  expectedTopics: string[]
  expectedCitations: string[]
  response: string
  citationsUsed: string[]
}

const SYSTEM_PROMPT = (domain: string) => `You evaluate an AI response in the ${domain} field.

Score on four dimensions (0-100 each):
1. ACCURACY: Are the stated facts correct for this domain? Penalize hallucinations heavily. 100 = every claim is correct.
2. CITATION_COVERAGE: Are claims backed by appropriate sources/entries? 100 = every non-trivial claim is cited.
3. HALLUCINATION_RATE: 0 = none. 100 = severely fabricated. Inverse-axis penalty.
4. RESPONSE_QUALITY: Useful, structured, complete? Not just polite — does it answer the question?

Output strict JSON only. No prose, no fences. Schema:
{
  "accuracy": 0-100,
  "citation_coverage": 0-100,
  "hallucination_rate": 0-100,
  "response_quality": 0-100,
  "reasoning": "1-3 sentences explaining the scores"
}`

export async function judgeResponse(params: JudgeParams): Promise<JudgeScores> {
  const client = getAnthropic()

  const userPrompt = `ORIGINAL QUESTION:
${params.prompt}

EXPECTED TOPICS: ${params.expectedTopics.join(', ') || 'n/a'}
EXPECTED CITATIONS: ${params.expectedCitations.join(', ') || 'n/a'}

RESPONSE TO EVALUATE:
${params.response}

CITATIONS USED IN RESPONSE: ${params.citationsUsed.join(', ') || 'none'}`

  const message = await client.messages.create({
    model: ANTHROPIC_JUDGE_MODEL,
    max_tokens: 600,
    system: [
      { type: 'text', text: SYSTEM_PROMPT(params.domain), cache_control: { type: 'ephemeral' } },
    ],
    messages: [{ role: 'user', content: userPrompt }],
  })
  const text = message.content.map((b) => ('text' in b ? b.text : '')).join('')
  return judgeScoreSchema.parse(parseJsonFromResponse(text))
}

/**
 * Multi-judge: run N parallel judge calls, return the median per dimension.
 * Flags high variance separately. Use N=3 for production; N=1 for cheap iter.
 */
export async function judgeMultiple(
  params: JudgeParams,
  n = 1,
): Promise<{ scores: JudgeScores; variance: Record<string, number> }> {
  const calls = Array.from({ length: n }, () => judgeResponse(params).catch(() => null))
  const results = (await Promise.all(calls)).filter((r): r is JudgeScores => r !== null)
  if (results.length === 0) throw new Error('All judge calls failed')

  const median = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
  }
  const variance = (arr: number[]) => {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length
    return arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length
  }
  const dims = ['accuracy', 'citation_coverage', 'hallucination_rate', 'response_quality'] as const
  const scores = {
    accuracy: median(results.map((r) => r.accuracy)),
    citation_coverage: median(results.map((r) => r.citation_coverage)),
    hallucination_rate: median(results.map((r) => r.hallucination_rate)),
    response_quality: median(results.map((r) => r.response_quality)),
    reasoning: results[0]!.reasoning,
  }
  const vars: Record<string, number> = {}
  for (const d of dims) vars[d] = variance(results.map((r) => r[d]))
  return { scores, variance: vars }
}
