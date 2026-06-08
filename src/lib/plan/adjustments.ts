import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db/prisma'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type CheckInData = {
  weightKg?: number
  hrResting?: number
  hrRestingBaseline?: number  // FC reposo del check-in anterior, para comparación relativa
  sleepHours?: number
  sleepScore?: number
  hardestSessionRpe?: number
  dietAdherencePct?: number
  painFlag?: boolean
  energyLevel?: number
  notes?: string
}

export type PlanContext = {
  currentWeek: number
  totalWeeks: number
  phase: string
  weeklyVolumeKm?: number
  isRecoveryWeek?: boolean
}

export type AdjustmentResult = {
  triggers: string[]           // flags internos
  adjustments: string[]        // cambios concretos aplicados
  recommendation: string       // texto AI para el atleta
  severity: 'ok' | 'warning' | 'critical'
}

// Reglas hardcodeadas — deterministas, sin AI
function evaluateRules(
  checkIn: CheckInData,
  plan: PlanContext
): { triggers: string[]; adjustments: string[]; severity: 'ok' | 'warning' | 'critical' } {
  const triggers: string[] = []
  const adjustments: string[] = []
  let severity: 'ok' | 'warning' | 'critical' = 'ok'

  // FC reposo alta: >10% sobre la FC previa del atleta, o >62 si no hay baseline
  const fcBaseline = checkIn.hrRestingBaseline ?? 62
  if (checkIn.hrResting && checkIn.hrResting > fcBaseline * 1.10) {
    triggers.push('fc_alta')
    adjustments.push('Reducir intensidad de sesiones de calidad esta semana')
    severity = 'warning'
  }

  // Sueño insuficiente
  if (checkIn.sleepHours && checkIn.sleepHours < 6.5) {
    triggers.push('sueno_bajo')
    adjustments.push('Priorizar descanso — convertir una sesión de calidad en rodaje suave')
    severity = 'warning'
  }

  // RPE muy alto (>8 en sesión más dura en semana base)
  if (checkIn.hardestSessionRpe && checkIn.hardestSessionRpe >= 9 && plan.phase === 'BASE') {
    triggers.push('rpe_excesivo')
    adjustments.push('La intensidad está por encima del objetivo — mantener Z2 estricto')
    severity = 'warning'
  }

  // Energía muy baja
  if (checkIn.energyLevel && checkIn.energyLevel <= 2) {
    triggers.push('energia_baja')
    adjustments.push('Semana de recuperación activa — reducir volumen 20%')
    severity = 'warning'
  }

  // Dolor/lesión — critical
  if (checkIn.painFlag) {
    triggers.push('dolor_activo')
    adjustments.push('⚠ Dolor reportado — pausar sesiones de impacto, evaluación médica recomendada')
    severity = 'critical'
  }

  // Adherencia muy baja
  if (checkIn.dietAdherencePct !== undefined && checkIn.dietAdherencePct < 40) {
    triggers.push('adherencia_baja')
    adjustments.push('Revisar plan nutricional — adherencia baja puede afectar recuperación')
    if (severity === 'ok') severity = 'warning'
  }

  return { triggers, adjustments, severity }
}

// Texto personalizado con Claude Haiku
async function generateRecommendationText(
  checkIn: CheckInData,
  plan: PlanContext,
  triggers: string[],
  adjustments: string[]
): Promise<string> {
  if (triggers.length === 0) {
    return '¡Excelente semana! Tus métricas están en rango óptimo. Mantén el ritmo y sigue el plan como está.'
  }

  try {
    const prompt = `Atleta acaba de hacer check-in semanal. Genera un mensaje motivador y específico de 2-3 oraciones en español.

Datos del check-in:
- FC reposo: ${checkIn.hrResting ?? '?'} bpm
- Sueño: ${checkIn.sleepHours ?? '?'} h
- Energía: ${checkIn.energyLevel ?? '?'}/5
- RPE sesión más dura: ${checkIn.hardestSessionRpe ?? '?'}/10
- Dolor: ${checkIn.painFlag ? 'Sí' : 'No'}
- Adherencia dieta: ${checkIn.dietAdherencePct ?? '?'}%

Ajustes detectados: ${adjustments.join('; ')}
Semana ${plan.currentWeek}/${plan.totalWeeks} — Fase ${plan.phase}

El mensaje debe: reconocer el esfuerzo, explicar brevemente por qué se hace el ajuste, y dar una instrucción clara para esta semana. Tono directo, sin ser dramático. Si hay dolor, siempre mencionar evaluación médica.`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })

    const block = response.content[0]
    return block.type === 'text' ? block.text : adjustments.join('. ')
  } catch {
    return adjustments.join('. ')
  }
}

export async function evaluateAndAdjust(
  checkIn: CheckInData,
  plan: PlanContext
): Promise<AdjustmentResult> {
  const { triggers, adjustments, severity } = evaluateRules(checkIn, plan)
  const recommendation = await generateRecommendationText(checkIn, plan, triggers, adjustments)
  return { triggers, adjustments, recommendation, severity }
}

// ---------------------------------------------------------------------------
// applyPlanAdjustments — modifica PlannedSessions de la semana siguiente
// ---------------------------------------------------------------------------

/**
 * Aplica ajustes concretos a las sesiones de la semana siguiente según los triggers.
 * Se llama desde el checkin route si hay triggers activos y el atleta tiene plan activo.
 */
export async function applyPlanAdjustments(
  planId: string,
  nextWeekNumber: number,
  triggers: string[]
): Promise<void> {
  if (triggers.length === 0) return

  // Buscar la semana siguiente del plan
  const nextWeek = await prisma.planWeek.findFirst({
    where: { planId, weekNumber: nextWeekNumber },
    include: { sessions: true },
  })
  if (!nextWeek || nextWeek.sessions.length === 0) return

  const hasVolumeTrigger = triggers.some(t =>
    ['energia_baja', 'sueno_bajo', 'fc_alta'].includes(t)
  )
  const hasPain = triggers.includes('dolor_activo')
  const hasRpe = triggers.includes('rpe_excesivo')

  for (const session of nextWeek.sessions) {
    const updates: Record<string, unknown> = {}

    if (hasPain) {
      // Marcar todas las sesiones como opcionales con nota
      updates.coachNote = '[AJUSTE AUTO] Dolor reportado — sesión opcional. Consulta a un médico antes de entrenar.'
    }

    if (hasVolumeTrigger) {
      // Reducir duración 20%
      updates.durationMin = Math.round(session.durationMin * 0.8)
      const existing = session.coachNote ?? ''
      const prefix = existing.includes('[AJUSTE AUTO]') ? existing : existing ? existing + ' ' : ''
      updates.coachNote = prefix + '[AJUSTE AUTO] Volumen reducido 20% por señales de fatiga.'
    }

    if (hasRpe && session.zoneTarget) {
      // Bajar una zona (Z4→Z3, Z3→Z2, Z2→Z1)
      const zoneMap: Record<string, string> = { Z5: 'Z4', Z4: 'Z3', Z3: 'Z2', Z2: 'Z1' }
      const lowerZone = zoneMap[session.zoneTarget]
      if (lowerZone) {
        updates.zoneTarget = lowerZone
        const existing = (updates.coachNote as string) ?? session.coachNote ?? ''
        updates.coachNote = (existing ? existing + ' ' : '') + `[AJUSTE AUTO] Zona bajada de ${session.zoneTarget} a ${lowerZone} por RPE elevado.`
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.plannedSession.update({
        where: { id: session.id },
        data: updates,
      })
    }
  }
}
