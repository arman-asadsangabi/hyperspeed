import { z } from 'zod'
import { ANTHROPIC_MODEL, getAnthropic, parseJsonFromResponse } from './anthropic'

const lintFindingSchema = z.object({
  entryId: z.string().nullable(),
  checkType: z.enum([
    'vague_claim',
    'missing_citation',
    'outdated_date',
    'contradiction',
    'coverage_gap',
  ]),
  severity: z.enum(['info', 'warning', 'error']).default('warning'),
  message: z.string().min(1).max(1000),
  suggestedFix: z.string().max(2000).optional(),
})

export type LintFinding = z.infer<typeof lintFindingSchema>

export interface LintEntry {
  id: string
  entryType: string
  title: string
  content: string
  tags: string[]
  hasCitation: boolean
}

/**
 * Local checks that don't require Claude. Run inline — fast.
 */
export function runLocalChecks(
  entries: LintEntry[],
  currentYear: number = new Date().getFullYear(),
): LintFinding[] {
  const out: LintFinding[] = []
  for (const e of entries) {
    // Missing citation on fact / heuristic
    if ((e.entryType === 'fact' || e.entryType === 'heuristic') && !e.hasCitation) {
      out.push({
        entryId: e.id,
        checkType: 'missing_citation',
        severity: 'warning',
        message: `This ${e.entryType} entry has no linked citation. Add one for traceability.`,
      })
    }
    // Outdated tax year / date reference
    const yearMatch = e.content.match(/\b(19|20)\d{2}\b/g)
    if (yearMatch) {
      for (const y of yearMatch) {
        const year = Number(y)
        if (year < currentYear - 1) {
          out.push({
            entryId: e.id,
            checkType: 'outdated_date',
            severity: 'info',
            message: `References year ${y}; verify it's still current as of ${currentYear}.`,
          })
          break
        }
      }
    }
    // Very short content (likely under-specified)
    if (e.content.trim().length < 40) {
      out.push({
        entryId: e.id,
        checkType: 'vague_claim',
        severity: 'info',
        message: 'Entry content is very short. Add specifics: numbers, dates, conditions.',
      })
    }
  }
  return out
}

/**
 * AI-powered checks: vague language + contradiction detection.
 * Falls back to [] when ANTHROPIC_API_KEY isn't set so the local-only
 * lint still runs.
 */
export async function runAiChecks(entries: LintEntry[], domain: string): Promise<LintFinding[]> {
  if (!process.env.ANTHROPIC_API_KEY) return []
  const client = getAnthropic()

  const list = entries
    .map((e) => `[${e.id}] (${e.entryType}) ${e.title}\n${e.content.slice(0, 800)}`)
    .join('\n\n---\n\n')

  const systemPrompt = `You audit pack entries in the ${domain} domain for quality issues.

Output strict JSON — no prose. An array of findings:
{
  "entryId": string | null,
  "checkType": "vague_claim" | "contradiction",
  "severity": "info" | "warning" | "error",
  "message": "1-2 sentence description of the issue",
  "suggestedFix": "concrete revision suggestion"
}

Flag only:
- vague_claim: hedging language ("may", "could", "generally") on entries that should be specific
- contradiction: pairs of entries that conflict (cite both IDs in message, use entryId of one)

Skip everything else. Output [] if no issues.`

  const message = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: list }],
  })

  const text = message.content.map((b) => ('text' in b ? b.text : '')).join('')
  try {
    const raw = parseJsonFromResponse<unknown>(text)
    if (!Array.isArray(raw)) return []
    return raw
      .map((x) => lintFindingSchema.safeParse(x))
      .filter((r): r is { success: true; data: LintFinding } => r.success)
      .map((r) => r.data)
  } catch {
    return []
  }
}

export async function runAllChecks(entries: LintEntry[], domain: string): Promise<LintFinding[]> {
  const local = runLocalChecks(entries)
  const ai = await runAiChecks(entries, domain).catch(() => [])
  return [...local, ...ai]
}

export function computeHealthScore(findings: LintFinding[], totalEntries: number): number {
  if (totalEntries === 0) return 0
  const weights = { error: 8, warning: 3, info: 1 }
  const penalty = findings.reduce((sum, f) => sum + weights[f.severity], 0)
  return Math.max(0, Math.min(100, 100 - Math.round((penalty / Math.max(totalEntries, 1)) * 8)))
}
