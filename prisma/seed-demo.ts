/**
 * seed-demo.ts — Demo data for local demos with clients
 *
 * Creates: 1 coach + 6 athletes with historical data + plans
 * Run: pnpm tsx prisma/seed-demo.ts
 *
 * Users:
 *   coach_demo@medaliq.com       / Coach2026!    → Coach Carlos Medina
 *   sebastian_gym@medaliq.com    / Atleta2026!   → B2C Gym, Intermediate, 26yo
 *   valentina_run@medaliq.com    / Atleta2026!   → B2C Running, Intermediate, 29yo
 *   andres_b2b@medaliq.com      / Atleta2026!   → B2B Gym (Carlos), 28yo
 *   felipe_run@medaliq.com      / Atleta2026!   → B2B Running (Carlos), 32yo
 *   maria_gym@medaliq.com       / Atleta2026!   → B2B Gym (Carlos), 24yo
 *   camila_completed@medaliq.com / Atleta2026!  → B2B Gym (Carlos), 27yo · Plan COMPLETADO
 */

import 'dotenv/config'
import {
  PrismaClient, UserRole, GoalType, PlanStatus, PlanSource,
  Phase, SessionType, SessionIntensity, SessionDiscipline,
  SubscriptionTier, CoachSubscriptionTier, AthleteStatus,
} from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)

// ─── Helpers ────────────────────────────────────────────────────────────────

const TODAY = new Date('2026-08-06')

function daysAgo(n: number): Date {
  const d = new Date(TODAY)
  d.setDate(d.getDate() - n)
  return d
}

function daysFromNow(n: number): Date {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + n)
  return d
}

function dateOnly(d: Date): Date {
  return new Date(d.toISOString().split('T')[0] + 'T00:00:00.000Z')
}

function monday(d: Date): Date {
  const date = new Date(d)
  const day = date.getUTCDay()
  const diff = (day === 0 ? -6 : 1 - day)
  date.setUTCDate(date.getUTCDate() + diff)
  return dateOnly(date)
}

