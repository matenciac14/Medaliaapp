// ---------------------------------------------------------------------------
// generator.ts — Motor de generación de planes de entrenamiento
// Combina templates + fórmulas + AI (Claude Haiku) + persistencia en BD
// ---------------------------------------------------------------------------

import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db/prisma'
import { parseUserConfig } from '@/lib/config/user-config'
import { parseAIProfile, buildPlanSystemPrompt } from '@/lib/ai/profile'
import {
  calculateHRZones,
  calculateMacros,
  calculateTDEE,
  estimateHRMax,
} from './formulas'
import { getTemplate } from './templates'
import type { WeekSchedule, CardioMachine, DayConfig, MuscleGroupSplit } from '@/app/onboarding/_types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GeneratePlanInput = {
  userId: string
  goalType: string
  raceDate?: string
  targetTimeSecs?: number
  weightGoalKg?: number
  age: number
  heightCm: number
  weightKg: number
  gender?: 'male' | 'female'
  hrResting?: number
  hrMax?: number
  daysPerWeek: number
  hoursPerSession: number
  injuries: string[]
  conditions: string[]
  nutritionCommitment: string
  generatedBy?: 'AI' | 'COACH'
  weekSchedule?: WeekSchedule
  experienceLevel?: string
}

type Recommendation = { title: string; text: string }

