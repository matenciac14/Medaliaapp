import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import Anthropic from '@anthropic-ai/sdk'
import { rateLimit } from '@/lib/rate-limit'
import { parseUserConfig } from '@/lib/config/user-config'
import { getAIConfig } from '@/lib/ai/config'
import { parseAIProfile, buildChatSystemPrompt } from '@/lib/ai/profile'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })

  const userId = session.user.id
  const { allowed } = rateLimit(`ai-chat:${userId}`, { limit: 20, windowMs: 60_000 })
  if (!allowed) {
    return Response.json({ error: 'Límite de mensajes alcanzado. Intenta en un minuto.' }, { status: 429 })
  }

  const { messages } = await req.json()
  const aiConfig = getAIConfig()

  // ── Verificar límite mensual ──────────────────────────────────────────────
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { config: true },
  })

  const config = parseUserConfig(userRecord?.config)
  const currentMonth = new Date().toISOString().slice(0, 7) // "YYYY-MM"

  // Reset del contador si el mes cambió
  let messagesThisMonth = config.ai.messagesThisMonth
  let messagesResetAt = config.ai.messagesResetAt

  if (messagesResetAt !== currentMonth) {
    messagesThisMonth = 0
    messagesResetAt = currentMonth
  }

  const monthlyLimit = config.ai.monthlyLimit

  // Calcular fecha de reset (1ro del próximo mes)
  const now = new Date()
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const nextMonthISO = nextMonth.toISOString()

  // Bloquear si alcanzó el límite (999999 = trial/sin límite)
  if (monthlyLimit !== 999999 && messagesThisMonth >= monthlyLimit) {
    return Response.json(
      { error: 'LIMIT_REACHED', limit: monthlyLimit, resetAt: nextMonthISO },
      { status: 429 }
    )
  }

  // ── Cargar contexto completo del usuario ──────────────────────────────────
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      goals: { where: { status: 'ACTIVE' }, take: 1 },
      trainingPlans: {
        where: { status: 'ACTIVE' },
        take: 1,
        include: { weeks: { take: 3, orderBy: { weekNumber: 'asc' } } },
      },
      checkIns: { orderBy: { recordedAt: 'desc' }, take: 1 },
    },
  })

  // Leer AI Profile configurado por el admin
  const sysConfig = await prisma.systemConfig.findUnique({ where: { id: 'singleton' } })
  const aiProfile = parseAIProfile(sysConfig?.aiProfile)
  const profilePrompt = buildChatSystemPrompt(aiProfile)

  // Combinar: filosofía del admin + contexto real del atleta
  const systemPrompt = `${profilePrompt}

${buildAthleteContext(user)}`

  // ── Stream de respuesta ───────────────────────────────────────────────────
  const stream = await anthropic.messages.stream({
    model: aiConfig.chatModel,
    max_tokens: aiConfig.maxTokensChat,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
  })

  const newCount = messagesThisMonth + 1
  const remaining = monthlyLimit === 999999 ? 999999 : Math.max(0, monthlyLimit - newCount)

  // Actualizar contador en DB de forma asíncrona (fire-and-forget pero esperamos para no perder el update)
  const updatedConfig = {
    ...config,
    ai: {
      ...config.ai,
      messagesThisMonth: newCount,
      messagesResetAt: currentMonth,
    },
  }

  // Retornar como ReadableStream — actualizar DB cuando el stream complete
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()

      // Actualizar contador en DB después de respuesta exitosa
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { config: updatedConfig as object },
        })
      } catch {
        // No bloquear al usuario si falla el update del contador
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-AI-Remaining': String(remaining),
      'X-AI-Limit': String(monthlyLimit),
    },
  })
}