function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Demo seed starting...')

  const athletePassword = await bcrypt.hash('Atleta2026!', 12)

  // ── 1. Coach demo (already exists, update subscription) ──────────────────
  const coachDemo = await prisma.user.upsert({
    where: { email: 'coach_demo@medaliq.com' },
    update: {},
    create: {
      email: 'coach_demo@medaliq.com',
      name: 'Carlos Medina',
      password: await bcrypt.hash('Coach2026!', 12),
      role: UserRole.COACH,
      featureCoach: true,
      featurePlan: false, featureCheckin: false, featureNutrition: false,
      featureProgress: false, featureLog: false, featureGym: false,
      onboardingCompleted: true,
      identification: '1098765432',
      phoneWa: '+573001234567',
    },
  })
  console.log('Coach:', coachDemo.email)

  await prisma.userSubscription.upsert({
    where: { userId: coachDemo.id },
    update: { coachTier: CoachSubscriptionTier.GROWTH },
    create: {
      userId: coachDemo.id,
      tier: SubscriptionTier.PRO,
      coachTier: CoachSubscriptionTier.GROWTH,
    },
  })

  // ── 2. Athletes ───────────────────────────────────────────────────────────

  const athleteConfigs = [
    {
      email: 'sebastian_gym@medaliq.com',
      name: 'Sebastián Torres',
      sport: 'STRENGTH' as const,
      sportGoal: 'MUSCLE_GAIN',
      level: 'INTERMEDIATE' as const,
      age: 26, weightKg: 80, heightCm: 176, gender: 'male',
      hrResting: 62, goalType: GoalType.STRENGTH_TRAINING,
      isB2B: false,
      dateOfBirth: new Date('2000-03-15'),
    },
    {
      email: 'valentina_run@medaliq.com',
      name: 'Valentina Ospina',
      sport: 'RUNNING' as const,
      sportGoal: 'RACE',
      level: 'INTERMEDIATE' as const,
      age: 29, weightKg: 60, heightCm: 165, gender: 'female',
      hrResting: 58, goalType: GoalType.RACE_10K,
      isB2B: false,
      dateOfBirth: new Date('1997-06-22'),
    },
    {
      email: 'andres_b2b@medaliq.com',
      name: 'Andrés Morales',
      sport: 'STRENGTH' as const,
      sportGoal: 'MUSCLE_GAIN',
      level: 'INTERMEDIATE' as const,
      age: 28, weightKg: 78, heightCm: 175, gender: 'male',
      hrResting: 64, goalType: GoalType.STRENGTH_TRAINING,
      isB2B: true,
      dateOfBirth: new Date('1998-09-10'),
    },
    {
      email: 'felipe_run@medaliq.com',
      name: 'Felipe Ramírez',
      sport: 'RUNNING' as const,
      sportGoal: 'RACE',
      level: 'ADVANCED' as const,
      age: 32, weightKg: 72, heightCm: 178, gender: 'male',
      hrResting: 52, goalType: GoalType.RACE_10K,
      isB2B: true,
      dateOfBirth: new Date('1994-01-30'),
    },
    {
      email: 'maria_gym@medaliq.com',
      name: 'María Pérez',
      sport: 'STRENGTH' as const,
      sportGoal: 'GENERAL_FITNESS',
      level: 'BEGINNER' as const,
      age: 24, weightKg: 58, heightCm: 162, gender: 'female',
      hrResting: 68, goalType: GoalType.GENERAL_FITNESS,
      isB2B: true,
      dateOfBirth: new Date('2002-11-05'),
    },
  ]

  const athletes: Record<string, string> = {} // email → userId

  for (const cfg of athleteConfigs) {
    const hrMax = cfg.gender === 'female'
      ? Math.round(211 - 0.64 * cfg.age)
      : Math.round(220 - cfg.age)

    const user = await prisma.user.upsert({
      where: { email: cfg.email },
      update: {},
      create: {
        email: cfg.email,
        name: cfg.name,
        password: athletePassword,
        role: UserRole.ATHLETE,
        featurePlan: cfg.isB2B ? false : true,
        featureCheckin: cfg.isB2B ? false : true,
        featureNutrition: true,
        featureProgress: cfg.isB2B ? false : true,
        featureLog: true,
        featureGym: true,
        featureCoach: false,
        onboardingCompleted: true,
      },
    })

    // Enable features for B2B athletes (simulating coach activation)
    if (cfg.isB2B) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          featurePlan: true, featureCheckin: true, featureProgress: true,
        },
      })
    }

    await prisma.healthProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        age: cfg.age,
        weightKg: cfg.weightKg,
        heightCm: cfg.heightCm,
        gender: cfg.gender,
        dateOfBirth: cfg.dateOfBirth,
        hrResting: cfg.hrResting,
        hrMax,
        sport: cfg.sport,
        sportGoal: cfg.sportGoal,
        experienceLevel: cfg.level,
        sessionMinutes: 60,
        weightGoalKg: cfg.sport === 'RUNNING' ? cfg.weightKg - 3 : cfg.weightKg + 3,
      },
    })

    await prisma.userSubscription.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, tier: SubscriptionTier.PRO },
    })

    athletes[cfg.email] = user.id
    console.log('  Athlete:', cfg.email, '→', user.id)
  }

  // ── 3. Coach-Athlete links (B2B) ─────────────────────────────────────────

  const b2bEmails = ['andres_b2b@medaliq.com', 'felipe_run@medaliq.com', 'maria_gym@medaliq.com']
  for (const email of b2bEmails) {
    await prisma.coachAthlete.upsert({
      where: { coachId_athleteId: { coachId: coachDemo.id, athleteId: athletes[email] } },
      update: {},
      create: {
        coachId: coachDemo.id,
        athleteId: athletes[email],
        status: AthleteStatus.ACTIVE,
        coachGoal: email.includes('run')
          ? 'Bajar el 10K a sub-45 min en 8 semanas'
          : 'Ganar masa muscular y mejorar postura',
      },
    })
  }
  console.log('B2B links created')

  // ── 4. NutritionPlan for each athlete ────────────────────────────────────

  const nutritionData: Record<string, {
    tdee: number, targetKcalHard: number, targetKcalEasy: number,
    targetKcalRest: number, proteinG: number, carbsHardG: number,
    carbsEasyG: number, fatG: number
  }> = {
    'sebastian_gym@medaliq.com':  { tdee: 2800, targetKcalHard: 3100, targetKcalEasy: 2800, targetKcalRest: 2400, proteinG: 180, carbsHardG: 350, carbsEasyG: 290, fatG: 80 },
    'valentina_run@medaliq.com':  { tdee: 2100, targetKcalHard: 2350, targetKcalEasy: 2100, targetKcalRest: 1900, proteinG: 120, carbsHardG: 280, carbsEasyG: 240, fatG: 65 },
    'andres_b2b@medaliq.com':     { tdee: 2750, targetKcalHard: 3050, targetKcalEasy: 2750, targetKcalRest: 2400, proteinG: 175, carbsHardG: 340, carbsEasyG: 280, fatG: 78 },
    'felipe_run@medaliq.com':     { tdee: 2600, targetKcalHard: 2900, targetKcalEasy: 2600, targetKcalRest: 2200, proteinG: 145, carbsHardG: 340, carbsEasyG: 300, fatG: 72 },
    'maria_gym@medaliq.com':      { tdee: 1950, targetKcalHard: 2100, targetKcalEasy: 1950, targetKcalRest: 1750, proteinG: 110, carbsHardG: 230, carbsEasyG: 200, fatG: 62 },
  }

  for (const [email, nut] of Object.entries(nutritionData)) {
    await prisma.nutritionPlan.upsert({
      where: { userId: athletes[email] },
      update: {},
      create: { userId: athletes[email], ...nut },
    })
  }
  console.log('Nutrition plans created')

  // ── 5. Training Plans (running athletes: valentina + felipe) ─────────────

  // Weeks:
  // W1: Jul 21 (Mon) → Jul 27 (Sun) — past, completed
  // W2: Jul 28 (Mon) → Aug 3 (Sun)  — past, completed
  // W3: Aug 4 (Mon)  → Aug 10 (Sun) — current (partially done)
  // W4: Aug 11 (Mon) → Aug 17 (Sun) — future

  const runW1Start = new Date('2026-07-21T00:00:00.000Z')
  const runPlanEnd = new Date('2026-08-17T23:59:59.999Z')

  const runningAthletes = [
    { email: 'valentina_run@medaliq.com', name: 'Plan Running — Valentina', source: PlanSource.ATHLETE },
    { email: 'felipe_run@medaliq.com', name: 'Plan Running 10K — Felipe', source: PlanSource.COACH },
  ]

  const trainingPlanIds: Record<string, string> = {}

  // Delete existing plans to allow idempotent re-run
  for (const ra of runningAthletes) {
    await prisma.trainingPlan.deleteMany({ where: { userId: athletes[ra.email] } })
  }

  for (const ra of runningAthletes) {
    const hrMax = ra.email === 'valentina_run@medaliq.com' ? 194 : 188
    const hrZones = {
      z1: { min: Math.round(hrMax * 0.50), max: Math.round(hrMax * 0.60) },
      z2: { min: Math.round(hrMax * 0.60), max: Math.round(hrMax * 0.70) },
      z3: { min: Math.round(hrMax * 0.70), max: Math.round(hrMax * 0.80) },
      z4: { min: Math.round(hrMax * 0.80), max: Math.round(hrMax * 0.90) },
      z5: { min: Math.round(hrMax * 0.90), max: hrMax },
    }

    const plan = await prisma.trainingPlan.create({
      data: {
        userId: athletes[ra.email],
        name: ra.name,
        goalType: GoalType.RACE_10K,
        totalWeeks: 4,
        startDate: runW1Start,
        endDate: runPlanEnd,
        status: PlanStatus.ACTIVE,
        hrZones,
        generatedBy: ra.source,
      },
    })
    trainingPlanIds[ra.email] = plan.id

    // Create 4 weeks
    const weekDefs = [
      { n: 1, start: '2026-07-21', end: '2026-07-27', phase: Phase.BASE,       volumeKm: 28, focus: 'Semana de base — rodajes Z2 y un tempo suave' },
      { n: 2, start: '2026-07-28', end: '2026-08-03', phase: Phase.DESARROLLO, volumeKm: 32, focus: 'Semana de desarrollo — incremento de volumen e intervalos' },
      { n: 3, start: '2026-08-04', end: '2026-08-10', phase: Phase.DESARROLLO, volumeKm: 35, focus: 'Semana de desarrollo — tirada larga + fartlek' },
      { n: 4, start: '2026-08-11', end: '2026-08-17', phase: Phase.ESPECIFICO, volumeKm: 30, focus: 'Semana específica — simulacro de carrera y afinamiento' },
    ]

    for (const wd of weekDefs) {
      const week = await prisma.planWeek.create({
        data: {
          planId: plan.id,
          weekNumber: wd.n,
          phase: wd.phase,
          volumeKm: wd.volumeKm,
          focusDescription: wd.focus,
          startDate: new Date(wd.start + 'T00:00:00.000Z'),
          endDate: new Date(wd.end + 'T23:59:59.999Z'),
        },
      })

      // Create sessions per week
      const sessionTemplates: { day: number; type: SessionType; int: SessionIntensity; dur: number; zone: string | null; detail: string }[] = [
        { day: 2, type: SessionType.RODAJE_Z2,    int: SessionIntensity.LOW,      dur: 45, zone: 'Z2', detail: `Rodaje continuo Z2 — mantén FC ${Math.round(hrMax * 0.62)}-${Math.round(hrMax * 0.68)} bpm` },
        { day: 4, type: SessionType.TEMPO,         int: SessionIntensity.MODERATE, dur: 50, zone: 'Z3-Z4', detail: `Tempo 20 min a ritmo Z3-Z4 — FC ${Math.round(hrMax * 0.72)}-${Math.round(hrMax * 0.82)} bpm` },
        { day: 6, type: SessionType.TIRADA_LARGA,  int: SessionIntensity.LOW,      dur: 70, zone: 'Z2', detail: `Tirada larga Z2 — ritmo conversacional` },
        { day: 7, type: SessionType.DESCANSO,      int: SessionIntensity.REST,     dur: 0, zone: null, detail: 'Descanso activo o recuperación' },
      ]

      if (wd.n === 2 || wd.n === 3) {
        sessionTemplates[1] = { day: 4, type: SessionType.INTERVALOS, int: SessionIntensity.HIGH, dur: 55, zone: 'Z4-Z5', detail: `Intervalos 5×1km a ritmo objetivo 10K — FC ${Math.round(hrMax * 0.85)}-${Math.round(hrMax * 0.95)} bpm` }
      }
      if (wd.n === 4) {
        sessionTemplates[1] = { day: 4, type: SessionType.SIMULACRO,  int: SessionIntensity.HIGH, dur: 55, zone: 'Z4', detail: 'Simulacro de 8km a ritmo objetivo — ¡a tope!' }
      }

      for (const st of sessionTemplates) {
        const weekStart = new Date(wd.start + 'T00:00:00.000Z')
        const sessionDate = new Date(weekStart)
        sessionDate.setUTCDate(weekStart.getUTCDate() + (st.day - 1))

        await prisma.plannedSession.create({
          data: {
            weekId: week.id,
            dayOfWeek: st.day,
            type: st.type,
            intensity: st.int,
            durationMin: st.dur,
            zoneTarget: st.zone,
            detailText: st.detail,
            date: sessionDate,
          },
        })
      }
    }
    console.log('  Training plan:', ra.email)
  }

  // ── 5b. WorkoutTemplates — gym B2B athletes (Andrés: PPL, María: Full Body) ─

  // Delete existing templates from coach_demo to allow idempotent re-run
  await prisma.workoutTemplate.deleteMany({ where: { coachId: coachDemo.id } })

  // Andrés: Push/Pull/Legs 3 days — Intermediate, Muscle Gain
  const templateAndres = await prisma.workoutTemplate.create({
    data: {
      coachId: coachDemo.id,
      name: 'PPL — Andrés Morales',
      description: 'Push / Pull / Legs 3 días para hipertrofia intermedia',
      goal: 'HYPERTROPHY',
      level: 'INTERMEDIATE',
      daysPerWeek: 3,
      category: 'PPL',
      isPublic: false,
      isActive: true,
    },
  })

  const daysPPL = [
    {
      dayOfWeek: 1, label: 'Lunes — Push: Pecho y Tríceps', muscleGroups: ['Pecho', 'Tríceps'],
      exercises: [
        { exerciseId: 'global-exercise-press-plano-barra',     order: 1, sets: 4, repsScheme: '10-10-8-8', restSeconds: 90 },
        { exerciseId: 'global-exercise-cruces-polea-alta',     order: 2, sets: 3, repsScheme: '12-12-10', restSeconds: 60 },
        { exerciseId: 'global-exercise-extension-triceps-polea', order: 3, sets: 3, repsScheme: '15-15-12', restSeconds: 60 },
      ],
    },
    {
      dayOfWeek: 3, label: 'Miércoles — Pull: Espalda y Bíceps', muscleGroups: ['Espalda', 'Bíceps'],
      exercises: [
        { exerciseId: 'global-exercise-dominadas',          order: 1, sets: 4, repsScheme: '8-8-6-6', restSeconds: 90 },
        { exerciseId: 'global-exercise-remo-barra',         order: 2, sets: 3, repsScheme: '10-10-8', restSeconds: 90 },
        { exerciseId: 'global-exercise-martillo-mancuernas', order: 3, sets: 3, repsScheme: '12-12-10', restSeconds: 60 },
      ],
    },
    {
      dayOfWeek: 5, label: 'Viernes — Legs: Piernas Completas', muscleGroups: ['Cuádriceps', 'Femorales', 'Glúteos'],
      exercises: [
        { exerciseId: 'global-exercise-sentadilla-sumo',    order: 1, sets: 4, repsScheme: '10-10-8-8', restSeconds: 120 },
        { exerciseId: 'global-exercise-prensa',             order: 2, sets: 3, repsScheme: '12-12-10', restSeconds: 90 },
        { exerciseId: 'global-exercise-extension-rodillas', order: 3, sets: 3, repsScheme: '15-15-12', restSeconds: 60 },
      ],
    },
  ]

  for (const d of daysPPL) {
    const day = await prisma.workoutDay.create({
      data: {
        templateId: templateAndres.id,
        dayOfWeek: d.dayOfWeek,
        label: d.label,
        muscleGroups: d.muscleGroups,
        isRestDay: false,
      },
    })
    for (const ex of d.exercises) {
      await prisma.workoutExercise.create({
        data: { dayId: day.id, ...ex },
      })
    }
  }

  await prisma.assignedWorkout.create({
    data: {
      templateId: templateAndres.id,
      athleteId: athletes['andres_b2b@medaliq.com'],
      coachId: coachDemo.id,
      startDate: new Date('2026-07-21T00:00:00.000Z'),
      weeksDuration: 8,
      isActive: true,
      notes: 'PPL 3 días — foco en volumen y progresión de cargas. Revisar técnica en sentadilla.',
    },
  })
  console.log('  Workout template assigned: Andrés (PPL)')

  // María: Full Body A/B 3 days — Beginner, General Fitness
  const templateMaria = await prisma.workoutTemplate.create({
    data: {
      coachId: coachDemo.id,
      name: 'Full Body — María Pérez',
      description: 'Full Body A/B alternado 3 días para principiantes',
      goal: 'TONING',
      level: 'BEGINNER',
      daysPerWeek: 3,
      category: 'FULL_BODY',
      isPublic: false,
      isActive: true,
    },
  })

  const daysFullBody = [
    {
      dayOfWeek: 1, label: 'Lunes — Full Body A', muscleGroups: ['Cuádriceps', 'Pecho', 'Espalda'],
      exercises: [
        { exerciseId: 'global-exercise-sentadilla-sumo',     order: 1, sets: 3, repsScheme: '12-12-10', restSeconds: 90 },
        { exerciseId: 'global-exercise-press-plano-barra',   order: 2, sets: 3, repsScheme: '12-12-10', restSeconds: 60 },
        { exerciseId: 'global-exercise-jalon-polea-alta',    order: 3, sets: 3, repsScheme: '12-12-10', restSeconds: 60 },
      ],
    },
    {
      dayOfWeek: 3, label: 'Miércoles — Full Body B', muscleGroups: ['Glúteos', 'Femorales', 'Hombros'],
      exercises: [
        { exerciseId: 'global-exercise-hip-thrust',          order: 1, sets: 3, repsScheme: '15-15-12', restSeconds: 90 },
        { exerciseId: 'global-exercise-avanzadas',           order: 2, sets: 3, repsScheme: '12-12-10', restSeconds: 60 },
        { exerciseId: 'global-exercise-elevacion-lateral',   order: 3, sets: 3, repsScheme: '15-15-12', restSeconds: 60 },
      ],
    },
    {
      dayOfWeek: 5, label: 'Viernes — Full Body A (variante)', muscleGroups: ['Cuádriceps', 'Pecho', 'Espalda'],
      exercises: [
        { exerciseId: 'global-exercise-peso-muerto',         order: 1, sets: 3, repsScheme: '12-12-10', restSeconds: 90 },
        { exerciseId: 'global-exercise-press-inclinado-barra', order: 2, sets: 3, repsScheme: '12-12-10', restSeconds: 60 },
        { exerciseId: 'global-exercise-remo-mancuernas',     order: 3, sets: 3, repsScheme: '12-12-10', restSeconds: 60 },
      ],
    },
  ]

  for (const d of daysFullBody) {
    const day = await prisma.workoutDay.create({
      data: {
        templateId: templateMaria.id,
        dayOfWeek: d.dayOfWeek,
        label: d.label,
        muscleGroups: d.muscleGroups,
        isRestDay: false,
      },
    })
    for (const ex of d.exercises) {
      await prisma.workoutExercise.create({
        data: { dayId: day.id, ...ex },
      })
    }
  }

  await prisma.assignedWorkout.create({
    data: {
      templateId: templateMaria.id,
      athleteId: athletes['maria_gym@medaliq.com'],
      coachId: coachDemo.id,
      startDate: new Date('2026-07-21T00:00:00.000Z'),
      weeksDuration: 8,
      isActive: true,
      notes: 'Full Body 3 días — énfasis en técnica y activación de glúteos. Progresión gradual.',
    },
  })
  console.log('  Workout template assigned: María (Full Body A/B)')

  // ── 6. SessionLogs — running athletes (past 2 weeks: Jul 23 – Aug 5) ─────
  //    These are FREE logs (no plannedSessionId) for simplicity

  const runSessionData: { email: string; date: string; km: number; min: number; rpe: number; hr: number; type: SessionType; disc: SessionDiscipline }[] = [
    // valentina_run
    { email: 'valentina_run@medaliq.com', date: '2026-07-23', km: 8.2,  min: 52, rpe: 6, hr: 152, type: SessionType.RODAJE_Z2,   disc: SessionDiscipline.RUNNING },
    { email: 'valentina_run@medaliq.com', date: '2026-07-25', km: 6.5,  min: 42, rpe: 7, hr: 165, type: SessionType.TEMPO,        disc: SessionDiscipline.RUNNING },
    { email: 'valentina_run@medaliq.com', date: '2026-07-27', km: 12.1, min: 78, rpe: 6, hr: 155, type: SessionType.TIRADA_LARGA, disc: SessionDiscipline.RUNNING },
    { email: 'valentina_run@medaliq.com', date: '2026-07-30', km: 8.5,  min: 54, rpe: 7, hr: 158, type: SessionType.RODAJE_Z2,   disc: SessionDiscipline.RUNNING },
    { email: 'valentina_run@medaliq.com', date: '2026-08-01', km: 5.0,  min: 35, rpe: 8, hr: 172, type: SessionType.INTERVALOS,  disc: SessionDiscipline.RUNNING },
    { email: 'valentina_run@medaliq.com', date: '2026-08-03', km: 13.0, min: 84, rpe: 6, hr: 153, type: SessionType.TIRADA_LARGA, disc: SessionDiscipline.RUNNING },
    { email: 'valentina_run@medaliq.com', date: '2026-08-05', km: 7.0,  min: 45, rpe: 6, hr: 150, type: SessionType.RODAJE_Z2,   disc: SessionDiscipline.RUNNING },
    // felipe_run
    { email: 'felipe_run@medaliq.com', date: '2026-07-23', km: 10.0, min: 52, rpe: 6, hr: 148, type: SessionType.RODAJE_Z2,   disc: SessionDiscipline.RUNNING },
    { email: 'felipe_run@medaliq.com', date: '2026-07-25', km: 8.0,  min: 40, rpe: 8, hr: 170, type: SessionType.TEMPO,        disc: SessionDiscipline.RUNNING },
    { email: 'felipe_run@medaliq.com', date: '2026-07-27', km: 16.0, min: 86, rpe: 7, hr: 156, type: SessionType.TIRADA_LARGA, disc: SessionDiscipline.RUNNING },
    { email: 'felipe_run@medaliq.com', date: '2026-07-29', km: 8.5,  min: 44, rpe: 7, hr: 152, type: SessionType.RODAJE_Z2,   disc: SessionDiscipline.RUNNING },
    { email: 'felipe_run@medaliq.com', date: '2026-07-31', km: 6.0,  min: 36, rpe: 9, hr: 176, type: SessionType.INTERVALOS,  disc: SessionDiscipline.RUNNING },
    { email: 'felipe_run@medaliq.com', date: '2026-08-02', km: 14.0, min: 72, rpe: 7, hr: 160, type: SessionType.TIRADA_LARGA, disc: SessionDiscipline.RUNNING },
    { email: 'felipe_run@medaliq.com', date: '2026-08-04', km: 9.0,  min: 47, rpe: 6, hr: 146, type: SessionType.RODAJE_Z2,   disc: SessionDiscipline.RUNNING },
  ]

  for (const s of runSessionData) {
    const d = new Date(s.date + 'T00:00:00.000Z')
    await prisma.sessionLog.create({
      data: {
        userId: athletes[s.email],
        sessionDate: d,
        completedAt: new Date(s.date + 'T18:00:00.000Z'),
        rpe: s.rpe,
        hrAvg: s.hr,
        hrMax: s.hr + 12,
        distanceKm: s.km,
        durationMin: s.min,
        freeSessionType: s.type,
        discipline: s.disc,
        dataSource: 'MANUAL',
        avgPaceSecPerKm: Math.round((s.min * 60) / s.km),
      },
    })
  }
  console.log('Running session logs created')

  // ── 7. GymSessions + SetLogs (gym athletes: sebastian, andres, maria) ────

  const gymSessionData = [
    // sebastian_gym (B2C, Intermediate)
    { email: 'sebastian_gym@medaliq.com', date: '2026-07-23', label: 'Push — Pecho y Tríceps',    rpe: 7, exercises: [
      { name: 'Press Banca', sets: [[80,10],[80,10],[85,8],[85,8]] },
      { name: 'Press Inclinado Mancuerna', sets: [[30,12],[30,12],[32,10]] },
      { name: 'Fondos Tríceps', sets: [[0,15],[0,15],[0,12]] },
    ]},
    { email: 'sebastian_gym@medaliq.com', date: '2026-07-25', label: 'Pull — Espalda y Bíceps',   rpe: 8, exercises: [
      { name: 'Dominadas', sets: [[0,8],[0,8],[0,6]] },
      { name: 'Remo con Barra', sets: [[70,10],[70,10],[75,8]] },
      { name: 'Curl Bíceps Mancuerna', sets: [[16,12],[16,12],[18,10]] },
    ]},
    { email: 'sebastian_gym@medaliq.com', date: '2026-07-28', label: 'Legs — Cuádriceps y Glúteos', rpe: 8, exercises: [
      { name: 'Sentadilla', sets: [[100,10],[100,10],[105,8],[105,8]] },
      { name: 'Prensa', sets: [[180,12],[180,12],[190,10]] },
      { name: 'Extensión Cuádriceps', sets: [[60,15],[60,15],[65,12]] },
    ]},
    { email: 'sebastian_gym@medaliq.com', date: '2026-07-30', label: 'Push — Hombros',            rpe: 7, exercises: [
      { name: 'Press Militar', sets: [[60,10],[60,10],[65,8]] },
      { name: 'Elevaciones Laterales', sets: [[12,15],[12,15],[14,12]] },
      { name: 'Press Arnold', sets: [[24,12],[24,12],[26,10]] },
    ]},
    { email: 'sebastian_gym@medaliq.com', date: '2026-08-01', label: 'Pull — Espalda Completa',   rpe: 7, exercises: [
      { name: 'Jalón al Pecho', sets: [[70,12],[70,12],[75,10]] },
      { name: 'Remo Máquina', sets: [[75,12],[75,12],[80,10]] },
      { name: 'Face Pull', sets: [[35,15],[35,15],[35,15]] },
    ]},
    { email: 'sebastian_gym@medaliq.com', date: '2026-08-04', label: 'Legs — Femorales y Gemelos', rpe: 8, exercises: [
      { name: 'Peso Muerto Rumano', sets: [[90,10],[90,10],[95,8]] },
      { name: 'Curl Femoral', sets: [[55,12],[55,12],[60,10]] },
      { name: 'Elevación de Gemelos', sets: [[80,20],[80,20],[80,18]] },
    ]},
    // andres_b2b (B2B, Intermediate)
    { email: 'andres_b2b@medaliq.com', date: '2026-07-24', label: 'Pecho y Tríceps', rpe: 7, exercises: [
      { name: 'Press Banca', sets: [[75,10],[75,10],[80,8]] },
      { name: 'Aperturas Polea', sets: [[20,15],[20,15],[22,12]] },
      { name: 'Extensión Tríceps Polea', sets: [[35,15],[35,15],[37,12]] },
    ]},
    { email: 'andres_b2b@medaliq.com', date: '2026-07-26', label: 'Espalda y Bíceps', rpe: 8, exercises: [
      { name: 'Jalón al Pecho', sets: [[75,10],[75,10],[80,8]] },
      { name: 'Remo con Barra', sets: [[65,10],[65,10],[70,8]] },
      { name: 'Curl Martillo', sets: [[18,12],[18,12],[20,10]] },
    ]},
    { email: 'andres_b2b@medaliq.com', date: '2026-07-29', label: 'Piernas Completas', rpe: 9, exercises: [
      { name: 'Sentadilla', sets: [[90,10],[90,10],[95,8],[95,8]] },
      { name: 'Zancadas', sets: [[30,12],[30,12],[30,12]] },
      { name: 'Press de Piernas', sets: [[160,12],[160,12],[170,10]] },
    ]},
    { email: 'andres_b2b@medaliq.com', date: '2026-07-31', label: 'Hombros y Core', rpe: 7, exercises: [
      { name: 'Press Militar', sets: [[55,10],[55,10],[60,8]] },
      { name: 'Elevaciones Laterales', sets: [[10,15],[10,15],[12,12]] },
      { name: 'Plancha Abdominal', sets: [[0,45],[0,45],[0,40]] },
    ]},
    { email: 'andres_b2b@medaliq.com', date: '2026-08-02', label: 'Pecho y Tríceps', rpe: 8, exercises: [
      { name: 'Press Banca', sets: [[77.5,10],[77.5,10],[82.5,8]] },
      { name: 'Fondos Tríceps', sets: [[0,12],[0,12],[0,10]] },
    ]},
    { email: 'andres_b2b@medaliq.com', date: '2026-08-05', label: 'Espalda y Bíceps', rpe: 7, exercises: [
      { name: 'Jalón al Pecho', sets: [[77.5,10],[77.5,10],[82.5,8]] },
      { name: 'Curl Bíceps Barra', sets: [[35,12],[35,12],[37,10]] },
    ]},
    // maria_gym (B2B, Beginner)
    { email: 'maria_gym@medaliq.com', date: '2026-07-23', label: 'Full Body A', rpe: 6, exercises: [
      { name: 'Sentadilla Goblet', sets: [[20,12],[20,12],[22,10]] },
      { name: 'Press Mancuerna Pecho', sets: [[12,12],[12,12],[14,10]] },
      { name: 'Remo con Mancuerna', sets: [[14,12],[14,12],[16,10]] },
    ]},
    { email: 'maria_gym@medaliq.com', date: '2026-07-26', label: 'Full Body B', rpe: 6, exercises: [
      { name: 'Peso Muerto Mancuerna', sets: [[30,12],[30,12],[32,10]] },
      { name: 'Zancadas', sets: [[16,12],[16,12],[18,10]] },
      { name: 'Plancha Abdominal', sets: [[0,30],[0,30],[0,30]] },
    ]},
    { email: 'maria_gym@medaliq.com', date: '2026-07-29', label: 'Full Body A', rpe: 7, exercises: [
      { name: 'Sentadilla Goblet', sets: [[22,12],[22,12],[24,10]] },
      { name: 'Press Mancuerna Pecho', sets: [[14,12],[14,12],[14,10]] },
      { name: 'Hip Thrust', sets: [[30,15],[30,15],[35,12]] },
    ]},
    { email: 'maria_gym@medaliq.com', date: '2026-08-02', label: 'Full Body B', rpe: 6, exercises: [
      { name: 'Peso Muerto Mancuerna', sets: [[32,12],[32,12],[34,10]] },
      { name: 'Jalón Polea', sets: [[35,12],[35,12],[40,10]] },
      { name: 'Plancha Abdominal', sets: [[0,35],[0,35],[0,30]] },
    ]},
    { email: 'maria_gym@medaliq.com', date: '2026-08-05', label: 'Full Body A', rpe: 7, exercises: [
      { name: 'Sentadilla Goblet', sets: [[24,12],[24,12],[26,10]] },
      { name: 'Hip Thrust', sets: [[35,15],[35,15],[40,12]] },
      { name: 'Zancadas', sets: [[18,12],[18,12],[20,10]] },
    ]},
  ]

  for (const gs of gymSessionData) {
    const athleteId = athletes[gs.email]
    const sessionDate = new Date(gs.date + 'T00:00:00.000Z')

    const gymSession = await prisma.gymSession.create({
      data: {
        athleteId,
        dayOfWeek: sessionDate.getUTCDay() || 7,
        date: sessionDate,
        durationMin: 55 + Math.floor(Math.random() * 20),
        rpe: gs.rpe,
        notes: gs.label,
        completed: true,
      },
    })

    let setOrder = 1
    for (const ex of gs.exercises) {
      for (let i = 0; i < ex.sets.length; i++) {
        const [weight, reps] = ex.sets[i] as [number, number]
        await prisma.setLog.create({
          data: {
            sessionId: gymSession.id,
            exerciseName: ex.name,
            setNumber: i + 1,
            weightKg: weight || null,
            repsCompleted: reps,
            completed: true,
            setLogType: 'WORK',
          },
        })
        setOrder++
      }
    }

    // Also create a SessionLog for the gym session (for dashboard metrics)
    await prisma.sessionLog.create({
      data: {
        userId: athleteId,
        sessionDate,
        completedAt: new Date(gs.date + 'T20:00:00.000Z'),
        rpe: gs.rpe,
        durationMin: 55 + Math.floor(Math.random() * 20),
        notes: gs.label,
        freeSessionType: SessionType.FUERZA,
        discipline: SessionDiscipline.STRENGTH,
        dataSource: 'MANUAL',
      },
    })
  }
  console.log('Gym sessions + session logs created')

  // ── 8. WeeklyCheckIns (weeks 30 and 31 of 2026) ──────────────────────────

  // Week 30: Jul 21–27 — weekNumber 30
  // Week 31: Jul 28 – Aug 3 — weekNumber 31

  const checkInData = [
    { email: 'sebastian_gym@medaliq.com',
      checkIns: [
        { wn: 30, at: '2026-07-25', weightKg: 80.2, hrResting: 62, sleepHours: 7.5, sleepScore: 7, energy: 7, rpe: 8, dietPct: 80, stress: 3, motivation: 8, pain: 0, waist: 86, arms: 38 },
        { wn: 31, at: '2026-08-01', weightKg: 79.8, hrResting: 61, sleepHours: 7.8, sleepScore: 8, energy: 8, rpe: 8, dietPct: 85, stress: 3, motivation: 8, pain: 0, waist: 85, arms: 38.5 },
      ]
    },
    { email: 'valentina_run@medaliq.com',
      checkIns: [
        { wn: 30, at: '2026-07-25', weightKg: 60.1, hrResting: 57, sleepHours: 7.2, sleepScore: 7, energy: 7, rpe: 7, dietPct: 75, stress: 3, motivation: 7, pain: 1, waist: 70, hips: 94 },
        { wn: 31, at: '2026-08-01', weightKg: 59.8, hrResting: 57, sleepHours: 7.5, sleepScore: 8, energy: 8, rpe: 8, dietPct: 80, stress: 4, motivation: 7, pain: 1, waist: 69.5, hips: 93 },
      ]
    },
    { email: 'andres_b2b@medaliq.com',
      checkIns: [
        { wn: 30, at: '2026-07-25', weightKg: 78.3, hrResting: 64, sleepHours: 7.0, sleepScore: 6, energy: 7, rpe: 9, dietPct: 78, stress: 5, motivation: 7, pain: 2, waist: 84, arms: 37 },
        { wn: 31, at: '2026-08-01', weightKg: 78.0, hrResting: 63, sleepHours: 7.2, sleepScore: 7, energy: 7, rpe: 8, dietPct: 82, stress: 4, motivation: 8, pain: 1, waist: 83.5, arms: 37.2 },
      ]
    },
    { email: 'felipe_run@medaliq.com',
      checkIns: [
        { wn: 30, at: '2026-07-26', weightKg: 72.1, hrResting: 52, sleepHours: 7.8, sleepScore: 8, energy: 8, rpe: 7, dietPct: 85, stress: 3, motivation: 8, pain: 0, waist: 78 },
        { wn: 31, at: '2026-08-02', weightKg: 71.8, hrResting: 51, sleepHours: 8.0, sleepScore: 9, energy: 9, rpe: 9, dietPct: 88, stress: 4, motivation: 9, pain: 2, waist: 77.5 },
      ]
    },
    { email: 'maria_gym@medaliq.com',
      checkIns: [
        { wn: 30, at: '2026-07-25', weightKg: 58.2, hrResting: 68, sleepHours: 7.0, sleepScore: 7, energy: 6, rpe: 6, dietPct: 70, stress: 2, motivation: 7, pain: 0, waist: 74, hips: 96 },
        { wn: 31, at: '2026-08-01', weightKg: 58.0, hrResting: 67, sleepHours: 7.2, sleepScore: 7, energy: 7, rpe: 6, dietPct: 72, stress: 2, motivation: 8, pain: 0, waist: 73.5, hips: 95.5 },
      ]
    },
  ]

  for (const ci of checkInData) {
    for (const c of ci.checkIns) {
      try {
        await prisma.weeklyCheckIn.create({
          data: {
            userId: athletes[ci.email],
            weekNumber: c.wn,
            recordedAt: new Date(c.at + 'T10:00:00.000Z'),
            weightKg: c.weightKg,
            hrResting: c.hrResting,
            sleepHours: c.sleepHours,
            sleepScore: c.sleepScore,
            energyLevel: c.energy,
            hardestSessionRpe: c.rpe,
            dietAdherencePct: c.dietPct,
            stressLevel: c.stress,
            motivationLevel: c.motivation,
            painLevel: c.pain,
            waistCm: (c as any).waist ?? null,
            armsCm: (c as any).arms ?? null,
            hipsCm: (c as any).hips ?? null,
            adjustmentsTriggered: [],
          },
        })
      } catch (e: any) {
        if (e.code === 'P2002') {
          console.log(`    CheckIn already exists: ${ci.email} week ${c.wn}`)
        } else throw e
      }
    }
  }
  console.log('Weekly check-ins created')

  // ── 9. FoodLogs (basic — uses any available food from DB) ────────────────

  const foods = await prisma.food.findMany({
    where: { isActive: true },
    select: { id: true, name: true, kcalPer100g: true, proteinPer100g: true, carbsPer100g: true, fatPer100g: true },
    take: 20,
  })

  if (foods.length > 0) {
    const foodByIndex = (i: number) => foods[i % foods.length]
    const mealTypes = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'] as const

    const logDays = [
      '2026-07-24', '2026-07-25', '2026-07-28', '2026-07-29',
      '2026-07-31', '2026-08-01', '2026-08-04', '2026-08-05',
    ]

    const foodAthletes = [
      'sebastián_gym@medaliq.com', 'valentina_run@medaliq.com',
      'andres_b2b@medaliq.com', 'felipe_run@medaliq.com',
    ]

    let foodIdx = 0
    for (const email of ['sebastian_gym@medaliq.com', 'valentina_run@medaliq.com', 'andres_b2b@medaliq.com', 'felipe_run@medaliq.com']) {
      for (const day of logDays.slice(0, 4)) {
        for (const meal of ['BREAKFAST', 'LUNCH', 'DINNER'] as const) {
          const food = foodByIndex(foodIdx++)
          const grams = meal === 'LUNCH' ? 200 : 150
          await prisma.foodLog.create({
            data: {
              userId: athletes[email],
              foodId: food.id,
              date: new Date(day + 'T00:00:00.000Z'),
              mealType: meal,
              grams,
              kcalLogged: (food.kcalPer100g * grams) / 100,
              proteinLogged: (food.proteinPer100g * grams) / 100,
              carbsLogged: (food.carbsPer100g * grams) / 100,
              fatLogged: (food.fatPer100g * grams) / 100,
            },
          }).catch(() => {}) // skip duplicates silently
        }
      }
    }
    console.log('Food logs created')
  } else {
    console.log('No foods in DB — skipping food logs')
  }

  // ── 10. Camila — B2B Gym athlete with COMPLETED plan ─────────────────────
  {
    const camilaEmail = 'camila_completed@medaliq.com'
    const camilaAge = 27
    const camilaHrMax = Math.round(211 - 0.64 * camilaAge) // female formula

    const camilaUser = await prisma.user.upsert({
      where: { email: camilaEmail },
      update: {},
      create: {
        email: camilaEmail,
        name: 'Camila Herrera',
        password: athletePassword,
        role: UserRole.ATHLETE,
        featurePlan: true, featureCheckin: true, featureNutrition: true,
        featureProgress: true, featureLog: true, featureGym: true,
        featureCoach: false,
        onboardingCompleted: true,
      },
    })

    await prisma.healthProfile.upsert({
      where: { userId: camilaUser.id },
      update: {},
      create: {
        userId: camilaUser.id,
        age: camilaAge, weightKg: 62, heightCm: 168, gender: 'female',
        dateOfBirth: new Date('1999-04-12'),
        hrResting: 60, hrMax: camilaHrMax,
        sport: 'STRENGTH', sportGoal: 'BODY_RECOMPOSITION',
        experienceLevel: 'INTERMEDIATE', sessionMinutes: 60,
        weightGoalKg: 59,
      },
    })

    await prisma.userSubscription.upsert({
      where: { userId: camilaUser.id },
      update: {},
      create: { userId: camilaUser.id, tier: SubscriptionTier.PRO },
    })

    // B2B link to coach Carlos
    await prisma.coachAthlete.upsert({
      where: { coachId_athleteId: { coachId: coachDemo.id, athleteId: camilaUser.id } },
      update: {},
      create: {
        coachId: coachDemo.id,
        athleteId: camilaUser.id,
        status: AthleteStatus.ACTIVE,
        coachGoal: 'Recomposición corporal — perder grasa y ganar tono muscular',
      },
    })

    // Nutrition plan
    await prisma.nutritionPlan.upsert({
      where: { userId: camilaUser.id },
      update: {},
      create: {
        userId: camilaUser.id,
        tdee: 2050, targetKcalHard: 2250, targetKcalEasy: 2050,
        targetKcalRest: 1800, proteinG: 130, carbsHardG: 250,
        carbsEasyG: 210, fatG: 65,
      },
    })

    // Clean previous plans
    await prisma.trainingPlan.deleteMany({ where: { userId: camilaUser.id } })

    // Completed 4-week gym plan: Jun 30 → Jul 27
    const gymPlanStart = new Date('2026-06-30T00:00:00.000Z')
    const gymPlanEnd = new Date('2026-07-27T23:59:59.999Z')

    const gymPlan = await prisma.trainingPlan.create({
      data: {
        userId: camilaUser.id,
        name: 'Recomposición Corporal',
        goalType: GoalType.BODY_RECOMPOSITION,
        totalWeeks: 4,
        startDate: gymPlanStart,
        endDate: gymPlanEnd,
        status: PlanStatus.COMPLETED,
        generatedBy: PlanSource.COACH,
        hrZones: {
          z1: { min: Math.round(camilaHrMax * 0.50), max: Math.round(camilaHrMax * 0.60) },
          z2: { min: Math.round(camilaHrMax * 0.60), max: Math.round(camilaHrMax * 0.70) },
          z3: { min: Math.round(camilaHrMax * 0.70), max: Math.round(camilaHrMax * 0.80) },
          z4: { min: Math.round(camilaHrMax * 0.80), max: Math.round(camilaHrMax * 0.90) },
          z5: { min: Math.round(camilaHrMax * 0.90), max: camilaHrMax },
        },
      },
    })

    // 4 weeks with gym sessions (4 sessions/week: Push, Pull, Legs, Descanso)
    const gymWeekDefs = [
      { n: 1, start: '2026-06-30', end: '2026-07-06', phase: Phase.BASE,       focus: 'Adaptación — técnica y activación muscular' },
      { n: 2, start: '2026-07-07', end: '2026-07-13', phase: Phase.BASE,       focus: 'Base — volumen moderado, énfasis en compuestos' },
      { n: 3, start: '2026-07-14', end: '2026-07-20', phase: Phase.DESARROLLO, focus: 'Progresión — aumento de carga en compuestos' },
      { n: 4, start: '2026-07-21', end: '2026-07-27', phase: Phase.DESARROLLO, focus: 'Intensificación — RPE 8-9 en principales' },
    ]

    const gymSessionTemplates = [
      { day: 2, type: SessionType.FUERZA, int: SessionIntensity.HIGH,     dur: 55, zone: null, detail: 'Push — Pecho, Hombro, Tríceps' },
      { day: 4, type: SessionType.FUERZA, int: SessionIntensity.HIGH,     dur: 55, zone: null, detail: 'Pull — Espalda, Bíceps' },
      { day: 6, type: SessionType.FUERZA, int: SessionIntensity.MODERATE, dur: 60, zone: null, detail: 'Legs — Cuádriceps, Glúteos, Femorales' },
      { day: 7, type: SessionType.DESCANSO, int: SessionIntensity.REST,   dur: 0,  zone: null, detail: 'Descanso activo — movilidad y stretching' },
    ]

    const plannedSessionIds: string[] = []

    for (const wd of gymWeekDefs) {
      const week = await prisma.planWeek.create({
        data: {
          planId: gymPlan.id,
          weekNumber: wd.n,
          phase: wd.phase,
          volumeKm: null,
          focusDescription: wd.focus,
          startDate: new Date(wd.start + 'T00:00:00.000Z'),
          endDate: new Date(wd.end + 'T23:59:59.999Z'),
        },
      })

      for (const st of gymSessionTemplates) {
        const weekStart = new Date(wd.start + 'T00:00:00.000Z')
        const sessionDate = new Date(weekStart)
        sessionDate.setUTCDate(weekStart.getUTCDate() + (st.day - 1))

        const ps = await prisma.plannedSession.create({
          data: {
            weekId: week.id,
            dayOfWeek: st.day,
            type: st.type,
            intensity: st.int,
            durationMin: st.dur,
            zoneTarget: st.zone,
            detailText: st.detail,
            date: sessionDate,
          },
        })
        if (st.type !== SessionType.DESCANSO) {
          plannedSessionIds.push(ps.id)
        }
      }
    }

    // SessionLogs: 10 of 12 training sessions logged (~83% adherence)
    // Skip session index 5 (W2 Pull) and 9 (W4 Push) to simulate missed days
    const skipIndices = new Set([5, 9])
    const rpeValues = [6, 7, 7, 7, 8, 7, 8, 8, 8, 9, 8, 9]
    const hrValues  = [142, 148, 145, 150, 155, 152, 158, 156, 160, 162, 158, 165]
    const durValues = [52, 58, 57, 53, 56, 54, 58, 55, 62, 57, 60, 58]

    for (let i = 0; i < plannedSessionIds.length; i++) {
      if (skipIndices.has(i)) continue

      // Derive date from plan session
      const ps = await prisma.plannedSession.findUnique({
        where: { id: plannedSessionIds[i] },
        select: { date: true },
      })

      await prisma.sessionLog.create({
        data: {
          userId: camilaUser.id,
          plannedSessionId: plannedSessionIds[i],
          completedAt: ps?.date ?? new Date(),
          sessionDate: ps?.date ?? new Date(),
          rpe: rpeValues[i],
          hrAvg: hrValues[i],
          durationMin: durValues[i],
          discipline: SessionDiscipline.STRENGTH,
          notes: i === 0 ? 'Primera sesión del plan — buenas sensaciones' : null,
        },
      })
    }

    // WeeklyCheckIns (4 weeks of tracking)
    const checkInData = [
      { week: 1, date: '2026-07-05', weightKg: 62.0, rpe: 6 },
      { week: 2, date: '2026-07-12', weightKg: 61.6, rpe: 7 },
      { week: 3, date: '2026-07-19', weightKg: 61.3, rpe: 7 },
      { week: 4, date: '2026-07-26', weightKg: 60.8, rpe: 8 },
    ]

    for (const ci of checkInData) {
      await prisma.weeklyCheckIn.create({
        data: {
          userId: camilaUser.id,
          weekNumber: ci.week,
          recordedAt: new Date(ci.date + 'T10:00:00.000Z'),
          weightKg: ci.weightKg,
          rpe: ci.rpe,
          hrResting: 60 - ci.week, // slight improvement over weeks
          energyLevel: ci.week <= 2 ? 4 : 3,
        },
      }).catch(() => {}) // skip if duplicate
    }

    console.log('  Camila completed plan created (B2B Gym, 4 weeks, 10/12 sessions)')
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  console.log('\nDemo seed complete!')
  console.log('Users:')
  console.log('  coach_demo@medaliq.com        / Coach2026!   → Coach')
  console.log('  sebastian_gym@medaliq.com     / Atleta2026!  → B2C Gym')
  console.log('  valentina_run@medaliq.com     / Atleta2026!  → B2C Running')
  console.log('  andres_b2b@medaliq.com        / Atleta2026!  → B2B Gym (coach: Carlos)')
  console.log('  felipe_run@medaliq.com        / Atleta2026!  → B2B Running (coach: Carlos)')
  console.log('  maria_gym@medaliq.com         / Atleta2026!  → B2B Gym (coach: Carlos)')
  console.log('  camila_completed@medaliq.com  / Atleta2026!  → B2B Gym (coach: Carlos) · Plan COMPLETADO')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
