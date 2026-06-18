import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'
import { getAIConfig } from '@/lib/ai/config'
import { parseAIProfile, buildChatSystemPrompt } from '@/lib/ai/profile'
import { getCachedSystemConfig } from '@/lib/db/system-config'
import { sanitizeMessages, checkMonthlyLimit, buildUpdatedAIConfig, buildAthleteContext } from '@/domain/ai-coach/build-ai-context'
import { parseUserConfig } from '@/lib/config/user-config'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId = mobile.id
  const { allowed } = await rateLimitAsync(`ai-chat-mobile:${userId}`, { limit: 20, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Límite de mensajes alcanzado. Intenta en un minuto.' }, { status: 429 })

  const { messages: rawMessages } = await req.json()
  const messages = sanitizeMessages(rawMessages)
  if (!messages.length) return NextResponse.json({ error: 'Formato de mensajes inválido.' }, { status: 400 })

  const userRecord = await prisma.user.findUnique({ where: { id: userId }, select: { config: true } })
  if (!parseUserConfig(userRecord?.config).features.aiCoach) {
    return NextResponse.json({ error: 'Plan Pro requerido para usar el AI Coach.', upgrade: '/upgrade' }, { status: 402 })
  }

  const limitCheck = checkMonthlyLimit(userRecord?.config)
  if (!limitCheck.allowed) return NextResponse.json({ error: 'LIMIT_REACHED', limit: limitCheck.limit, resetAt: limitCheck.resetAt }, { status: 429 })

  const { newCount, remaining, currentMonth } = limitCheck
  const monthlyLimit = getAIConfig().maxTokensChat

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

  const response = await anthropic.messages.create({
    model: aiConfig.chatModel,
    max_tokens: aiConfig.maxTokensChat,
    system: systemPrompt,
    messages,
  })

  const content = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  const updatedConfig = buildUpdatedAIConfig(userRecord?.config, newCount, currentMonth)
  prisma.user.update({ where: { id: userId }, data: { config: updatedConfig as object } }).catch(() => {})

  return NextResponse.json({ content, remaining, limit: monthlyLimit })
}
