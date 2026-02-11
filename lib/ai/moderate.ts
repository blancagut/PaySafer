import { getOpenAIClient } from './client'

/**
 * Check content against OpenAI's moderation API.
 * Returns true if content is safe, false if flagged.
 */
export async function moderateContent(
  text: string
): Promise<{ safe: boolean; categories: string[] }> {
  try {
    const client = getOpenAIClient()
    const response = await client.moderations.create({ input: text })

    const result = response.results[0]
    if (!result) return { safe: true, categories: [] }

    const flaggedCategories = Object.entries(result.categories)
      .filter(([, flagged]) => flagged)
      .map(([category]) => category)

    return {
      safe: !result.flagged,
      categories: flaggedCategories,
    }
  } catch (err) {
    console.error('[AI Moderation] Error:', err)
    // Fail open — don't block content if moderation API fails
    return { safe: true, categories: [] }
  }
}
