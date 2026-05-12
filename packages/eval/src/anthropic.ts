import Anthropic from '@anthropic-ai/sdk'

export const ANTHROPIC_MODEL = 'claude-sonnet-4-5'
export const ANTHROPIC_JUDGE_MODEL = 'claude-sonnet-4-5'

let _client: Anthropic | undefined

export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Set it in your environment to enable AI features.',
    )
  }
  _client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

/**
 * Convenience: extract a JSON object from a Claude response that may have
 * wrapping prose / code fences.
 */
export function parseJsonFromResponse<T>(text: string): T {
  // First try direct JSON
  try {
    return JSON.parse(text) as T
  } catch {
    // Try to find a fenced code block
    const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(text)
    if (fence?.[1]) return JSON.parse(fence[1]) as T
    // Try to find the first {...} or [...]
    const obj = /(\{[\s\S]*\}|\[[\s\S]*\])/m.exec(text)
    if (obj?.[1]) return JSON.parse(obj[1]) as T
    throw new Error('Response did not contain valid JSON')
  }
}
