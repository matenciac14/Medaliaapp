/**
 * Infrastructure — Anthropic implementation of IAIService.
 * This is the only file that imports the Anthropic SDK for check-in AI.
 * Always fails silently — AI is a complement, never a dependency.
 */
import Anthropic from '@anthropic-ai/sdk'
import type { IAIService } from '@/domain/ports/ai.service'

const MODEL_FAST = 'claude-haiku-4-5-20251001'
const MODEL_CHAT = 'claude-sonnet-4-6'

export class AnthropicService implements IAIService {
  private client: Anthropic

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }

  async generateRecommendation(prompt: string): Promise<string | null> {
    try {
      const response = await this.client.messages.create({
        model: MODEL_FAST,
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      })
      const block = response.content[0]
      return block.type === 'text' ? block.text : null
    } catch {
      // AI is optional — return null so caller can use fallback
      return null
    }
  }

  async chat(systemPrompt: string, userMessage: string): Promise<string | null> {
    try {
      const response = await this.client.messages.create({
        model: MODEL_CHAT,
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      })
      const block = response.content[0]
      return block.type === 'text' ? block.text : null
    } catch {
      return null
    }
  }
}
