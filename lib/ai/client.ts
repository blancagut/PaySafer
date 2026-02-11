import OpenAI from 'openai'

// =============================================================================
// OpenAI Client Singleton
// =============================================================================

let _client: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error(
        'Missing OPENAI_API_KEY environment variable. ' +
        'Add it to your .env.local file.'
      )
    }
    _client = new OpenAI({ apiKey })
  }
  return _client
}

// =============================================================================
// Model Constants
// =============================================================================

/** Complex reasoning: disputes, fraud analysis, admin copilot, analytics */
export const GPT4O = 'gpt-4o' as const

/** Fast + cheap: translation, support FAQ, scam detection, trust narratives */
export const GPT4O_MINI = 'gpt-4o-mini' as const

// =============================================================================
// Shared Helpers
// =============================================================================

export interface AIResponse<T> {
  data: T | null
  error: string | null
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}

/**
 * Wrapper for OpenAI chat completions with error handling and retries.
 */
export async function chatCompletion(opts: {
  model: typeof GPT4O | typeof GPT4O_MINI
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxTokens?: number
  responseFormat?: 'json' | 'text'
}): Promise<AIResponse<string>> {
  const client = getOpenAIClient()
  const { model, systemPrompt, userPrompt, temperature = 0.3, maxTokens = 2048, responseFormat = 'text' } = opts

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      ...(responseFormat === 'json' ? { response_format: { type: 'json_object' } } : {}),
    })

    const content = response.choices[0]?.message?.content ?? null
    const usage = response.usage
      ? {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens,
        }
      : undefined

    return { data: content, error: null, usage }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown OpenAI error'
    console.error('[AI] chatCompletion error:', message)
    return { data: null, error: message }
  }
}

/**
 * Wrapper for structured JSON responses with automatic parsing.
 */
export async function chatCompletionJSON<T>(opts: {
  model: typeof GPT4O | typeof GPT4O_MINI
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxTokens?: number
}): Promise<AIResponse<T>> {
  const result = await chatCompletion({
    ...opts,
    responseFormat: 'json',
  })

  if (result.error || !result.data) {
    return { data: null, error: result.error, usage: result.usage }
  }

  try {
    const parsed = JSON.parse(result.data) as T
    return { data: parsed, error: null, usage: result.usage }
  } catch {
    return { data: null, error: 'Failed to parse AI JSON response', usage: result.usage }
  }
}
