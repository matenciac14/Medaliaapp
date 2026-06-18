import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { rateLimitAsync } from '@/lib/rate-limit'
import { getAIConfig } from '@/lib/ai/config'
import { parseAIProfile, buildChatSystemPrompt } from '@/lib/ai/profile'
import { getCachedSystemConfig } from '@/lib/db/system-config'
import { sanitizeMessages, checkMonthlyLimit, buildUpdatedAIConfig, buildAthleteContext } from '@/domain/ai-coach/build-ai-context'
import { parseUserConfig } from '@/lib/config/user-config'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })

  const userId = session.user.id
  const { allowed } = await rateLimitAsync(`ai-chat:${userId}`, { limit: 20, windowMs: 60_000 })
  if (!allowed) return Response.json({ error: 'Límite de mensajes alcanzado. Intenta en un minuto.' }, { status: 429 })

  const { messages: rawMessages } = await req.json()
  const messages = sanitizeMessages(rawMessages)
  if (!messages.length) return Response.json({ error: 'Formato de mensajes inválido.' }, { status: 400 })

  const userRecord = await prisma.user.findUnique({ where: { id: userId }, select: { config: true } })
  if (!parseUserConfig(userRecord?.config).features.aiCoach) {
    return Response.json({ error: 'Plan Pro requerido para usar el AI Coach.', upgrade: '/upgrade' }, { status: 402 })
  }

  const limitCheck = checkMonthlyLimit(userRecord?.config)
  if (!limitCheck.allowed) return Response.json({ error: 'LIMIT_REACHED', limit: limitCheck.limit, resetAt: limitCheck.resetAt }, { status: 429 })

  const { newCount, remaining, currentMonth } = limitCheck

  const [user, sysConfig] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        goals: { where: { status: 'ACTIVE' }, take: 1 },
        trainingPlans: { where: { status: 'ACTIVE' }, take: 1, include: { weeks: { take: 3, orderBy: { weekNumber: 'asc' } } } },
        checkIns: { orderBy: { recordedAt: 'desc' }, take: 1 },
      },
    }),
    getCachedSystemConfig(),
  ])

  const aiConfig = getAIConfig()
  const systemPrompt = `${buildChatSystemPrompt(parseAIProfile(sysConfig?.aiProfile))}\n\n${buildAthleteContext(user)}`

  const stream = await anthropic.messages.stream({
    model: aiConfig.chatModel,
    max_tokens: aiConfig.maxTokensChat,
    system: systemPrompt,
    messages,
  })

  const encoder = new TextEncoder()
  const updatedConfig = buildUpdatedAIConfig(userRecord?.config, newCount, currentMonth)

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
      prisma.user.update({ where: { id: userId }, data: { config: updatedConfig as object } }).catch(() => {})
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-AI-Remaining': String(remaining),
      'X-AI-Limit': String(getAIConfig().maxTokensChat),
    },
  })
}
