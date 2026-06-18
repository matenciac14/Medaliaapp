/**
 * Shared AI Coach logic — used by both web and mobile chat routes.
 *
 * Responsibilities:
 *  - Message sanitization (prevent prompt injection, cap cost)
 *  - Monthly limit check + counter reset
 *  - Athlete context prompt builder (injuries, conditions, plan, check-in)
 */

import { parseUserConfig } from '@/lib/config/user-config'

// ── Types ─────────────────────────────────────────────────────────────────────

export type RawMessage = { role: string; content: string }
export type ChatMessage = { role: 'user' | 'assistant'; content: string }

type AthleteContextInput = {
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
  trainingPlans?: Array<{ name: string; totalWeeks: number }>
  goals?: Array<{ type: string; raceDate?: Date | null }>
  checkIns?: Array<{
    weightKg?: number | null
    hrResting?: number | null
    sleepHours?: number | null
    energyLevel?: number | null
    hardestSessionRpe?: number | null
    dietAdherencePct?: number | null
    painFlag?: boolean
    stressLevel?: number | null
    motivationLevel?: number | null
  }>
} | null

export type LimitCheckResult =
  | { allowed: true; newCount: number; remaining: number; currentMonth: string; nextMonthISO: string }
  | { allowed: false; limit: number; resetAt: string }

// ── Sanitize messages ─────────────────────────────────────────────────────────

export function sanitizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return []
  return (raw as RawMessage[])
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .slice(-20)
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: typeof m.content === 'string' ? m.content.slice(0, 4000) : '',
    }))
    .filter(m => m.content.length > 0)
}

// ── Monthly limit check ───────────────────────────────────────────────────────

export function checkMonthlyLimit(rawConfig: unknown): LimitCheckResult {
  const config = parseUserConfig(rawConfig)
  const currentMonth = new Date().toISOString().slice(0, 7)
  const now = new Date()
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const nextMonthISO = nextMonth.toISOString()
  const monthlyLimit = config.ai.monthlyLimit

  let messagesThisMonth = config.ai.messagesThisMonth
  if (config.ai.messagesResetAt !== currentMonth) messagesThisMonth = 0

  if (monthlyLimit !== 999999 && messagesThisMonth >= monthlyLimit) {
    return { allowed: false, limit: monthlyLimit, resetAt: nextMonthISO }
  }

  const newCount = messagesThisMonth + 1
  const remaining = monthlyLimit === 999999 ? 999999 : Math.max(0, monthlyLimit - newCount)
  return { allowed: true, newCount, remaining, currentMonth, nextMonthISO }
}

export function buildUpdatedAIConfig(rawConfig: unknown, newCount: number, currentMonth: string) {
  const config = parseUserConfig(rawConfig)
  return { ...config, ai: { ...config.ai, messagesThisMonth: newCount, messagesResetAt: currentMonth } }
}

// ── Athlete context prompt ────────────────────────────────────────────────────

export function buildAthleteContext(user: AthleteContextInput): string {
  const profile = user?.profile
  const plan = user?.trainingPlans?.[0]
  const goal = user?.goals?.[0]
  const lastCheckIn = user?.checkIns?.[0]

  const conditionRules: string[] = []
  if (profile?.conditions?.length) {
    for (const c of profile.conditions) {
      const cl = c.toLowerCase()
      if (cl.includes('hipertensión') || cl.includes('presión'))
        conditionRules.push('- Hipertensión: no recomendar ejercicio de muy alta intensidad sin clearance médico. Preferir Z2-Z3.')
      if (cl.includes('diabetes'))
        conditionRules.push('- Diabetes: recordar al atleta monitorear glucosa antes y después. No recomendar ayuno previo al entrenamiento.')
      if (cl.includes('asma') || cl.includes('respirator'))
        conditionRules.push('- Asma/respiratorio: evitar alta intensidad en ambientes fríos o con polución. Sugerir precalentar bien.')
      if (cl.includes('corazón') || cl.includes('cardíac') || cl.includes('cardiac'))
        conditionRules.push('- Condición cardíaca: SIEMPRE recomendar consultar con cardiólogo antes de cambios de intensidad.')
    }
  }
  if (profile?.injuries?.length) {
    for (const inj of profile.injuries) {
      const il = inj.toLowerCase()
      if (il.includes('rodilla') || il.includes('knee'))
        conditionRules.push('- Lesión de rodilla: evitar alto impacto. Priorizar piscina, bici, o terreno plano.')
      if (il.includes('espalda') || il.includes('lumbar') || il.includes('columna'))
        conditionRules.push('- Lesión lumbar: no recomendar carga axial pesada. Fortalecer core primero.')
      if (il.includes('tobillo') || il.includes('plantar') || il.includes('fascitis'))
        conditionRules.push('- Lesión de tobillo/plantar: limitar volumen de carrera. Superficies blandas y calzado adecuado.')
      if (il.includes('hombro') || il.includes('manguito'))
        conditionRules.push('- Lesión de hombro: evitar ejercicios overhead. Adaptar natación a estilos alternativos.')
    }
  }

  return `ATLETA: ${user?.name ?? 'desconocido'}
- Edad: ${profile?.age ?? '?'} años | Peso: ${profile?.weightKg ?? '?'} kg | Objetivo: ${profile?.weightGoalKg ?? 'no definido'} kg
- Altura: ${profile?.heightCm ?? '?'} cm | FC reposo: ${profile?.hrResting ?? '?'} bpm | FC máx: ${profile?.hrMax ?? '?'} bpm
- Lesiones: ${profile?.injuries?.join(', ') || 'ninguna'}
- Condiciones médicas: ${profile?.conditions?.join(', ') || 'ninguna'}

PLAN ACTIVO: ${plan?.name ?? 'Sin plan activo'}${plan ? ` — ${plan.totalWeeks} semanas` : ''}
${goal ? `OBJETIVO: ${goal.type}${goal.raceDate ? ` | Fecha: ${new Date(goal.raceDate).toLocaleDateString('es-CO')}` : ''}` : ''}

ÚLTIMO CHECK-IN: ${lastCheckIn
    ? `peso ${lastCheckIn.weightKg ?? '?'}kg, FC ${lastCheckIn.hrResting ?? '?'}bpm, energía ${lastCheckIn.energyLevel ?? '?'}/10, RPE ${lastCheckIn.hardestSessionRpe ?? '?'}/10, estrés ${lastCheckIn.stressLevel ?? '?'}/10, motivación ${lastCheckIn.motivationLevel ?? '?'}/10, dolor: ${lastCheckIn.painFlag ? '⚠️ SÍ' : 'no'}`
    : 'sin check-ins aún'}

${conditionRules.length > 0 ? `RESTRICCIONES OBLIGATORIAS:\n${conditionRules.join('\n')}\n` : ''}REGLAS ÉTICAS: No diagnostiques enfermedades. No recetes medicamentos. Ante dolor agudo o síntomas cardíacos di "Esto debe evaluarlo un médico". Redirige preguntas médicas al especialista.`
}
