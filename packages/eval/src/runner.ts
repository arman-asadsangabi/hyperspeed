import { runPackChatTurn, type PackEntryForChat } from './test_chat'
import { judgeMultiple, type JudgeScores } from './judge'

export interface EvalRunInput {
  domain: string
  entries: PackEntryForChat[]
  testCases: { id: string; prompt: string; expectedTopics: string[]; expectedCitations: string[] }[]
  numJudges?: number
}

export interface EvalResult {
  testCaseId: string
  response: string
  citationsUsed: string[]
  scores: JudgeScores
  latencyMs: number
}

export interface AggregateScores {
  overall: number
  dimensions: Record<string, number>
  perDimensionPasses: Record<string, boolean>
}

const PUBLISH_GATE = {
  accuracy: 80,
  citation_coverage: 60,
  hallucination_rate: 10, // inverse-axis; values <= 10 are good
  response_quality: 70,
  overall: 75,
}

/**
 * Weighted overall = mean of accuracy + citation_coverage + response_quality
 *   minus hallucination penalty (since hallucination is inverse-axis).
 */
export function aggregate(results: EvalResult[]): AggregateScores {
  if (results.length === 0)
    return {
      overall: 0,
      dimensions: {
        accuracy: 0,
        citation_coverage: 0,
        hallucination_rate: 100,
        response_quality: 0,
      },
      perDimensionPasses: {
        accuracy: false,
        citation_coverage: false,
        hallucination_rate: false,
        response_quality: false,
      },
    }
  const dims = ['accuracy', 'citation_coverage', 'hallucination_rate', 'response_quality'] as const
  const dimensions: Record<string, number> = {}
  for (const d of dims) {
    dimensions[d] = results.reduce((s, r) => s + r.scores[d], 0) / results.length
  }
  const overall =
    (dimensions.accuracy! +
      dimensions.citation_coverage! +
      dimensions.response_quality! -
      dimensions.hallucination_rate! * 0.5) /
    3
  return {
    overall: Math.max(0, Math.min(100, Math.round(overall * 10) / 10)),
    dimensions,
    perDimensionPasses: {
      accuracy: dimensions.accuracy! >= PUBLISH_GATE.accuracy,
      citation_coverage: dimensions.citation_coverage! >= PUBLISH_GATE.citation_coverage,
      hallucination_rate: dimensions.hallucination_rate! <= PUBLISH_GATE.hallucination_rate,
      response_quality: dimensions.response_quality! >= PUBLISH_GATE.response_quality,
    },
  }
}

export const PUBLISH_GATE_CONFIG = PUBLISH_GATE

/**
 * Run every test case through the pack-grounded model + judge.
 * Errors per case are caught so one bad case doesn't abort the run.
 */
export async function runEvalCases(input: EvalRunInput): Promise<EvalResult[]> {
  const out: EvalResult[] = []
  for (const tc of input.testCases) {
    const t0 = Date.now()
    try {
      const chat = await runPackChatTurn({
        domain: input.domain,
        entries: input.entries,
        history: [],
        message: tc.prompt,
      })
      const judge = await judgeMultiple(
        {
          domain: input.domain,
          prompt: tc.prompt,
          expectedTopics: tc.expectedTopics,
          expectedCitations: tc.expectedCitations,
          response: chat.reply,
          citationsUsed: chat.citedEntryIds,
        },
        input.numJudges ?? 1,
      )
      out.push({
        testCaseId: tc.id,
        response: chat.reply,
        citationsUsed: chat.citedEntryIds,
        scores: judge.scores,
        latencyMs: Date.now() - t0,
      })
    } catch (err: unknown) {
      out.push({
        testCaseId: tc.id,
        response: '[error]',
        citationsUsed: [],
        scores: {
          accuracy: 0,
          citation_coverage: 0,
          hallucination_rate: 100,
          response_quality: 0,
          reasoning: err instanceof Error ? err.message.slice(0, 500) : 'unknown error',
        },
        latencyMs: Date.now() - t0,
      })
    }
  }
  return out
}
