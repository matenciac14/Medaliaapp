import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { getMobileUser } from '@/lib/mobile-auth'
import { rateLimitAsync } from '@/lib/rate-limit'
import { parseUserConfig } from '@/lib/config/user-config'
import { getAIConfig } from '@/lib/ai/config'
import { parseAIProfile, buildChatSystemPrompt } from '@/lib/ai/profile'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  if (!mobile) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const userId = mobile.id
  const { allowed } = await rateLimitAsync(`ai-chat-mobile:${userId}`, { limit: 20, windowMs: 60_000 })
  if (!allowed) {
    return NextResponse.json({ error: 'Límite de mensajes alcanzado. Intenta en un minuto.' }, { status: 429 })
  }

  const { messages: rawMessages } = await req.json()

  if (!Array.isArray(rawMessages)) {
    return NextResponse.json({ error: 'Formato de mensajes inválido.' }, { status: 400 })
  }

  const messages = rawMessages
    .filter((m: { role: string; content: string }) => m.role === 'user' || m.role === 'assistant')
    .slice(-20)
    .map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: typeof m.content === 'string' ? m.content.slice(0, 4000) : '',
    }))
    .filter(m => m.content.length > 0)

  const aiConfig = getAIConfig()

  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { config: true },
  })

  const config = parseUserConfig(userRecord?.config)

  if (!config.features.aiCoach) {
    return NextResponse.json({ error: 'El AI Coach no está activado en tu cuenta.' }, { status: 403 })
  }

  const currentMonth = new Date().toISOString().slice(0, 7)

  let messagesThisMonth = config.ai.messagesThisMonth
  let messagesResetAt = config.ai.messagesResetAt

  if (messagesResetAt !== currentMonth) {
    messagesThisMonth = 0
    messagesResetAt = currentMonth
  }

  const monthlyLimit = config.ai.monthlyLimit

  const now = new Date()
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const nextMonthISO = nextMonth.toISOString()

  if (monthlyLimit !== 999999 && messagesThisMonth >= monthlyLimit) {
    return NextResponse.json({ error: 'LIMIT_REACHED', limit: monthlyLimit, resetAt: nextMonthISO }, { status: 429 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      goals: { where: { status: 'ACTIVE' }, take: 1 },
      trainingPlans: { where: { status: 'ACTIVE' }, take: 1, include: { weeks: { take: 3, orderBy: { weekNumber: 'asc' } } } },
      checkIns: { orderBy: { recordedAt: 'desc' }, take: 1 },
    },
  })

  const sysConfig = await prisma.systemConfig.findUnique({ where: { id: 'singleton' } })
  const aiProfile = parseAIProfile(sysConfig?.aiProfile)
  const profilePrompt = buildChatSystemPrompt(aiProfile)
  const systemPrompt = `${profilePrompt}\n\n${buildAthleteContext(user)}`

  const response = await anthropic.messages.create({
    model: aiConfig.chatModel,
    max_tokens: aiConfig.maxTokensChat,
    system: systemPrompt,
    messages,
  })

  const content = response.content
    .filter(block => block.type === 'text')
    .map(block => (block as { type: 'text'; text: string }).text)
    .join('')

  const newCount = messagesThisMonth + 1
  const remaining = monthlyLimit === 999999 ? 999999 : Math.max(0, monthlyLimit - newCount)

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        config: {
          ...config,
          ai: { ...config.ai, messagesThisMonth: newCount, messagesResetAt: currentMonth },
        } as object,
      },
    })
  } catch {
    // Non-blocking
  }

  return NextResponse.json({ content, remaining, limit: monthlyLimit })
}

function buildAthleteContext(user: {
  name?: string | null
  profile?: { age?: number | null; weightKg?: number | null; weightGoalKg?: number | null; heightCm?: number | null; hrResting?: number | null; hrMax?: number | null; injuries?: string[]; conditions?: string[] } | null
  trainingPlans?: Array<{ name: string; totalWeeks: number }>
  goals?: Array<{ type: string; raceDate?: Date | null }>
  checkIns?: Array<{ weightKg?: number | null; hrResting?: number | null; sleepHours?: number | null; energyLevel?: number | null; hardestSessionRpe?: number | null; dietAdherencePct?: number | null; painFlag?: boolean }>
} | null): string {
  const profile = user?.profile
  const plan = user?.trainingPlans?.[0]
  const goal = user?.goals?.[0]
  const lastCheckIn = user?.checkIns?.[0]

  return `ATLETA: ${user?.name ?? 'desconocido'}
- Edad: ${profile?.age ?? '?'} años | Peso: ${profile?.weightKg ?? '?'} kg | Altura: ${profile?.heightCm ?? '?'} cm
- FC reposo: ${profile?.hrResting ?? '?'} bpm | FC máx: ${profile?.hrMax ?? '?'} bpm
- Lesiones: ${profile?.injuries?.join(', ') || 'ninguna'}
- Condiciones: ${profile?.conditions?.join(', ') || 'ninguna'}

PLAN ACTIVO: ${plan?.name ?? 'Sin plan activo'}${plan ? ` — ${plan.totalWeeks} semanas` : ''}
${goal ? `OBJETIVO: ${goal.type}${goal.raceDate ? ` | Fecha: ${new Date(goal.raceDate).toLocaleDateString('es-CO')}` : ''}` : ''}

ÚLTIMO CHECK-IN: ${lastCheckIn
    ? `peso ${lastCheckIn.weightKg ?? '?'}kg, energía ${lastCheckIn.energyLevel ?? '?'}/5, RPE ${lastCheckIn.hardestSessionRpe ?? '?'}/10, dolor: ${lastCheckIn.painFlag ? '⚠️ SÍ' : 'no'}`
    : 'sin check-ins aún'}

REGLAS ÉTICAS: No diagnostiques enfermedades. No recetes medicamentos. Ante dolor agudo di "Esto debe evaluarlo un médico".`
}
