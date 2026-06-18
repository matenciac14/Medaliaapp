/**
 * Port — contract for AI service interactions.
 * Routes and use cases depend on this interface, not on Anthropic SDK directly.
 */
export interface IAIService {
  /**
   * Generates a natural-language recommendation text based on check-in evaluation.
   * Returns null if AI is unavailable (caller must handle gracefully).
   */
  generateRecommendation(prompt: string): Promise<string | null>

  /**
   * Sends a conversational message and returns the assistant's reply.
   * Used in the AI Coach chat feature.
   * Returns null on failure — never throws.
   */
  chat(systemPrompt: string, userMessage: string): Promise<string | null>
}