function buildAthleteContext(user: {
  name?: string | null
  profile?: {
    age?: number | null
    weightKg?: number | null
    weightGoalKg?: number | null
    heightCm?: number | null
    hrResting?: number | null
    hrMax?: number | null
    injuries?: string[]
    conditions?: string[]
  } | null
  trainingPlans?: Array<{
    name: string
    totalWeeks: number
  }>
  goals?: Array<{
    type: string
    raceDate?: Date | null
  }>
  checkIns?: Array<{
    weightKg?: number | null
    hrResting?: number | null
    sleepHours?: number | null
    energyLevel?: number | null
    hardestSessionRpe?: number | null
    dietAdherencePct?: number | null
    painFlag?: boolean
  }>
} | null): string {
  const profile = user?.profile
  const plan = user?.trainingPlans?.[0]
  const goal = user?.goals?.[0]
  const lastCheckIn = user?.checkIns?.[0]

  // Restricciones específicas por condición médica
  const conditionRules: string[] = []
  if (profile?.conditions?.length) {
    for (const c of profile.conditions) {
      const cl = c.toLowerCase()
      if (cl.includes('hipertensión') || cl.includes('presión')) {
        conditionRules.push('- Hipertensión: no recomendar ejercicio de muy alta intensidad sin clearance médico. Preferir Z2-Z3.')
      }
      if (cl.includes('diabetes')) {
        conditionRules.push('- Diabetes: recordar al atleta monitorear glucosa antes y después del ejercicio. No recomendar ayuno previo al entrenamiento.')
      }
      if (cl.includes('asma') || cl.includes('respirator')) {
        conditionRules.push('- Asma/respiratorio: evitar recomendar sesiones de alta intensidad en ambientes fríos o con polución. Sugerir precalentar bien.')
      }
      if (cl.includes('corazón') || cl.includes('cardíac') || cl.includes('cardiac')) {
        conditionRules.push('- Condición cardíaca: SIEMPRE recomendar consultar con cardiólogo antes de cambios de intensidad. Mantener FC baja.')
      }
    }
  }
  if (profile?.injuries?.length) {
    for (const inj of profile.injuries) {
      const il = inj.toLowerCase()
      if (il.includes('rodilla') || il.includes('knee')) {
        conditionRules.push('- Lesión de rodilla: evitar recomendar ejercicios de alto impacto (saltos, bajadas rápidas). Priorizar piscina, bici, o terreno plano.')
      }
      if (il.includes('espalda') || il.includes('lumbar') || il.includes('columna')) {
        conditionRules.push('- Lesión de espalda/lumbar: no recomendar ejercicios con carga axial pesada. Fortalecer core primero.')
      }
      if (il.includes('tobillo') || il.includes('plantar') || il.includes('fascitis')) {
        conditionRules.push('- Lesión de tobillo/plantar: limitar volumen de carrera. Recomendar superficies blandas y calzado adecuado.')
      }
      if (il.includes('hombro') || il.includes('manguito')) {
        conditionRules.push('- Lesión de hombro: evitar ejercicios overhead. Adaptar natación a estilos alternativos.')
      }
    }
  }

  return `ATLETA: ${user?.name ?? 'desconocido'}
- Edad: ${profile?.age ?? '?'} años | Peso: ${profile?.weightKg ?? '?'} kg | Objetivo peso: ${profile?.weightGoalKg ?? 'no definido'} kg
- Altura: ${profile?.heightCm ?? '?'} cm | FC reposo: ${profile?.hrResting ?? '?'} bpm | FC máx: ${profile?.hrMax ?? '?'} bpm
- Lesiones: ${profile?.injuries?.join(', ') || 'ninguna'}
- Condiciones médicas: ${profile?.conditions?.join(', ') || 'ninguna'}

PLAN ACTIVO: ${plan?.name ?? 'Sin plan activo'}${plan ? ` — ${plan.totalWeeks} semanas` : ''}
${goal ? `OBJETIVO: ${goal.type}${goal.raceDate ? ` | Fecha: ${new Date(goal.raceDate).toLocaleDateString('es-CO')}` : ''}` : ''}

ÚLTIMO CHECK-IN: ${lastCheckIn
    ? `peso ${lastCheckIn.weightKg ?? '?'}kg, FC reposo ${lastCheckIn.hrResting ?? '?'}bpm, energía ${lastCheckIn.energyLevel ?? '?'}/5, RPE ${lastCheckIn.hardestSessionRpe ?? '?'}/10, dolor: ${lastCheckIn.painFlag ? '⚠️ SÍ' : 'no'}`
    : 'sin check-ins aún'}

${conditionRules.length > 0 ? `RESTRICCIONES OBLIGATORIAS:\n${conditionRules.join('\n')}` : ''}

REGLAS ÉTICAS: No diagnostiques enfermedades. No recetes medicamentos. Ante dolor agudo o síntomas cardíacos di "Esto debe evaluarlo un médico". Redirige preguntas médicas al especialista.`
}