export type GeneratePlanResult = {
  planId: string
  recommendations: Recommendation[]
  hrZones: ReturnType<typeof calculateHRZones>
  hrMax: number
  tdee: number | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calcula la fecha real de una sesión dado el inicio del plan, la semana y el día.
 * dayOfWeek: 1=lun … 7=dom
 */
function sessionDate(planStart: Date, weekIndex: number, dayOfWeek: number): Date {
  const date = new Date(planStart)
  // Avanzar al lunes de la semana correspondiente
  date.setDate(date.getDate() + weekIndex * 7)
  // Ajustar al día de la semana (1=lun → dayOfWeek-1 días desde lunes)
  const currentDow = date.getDay() // 0=dom, 1=lun, …
  const targetDow = dayOfWeek % 7  // 7=dom → 0
  const diff = (targetDow - currentDow + 7) % 7
  date.setDate(date.getDate() + diff)
  return date
}

/**
 * Llama a Claude Haiku para personalizar recomendaciones.
 * Devuelve array vacío si falla — no bloquea el plan.
 */
async function getAIRecommendations(
  input: GeneratePlanInput,
  hrMax: number,
  zones: ReturnType<typeof calculateHRZones>
): Promise<Recommendation[]> {
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // Leer AI Profile desde DB para usar la filosofía y restricciones configuradas por el admin
    const sysConfig = await prisma.systemConfig.findUnique({ where: { id: 'singleton' } })
    const aiProfile = parseAIProfile(sysConfig?.aiProfile)
    const systemPrompt = buildPlanSystemPrompt(aiProfile, input.goalType)

    const injuriesStr = input.injuries.length > 0 ? input.injuries.join(', ') : 'ninguna'
    const conditionsStr = input.conditions.length > 0 ? input.conditions.join(', ') : 'ninguna'

    const userMessage = `Atleta: ${input.age}a, ${input.weightKg}kg, objetivo: ${input.goalType}, lesiones: ${injuriesStr}, condiciones: ${conditionsStr}. Zonas FC: Z2=${zones.z2.min}-${zones.z2.max}bpm, Z4=${zones.z4.min}-${zones.z4.max}bpm. Genera 3 recomendaciones personalizadas. JSON: {"recommendations":[{"title":string,"text":string}]}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
    const parsed = JSON.parse(rawText)
    return (parsed.recommendations as Recommendation[]) ?? []
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Gym exercise selection — selección de ejercicios por split y nivel
// ---------------------------------------------------------------------------

type GymExercise = { id: string; name: string; muscleGroups: string[]; equipment: string }

// Ejercicios seleccionados por split y nivel (nombres que coinciden con el seed)
const SPLIT_EXERCISES: Record<MuscleGroupSplit, Record<string, string[]>> = {
  PUSH: {
    BEGINNER: [
      'Press declinado con mancuernas',
      'Elevación lateral con mancuernas',
      'Push down en polea',
      'Press Arnold',
    ],
    INTERMEDIATE: [
      'Press plano con barra',
      'Press Arnold',
      'Elevación lateral con mancuernas',
      'Cruces en polea alta',
      'Push down en polea',
    ],
    ADVANCED: [
      'Press plano con barra',
      'Press inclinado con barra',
      'Press Arnold',
      'Elevación lateral con mancuernas',
      'Cruces en polea alta',
      'Press francés',
    ],
  },
  PULL: {
    BEGINNER: [
      'Jalón polea alta',
      'Remo con mancuernas',
      'Curl martillo con mancuernas',
      'Elevación frontal con mancuernas',
    ],
    INTERMEDIATE: [
      'Jalón polea alta',
      'Remo con barra',
      'Curl martillo con mancuernas',
      'Curl concentrado con mancuernas',
      'Pájaros',
    ],
    ADVANCED: [
      'Dominadas',
      'Remo con barra',
      'Jalón polea alta',
      'Curl martillo con mancuernas',
      'Curl predicador',
      'Pájaros',
    ],
  },
  LEGS: {
    BEGINNER: [
      'Prensa de piernas',
      'Extensión de rodillas en máquina',
      'Flexión de rodillas acostado',
      'Elevación de talones en máquina',
    ],
    INTERMEDIATE: [
      'Sentadilla sumo con barra',
      'Prensa de piernas',
      'Flexión de rodillas sentado',
      'Abducción en máquina',
      'Elevación de talones en máquina',
    ],
    ADVANCED: [
      'Sentadilla frontal con barra',
      'Hip thrust con barra',
      'Peso muerto con barra',
      'Sentadilla hack en máquina',
      'Extensión de rodillas en máquina',
      'Elevación de talones en máquina',
    ],
  },
  FULL_BODY: {
    BEGINNER: [
      'Prensa de piernas',
      'Jalón polea alta',
      'Press declinado con mancuernas',
      'Elevación lateral con mancuernas',
    ],
    INTERMEDIATE: [
      'Sentadilla sumo con barra',
      'Remo con mancuernas',
      'Press Arnold',
      'Curl martillo con mancuernas',
      'Push down en polea',
    ],
    ADVANCED: [
      'Sentadilla frontal con barra',
      'Dominadas',
      'Press plano con barra',
      'Press militar con barra',
      'Curl martillo con mancuernas',
      'Push down en polea',
    ],
  },
}

const SPLIT_LABELS: Record<MuscleGroupSplit, string> = {
  PUSH: 'Push — Pecho, Hombros, Tríceps',
  PULL: 'Pull — Espalda, Bíceps',
  LEGS: 'Piernas — Cuádriceps, Glúteos',
  FULL_BODY: 'Full Body',
}

function getSetsRepsScheme(phase: string): string {
  switch (phase) {
    case 'BASE': return '3×12-15'
    case 'DESARROLLO': return '4×10-12'
    case 'ESPECIFICO':
    case 'ESPECÍFICO': return '4×8-10'
    default: return '3×10-12' // AFINAMIENTO
  }
}

async function fetchExercisesForSchedule(
  schedule: WeekSchedule,
  experienceLevel: string
): Promise<Record<string, GymExercise[]>> {
  // Collect which splits are used
  const splitsNeeded = new Set<MuscleGroupSplit>()
  for (const dow of [1, 2, 3, 4, 5, 6, 7] as const) {
    const day = schedule[dow]
    if (day.type === 'strength' && day.split) {
      splitsNeeded.add(day.split)
    }
  }
  if (splitsNeeded.size === 0) return {}

  const level = (experienceLevel ?? 'INTERMEDIATE').toUpperCase() as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'

  // Fetch all global exercises once
  const allExercises = await prisma.exercise.findMany({
    where: { isGlobal: true },
    select: { id: true, name: true, muscleGroups: true, equipment: true },
  })

  const result: Record<string, GymExercise[]> = {}

  for (const split of splitsNeeded) {
    const wantedNames = SPLIT_EXERCISES[split][level] ?? SPLIT_EXERCISES[split]['INTERMEDIATE']
    // Match by name (case-insensitive, partial)
    const matched: GymExercise[] = []
    for (const name of wantedNames) {
      const found = allExercises.find(
        e => e.name.toLowerCase().includes(name.toLowerCase()) ||
             name.toLowerCase().includes(e.name.toLowerCase())
      )
      if (found) {
        matched.push(found as GymExercise)
      } else {
        // Fallback: use name directly even if not in DB
        matched.push({ id: `fallback-${name}`, name, muscleGroups: [], equipment: '' })
      }
    }
    result[split] = matched
  }

  return result
}

function buildStrengthStructure(
  split: MuscleGroupSplit,
  exercises: GymExercise[],
  durationMin: number,
  phase: string
): string {
  const scheme = getSetsRepsScheme(phase)
  const splitLabel = SPLIT_LABELS[split]
  const lines = exercises.map(e => `${scheme} ${e.name}`)
  return `${durationMin} min · ${splitLabel}\n${lines.join('\n')}`
}

// ---------------------------------------------------------------------------
// Cardio machine sessions — genera estructura detallada por fase y máquina
// ---------------------------------------------------------------------------

const MACHINE_NAMES: Record<CardioMachine, string> = {
  TREADMILL: 'cinta',
  ELLIPTICAL: 'elíptica',
  BIKE: 'bici estática',
  ROWING: 'remo',
  ANY: 'máquina cardio',
}

function buildCardioStructure(
  machine: CardioMachine,
  durationMin: number,
  phase: string,
  hrZones: ReturnType<typeof calculateHRZones>
): { zoneTarget: string; structure: string } {
  const m = MACHINE_NAMES[machine] ?? 'máquina cardio'
  const z1max = hrZones.z1?.max ?? hrZones.z2.min - 5
  const z2 = `${hrZones.z2.min}–${hrZones.z2.max} bpm`
  const z3 = `${hrZones.z3.min}–${hrZones.z3.max} bpm`
  const warm = 5
  const cool = 5
  const main = durationMin - warm - cool

  switch (phase) {
    case 'BASE':
      return {
        zoneTarget: 'Z2',
        structure: `${durationMin} min en ${m} · ${warm} min calentamiento suave · ${main} min Zona 2 (${z2}) ritmo conversacional · ${cool} min vuelta calma`,
      }
    case 'DESARROLLO':
      return {
        zoneTarget: 'Z2-Z3',
        structure: `${durationMin} min en ${m} · ${warm} min calentamiento Z1 · ${main - 8} min Z2 continuo (${z2}) · 8 min Z3 progresivo (${z3}) · ${cool} min vuelta calma`,
      }
    case 'ESPECIFICO':
      return {
        zoneTarget: 'Z2-Z3',
        structure: `${durationMin} min en ${m} · ${warm} min calentamiento · ${main - 10} min Z2 (${z2}) · 10 min Z3 sostenido (${z3}) · ${cool} min enfriamiento`,
      }
    default: // AFINAMIENTO
      return {
        zoneTarget: 'Z1-Z2',
        structure: `${durationMin} min en ${m} · Recuperación activa · No superar ${hrZones.z2.max} bpm · Ritmo muy suave, sin esfuerzo`,
      }
  }
}

function buildScheduledSessions(
  weekId: string,
  week: { phase: string },
  schedule: WeekSchedule,
  planStart: Date,
  weekIndex: number,
  hrZones: ReturnType<typeof calculateHRZones>,
  hoursPerSession: number,
  gymExercises: Record<string, GymExercise[]> = {}
) {
  const durationMin = Math.round(hoursPerSession * 60)

  return ([1, 2, 3, 4, 5, 6, 7] as const)
    .filter((dow) => schedule[dow]?.type !== 'rest')
    .map((dow) => {
      const day = schedule[dow] as DayConfig
      if (day.type === 'cardio') {
        const cardio = buildCardioStructure(
          day.cardioMachine ?? 'ANY',
          durationMin,
          week.phase,
          hrZones
        )
        return {
          weekId,
          dayOfWeek: dow,
          type: 'OTRO' as const,
          durationMin,
          zoneTarget: cardio.zoneTarget,
          structure: cardio.structure,
          date: sessionDate(planStart, weekIndex, dow),
        }
      }
      // STRENGTH — usar ejercicios del split si están disponibles
      const split = day.split as MuscleGroupSplit | undefined
      const exercises = split ? (gymExercises[split] ?? []) : []
      const structure = split && exercises.length > 0
        ? buildStrengthStructure(split, exercises, durationMin, week.phase)
        : `Sesión de fuerza ${durationMin} min — Ver ejercicios en el tracker de gym`
      return {
        weekId,
        dayOfWeek: dow,
        type: 'FUERZA' as const,
        durationMin,
        zoneTarget: null,
        structure,
        date: sessionDate(planStart, weekIndex, dow),
      }
    })
}

// ---------------------------------------------------------------------------
// Mock data para cuando la BD no está conectada
// ---------------------------------------------------------------------------

function buildMockResult(input: GeneratePlanInput): GeneratePlanResult {
  const hrMax = input.hrMax && input.hrMax > 100 ? input.hrMax : estimateHRMax(input.age)
  const zones = calculateHRZones(hrMax, input.hrResting ?? 0)
  const tdee = calculateTDEE(
    input.weightKg,
    input.heightCm,
    input.age,
    input.gender ?? 'male',
    input.daysPerWeek
  )
  return {
    planId: `mock-${Date.now()}`,
    recommendations: [
      {
        title: 'Plan generado (modo demo)',
        text: 'La base de datos no está conectada. Este es un resultado de prueba.',
      },
    ],
    hrZones: zones,
    hrMax,
    tdee,
  }
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export async function generatePlan(input: GeneratePlanInput): Promise<GeneratePlanResult> {
  // 1. Seleccionar template
  const template = getTemplate(input.goalType)
  if (!template) {
    // Fallback: usar HALF_MARATHON si no hay template para el goalType
    console.warn(`[generatePlan] No template for goalType: ${input.goalType}`)
  }

  // 2. Calcular hrMax real o estimado
  const hrMax = input.hrMax && input.hrMax > 100 ? input.hrMax : estimateHRMax(input.age)

  // 3. Calcular zonas FC
  const hrZones = calculateHRZones(hrMax, input.hrResting ?? 0)

  // 4. Calcular TDEE y macros
  const tdee = calculateTDEE(
    input.weightKg,
    input.heightCm,
    input.age,
    input.gender ?? 'male',
    input.daysPerWeek
  )
  const hasWeightGoal = !!input.weightGoalKg
  const macros = calculateMacros(tdee, input.weightKg, hasWeightGoal)

  // 5. Llamar a AI para personalizar textos (solo si es B2C, no coach)
  const recommendations = input.generatedBy === 'COACH'
    ? []
    : await getAIRecommendations(input, hrMax, hrZones)

  // 5b. Pre-fetch gym exercises si hay días de fuerza en el schedule
  let gymExercises: Record<string, GymExercise[]> = {}
  if (input.weekSchedule && input.experienceLevel) {
    try {
      gymExercises = await fetchExercisesForSchedule(input.weekSchedule, input.experienceLevel)
    } catch {
      // No bloquear el plan si falla la consulta de ejercicios
      gymExercises = {}
    }
  }

  // 6. Calcular fecha de inicio del plan (hoy)
  const planStart = new Date()
  planStart.setHours(0, 0, 0, 0)

  // 7. Determinar fecha fin del plan
  const totalWeeks = template?.totalWeeks ?? 18
  const planEnd = new Date(planStart)
  planEnd.setDate(planEnd.getDate() + totalWeeks * 7)

  // 8. Guardar en BD
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 8a. Crear TrainingPlan
      const trainingPlan = await tx.trainingPlan.create({
        data: {
          userId: input.userId,
          name: `Plan ${input.goalType} — ${planStart.toLocaleDateString('es-CO')}`,
          totalWeeks,
          status: 'ACTIVE' as any,
          generatedBy: (input.generatedBy ?? 'AI') as any,
          startDate: planStart,
          endDate: planEnd,
          hrZones: hrZones as any,
        },
      })

      // 8b. Upsert NutritionPlan
      await tx.nutritionPlan.upsert({
        where: { userId: input.userId },
        create: {
          userId: input.userId,
          tdee,
          targetKcalHard: macros.hard.kcal,
          targetKcalEasy: macros.easy.kcal,
          targetKcalRest: macros.rest.kcal,
          proteinG: macros.hard.protein,
          carbsHardG: macros.hard.carbs,
          carbsEasyG: macros.easy.carbs,
          fatG: macros.hard.fat,
        },
        update: {
          tdee,
          targetKcalHard: macros.hard.kcal,
          targetKcalEasy: macros.easy.kcal,
          targetKcalRest: macros.rest.kcal,
          proteinG: macros.hard.protein,
          carbsHardG: macros.hard.carbs,
          carbsEasyG: macros.easy.carbs,
          fatG: macros.hard.fat,
        },
      })

      // 8c. Crear PlanWeeks + PlannedSessions si hay template
      if (template) {
        for (const week of template.weeks) {
          const weekIndex = week.weekNumber - 1
          const weekStart = new Date(planStart)
          weekStart.setDate(weekStart.getDate() + weekIndex * 7)
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekEnd.getDate() + 6)

          const planWeek = await tx.planWeek.create({
            data: {
              planId: trainingPlan.id,
              weekNumber: week.weekNumber,
              phase: week.phase as any,
              volumeKm: week.volumeKm,
              focusDescription: week.focusDescription,
              isRecoveryWeek: week.isRecoveryWeek,
              startDate: weekStart,
              endDate: weekEnd,
            },
          })

          // Crear todas las sesiones de la semana en un solo INSERT
          // Si el usuario definió su horario semanal, usarlo; si no, usar el template
          const sessionsData = input.weekSchedule
            ? buildScheduledSessions(
                planWeek.id,
                week,
                input.weekSchedule,
                planStart,
                weekIndex,
                hrZones,
                input.hoursPerSession,
                gymExercises
              )
            : week.sessions.map((session) => ({
                weekId: planWeek.id,
                dayOfWeek: session.dayOfWeek,
                type: session.type as any,
                durationMin: session.durationMin,
                zoneTarget: session.zoneTarget,
                structure: session.structure,
                date: sessionDate(planStart, weekIndex, session.dayOfWeek),
              }))

          await tx.plannedSession.createMany({ data: sessionsData as any })
        }
      }

      return trainingPlan
    }, { timeout: 30000 })

    // Determinar sport.type y sport.goal a partir del goalType
    const goalTypeUpper = input.goalType.toUpperCase()
    let sportType: 'RUNNING' | 'CYCLING' | 'TRIATHLON' | 'SWIMMING' | 'STRENGTH' | 'GENERAL'
    let sportGoal: 'RACE' | 'BODY_RECOMPOSITION' | 'GENERAL_FITNESS'

    if (goalTypeUpper.startsWith('RACE_CYCLING')) {
      sportType = 'CYCLING'
      sportGoal = 'RACE'
    } else if (goalTypeUpper.startsWith('RACE_TRIATHLON')) {
      sportType = 'TRIATHLON'
      sportGoal = 'RACE'
    } else if (goalTypeUpper.startsWith('RACE_')) {
      sportType = 'RUNNING'
      sportGoal = 'RACE'
    } else if (goalTypeUpper === 'BODY_RECOMPOSITION' || goalTypeUpper === 'WEIGHT_LOSS') {
      sportType = 'STRENGTH'
      sportGoal = 'BODY_RECOMPOSITION'
    } else {
      sportType = 'GENERAL'
      sportGoal = 'GENERAL_FITNESS'
    }

    // Actualizar User.config tras guardar el plan
    const existingUser = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { config: true },
    })
    const currentConfig = parseUserConfig(existingUser?.config)

    // B2C (generado por AI): auto-activar con trial 30 días
    // B2B (generado por coach): features las activa el coach manualmente
    const isB2C = input.generatedBy !== 'COACH'
    const trialEndsAt = isB2C
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      : currentConfig.trial?.endsAt ?? null

    const newConfig = {
      ...currentConfig,
      features: {
        ...currentConfig.features,
        ...(isB2C ? {
          plan: true,
          checkin: true,
          nutrition: true,
          progress: true,
          log: true,
        } : {}),
      },
      onboarding: {
        completed: true,
        completedAt: new Date().toISOString(),
      },
      plan: {
        activePlanId: result.id,
        currentWeek: 1,
        totalWeeks: result.totalWeeks,
        phase: 'BASE' as const,
      },
      sport: {
        type: sportType,
        goal: sportGoal,
      },
      trial: {
        plan: isB2C ? ('TRIAL' as const) : (currentConfig.trial?.plan ?? 'FREE' as const),
        endsAt: trialEndsAt,
      },
      ai: {
        ...currentConfig.ai,
        monthlyLimit: isB2C ? 999999 : currentConfig.ai.monthlyLimit,
      },
    }
    await prisma.user.update({
      where: { id: input.userId },
      data: { config: newConfig },
    })

    return {
      planId: result.id,
      recommendations,
      hrZones,
      hrMax,
      tdee,
    }
  } catch (dbError) {
    // BD no conectada o error de escritura — devolver datos sin planId real
    console.error('[generatePlan] DB error, falling back to mock:', dbError)
    const mockResult = buildMockResult(input)
    return {
      ...mockResult,
      recommendations: recommendations.length > 0 ? recommendations : mockResult.recommendations,
    }
  }
}
