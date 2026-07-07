// DEV ONLY — seed de desarrollo con usuarios de prueba.
// Para producción usar: tsx prisma/seed.prod.ts
import 'dotenv/config'
import { PrismaClient, UserRole, GoalType, PlanStatus, PlanSource, Phase, SessionType, EquipmentType, ExerciseCategory, SubscriptionTier, CoachSubscriptionTier } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)

function weeksAgo(n: number): Date {
  const d = new Date('2026-05-29')
  d.setDate(d.getDate() - n * 7)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

async function main() {
  console.log('🌱 Seeding...')

  const athletePassword = await bcrypt.hash('atleta123', 12)
  const coachPassword   = await bcrypt.hash('coach123', 12)

  // ── Coach 1 ───────────────────────────────────────────────────────────────
  const coach1 = await prisma.user.upsert({
    where: { email: 'coach@medaliq.com' },
    update: { featureCoach: true, featurePlan: false, featureCheckin: false, featureNutrition: false, featureProgress: false, featureLog: false, featureGym: false, onboardingCompleted: true, needsRoleSelection: false },
    create: {
      email: 'coach@medaliq.com',
      name: 'Carlos Entrenador',
      password: coachPassword,
      role: UserRole.COACH,
      featureCoach: true,
      featurePlan: false, featureCheckin: false, featureNutrition: false,
      featureProgress: false, featureLog: false, featureGym: false,
      onboardingCompleted: true, needsRoleSelection: false,
    },
  })


  // UserSubscription + perfil público para coach1
  await prisma.userSubscription.upsert({
    where: { userId: coach1.id },
    update: {},
    create: { userId: coach1.id, tier: SubscriptionTier.PRO, coachTier: CoachSubscriptionTier.GROWTH },
  })

  await prisma.coachProfile.upsert({
    where: { coachId: coach1.id },
    update: {},
    create: {
      coachId: coach1.id,
      slug: 'carlos-entrenador',
      headline: 'Especialista en media maratón y running de fondo',
      bio: 'Entrenador certificado con 8 años de experiencia. Ayudo a corredores de todos los niveles a alcanzar sus metas de carrera con planes periodizados y seguimiento cercano.',
      specialties: ['RUNNING', 'GYM'],
      city: 'Bogotá', country: 'CO',
      yearsExp: 8,
      certifications: ['IAAF Level 1', 'Running Coach ASEP'],
      isPublic: true,
    },
  })

  await prisma.inviteCode.upsert({
    where: { code: 'CARLOS2026' },
    update: {},
    create: {
      code: 'CARLOS2026',
      coachId: coach1.id,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año en seed
    },
  })

  // ── Coach 2 ───────────────────────────────────────────────────────────────
  const coach2 = await prisma.user.upsert({
    where: { email: 'maria.coach@medaliq.com' },
    update: { featureCoach: true, featurePlan: false, featureCheckin: false, featureNutrition: false, featureProgress: false, featureLog: false, featureGym: false, onboardingCompleted: true, needsRoleSelection: false },
    create: {
      email: 'maria.coach@medaliq.com',
      name: 'María González',
      password: coachPassword,
      role: UserRole.COACH,
      featureCoach: true,
      featurePlan: false, featureCheckin: false, featureNutrition: false,
      featureProgress: false, featureLog: false, featureGym: false,
      onboardingCompleted: true, needsRoleSelection: false,
    },
  })

  // ── Admin ─────────────────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'admin@medaliq.com' },
    update: { role: UserRole.ADMIN },
    create: {
      email: 'admin@medaliq.com',
      name: 'Admin Medaliq',
      password: await bcrypt.hash('admin123!', 12),
      role: UserRole.ADMIN,
      onboardingCompleted: true,
    },
  })

  // ── Atleta 1 — miguel (B2B coach1, running half marathon) ────────────────
  const athlete1 = await prisma.user.upsert({
    where: { email: 'miguel@medaliq.com' },
    update: { featurePlan: true, featureCheckin: true, featureNutrition: true, featureProgress: true, featureLog: true, featureGym: true, onboardingCompleted: true },
    create: {
      email: 'miguel@medaliq.com',
      name: 'Miguel Atleta',
      password: athletePassword,
      role: UserRole.ATHLETE,
      featurePlan: true, featureCheckin: true, featureNutrition: true,
      featureProgress: true, featureLog: true, featureGym: true,
      onboardingCompleted: true,
      profile: {
        create: {
          age: 30, heightCm: 175, weightKg: 75, weightGoalKg: 70,
          hrResting: 55, hrMax: 185, altitudeMeters: 2600,
          gender: 'male', sport: 'RUNNING', sportGoal: 'RACE_HALF_MARATHON', experienceLevel: 'INTERMEDIATE',
          injuries: [], conditions: [], medications: [],
          sleepHoursAvg: 7, sleepScoreAvg: 78,
        },
      },
    },
  })


  // UserSubscription para miguel
  await prisma.userSubscription.upsert({
    where: { userId: athlete1.id },
    update: {},
    create: { userId: athlete1.id, tier: SubscriptionTier.PRO },
  })

  await prisma.coachAthlete.upsert({
    where: { coachId_athleteId: { coachId: coach1.id, athleteId: athlete1.id } },
    update: {},
    create: { coachId: coach1.id, athleteId: athlete1.id },
  })

  const plan1Start = weeksAgo(6)
  const plan1 = await prisma.trainingPlan.upsert({
    where: { id: 'seed-plan-1' },
    update: {},
    create: {
      id: 'seed-plan-1',
      userId: athlete1.id,
      name: 'Media Maratón — 18 semanas',
      totalWeeks: 18,
      startDate: plan1Start,
      endDate: addDays(plan1Start, 18 * 7),
      status: PlanStatus.ACTIVE,
      generatedBy: PlanSource.AI,
      goalType: GoalType.RACE_HALF_MARATHON,
      hrZones: { z1: { min: 95, max: 114 }, z2: { min: 115, max: 133 }, z3: { min: 134, max: 152 }, z4: { min: 153, max: 171 }, z5: { min: 172, max: 185 } },
    },
  })

  for (const [wi, weekData] of [
    { wn: 1, phase: Phase.BASE, vol: 30, focus: 'Adaptación — rodajes suaves Z2', recovery: false },
    { wn: 2, phase: Phase.BASE, vol: 34, focus: 'Base aeróbica — incremento progresivo', recovery: false },
    { wn: 3, phase: Phase.BASE, vol: 38, focus: 'Consolidación base — primer fartlek', recovery: false },
    { wn: 4, phase: Phase.BASE, vol: 28, focus: 'Semana recuperación activa', recovery: true },
    { wn: 5, phase: Phase.DESARROLLO, vol: 42, focus: 'Desarrollo — tempo runs', recovery: false },
    { wn: 6, phase: Phase.DESARROLLO, vol: 45, focus: 'Desarrollo — intervalos Z4', recovery: false },
  ].entries()) {
    const wStart = addDays(plan1Start, weekData.wn * 7 - 7)
    const week = await prisma.planWeek.upsert({
      where: { planId_weekNumber: { planId: plan1.id, weekNumber: weekData.wn } },
      update: {},
      create: {
        planId: plan1.id, weekNumber: weekData.wn, phase: weekData.phase,
        volumeKm: weekData.vol, focusDescription: weekData.focus,
        isRecoveryWeek: weekData.recovery,
        startDate: wStart, endDate: addDays(wStart, 6),
      },
    })
    const sessDefs = weekData.recovery
      ? [
          { d: 1, type: SessionType.RODAJE_Z2, dur: 30, zone: 'Z1-Z2', detail: 'Rodaje muy suave de recuperación' },
          { d: 3, type: SessionType.RODAJE_Z2, dur: 25, zone: 'Z1', detail: 'Trote ligero 25 min' },
          { d: 6, type: SessionType.RODAJE_Z2, dur: 40, zone: 'Z2', detail: 'Tirada corta fácil' },
        ]
      : weekData.wn <= 3
        ? [
            { d: 1, type: SessionType.RODAJE_Z2, dur: 40, zone: 'Z2', detail: '40 min fácil Z2 — conversacional' },
            { d: 3, type: SessionType.FARTLEK, dur: 50, zone: 'Z2-Z3', detail: '10 cal + 6×2 min Z3/2 min Z2 + 10 vuelta' },
            { d: 5, type: SessionType.RODAJE_Z2, dur: 35, zone: 'Z2', detail: '35 min rodaje suave' },
            { d: 6, type: SessionType.TIRADA_LARGA, dur: 75, zone: 'Z2', detail: 'Tirada larga 75 min — Z2 todo, hidratación c/20 min' },
          ]
        : [
            { d: 1, type: SessionType.RODAJE_Z2, dur: 45, zone: 'Z2', detail: '45 min Z2 activación' },
            { d: 2, type: SessionType.TEMPO, dur: 55, zone: 'Z3-Z4', detail: '15 cal + 20 min tempo Z3 + 10 vuelta' },
            { d: 4, type: SessionType.INTERVALOS, dur: 60, zone: 'Z4-Z5', detail: '15 cal + 8×600m Z4 / 200m trote + 15 vuelta' },
            { d: 6, type: SessionType.TIRADA_LARGA, dur: 90, zone: 'Z2', detail: 'Tirada larga 90 min — todo Z2, gel c/30 min' },
          ]
    for (const s of sessDefs) {
      await prisma.plannedSession.upsert({
        where: { id: `seed-p1-w${weekData.wn}-d${s.d}` },
        update: {},
        create: {
          id: `seed-p1-w${weekData.wn}-d${s.d}`,
          weekId: week.id, dayOfWeek: s.d, type: s.type,
          durationMin: s.dur, zoneTarget: s.zone, detailText: s.detail,
          date: addDays(wStart, s.d - 1),
        },
      })
    }
  }

  // NutritionPlan para Miguel — calculado con Mifflin-St Jeor (age=30, 175cm, 75kg, male, 4d/sem, déficit -500)
  await prisma.nutritionPlan.upsert({
    where: { userId: athlete1.id },
    update: {},
    create: {
      userId: athlete1.id,
      tdee: 2633,
      targetKcalHard: 2133,
      targetKcalEasy: 1933,
      targetKcalRest: 1733,
      proteinG: 150,
      carbsHardG: 267,
      carbsEasyG: 169,
      fatG: 52,
    },
  })

  for (const ci of [
    { wn: 1, wkg: 75.2, hr: 55, sleep: 7.5, score: 82, rpe: 7, adh: 85, pain: false, energy: 4, notes: 'Semana bien, piernas respondieron al volumen' },
    { wn: 2, wkg: 74.8, hr: 54, sleep: 7.0, score: 79, rpe: 7, adh: 80, pain: false, energy: 4, notes: 'Un poco de cansancio acumulado en el fartlek' },
    { wn: 3, wkg: 74.5, hr: 53, sleep: 7.8, score: 85, rpe: 8, adh: 90, pain: false, energy: 5, notes: 'Excelente semana, marcas bajando en el fartlek' },
    { wn: 4, wkg: 74.3, hr: 52, sleep: 8.2, score: 88, rpe: 5, adh: 95, pain: false, energy: 5, notes: 'Semana recuperación — piernas frescas' },
    { wn: 5, wkg: 74.0, hr: 52, sleep: 7.5, score: 83, rpe: 8, adh: 88, pain: false, energy: 4, notes: 'Tempo duro pero bien. Ritmo manejable' },
    { wn: 6, wkg: 73.8, hr: 53, sleep: 7.2, score: 80, rpe: 9, adh: 85, pain: false, energy: 3, notes: 'Intervalos muy exigentes — mañana descansaré bien' },
  ]) {
    const _existsCi1 = await prisma.weeklyCheckIn.findFirst({
      where: { userId: athlete1.id, planId: plan1.id, weekNumber: ci.wn },
      select: { id: true },
    })
    if (!_existsCi1) {
      await prisma.weeklyCheckIn.create({
        data: {
          userId: athlete1.id, planId: plan1.id, weekNumber: ci.wn,
          weightKg: ci.wkg, hrResting: ci.hr, sleepHours: ci.sleep, sleepScore: ci.score,
          hardestSessionRpe: ci.rpe, painFlag: ci.pain,
          dietAdherencePct: ci.adh, energyLevel: ci.energy, notes: ci.notes, adjustmentsTriggered: [],
        },
      })
    }
  }

  // ── Atleta 2 — ana (B2C, recién registrada, sin plan) ────────────────────
  await prisma.user.upsert({
    where: { email: 'ana@medaliq.com' },
    update: {},
    create: {
      email: 'ana@medaliq.com',
      name: 'Ana Runner',
      password: athletePassword,
      role: UserRole.ATHLETE,
      featurePlan: false, featureCheckin: false, featureNutrition: false,
      featureProgress: false, featureLog: false, featureGym: false,
      onboardingCompleted: false,
      profile: {
        create: {
          age: 27, heightCm: 163, weightKg: 62, weightGoalKg: 60,
          hrResting: 52, hrMax: 192, altitudeMeters: 0,
          injuries: ['Rodilla derecha (2024)'], conditions: [], medications: [],
          sleepHoursAvg: 8, sleepScoreAvg: 85,
        },
      },
    },
  })

  // ── Atleta 3 — Juan Pérez (B2B coach1, running 10K) ──────────────────────
  const a3 = await prisma.user.upsert({
    where: { email: 'juan.perez@medaliq.com' },
    update: { featurePlan: true, featureCheckin: true, featureNutrition: true, featureProgress: true, featureLog: true, featureGym: true, onboardingCompleted: true },
    create: {
      email: 'juan.perez@medaliq.com',
      name: 'Juan Pérez',
      password: athletePassword,
      role: UserRole.ATHLETE,
      featurePlan: true, featureCheckin: true, featureNutrition: true,
      featureProgress: true, featureLog: true, featureGym: true,
      onboardingCompleted: true,
      profile: {
        create: {
          age: 34, heightCm: 172, weightKg: 72, weightGoalKg: 70,
          hrResting: 58, hrMax: 181, altitudeMeters: 2600,
          injuries: [], conditions: [], medications: [],
          sleepHoursAvg: 7, sleepScoreAvg: 75,
        },
      },
    },
  })
  await prisma.coachAthlete.upsert({
    where: { coachId_athleteId: { coachId: coach1.id, athleteId: a3.id } },
    update: {}, create: { coachId: coach1.id, athleteId: a3.id },
  })
  await seedRunningPlan(prisma, a3.id, 'seed-plan-3', '10K — 12 semanas', 12, weeksAgo(5), GoalType.RACE_10K, [
    { wn: 1, phase: Phase.BASE, vol: 22, focus: 'Base aeróbica inicial', recovery: false },
    { wn: 2, phase: Phase.BASE, vol: 25, focus: 'Consolidación base', recovery: false },
    { wn: 3, phase: Phase.BASE, vol: 28, focus: 'Primer fartlek', recovery: false },
    { wn: 4, phase: Phase.BASE, vol: 20, focus: 'Recuperación', recovery: true },
    { wn: 5, phase: Phase.DESARROLLO, vol: 30, focus: 'Desarrollo ritmo 10K', recovery: false },
  ], [
    { wn: 1, wkg: 72.1, hr: 58, sleep: 7.0, score: 76, rpe: 6, adh: 80, pain: false, energy: 4, notes: 'Bien, adaptando al volumen' },
    { wn: 2, wkg: 71.8, hr: 57, sleep: 7.5, score: 80, rpe: 7, adh: 85, pain: false, energy: 4, notes: 'Fartlek muy bien' },
    { wn: 3, wkg: 71.5, hr: 57, sleep: 6.8, score: 72, rpe: 8, adh: 78, pain: false, energy: 3, notes: 'Semana exigente, piernas pesadas el viernes' },
    { wn: 4, wkg: 71.3, hr: 56, sleep: 8.0, score: 86, rpe: 5, adh: 90, pain: false, energy: 5, notes: 'Recuperación perfecta' },
    { wn: 5, wkg: 71.0, hr: 56, sleep: 7.2, score: 78, rpe: 8, adh: 85, pain: false, energy: 4, notes: 'Primer tempo 10K — ritmo 4:32/km' },
  ])

  // ── Atleta 4 — Sofía Ramírez (B2B coach2, recomposición corporal) ─────────
  const a4 = await prisma.user.upsert({
    where: { email: 'sofia.ramirez@medaliq.com' },
    update: { featurePlan: true, featureCheckin: true, featureNutrition: true, featureProgress: true, featureLog: true, featureGym: true, onboardingCompleted: true },
    create: {
      email: 'sofia.ramirez@medaliq.com',
      name: 'Sofía Ramírez',
      password: athletePassword,
      role: UserRole.ATHLETE,
      featurePlan: true, featureCheckin: true, featureNutrition: true,
      featureProgress: true, featureLog: true, featureGym: true,
      onboardingCompleted: true,
      profile: {
        create: {
          age: 26, heightCm: 160, weightKg: 68, weightGoalKg: 60,
          hrResting: 65, hrMax: 190, altitudeMeters: 1600,
          injuries: [], conditions: [], medications: [],
          sleepHoursAvg: 7, sleepScoreAvg: 72,
        },
      },
    },
  })
  await prisma.coachAthlete.upsert({
    where: { coachId_athleteId: { coachId: coach2.id, athleteId: a4.id } },
    update: {}, create: { coachId: coach2.id, athleteId: a4.id },
  })
  await seedBodyPlan(prisma, a4.id, 'seed-plan-4', 'Recomposición Corporal — 16 semanas', 16, weeksAgo(8), [
    { wn: 1, wkg: 68.2, hr: 65, sleep: 7.0, score: 70, rpe: 6, adh: 75, pain: false, energy: 3, notes: 'Primera semana de gym — DOMS en piernas' },
    { wn: 2, wkg: 67.9, hr: 64, sleep: 7.2, score: 74, rpe: 7, adh: 80, pain: false, energy: 4, notes: 'Mejor adaptación, cargas subieron' },
    { wn: 3, wkg: 67.6, hr: 63, sleep: 7.5, score: 78, rpe: 7, adh: 82, pain: false, energy: 4, notes: 'Sentadilla llegó a 50kg' },
    { wn: 4, wkg: 67.4, hr: 63, sleep: 8.0, score: 82, rpe: 5, adh: 88, pain: false, energy: 5, notes: 'Semana leve — cuerpo agradecido' },
    { wn: 5, wkg: 67.2, hr: 62, sleep: 7.3, score: 76, rpe: 8, adh: 85, pain: false, energy: 4, notes: 'Progresión de cargas muy bien' },
    { wn: 6, wkg: 67.0, hr: 62, sleep: 7.0, score: 74, rpe: 8, adh: 83, pain: false, energy: 3, notes: 'Hip thrust a 70kg esta semana' },
    { wn: 7, wkg: 66.7, hr: 61, sleep: 7.8, score: 80, rpe: 7, adh: 87, pain: false, energy: 4, notes: 'Muy bien — ya se notan cambios' },
    { wn: 8, wkg: 66.5, hr: 61, sleep: 8.2, score: 85, rpe: 5, adh: 92, pain: false, energy: 5, notes: 'Recuperación activa — sentadilla sin dolor' },
  ])

  // ── Atleta 5 — Andrés Moreno (B2C trial, ciclismo) ───────────────────────
  const a5 = await prisma.user.upsert({
    where: { email: 'andres.moreno@medaliq.com' },
    update: { featurePlan: true, featureCheckin: true, featureNutrition: true, featureProgress: true, featureLog: true, featureGym: true, onboardingCompleted: true },
    create: {
      email: 'andres.moreno@medaliq.com',
      name: 'Andrés Moreno',
      password: athletePassword,
      role: UserRole.ATHLETE,
      featurePlan: true, featureCheckin: true, featureNutrition: true,
      featureProgress: true, featureLog: true, featureGym: true,
      onboardingCompleted: true,
      profile: {
        create: {
          age: 35, heightCm: 178, weightKg: 80, weightGoalKg: 76,
          hrResting: 52, hrMax: 179, altitudeMeters: 2600,
          injuries: [], conditions: [], medications: [],
          sleepHoursAvg: 6.5, sleepScoreAvg: 70,
        },
      },
    },
  })
  await seedCyclingPlan(prisma, a5.id, 'seed-plan-5', 'Ciclismo — 18 semanas', 18, weeksAgo(4), [
    { wn: 1, wkg: 80.3, hr: 52, sleep: 6.5, score: 68, rpe: 7, adh: 75, pain: false, energy: 3, notes: 'Primera semana, piernas aún adaptando al sillín' },
    { wn: 2, wkg: 80.0, hr: 51, sleep: 6.8, score: 72, rpe: 7, adh: 78, pain: false, energy: 4, notes: 'Sweet spot estuvo bien' },
    { wn: 3, wkg: 79.7, hr: 51, sleep: 7.0, score: 75, rpe: 8, adh: 80, pain: false, energy: 4, notes: 'Primer intervalo VO2max — muy exigente' },
    { wn: 4, wkg: 79.5, hr: 51, sleep: 7.5, score: 80, rpe: 5, adh: 88, pain: false, energy: 5, notes: 'Semana recuperación — buenas sensaciones' },
  ])

  // ── Atleta 6 — Valentina Castro (B2C trial, running half) ─────────────────
  const a6 = await prisma.user.upsert({
    where: { email: 'valentina.castro@medaliq.com' },
    update: { featurePlan: true, featureCheckin: true, featureNutrition: true, featureProgress: true, featureLog: true, featureGym: true, onboardingCompleted: true },
    create: {
      email: 'valentina.castro@medaliq.com',
      name: 'Valentina Castro',
      password: athletePassword,
      role: UserRole.ATHLETE,
      featurePlan: true, featureCheckin: true, featureNutrition: true,
      featureProgress: true, featureLog: true, featureGym: true,
      onboardingCompleted: true,
      profile: {
        create: {
          age: 29, heightCm: 165, weightKg: 58, weightGoalKg: 56,
          hrResting: 54, hrMax: 188, altitudeMeters: 0,
          injuries: ['Fascitis plantar izq (2025)'], conditions: [], medications: [],
          sleepHoursAvg: 7.5, sleepScoreAvg: 80,
        },
      },
    },
  })
  await seedRunningPlan(prisma, a6.id, 'seed-plan-6', 'Media Maratón — 18 semanas', 18, weeksAgo(3), GoalType.RACE_HALF_MARATHON, [
    { wn: 1, phase: Phase.BASE, vol: 28, focus: 'Adaptación — cuidado fascitis plantar', recovery: false },
    { wn: 2, phase: Phase.BASE, vol: 32, focus: 'Consolidación base aeróbica', recovery: false },
    { wn: 3, phase: Phase.BASE, vol: 35, focus: 'Primer fartlek — monitorear pie', recovery: false },
  ], [
    { wn: 1, wkg: 58.1, hr: 54, sleep: 7.5, score: 80, rpe: 6, adh: 82, pain: true, energy: 4, notes: 'Leve molestia pie al final del long run — usé plantillas' },
    { wn: 2, wkg: 57.8, hr: 53, sleep: 7.8, score: 83, rpe: 7, adh: 85, pain: false, energy: 4, notes: 'Pie sin molestias — seguí con ejercicios excéntricos' },
    { wn: 3, wkg: 57.6, hr: 53, sleep: 7.2, score: 79, rpe: 7, adh: 88, pain: false, energy: 4, notes: 'Fartlek muy bien, 5:10/km en bloques Z3' },
  ])

  // ── Atleta 7 — Camilo Torres (B2B coach2, fuerza) ─────────────────────────
  const a7 = await prisma.user.upsert({
    where: { email: 'camilo.torres@medaliq.com' },
    update: { featurePlan: true, featureCheckin: true, featureNutrition: true, featureProgress: true, featureLog: true, featureGym: true, onboardingCompleted: true },
    create: {
      email: 'camilo.torres@medaliq.com',
      name: 'Camilo Torres',
      password: athletePassword,
      role: UserRole.ATHLETE,
      featurePlan: true, featureCheckin: true, featureNutrition: true,
      featureProgress: true, featureLog: true, featureGym: true,
      onboardingCompleted: true,
      profile: {
        create: {
          age: 32, heightCm: 182, weightKg: 88, weightGoalKg: 85,
          hrResting: 62, hrMax: 183, altitudeMeters: 2600,
          injuries: [], conditions: [], medications: [],
          sleepHoursAvg: 7, sleepScoreAvg: 74,
        },
      },
    },
  })
  await prisma.coachAthlete.upsert({
    where: { coachId_athleteId: { coachId: coach2.id, athleteId: a7.id } },
    update: {}, create: { coachId: coach2.id, athleteId: a7.id },
  })
  await seedBodyPlan(prisma, a7.id, 'seed-plan-7', 'Fuerza & Composición — 16 semanas', 16, weeksAgo(6), [
    { wn: 1, wkg: 88.1, hr: 62, sleep: 7.0, score: 73, rpe: 7, adh: 78, pain: false, energy: 4, notes: 'Reanudé entrenamiento después de 3 meses — bien' },
    { wn: 2, wkg: 87.8, hr: 61, sleep: 7.2, score: 76, rpe: 8, adh: 82, pain: false, energy: 4, notes: 'Peso muerto volvió a 120kg' },
    { wn: 3, wkg: 87.5, hr: 61, sleep: 7.5, score: 78, rpe: 8, adh: 80, pain: false, energy: 3, notes: 'Sentadilla 100kg — técnica mejorando' },
    { wn: 4, wkg: 87.2, hr: 60, sleep: 8.0, score: 84, rpe: 5, adh: 90, pain: false, energy: 5, notes: 'Semana descarga — piernas muy frescas' },
    { wn: 5, wkg: 87.0, hr: 60, sleep: 7.3, score: 79, rpe: 8, adh: 85, pain: false, energy: 4, notes: 'Press banca 90kg x5 — nuevo récord personal' },
    { wn: 6, wkg: 86.8, hr: 59, sleep: 7.0, score: 76, rpe: 9, adh: 83, pain: false, energy: 3, notes: 'Semana pesada — volumen alto, buena adherencia' },
  ])

  // ── Atleta 8 — Laura Gómez (B2C trial, recomposición) ────────────────────
  const a8 = await prisma.user.upsert({
    where: { email: 'laura.gomez@medaliq.com' },
    update: { featurePlan: true, featureCheckin: true, featureNutrition: true, featureProgress: true, featureLog: true, featureGym: true, onboardingCompleted: true },
    create: {
      email: 'laura.gomez@medaliq.com',
      name: 'Laura Gómez',
      password: athletePassword,
      role: UserRole.ATHLETE,
      featurePlan: true, featureCheckin: true, featureNutrition: true,
      featureProgress: true, featureLog: true, featureGym: true,
      onboardingCompleted: true,
      profile: {
        create: {
          age: 24, heightCm: 158, weightKg: 65, weightGoalKg: 58,
          hrResting: 68, hrMax: 193, altitudeMeters: 2600,
          injuries: [], conditions: [], medications: [],
          sleepHoursAvg: 6.5, sleepScoreAvg: 68,
        },
      },
    },
  })
  await seedBodyPlan(prisma, a8.id, 'seed-plan-8', 'Recomposición Corporal — 16 semanas', 16, weeksAgo(3), [
    { wn: 1, wkg: 65.2, hr: 68, sleep: 6.5, score: 66, rpe: 6, adh: 70, pain: false, energy: 3, notes: 'Primera semana en gym — emocionada pero cansada' },
    { wn: 2, wkg: 64.8, hr: 67, sleep: 6.8, score: 70, rpe: 7, adh: 75, pain: false, energy: 3, notes: 'DOMS menos, cargas subiendo poco a poco' },
    { wn: 3, wkg: 64.5, hr: 66, sleep: 7.0, score: 73, rpe: 7, adh: 78, pain: false, energy: 4, notes: 'Hip thrust 45kg — buena activación glúteos' },
  ])

  // ── Atleta 9 — Sebastián Ríos (B2B coach1, running 5K) ───────────────────
  const a9 = await prisma.user.upsert({
    where: { email: 'sebastian.rios@medaliq.com' },
    update: { featurePlan: true, featureCheckin: true, featureNutrition: true, featureProgress: true, featureLog: true, featureGym: true, onboardingCompleted: true },
    create: {
      email: 'sebastian.rios@medaliq.com',
      name: 'Sebastián Ríos',
      password: athletePassword,
      role: UserRole.ATHLETE,
      featurePlan: true, featureCheckin: true, featureNutrition: true,
      featureProgress: true, featureLog: true, featureGym: true,
      onboardingCompleted: true,
      profile: {
        create: {
          age: 22, heightCm: 170, weightKg: 65, weightGoalKg: 63,
          hrResting: 50, hrMax: 196, altitudeMeters: 0,
          injuries: [], conditions: [], medications: [],
          sleepHoursAvg: 8, sleepScoreAvg: 85,
        },
      },
    },
  })
  await prisma.coachAthlete.upsert({
    where: { coachId_athleteId: { coachId: coach1.id, athleteId: a9.id } },
    update: {}, create: { coachId: coach1.id, athleteId: a9.id },
  })
  await seedRunningPlan(prisma, a9.id, 'seed-plan-9', '5K — 8 semanas', 8, weeksAgo(4), GoalType.RACE_5K, [
    { wn: 1, phase: Phase.BASE, vol: 20, focus: 'Base aeróbica 5K', recovery: false },
    { wn: 2, phase: Phase.BASE, vol: 23, focus: 'Fartlek cortos', recovery: false },
    { wn: 3, phase: Phase.ESPECIFICO, vol: 25, focus: 'Ritmo 5K específico', recovery: false },
    { wn: 4, phase: Phase.ESPECIFICO, vol: 18, focus: 'Recuperación + test 3K', recovery: true },
  ], [
    { wn: 1, wkg: 65.0, hr: 50, sleep: 8.0, score: 85, rpe: 6, adh: 90, pain: false, energy: 5, notes: 'Muy bien — base sólida' },
    { wn: 2, wkg: 64.8, hr: 50, sleep: 7.8, score: 84, rpe: 7, adh: 88, pain: false, energy: 4, notes: 'Fartleks de 1 min al tope — muy intenso' },
    { wn: 3, wkg: 64.5, hr: 49, sleep: 8.2, score: 87, rpe: 8, adh: 92, pain: false, energy: 5, notes: 'Tempo a 4:25/km — nuevo nivel' },
    { wn: 4, wkg: 64.3, hr: 49, sleep: 8.5, score: 90, rpe: 5, adh: 95, pain: false, energy: 5, notes: 'Test 3K en 12:45 — en camino al sub-22' },
  ])

  // ── Atleta 10 — Daniela Vargas (B2C trial, triatlón) ─────────────────────
  const a10 = await prisma.user.upsert({
    where: { email: 'daniela.vargas@medaliq.com' },
    update: { featurePlan: true, featureCheckin: true, featureNutrition: true, featureProgress: true, featureLog: true, featureGym: true, onboardingCompleted: true },
    create: {
      email: 'daniela.vargas@medaliq.com',
      name: 'Daniela Vargas',
      password: athletePassword,
      role: UserRole.ATHLETE,
      featurePlan: true, featureCheckin: true, featureNutrition: true,
      featureProgress: true, featureLog: true, featureGym: true,
      onboardingCompleted: true,
      profile: {
        create: {
          age: 31, heightCm: 167, weightKg: 60, weightGoalKg: 58,
          hrResting: 48, hrMax: 186, altitudeMeters: 0,
          injuries: [], conditions: [], medications: [],
          sleepHoursAvg: 7.5, sleepScoreAvg: 82,
        },
      },
    },
  })
  await seedTriathlonPlan(prisma, a10.id, 'seed-plan-10', 'Triatlón Olímpico — 18 semanas', 18, weeksAgo(5), [
    { wn: 1, wkg: 60.1, hr: 48, sleep: 7.5, score: 82, rpe: 7, adh: 85, pain: false, energy: 4, notes: 'Primera semana multi-disciplina — natación la más débil' },
    { wn: 2, wkg: 59.9, hr: 48, sleep: 7.8, score: 84, rpe: 7, adh: 87, pain: false, energy: 4, notes: 'CSS mejoró — técnica de nado avanzando' },
    { wn: 3, wkg: 59.6, hr: 47, sleep: 7.5, score: 81, rpe: 8, adh: 85, pain: false, energy: 4, notes: 'Brick run duro pero bien' },
    { wn: 4, wkg: 59.4, hr: 47, sleep: 8.0, score: 86, rpe: 5, adh: 90, pain: false, energy: 5, notes: 'Semana recuperación — bicicleta suave' },
    { wn: 5, wkg: 59.2, hr: 46, sleep: 7.3, score: 80, rpe: 8, adh: 88, pain: false, energy: 4, notes: 'Intervalos en piscina — mejora de tiempo notable' },
  ])

  // ── Atleta 11 — Felipe Herrera (B2C trial, ciclismo) ─────────────────────
  const a11 = await prisma.user.upsert({
    where: { email: 'felipe.herrera@medaliq.com' },
    update: { featurePlan: true, featureCheckin: true, featureNutrition: true, featureProgress: true, featureLog: true, featureGym: true, onboardingCompleted: true },
    create: {
      email: 'felipe.herrera@medaliq.com',
      name: 'Felipe Herrera',
      password: athletePassword,
      role: UserRole.ATHLETE,
      featurePlan: true, featureCheckin: true, featureNutrition: true,
      featureProgress: true, featureLog: true, featureGym: true,
      onboardingCompleted: true,
      profile: {
        create: {
          age: 28, heightCm: 180, weightKg: 76, weightGoalKg: 73,
          hrResting: 55, hrMax: 186, altitudeMeters: 2600,
          injuries: [], conditions: [], medications: [],
          sleepHoursAvg: 7, sleepScoreAvg: 76,
        },
      },
    },
  })
  await seedCyclingPlan(prisma, a11.id, 'seed-plan-11', 'Ciclismo — 18 semanas', 18, weeksAgo(7), [
    { wn: 1, wkg: 76.2, hr: 55, sleep: 7.0, score: 75, rpe: 7, adh: 80, pain: false, energy: 4, notes: 'Bien — FTP estimado 230W' },
    { wn: 2, wkg: 75.9, hr: 54, sleep: 7.2, score: 78, rpe: 7, adh: 82, pain: false, energy: 4, notes: 'Sweet spot x30 min — aguanté bien' },
    { wn: 3, wkg: 75.6, hr: 54, sleep: 7.5, score: 80, rpe: 8, adh: 83, pain: false, energy: 3, notes: 'VO2max muy exigente — pero progresando' },
    { wn: 4, wkg: 75.4, hr: 53, sleep: 8.0, score: 85, rpe: 5, adh: 88, pain: false, energy: 5, notes: 'Semana ligera — piernas perfectas' },
    { wn: 5, wkg: 75.1, hr: 53, sleep: 7.0, score: 76, rpe: 8, adh: 84, pain: false, energy: 4, notes: 'Test FTP — subió a 242W' },
    { wn: 6, wkg: 74.9, hr: 52, sleep: 7.3, score: 78, rpe: 8, adh: 85, pain: false, energy: 4, notes: 'Entrenamiento de umbral — buen control' },
    { wn: 7, wkg: 74.6, hr: 52, sleep: 7.8, score: 82, rpe: 7, adh: 86, pain: false, energy: 4, notes: 'Gran rodada del sábado — 3h Z2' },
  ])

  // ── Atleta 12 — Isabella Méndez (B2B coach2, recomposición) ──────────────
  const a12 = await prisma.user.upsert({
    where: { email: 'isabella.mendez@medaliq.com' },
    update: { featurePlan: true, featureCheckin: true, featureNutrition: true, featureProgress: true, featureLog: true, featureGym: true, onboardingCompleted: true },
    create: {
      email: 'isabella.mendez@medaliq.com',
      name: 'Isabella Méndez',
      password: athletePassword,
      role: UserRole.ATHLETE,
      featurePlan: true, featureCheckin: true, featureNutrition: true,
      featureProgress: true, featureLog: true, featureGym: true,
      onboardingCompleted: true,
      profile: {
        create: {
          age: 33, heightCm: 162, weightKg: 70, weightGoalKg: 63,
          hrResting: 66, hrMax: 184, altitudeMeters: 2600,
          injuries: [], conditions: ['Hipotiroidismo'], medications: ['Levotiroxina 50mcg'],
          sleepHoursAvg: 7.5, sleepScoreAvg: 73,
        },
      },
    },
  })
  await prisma.coachAthlete.upsert({
    where: { coachId_athleteId: { coachId: coach2.id, athleteId: a12.id } },
    update: {}, create: { coachId: coach2.id, athleteId: a12.id },
  })
  await seedBodyPlan(prisma, a12.id, 'seed-plan-12', 'Recomposición Corporal — 16 semanas', 16, weeksAgo(4), [
    { wn: 1, wkg: 70.1, hr: 66, sleep: 7.5, score: 73, rpe: 6, adh: 76, pain: false, energy: 3, notes: 'Inicio bien — tiroides controlada' },
    { wn: 2, wkg: 69.8, hr: 65, sleep: 7.8, score: 76, rpe: 7, adh: 80, pain: false, energy: 4, notes: 'Cargas mejorando — más energía que la semana pasada' },
    { wn: 3, wkg: 69.5, hr: 65, sleep: 7.3, score: 74, rpe: 7, adh: 82, pain: false, energy: 3, notes: 'Sentadilla llegó a 45kg — progreso notable' },
    { wn: 4, wkg: 69.2, hr: 64, sleep: 8.0, score: 80, rpe: 5, adh: 88, pain: false, energy: 4, notes: 'Semana suave — buena recuperación' },
  ])

  // ── Atleta 13 — Nicolás Gutiérrez (B2B coach1, half marathon) ────────────
  const a13 = await prisma.user.upsert({
    where: { email: 'nicolas.gutierrez@medaliq.com' },
    update: { featurePlan: true, featureCheckin: true, featureNutrition: true, featureProgress: true, featureLog: true, featureGym: true, onboardingCompleted: true },
    create: {
      email: 'nicolas.gutierrez@medaliq.com',
      name: 'Nicolás Gutiérrez',
      password: athletePassword,
      role: UserRole.ATHLETE,
      featurePlan: true, featureCheckin: true, featureNutrition: true,
      featureProgress: true, featureLog: true, featureGym: true,
      onboardingCompleted: true,
      profile: {
        create: {
          age: 38, heightCm: 176, weightKg: 78, weightGoalKg: 74,
          hrResting: 56, hrMax: 177, altitudeMeters: 0,
          injuries: [], conditions: [], medications: [],
          sleepHoursAvg: 7, sleepScoreAvg: 75,
        },
      },
    },
  })
  await prisma.coachAthlete.upsert({
    where: { coachId_athleteId: { coachId: coach1.id, athleteId: a13.id } },
    update: {}, create: { coachId: coach1.id, athleteId: a13.id },
  })
  await seedRunningPlan(prisma, a13.id, 'seed-plan-13', 'Media Maratón — 18 semanas', 18, weeksAgo(2), GoalType.RACE_HALF_MARATHON, [
    { wn: 1, phase: Phase.BASE, vol: 25, focus: 'Adaptación inicial — regreso al running', recovery: false },
    { wn: 2, phase: Phase.BASE, vol: 28, focus: 'Base aeróbica — sin lesiones', recovery: false },
  ], [
    { wn: 1, wkg: 78.2, hr: 56, sleep: 7.0, score: 74, rpe: 6, adh: 78, pain: false, energy: 3, notes: 'De vuelta después de 2 meses de pausa — bien' },
    { wn: 2, wkg: 78.0, hr: 55, sleep: 7.3, score: 77, rpe: 7, adh: 82, pain: false, energy: 4, notes: 'Ritmos mejorando — Z2 a 5:50/km' },
  ])

  // ── Atleta 14 — Catalina Jiménez (B2C trial, running 10K) ────────────────
  const a14 = await prisma.user.upsert({
    where: { email: 'catalina.jimenez@medaliq.com' },
    update: { featurePlan: true, featureCheckin: true, featureNutrition: true, featureProgress: true, featureLog: true, featureGym: true, onboardingCompleted: true },
    create: {
      email: 'catalina.jimenez@medaliq.com',
      name: 'Catalina Jiménez',
      password: athletePassword,
      role: UserRole.ATHLETE,
      featurePlan: true, featureCheckin: true, featureNutrition: true,
      featureProgress: true, featureLog: true, featureGym: true,
      onboardingCompleted: true,
      profile: {
        create: {
          age: 25, heightCm: 161, weightKg: 55, weightGoalKg: 54,
          hrResting: 57, hrMax: 191, altitudeMeters: 2600,
          injuries: [], conditions: [], medications: [],
          sleepHoursAvg: 8, sleepScoreAvg: 85,
        },
      },
    },
  })
  await seedRunningPlan(prisma, a14.id, 'seed-plan-14', '10K — 12 semanas', 12, weeksAgo(4), GoalType.RACE_10K, [
    { wn: 1, phase: Phase.BASE, vol: 20, focus: 'Base aeróbica 10K', recovery: false },
    { wn: 2, phase: Phase.BASE, vol: 23, focus: 'Fartleks suaves', recovery: false },
    { wn: 3, phase: Phase.DESARROLLO, vol: 26, focus: 'Tempo + volumen', recovery: false },
    { wn: 4, phase: Phase.DESARROLLO, vol: 18, focus: 'Recuperación activa', recovery: true },
  ], [
    { wn: 1, wkg: 55.1, hr: 57, sleep: 8.0, score: 85, rpe: 6, adh: 88, pain: false, energy: 5, notes: 'Excelente primera semana — muy motivada' },
    { wn: 2, wkg: 54.9, hr: 56, sleep: 8.2, score: 87, rpe: 7, adh: 90, pain: false, energy: 5, notes: 'Fartlek a 4:48/km en bloques Z3' },
    { wn: 3, wkg: 54.7, hr: 56, sleep: 7.8, score: 83, rpe: 8, adh: 87, pain: false, energy: 4, notes: 'Tempo muy bien — aguanté 5 km a 4:55/km' },
    { wn: 4, wkg: 54.6, hr: 55, sleep: 8.5, score: 90, rpe: 4, adh: 93, pain: false, energy: 5, notes: 'Semana fácil — piernas como nuevas' },
  ])

  // ── Atleta 15 — Santiago Rodríguez (B2B coach1, maratón) ─────────────────
  const a15 = await prisma.user.upsert({
    where: { email: 'santiago.rodriguez@medaliq.com' },
    update: { featurePlan: true, featureCheckin: true, featureNutrition: true, featureProgress: true, featureLog: true, featureGym: true, onboardingCompleted: true },
    create: {
      email: 'santiago.rodriguez@medaliq.com',
      name: 'Santiago Rodríguez',
      password: athletePassword,
      role: UserRole.ATHLETE,
      featurePlan: true, featureCheckin: true, featureNutrition: true,
      featureProgress: true, featureLog: true, featureGym: true,
      onboardingCompleted: true,
      profile: {
        create: {
          age: 41, heightCm: 174, weightKg: 74, weightGoalKg: 71,
          hrResting: 54, hrMax: 174, altitudeMeters: 2600,
          injuries: ['Banda iliotibial derecha (2024 — resuelta)'], conditions: [], medications: [],
          sleepHoursAvg: 7, sleepScoreAvg: 76,
        },
      },
    },
  })
  await prisma.coachAthlete.upsert({
    where: { coachId_athleteId: { coachId: coach1.id, athleteId: a15.id } },
    update: {}, create: { coachId: coach1.id, athleteId: a15.id },
  })
  await seedRunningPlan(prisma, a15.id, 'seed-plan-15', 'Maratón — 18 semanas', 18, weeksAgo(10), GoalType.RACE_MARATHON, [
    { wn: 1,  phase: Phase.BASE,      vol: 40,  focus: 'Base aeróbica — rodajes suaves',         recovery: false },
    { wn: 2,  phase: Phase.BASE,      vol: 45,  focus: 'Consolidación base',                     recovery: false },
    { wn: 3,  phase: Phase.BASE,      vol: 50,  focus: 'Primer tempo maratón',                   recovery: false },
    { wn: 4,  phase: Phase.BASE,      vol: 35,  focus: 'Recuperación activa',                    recovery: true  },
    { wn: 5,  phase: Phase.DESARROLLO, vol: 55, focus: 'Desarrollo — ritmo maratón 5:08/km',     recovery: false },
    { wn: 6,  phase: Phase.DESARROLLO, vol: 58, focus: 'Volumen alto — tirada 28km',             recovery: false },
    { wn: 7,  phase: Phase.DESARROLLO, vol: 60, focus: 'Pico de volumen — tirada 30km',          recovery: false },
    { wn: 8,  phase: Phase.DESARROLLO, vol: 42, focus: 'Recuperación medio ciclo',               recovery: true  },
    { wn: 9,  phase: Phase.ESPECIFICO, vol: 58, focus: 'Específico maratón — tiradas largas',    recovery: false },
    { wn: 10, phase: Phase.ESPECIFICO, vol: 60, focus: 'Específico — 32km tirada control',       recovery: false },
  ], [
    { wn: 1,  wkg: 74.2, hr: 54, sleep: 7.0, score: 76, rpe: 6,  adh: 85, pain: false, energy: 4, notes: 'Base sólida — cuerpo respondió bien al volumen' },
    { wn: 2,  wkg: 74.0, hr: 53, sleep: 7.2, score: 78, rpe: 7,  adh: 83, pain: false, energy: 4, notes: 'Tirada de 22km a 5:20/km — zona 2 controlada' },
    { wn: 3,  wkg: 73.7, hr: 53, sleep: 7.5, score: 80, rpe: 8,  adh: 87, pain: false, energy: 4, notes: 'Tempo a 4:55/km — primer contacto ritmo maratón' },
    { wn: 4,  wkg: 73.5, hr: 52, sleep: 8.0, score: 85, rpe: 5,  adh: 90, pain: false, energy: 5, notes: 'Recuperación — banda iliotibial sin molestias' },
    { wn: 5,  wkg: 73.3, hr: 52, sleep: 7.3, score: 79, rpe: 8,  adh: 86, pain: false, energy: 4, notes: 'Tirada 26km — último km a ritmo maratón 5:05/km' },
    { wn: 6,  wkg: 73.0, hr: 51, sleep: 7.5, score: 81, rpe: 8,  adh: 85, pain: false, energy: 4, notes: 'Tirada 28km — volumen más alto hasta ahora' },
    { wn: 7,  wkg: 72.8, hr: 51, sleep: 7.0, score: 77, rpe: 9,  adh: 83, pain: false, energy: 3, notes: 'Semana brutal — 30km el sábado, piernas explotadas' },
    { wn: 8,  wkg: 72.6, hr: 50, sleep: 8.2, score: 86, rpe: 5,  adh: 92, pain: false, energy: 5, notes: 'Descarga — cuerpo agradecido. Banda sin molestia' },
    { wn: 9,  wkg: 72.4, hr: 50, sleep: 7.2, score: 80, rpe: 8,  adh: 87, pain: false, energy: 4, notes: 'Específico — primer 32km en entrenamiento (4:58/km)' },
    { wn: 10, wkg: 72.2, hr: 50, sleep: 7.5, score: 82, rpe: 9,  adh: 85, pain: false, energy: 3, notes: 'Tirada control 32km en 2:40 — en ruta al sub-4h' },
  ])

  // ── Ejercicios globales ────────────────────────────────────────────────────
  const globalExercises: Array<{
    id: string; name: string; muscleGroups: string[]; equipment: EquipmentType; category: ExerciseCategory
  }> = [
    { id: 'global-exercise-sentadilla-frontal',         name: 'Sentadilla frontal',              muscleGroups: ['QUADRICEPS', 'GLUTES'],                  equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-sentadilla-sumo',            name: 'Sentadilla sumo',                 muscleGroups: ['QUADRICEPS', 'GLUTES', 'HAMSTRINGS'],     equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-prensa',                     name: 'Prensa',                          muscleGroups: ['QUADRICEPS', 'GLUTES'],                  equipment: EquipmentType.MACHINE,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-extension-rodillas',         name: 'Extensión de rodillas',           muscleGroups: ['QUADRICEPS'],                            equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-avanzadas',                  name: 'Avanzadas (Lunges)',               muscleGroups: ['QUADRICEPS', 'GLUTES'],                  equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-sentadilla-hack',            name: 'Sentadilla hack',                 muscleGroups: ['QUADRICEPS'],                            equipment: EquipmentType.MACHINE,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-flexion-rodillas-acostado',  name: 'Flexión de rodillas acostado',    muscleGroups: ['HAMSTRINGS'],                            equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-flexion-rodillas-sentado',   name: 'Flexión de rodillas sentado',     muscleGroups: ['HAMSTRINGS'],                            equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-peso-muerto',                name: 'Peso muerto',                     muscleGroups: ['HAMSTRINGS', 'GLUTES', 'BACK'],          equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-hip-thrust',                 name: 'Hip Thrust',                      muscleGroups: ['GLUTES', 'HAMSTRINGS'],                  equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-patada-gluteos-maquina',     name: 'Patada de glúteos en máquina',    muscleGroups: ['GLUTES'],                                equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-abduccion-maquina',          name: 'Abducción en máquina',            muscleGroups: ['GLUTES'],                                equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-aduccion-maquina',           name: 'Aducción en máquina',             muscleGroups: ['GLUTES'],                                equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-press-plano-barra',          name: 'Press plano con barra',           muscleGroups: ['CHEST'],                                 equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-press-inclinado-barra',      name: 'Press inclinado con barra',       muscleGroups: ['CHEST'],                                 equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-press-declinado-mancuernas', name: 'Press declinado con mancuernas',  muscleGroups: ['CHEST'],                                 equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-cruces-polea-alta',          name: 'Cruces en polea alta',            muscleGroups: ['CHEST'],                                 equipment: EquipmentType.CABLE,      category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-remo-barra',                 name: 'Remo con barra',                  muscleGroups: ['BACK'],                                  equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-remo-mancuernas',            name: 'Remo con mancuernas',             muscleGroups: ['BACK'],                                  equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-jalon-polea-alta',           name: 'Jalón polea alta',                muscleGroups: ['BACK'],                                  equipment: EquipmentType.CABLE,      category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-dominadas',                  name: 'Dominadas',                       muscleGroups: ['BACK'],                                  equipment: EquipmentType.BODYWEIGHT, category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-press-militar-barra',        name: 'Press militar con barra',         muscleGroups: ['SHOULDERS'],                             equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-press-arnold',               name: 'Press Arnold',                    muscleGroups: ['SHOULDERS'],                             equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-elevacion-lateral',          name: 'Elevación lateral',               muscleGroups: ['SHOULDERS'],                             equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-elevacion-frontal',          name: 'Elevación frontal',               muscleGroups: ['SHOULDERS'],                             equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-pajaros',                    name: 'Pájaros (Reverse Fly)',            muscleGroups: ['SHOULDERS'],                             equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-flexion-barra-z',            name: 'Flexión de codo con barra Z',     muscleGroups: ['BICEPS'],                                equipment: EquipmentType.BARBELL,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-martillo-mancuernas',        name: 'Martillo con mancuernas',         muscleGroups: ['BICEPS'],                                equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-concentrado-mancuernas',     name: 'Concentrado con mancuernas',      muscleGroups: ['BICEPS'],                                equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-predicador',                 name: 'Predicador',                      muscleGroups: ['BICEPS'],                                equipment: EquipmentType.BARBELL,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-press-frances',              name: 'Press francés',                   muscleGroups: ['TRICEPS'],                               equipment: EquipmentType.BARBELL,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-push-down',                  name: 'Push down en polea',              muscleGroups: ['TRICEPS'],                               equipment: EquipmentType.CABLE,      category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-extension-codo',             name: 'Extensión de codo',               muscleGroups: ['TRICEPS'],                               equipment: EquipmentType.CABLE,      category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-patada-triceps',             name: 'Patada de tríceps',               muscleGroups: ['TRICEPS'],                               equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-extension-triceps-polea',    name: 'Extensión de tríceps en polea',   muscleGroups: ['TRICEPS'],                               equipment: EquipmentType.CABLE,      category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-elevacion-talones-maquina',  name: 'Elevación de talones en máquina', muscleGroups: ['CALVES'],                                equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-extension-plantar-prensa',   name: 'Extensión plantar en prensa',     muscleGroups: ['CALVES'],                                equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-elevacion-talones-sentado',  name: 'Elevación de talones sentado',    muscleGroups: ['CALVES'],                                equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-elevacion-piernas-colgado',  name: 'Elevación de piernas colgado',    muscleGroups: ['ABS'],                                   equipment: EquipmentType.BODYWEIGHT, category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-abs-roller',                 name: 'Abs roller',                      muscleGroups: ['ABS'],                                   equipment: EquipmentType.OTHER,      category: ExerciseCategory.ISOLATION },
  ]

  for (const ex of globalExercises) {
    await prisma.exercise.upsert({
      where: { id: ex.id },
      update: { name: ex.name, muscleGroups: ex.muscleGroups, equipment: ex.equipment, category: ex.category },
      create: { id: ex.id, coachId: null, name: ex.name, muscleGroups: ex.muscleGroups, equipment: ex.equipment, category: ex.category, isGlobal: true },
    })
  }

  console.log(`✅ Ejercicios:   ${globalExercises.length} ejercicios globales`)

  // ── Rutinas públicas del sistema ────────────────────────────────────────────
  type PublicTemplate = {
    id: string; name: string; description: string; goal: string; level: string
    daysPerWeek: number; category: string
    days: Array<{
      dayOfWeek: number; label: string; muscleGroups: string[]; isRestDay: boolean
      exercises?: Array<{ exerciseId: string; order: number; sets: number; repsScheme: string; restSeconds: number }>
    }>
  }

  const publicTemplates: PublicTemplate[] = [
    {
      id: 'public-template-ppl-3x',
      name: 'Push Pull Legs — 3 días',
      description: 'Divide los músculos en empuje, jalón y piernas. Ideal para ganar músculo con 3 días/semana.',
      goal: 'HYPERTROPHY', level: 'INTERMEDIATE', daysPerWeek: 3, category: 'PPL',
      days: [
        { dayOfWeek: 1, label: 'Lunes — Push (Pecho, Hombros, Tríceps)', muscleGroups: ['CHEST', 'SHOULDERS', 'TRICEPS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-press-plano-barra',    order: 1, sets: 4, repsScheme: '8-10', restSeconds: 120 },
          { exerciseId: 'global-exercise-press-inclinado-barra', order: 2, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-press-arnold',         order: 3, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-elevacion-lateral',    order: 4, sets: 3, repsScheme: '12-15', restSeconds: 60 },
          { exerciseId: 'global-exercise-extension-triceps-polea', order: 5, sets: 3, repsScheme: '12-15', restSeconds: 60 },
        ]},
        { dayOfWeek: 3, label: 'Miércoles — Pull (Espalda, Bíceps)', muscleGroups: ['BACK', 'BICEPS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-dominadas',             order: 1, sets: 4, repsScheme: '6-8', restSeconds: 120 },
          { exerciseId: 'global-exercise-remo-barra',            order: 2, sets: 4, repsScheme: '8-10', restSeconds: 120 },
          { exerciseId: 'global-exercise-jalon-polea-alta',      order: 3, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-flexion-barra-z',       order: 4, sets: 3, repsScheme: '10-12', restSeconds: 60 },
          { exerciseId: 'global-exercise-remo-mancuernas',       order: 5, sets: 3, repsScheme: '12', restSeconds: 60 },
        ]},
        { dayOfWeek: 5, label: 'Viernes — Legs (Cuádriceps, Isquios, Glúteos)', muscleGroups: ['QUADRICEPS', 'HAMSTRINGS', 'GLUTES'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-frontal',    order: 1, sets: 4, repsScheme: '8-10', restSeconds: 180 },
          { exerciseId: 'global-exercise-prensa',                order: 2, sets: 3, repsScheme: '10-12', restSeconds: 120 },
          { exerciseId: 'global-exercise-peso-muerto',           order: 3, sets: 3, repsScheme: '8-10', restSeconds: 180 },
          { exerciseId: 'global-exercise-extension-rodillas',    order: 4, sets: 3, repsScheme: '12-15', restSeconds: 60 },
          { exerciseId: 'global-exercise-hip-thrust',            order: 5, sets: 3, repsScheme: '12-15', restSeconds: 90 },
        ]},
        { dayOfWeek: 2, label: 'Martes — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 4, label: 'Jueves — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 6, label: 'Sábado — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 7, label: 'Domingo — Descanso', muscleGroups: [], isRestDay: true },
      ],
    },
    {
      id: 'public-template-fullbody-3x',
      name: 'Full Body — 3 días',
      description: 'Trabaja todo el cuerpo en cada sesión. Perfecto para principiantes o quienes buscan eficiencia.',
      goal: 'HYPERTROPHY', level: 'BEGINNER', daysPerWeek: 3, category: 'FULL_BODY',
      days: [
        { dayOfWeek: 1, label: 'Lunes — Full Body A', muscleGroups: ['CHEST', 'BACK', 'QUADRICEPS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-frontal',    order: 1, sets: 3, repsScheme: '10-12', restSeconds: 120 },
          { exerciseId: 'global-exercise-press-plano-barra',     order: 2, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-remo-barra',            order: 3, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-press-arnold',          order: 4, sets: 3, repsScheme: '10-12', restSeconds: 60 },
          { exerciseId: 'global-exercise-hip-thrust',            order: 5, sets: 3, repsScheme: '12-15', restSeconds: 60 },
        ]},
        { dayOfWeek: 3, label: 'Miércoles — Full Body B', muscleGroups: ['CHEST', 'BACK', 'HAMSTRINGS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-peso-muerto',           order: 1, sets: 3, repsScheme: '8-10', restSeconds: 180 },
          { exerciseId: 'global-exercise-press-inclinado-barra', order: 2, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-jalon-polea-alta',      order: 3, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-elevacion-lateral',     order: 4, sets: 3, repsScheme: '12-15', restSeconds: 60 },
          { exerciseId: 'global-exercise-avanzadas',             order: 5, sets: 3, repsScheme: '12 c/lado', restSeconds: 60 },
        ]},
        { dayOfWeek: 5, label: 'Viernes — Full Body C', muscleGroups: ['QUADRICEPS', 'CHEST', 'BACK'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-prensa',                order: 1, sets: 4, repsScheme: '12-15', restSeconds: 120 },
          { exerciseId: 'global-exercise-press-declinado-mancuernas', order: 2, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-remo-mancuernas',       order: 3, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-press-militar-barra',   order: 4, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-flexion-rodillas-acostado', order: 5, sets: 3, repsScheme: '12-15', restSeconds: 60 },
        ]},
        { dayOfWeek: 2, label: 'Martes — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 4, label: 'Jueves — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 6, label: 'Sábado — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 7, label: 'Domingo — Descanso', muscleGroups: [], isRestDay: true },
      ],
    },
    {
      id: 'public-template-upper-lower-4x',
      name: 'Upper / Lower — 4 días',
      description: 'Alterna tren superior e inferior. Mayor frecuencia por músculo con 4 sesiones semanales.',
      goal: 'HYPERTROPHY', level: 'INTERMEDIATE', daysPerWeek: 4, category: 'UPPER_LOWER',
      days: [
        { dayOfWeek: 1, label: 'Lunes — Upper (fuerza)', muscleGroups: ['CHEST', 'BACK', 'SHOULDERS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-press-plano-barra',    order: 1, sets: 4, repsScheme: '5-6', restSeconds: 180 },
          { exerciseId: 'global-exercise-remo-barra',           order: 2, sets: 4, repsScheme: '5-6', restSeconds: 180 },
          { exerciseId: 'global-exercise-press-inclinado-barra', order: 3, sets: 3, repsScheme: '8-10', restSeconds: 120 },
          { exerciseId: 'global-exercise-dominadas',            order: 4, sets: 3, repsScheme: '6-8', restSeconds: 120 },
          { exerciseId: 'global-exercise-press-militar-barra',  order: 5, sets: 3, repsScheme: '8-10', restSeconds: 90 },
        ]},
        { dayOfWeek: 2, label: 'Martes — Lower (fuerza)', muscleGroups: ['QUADRICEPS', 'HAMSTRINGS', 'GLUTES'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-frontal',   order: 1, sets: 4, repsScheme: '5-6', restSeconds: 180 },
          { exerciseId: 'global-exercise-peso-muerto',          order: 2, sets: 4, repsScheme: '5-6', restSeconds: 180 },
          { exerciseId: 'global-exercise-prensa',               order: 3, sets: 3, repsScheme: '10-12', restSeconds: 120 },
          { exerciseId: 'global-exercise-hip-thrust',           order: 4, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-flexion-rodillas-acostado', order: 5, sets: 3, repsScheme: '12-15', restSeconds: 60 },
        ]},
        { dayOfWeek: 4, label: 'Jueves — Upper (volumen)', muscleGroups: ['CHEST', 'BACK', 'BICEPS', 'TRICEPS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-press-inclinado-barra', order: 1, sets: 4, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-jalon-polea-alta',     order: 2, sets: 4, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-press-arnold',         order: 3, sets: 3, repsScheme: '10-12', restSeconds: 60 },
          { exerciseId: 'global-exercise-flexion-barra-z',      order: 4, sets: 3, repsScheme: '10-12', restSeconds: 60 },
          { exerciseId: 'global-exercise-extension-triceps-polea', order: 5, sets: 3, repsScheme: '12-15', restSeconds: 60 },
        ]},
        { dayOfWeek: 5, label: 'Viernes — Lower (volumen)', muscleGroups: ['QUADRICEPS', 'GLUTES'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-hack',      order: 1, sets: 4, repsScheme: '10-12', restSeconds: 120 },
          { exerciseId: 'global-exercise-avanzadas',            order: 2, sets: 3, repsScheme: '12 c/lado', restSeconds: 90 },
          { exerciseId: 'global-exercise-extension-rodillas',   order: 3, sets: 3, repsScheme: '12-15', restSeconds: 60 },
          { exerciseId: 'global-exercise-hip-thrust',           order: 4, sets: 3, repsScheme: '12-15', restSeconds: 90 },
          { exerciseId: 'global-exercise-abduccion-maquina',    order: 5, sets: 3, repsScheme: '15-20', restSeconds: 60 },
        ]},
        { dayOfWeek: 3, label: 'Miércoles — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 6, label: 'Sábado — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 7, label: 'Domingo — Descanso', muscleGroups: [], isRestDay: true },
      ],
    },
    {
      id: 'public-template-fuerza-5x5',
      name: 'Fuerza 5×5',
      description: 'Protocolo clásico para ganar fuerza máxima. 3 días, 5 series de 5 repeticiones en los grandes movimientos.',
      goal: 'STRENGTH', level: 'INTERMEDIATE', daysPerWeek: 3, category: 'STRENGTH',
      days: [
        { dayOfWeek: 1, label: 'Lunes — Día A', muscleGroups: ['CHEST', 'BACK', 'QUADRICEPS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-frontal',   order: 1, sets: 5, repsScheme: '5', restSeconds: 180 },
          { exerciseId: 'global-exercise-press-plano-barra',    order: 2, sets: 5, repsScheme: '5', restSeconds: 180 },
          { exerciseId: 'global-exercise-remo-barra',           order: 3, sets: 5, repsScheme: '5', restSeconds: 180 },
        ]},
        { dayOfWeek: 3, label: 'Miércoles — Día B', muscleGroups: ['BACK', 'SHOULDERS', 'HAMSTRINGS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-frontal',   order: 1, sets: 5, repsScheme: '5', restSeconds: 180 },
          { exerciseId: 'global-exercise-press-militar-barra',  order: 2, sets: 5, repsScheme: '5', restSeconds: 180 },
          { exerciseId: 'global-exercise-peso-muerto',          order: 3, sets: 1, repsScheme: '5', restSeconds: 300 },
        ]},
        { dayOfWeek: 5, label: 'Viernes — Día A (repetir)', muscleGroups: ['CHEST', 'BACK', 'QUADRICEPS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-frontal',   order: 1, sets: 5, repsScheme: '5', restSeconds: 180 },
          { exerciseId: 'global-exercise-press-plano-barra',    order: 2, sets: 5, repsScheme: '5', restSeconds: 180 },
          { exerciseId: 'global-exercise-remo-barra',           order: 3, sets: 5, repsScheme: '5', restSeconds: 180 },
        ]},
        { dayOfWeek: 2, label: 'Martes — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 4, label: 'Jueves — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 6, label: 'Sábado — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 7, label: 'Domingo — Descanso', muscleGroups: [], isRestDay: true },
      ],
    },
    {
      id: 'public-template-ppl-6x',
      name: 'Push Pull Legs — 6 días',
      description: 'Versión avanzada del PPL con doble frecuencia. Para quienes pueden entrenar 6 días a la semana.',
      goal: 'HYPERTROPHY', level: 'ADVANCED', daysPerWeek: 6, category: 'PPL',
      days: [
        { dayOfWeek: 1, label: 'Lunes — Push A', muscleGroups: ['CHEST', 'SHOULDERS', 'TRICEPS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-press-plano-barra',    order: 1, sets: 4, repsScheme: '6-8', restSeconds: 120 },
          { exerciseId: 'global-exercise-press-inclinado-barra', order: 2, sets: 4, repsScheme: '8-10', restSeconds: 90 },
          { exerciseId: 'global-exercise-press-arnold',         order: 3, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-elevacion-lateral',    order: 4, sets: 4, repsScheme: '15-20', restSeconds: 60 },
          { exerciseId: 'global-exercise-extension-triceps-polea', order: 5, sets: 3, repsScheme: '12-15', restSeconds: 60 },
        ]},
        { dayOfWeek: 2, label: 'Martes — Pull A', muscleGroups: ['BACK', 'BICEPS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-dominadas',            order: 1, sets: 4, repsScheme: '6-8', restSeconds: 120 },
          { exerciseId: 'global-exercise-remo-barra',           order: 2, sets: 4, repsScheme: '6-8', restSeconds: 120 },
          { exerciseId: 'global-exercise-jalon-polea-alta',     order: 3, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-flexion-barra-z',      order: 4, sets: 4, repsScheme: '10-12', restSeconds: 60 },
          { exerciseId: 'global-exercise-remo-mancuernas',      order: 5, sets: 3, repsScheme: '12', restSeconds: 60 },
        ]},
        { dayOfWeek: 3, label: 'Miércoles — Legs A', muscleGroups: ['QUADRICEPS', 'HAMSTRINGS', 'GLUTES'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-frontal',   order: 1, sets: 4, repsScheme: '6-8', restSeconds: 180 },
          { exerciseId: 'global-exercise-prensa',               order: 2, sets: 4, repsScheme: '10-12', restSeconds: 120 },
          { exerciseId: 'global-exercise-peso-muerto',          order: 3, sets: 3, repsScheme: '8', restSeconds: 180 },
          { exerciseId: 'global-exercise-extension-rodillas',   order: 4, sets: 3, repsScheme: '15', restSeconds: 60 },
          { exerciseId: 'global-exercise-hip-thrust',           order: 5, sets: 3, repsScheme: '12', restSeconds: 90 },
        ]},
        { dayOfWeek: 4, label: 'Jueves — Push B', muscleGroups: ['CHEST', 'SHOULDERS', 'TRICEPS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-press-inclinado-barra', order: 1, sets: 4, repsScheme: '8-10', restSeconds: 120 },
          { exerciseId: 'global-exercise-press-declinado-mancuernas', order: 2, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-press-militar-barra',  order: 3, sets: 4, repsScheme: '8-10', restSeconds: 90 },
          { exerciseId: 'global-exercise-elevacion-frontal',    order: 4, sets: 3, repsScheme: '12-15', restSeconds: 60 },
          { exerciseId: 'global-exercise-cruces-polea-alta',    order: 5, sets: 3, repsScheme: '15', restSeconds: 60 },
        ]},
        { dayOfWeek: 5, label: 'Viernes — Pull B', muscleGroups: ['BACK', 'BICEPS', 'SHOULDERS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-remo-mancuernas',      order: 1, sets: 4, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-jalon-polea-alta',     order: 2, sets: 4, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-dominadas',            order: 3, sets: 3, repsScheme: 'al fallo', restSeconds: 120 },
          { exerciseId: 'global-exercise-flexion-barra-z',      order: 4, sets: 3, repsScheme: '12', restSeconds: 60 },
          { exerciseId: 'global-exercise-pajaros',              order: 5, sets: 3, repsScheme: '15', restSeconds: 60 },
        ]},
        { dayOfWeek: 6, label: 'Sábado — Legs B', muscleGroups: ['QUADRICEPS', 'GLUTES', 'HAMSTRINGS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-hack',      order: 1, sets: 4, repsScheme: '10-12', restSeconds: 120 },
          { exerciseId: 'global-exercise-avanzadas',            order: 2, sets: 3, repsScheme: '12 c/lado', restSeconds: 90 },
          { exerciseId: 'global-exercise-hip-thrust',           order: 3, sets: 4, repsScheme: '12-15', restSeconds: 90 },
          { exerciseId: 'global-exercise-abduccion-maquina',    order: 4, sets: 3, repsScheme: '15-20', restSeconds: 60 },
          { exerciseId: 'global-exercise-flexion-rodillas-sentado', order: 5, sets: 3, repsScheme: '12-15', restSeconds: 60 },
        ]},
        { dayOfWeek: 7, label: 'Domingo — Descanso', muscleGroups: [], isRestDay: true },
      ],
    },
  ]

  for (const tmpl of publicTemplates) {
    await prisma.workoutTemplate.upsert({
      where: { id: tmpl.id },
      update: {},
      create: {
        id: tmpl.id,
        name: tmpl.name,
        description: tmpl.description,
        goal: tmpl.goal,
        level: tmpl.level,
        daysPerWeek: tmpl.daysPerWeek,
        isPublic: true,
        category: tmpl.category,
      },
    })

    for (const day of tmpl.days) {
      const dayId = `${tmpl.id}-day-${day.dayOfWeek}`
      await prisma.workoutDay.upsert({
        where: { id: dayId },
        update: {},
        create: {
          id: dayId,
          templateId: tmpl.id,
          dayOfWeek: day.dayOfWeek,
          label: day.label,
          muscleGroups: day.muscleGroups,
          isRestDay: day.isRestDay,
          order: day.dayOfWeek,
        },
      })

      if (!day.isRestDay && day.exercises) {
        for (const ex of day.exercises) {
          const exId = `${dayId}-ex-${ex.exerciseId}`
          await prisma.workoutExercise.upsert({
            where: { id: exId },
            update: {},
            create: {
              id: exId,
              dayId,
              exerciseId: ex.exerciseId,
              order: ex.order,
              sets: ex.sets,
              repsScheme: ex.repsScheme,
              restSeconds: ex.restSeconds,
            },
          })
        }
      }
    }
  }

  console.log(`✅ Rutinas:      ${publicTemplates.length} plantillas públicas del sistema`)

  // ── Sistema: WorkoutTemplate "Fuerza corredor" ─────────────────────────────
  // Plantilla interna usada por generate-plan para vincular sesiones FUERZA
  // en planes de running (5K, 10K, Media, Maratón) al gym tracker.
  // isPublic: false — el atleta no la selecciona manualmente.
  // Dos WorkoutDays (por fase, no por día de semana):
  //   BASE:       fuerza funcional 3×12-15 (sentadillas, lunges, hip thrust)
  //   ESPECÍFICO: fuerza específica 4×8-10 + talones
  await prisma.workoutTemplate.upsert({
    where: { id: 'system-fuerza-corredor' },
    update: {},
    create: {
      id: 'system-fuerza-corredor',
      name: 'Fuerza corredor',
      description: 'Rutina de fuerza complementaria para atletas de running. Se vincula automáticamente al plan de entrenamiento.',
      goal: 'RUNNING_STRENGTH',
      level: 'INTERMEDIATE',
      daysPerWeek: 1,
      isPublic: false,
      category: 'RUNNER_STRENGTH',
    },
  })

  // BASE — sentadilla, lunges, hip thrust, talones (fuerza funcional)
  await prisma.workoutDay.upsert({
    where: { id: 'system-fuerza-corredor-base' },
    update: {},
    create: {
      id: 'system-fuerza-corredor-base',
      templateId: 'system-fuerza-corredor',
      dayOfWeek: 1,
      label: 'Fuerza Base — Funcional corredor',
      muscleGroups: ['QUADRICEPS', 'GLUTES', 'HAMSTRINGS', 'CALVES'],
      isRestDay: false,
      order: 1,
      warmupNotes: '5 min movilidad de cadera y rodilla. Activación glúteos con banda.',
    },
  })

  const baseFuerzaExercises = [
    { exerciseId: 'global-exercise-sentadilla-frontal',        order: 1, sets: 3, repsScheme: '12-15', restSeconds: 90  },
    { exerciseId: 'global-exercise-avanzadas',                 order: 2, sets: 3, repsScheme: '12 c/lado', restSeconds: 60  },
    { exerciseId: 'global-exercise-hip-thrust',                order: 3, sets: 3, repsScheme: '15',     restSeconds: 60  },
    { exerciseId: 'global-exercise-elevacion-talones-maquina', order: 4, sets: 3, repsScheme: '20',     restSeconds: 45  },
  ]
  for (const ex of baseFuerzaExercises) {
    await prisma.workoutExercise.upsert({
      where: { id: `system-fuerza-corredor-base-ex-${ex.exerciseId}` },
      update: {},
      create: {
        id: `system-fuerza-corredor-base-ex-${ex.exerciseId}`,
        dayId: 'system-fuerza-corredor-base',
        exerciseId: ex.exerciseId,
        order: ex.order,
        sets: ex.sets,
        repsScheme: ex.repsScheme,
        restSeconds: ex.restSeconds,
      },
    })
  }

  // ESPECÍFICO — carga más alta, talones con más volumen (fuerza específica)
  await prisma.workoutDay.upsert({
    where: { id: 'system-fuerza-corredor-especifico' },
    update: {},
    create: {
      id: 'system-fuerza-corredor-especifico',
      templateId: 'system-fuerza-corredor',
      dayOfWeek: 2,
      label: 'Fuerza Específica — Potencia y reactividad',
      muscleGroups: ['QUADRICEPS', 'GLUTES', 'HAMSTRINGS', 'CALVES'],
      isRestDay: false,
      order: 2,
      warmupNotes: '5 min rodillo espuma. Skipping progresivo + talones al glúteo.',
    },
  })

  const especificoFuerzaExercises = [
    { exerciseId: 'global-exercise-sentadilla-frontal',        order: 1, sets: 4, repsScheme: '8-10',      restSeconds: 120 },
    { exerciseId: 'global-exercise-peso-muerto',               order: 2, sets: 4, repsScheme: '8',          restSeconds: 180 },
    { exerciseId: 'global-exercise-avanzadas',                 order: 3, sets: 3, repsScheme: '10 c/lado',  restSeconds: 90  },
    { exerciseId: 'global-exercise-elevacion-talones-maquina', order: 4, sets: 4, repsScheme: '15',          restSeconds: 45  },
  ]
  for (const ex of especificoFuerzaExercises) {
    await prisma.workoutExercise.upsert({
      where: { id: `system-fuerza-corredor-especifico-ex-${ex.exerciseId}` },
      update: {},
      create: {
        id: `system-fuerza-corredor-especifico-ex-${ex.exerciseId}`,
        dayId: 'system-fuerza-corredor-especifico',
        exerciseId: ex.exerciseId,
        order: ex.order,
        sets: ex.sets,
        repsScheme: ex.repsScheme,
        restSeconds: ex.restSeconds,
      },
    })
  }

  console.log('✅ Fuerza corredor: plantilla de sistema (BASE + ESPECÍFICO)')
  console.log(`✅ Coaches:      coach@medaliq.com / coach123`)
  console.log(`                maria.coach@medaliq.com / coach123`)
  console.log(`✅ Admin:        admin@medaliq.com / admin123!`)
  console.log(`✅ Atletas (15):`)
  console.log(`   1  miguel@medaliq.com         (B2B coach1 · half marathon · semana 7)`)
  console.log(`   2  ana@medaliq.com             (B2C sin plan · recién registrada)`)
  console.log(`   3  juan.perez@medaliq.com      (B2B coach1 · 10K · semana 6)`)
  console.log(`   4  sofia.ramirez@medaliq.com   (B2B coach2 · recomposición · semana 9)`)
  console.log(`   5  andres.moreno@medaliq.com   (B2C trial · ciclismo · semana 5)`)
  console.log(`   6  valentina.castro@medaliq.com(B2C trial · half marathon · semana 4)`)
  console.log(`   7  camilo.torres@medaliq.com   (B2B coach2 · fuerza · semana 7)`)
  console.log(`   8  laura.gomez@medaliq.com     (B2C trial · recomposición · semana 4)`)
  console.log(`   9  sebastian.rios@medaliq.com  (B2B coach1 · 5K · semana 5)`)
  console.log(`   10 daniela.vargas@medaliq.com  (B2C trial · triatlón · semana 6)`)
  console.log(`   11 felipe.herrera@medaliq.com  (B2C trial · ciclismo · semana 8)`)
  console.log(`   12 isabella.mendez@medaliq.com (B2B coach2 · recomposición · semana 5)`)
  console.log(`   13 nicolas.gutierrez@medaliq.com(B2B coach1 · half marathon · semana 3)`)
  console.log(`   14 catalina.jimenez@medaliq.com(B2C trial · 10K · semana 5)`)
  console.log(`   15 santiago.rodriguez@medaliq.com(B2B coach1 · maratón · semana 11)`)
  console.log(`\n🎉 Seed completo. Contraseña atletas: atleta123`)
}

// ── Helpers de plan ────────────────────────────────────────────────────────────

async function seedRunningPlan(
  prisma: PrismaClient,
  userId: string,
  planId: string,
  name: string,
  totalWeeks: number,
  startDate: Date,
  goalType: GoalType,
  weekDefs: Array<{ wn: number; phase: Phase; vol: number; focus: string; recovery: boolean }>,
  checkIns: Array<{ wn: number; wkg: number; hr: number; sleep: number; score: number; rpe: number; adh: number; pain: boolean; energy: number; notes: string }>,
) {
  const plan = await prisma.trainingPlan.upsert({
    where: { id: planId },
    update: {},
    create: {
      id: planId, userId, name, totalWeeks,
      startDate, endDate: addDays(startDate, totalWeeks * 7),
      status: PlanStatus.ACTIVE, generatedBy: PlanSource.AI,
      hrZones: { z1: { min: 90, max: 115 }, z2: { min: 116, max: 135 }, z3: { min: 136, max: 155 }, z4: { min: 156, max: 172 }, z5: { min: 173, max: 195 } },
    },
  })

  for (const wd of weekDefs) {
    const wStart = addDays(startDate, (wd.wn - 1) * 7)
    const week = await prisma.planWeek.upsert({
      where: { planId_weekNumber: { planId: plan.id, weekNumber: wd.wn } },
      update: {},
      create: {
        planId: plan.id, weekNumber: wd.wn, phase: wd.phase,
        volumeKm: wd.vol, focusDescription: wd.focus, isRecoveryWeek: wd.recovery,
        startDate: wStart, endDate: addDays(wStart, 6),
      },
    })

    const sessDefs = wd.recovery
      ? [
          { d: 1, type: SessionType.RODAJE_Z2, dur: 30, zone: 'Z1-Z2', detail: 'Rodaje suave recuperación' },
          { d: 3, type: SessionType.RODAJE_Z2, dur: 25, zone: 'Z1',    detail: 'Trote ligero 25 min' },
          { d: 6, type: SessionType.RODAJE_Z2, dur: 40, zone: 'Z2',    detail: 'Tirada corta fácil' },
        ]
      : wd.wn <= 2
        ? [
            { d: 1, type: SessionType.RODAJE_Z2,   dur: 40, zone: 'Z2',    detail: '40 min Z2 activación' },
            { d: 3, type: SessionType.FARTLEK,       dur: 50, zone: 'Z2-Z3', detail: '10 cal + 5×2 min Z3 / 2 min Z2 + 10 vuelta' },
            { d: 6, type: SessionType.TIRADA_LARGA,  dur: 70, zone: 'Z2',    detail: 'Tirada larga Z2 — hidratación c/20 min' },
          ]
        : [
            { d: 1, type: SessionType.RODAJE_Z2,   dur: 45, zone: 'Z2',    detail: '45 min Z2 activación' },
            { d: 2, type: SessionType.TEMPO,         dur: 55, zone: 'Z3-Z4', detail: '15 cal + 20 min tempo + 10 vuelta' },
            { d: 4, type: SessionType.INTERVALOS,    dur: 60, zone: 'Z4-Z5', detail: '15 cal + 6×800m Z4 / 400m trote + 15 vuelta' },
            { d: 6, type: SessionType.TIRADA_LARGA,  dur: 90, zone: 'Z2',    detail: 'Tirada larga 90 min — gel c/30 min' },
          ]

    for (const s of sessDefs) {
      await prisma.plannedSession.upsert({
        where: { id: `${planId}-w${wd.wn}-d${s.d}` },
        update: {},
        create: {
          id: `${planId}-w${wd.wn}-d${s.d}`,
          weekId: week.id, dayOfWeek: s.d, type: s.type,
          durationMin: s.dur, zoneTarget: s.zone, detailText: s.detail,
          date: addDays(wStart, s.d - 1),
        },
      })
    }
  }

  for (const ci of checkIns) {
    const _existsCi = await prisma.weeklyCheckIn.findFirst({
      where: { userId, planId: null, weekNumber: ci.wn },
      select: { id: true },
    })
    if (!_existsCi) {
      await prisma.weeklyCheckIn.create({
        data: {
          userId, planId: null, weekNumber: ci.wn,
          weightKg: ci.wkg, hrResting: ci.hr, sleepHours: ci.sleep, sleepScore: ci.score,
          hardestSessionRpe: ci.rpe, painFlag: ci.pain,
          dietAdherencePct: ci.adh, energyLevel: ci.energy, notes: ci.notes, adjustmentsTriggered: [],
        },
      })
    }
  }
}

async function seedBodyPlan(
  prisma: PrismaClient,
  userId: string,
  planId: string,
  name: string,
  totalWeeks: number,
  startDate: Date,
  checkIns: Array<{ wn: number; wkg: number; hr: number; sleep: number; score: number; rpe: number; adh: number; pain: boolean; energy: number; notes: string }>,
) {
  const plan = await prisma.trainingPlan.upsert({
    where: { id: planId },
    update: {},
    create: {
      id: planId, userId, name, totalWeeks,
      startDate, endDate: addDays(startDate, totalWeeks * 7),
      status: PlanStatus.ACTIVE, generatedBy: PlanSource.AI,
      hrZones: {},
    },
  })

  const weekCount = Math.min(checkIns.length, Math.ceil((Date.now() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)))

  for (let wn = 1; wn <= weekCount; wn++) {
    const phase = wn <= 4 ? Phase.BASE : wn <= 8 ? Phase.DESARROLLO : wn <= 12 ? Phase.ESPECIFICO : Phase.AFINAMIENTO
    const isRecovery = wn % 4 === 0
    const wStart = addDays(startDate, (wn - 1) * 7)

    const week = await prisma.planWeek.upsert({
      where: { planId_weekNumber: { planId: plan.id, weekNumber: wn } },
      update: {},
      create: {
        planId: plan.id, weekNumber: wn, phase,
        focusDescription: isRecovery ? 'Semana de descarga — cargas reducidas' : 'Hipertrofia + cardio metabólico',
        isRecoveryWeek: isRecovery,
        startDate: wStart, endDate: addDays(wStart, 6),
      },
    })

    const sessDefs = isRecovery
      ? [
          { d: 1, type: SessionType.FUERZA,    dur: 40, zone: null, detail: 'Fuerza ligera — técnica' },
          { d: 3, type: SessionType.RODAJE_Z2,  dur: 30, zone: 'Z1', detail: 'Cardio suave 30 min' },
          { d: 5, type: SessionType.FUERZA,    dur: 40, zone: null, detail: 'Fuerza complementaria' },
        ]
      : [
          { d: 1, type: SessionType.FUERZA,    dur: 60, zone: null, detail: 'Tren inferior — sentadilla + hip thrust + extensión' },
          { d: 2, type: SessionType.RODAJE_Z2,  dur: 35, zone: 'Z2', detail: 'Cardio LISS 35 min' },
          { d: 3, type: SessionType.FUERZA,    dur: 60, zone: null, detail: 'Tren superior — press + jalón + remo' },
          { d: 5, type: SessionType.FUERZA,    dur: 55, zone: null, detail: 'Full body metabólico + cardio HIIT 15 min' },
        ]

    for (const s of sessDefs) {
      await prisma.plannedSession.upsert({
        where: { id: `${planId}-w${wn}-d${s.d}` },
        update: {},
        create: {
          id: `${planId}-w${wn}-d${s.d}`,
          weekId: week.id, dayOfWeek: s.d, type: s.type,
          durationMin: s.dur, zoneTarget: s.zone ?? undefined, detailText: s.detail,
          date: addDays(wStart, s.d - 1),
        },
      })
    }
  }

  for (const ci of checkIns) {
    const _existsCi = await prisma.weeklyCheckIn.findFirst({
      where: { userId, planId: null, weekNumber: ci.wn },
      select: { id: true },
    })
    if (!_existsCi) {
      await prisma.weeklyCheckIn.create({
        data: {
          userId, planId: null, weekNumber: ci.wn,
          weightKg: ci.wkg, hrResting: ci.hr, sleepHours: ci.sleep, sleepScore: ci.score,
          hardestSessionRpe: ci.rpe, painFlag: ci.pain,
          dietAdherencePct: ci.adh, energyLevel: ci.energy, notes: ci.notes, adjustmentsTriggered: [],
        },
      })
    }
  }
}

async function seedCyclingPlan(
  prisma: PrismaClient,
  userId: string,
  planId: string,
  name: string,
  totalWeeks: number,
  startDate: Date,
  checkIns: Array<{ wn: number; wkg: number; hr: number; sleep: number; score: number; rpe: number; adh: number; pain: boolean; energy: number; notes: string }>,
) {
  const plan = await prisma.trainingPlan.upsert({
    where: { id: planId },
    update: {},
    create: {
      id: planId, userId, name, totalWeeks,
      startDate, endDate: addDays(startDate, totalWeeks * 7),
      status: PlanStatus.ACTIVE, generatedBy: PlanSource.AI,
      hrZones: { z1: { min: 88, max: 110 }, z2: { min: 111, max: 130 }, z3: { min: 131, max: 150 }, z4: { min: 151, max: 168 }, z5: { min: 169, max: 190 } },
    },
  })

  const weekCount = Math.min(checkIns.length, Math.ceil((Date.now() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)))

  for (let wn = 1; wn <= weekCount; wn++) {
    const phase = wn <= 4 ? Phase.BASE : wn <= 8 ? Phase.DESARROLLO : Phase.ESPECIFICO
    const isRecovery = wn % 4 === 0
    const wStart = addDays(startDate, (wn - 1) * 7)

    const week = await prisma.planWeek.upsert({
      where: { planId_weekNumber: { planId: plan.id, weekNumber: wn } },
      update: {},
      create: {
        planId: plan.id, weekNumber: wn, phase,
        volumeKm: isRecovery ? 80 : 100 + wn * 8,
        focusDescription: isRecovery ? 'Semana recuperación — rodadas suaves' : wn <= 4 ? 'Base aeróbica — Z2 extenso' : 'Sweet spot y VO2max',
        isRecoveryWeek: isRecovery,
        startDate: wStart, endDate: addDays(wStart, 6),
      },
    })

    const sessDefs = isRecovery
      ? [
          { d: 2, type: SessionType.CICLA, dur: 60, zone: 'Z1-Z2', detail: 'Rodada suave recuperación — 60 min Z1-Z2' },
          { d: 5, type: SessionType.CICLA, dur: 90, zone: 'Z2',    detail: 'Rodada fácil 90 min Z2' },
        ]
      : wn <= 4
        ? [
            { d: 1, type: SessionType.CICLA,    dur: 90,  zone: 'Z2',    detail: '90 min Z2 extenso — cadencia 85-90 rpm' },
            { d: 3, type: SessionType.FARTLEK,   dur: 75,  zone: 'Z2-Z3', detail: '10 cal + 4×10 min sweet spot / 5 min Z2 + 10 vuelta' },
            { d: 5, type: SessionType.RODAJE_Z2, dur: 45,  zone: 'Z2',    detail: 'Run Z2 45 min — entrenamiento cruzado' },
            { d: 6, type: SessionType.CICLA,    dur: 180, zone: 'Z2',    detail: 'Gran rodada 3h Z2 — salida larga' },
          ]
        : [
            { d: 1, type: SessionType.CICLA,    dur: 90,  zone: 'Z2',    detail: '90 min Z2 activación' },
            { d: 2, type: SessionType.INTERVALOS, dur: 75, zone: 'Z4-Z5', detail: '15 cal + 5×4 min VO2max / 4 min Z2 + 15 vuelta' },
            { d: 4, type: SessionType.TEMPO,     dur: 80,  zone: 'Z3-Z4', detail: '15 cal + 40 min sweet spot + 15 vuelta' },
            { d: 6, type: SessionType.CICLA,    dur: 210, zone: 'Z2',    detail: 'Gran rodada 3.5h — últimos 30 min a ritmo competencia' },
          ]

    for (const s of sessDefs) {
      await prisma.plannedSession.upsert({
        where: { id: `${planId}-w${wn}-d${s.d}` },
        update: {},
        create: {
          id: `${planId}-w${wn}-d${s.d}`,
          weekId: week.id, dayOfWeek: s.d, type: s.type,
          durationMin: s.dur, zoneTarget: s.zone, detailText: s.detail,
          date: addDays(wStart, s.d - 1),
        },
      })
    }
  }

  for (const ci of checkIns) {
    const _existsCi = await prisma.weeklyCheckIn.findFirst({
      where: { userId, planId: null, weekNumber: ci.wn },
      select: { id: true },
    })
    if (!_existsCi) {
      await prisma.weeklyCheckIn.create({
        data: {
          userId, planId: null, weekNumber: ci.wn,
          weightKg: ci.wkg, hrResting: ci.hr, sleepHours: ci.sleep, sleepScore: ci.score,
          hardestSessionRpe: ci.rpe, painFlag: ci.pain,
          dietAdherencePct: ci.adh, energyLevel: ci.energy, notes: ci.notes, adjustmentsTriggered: [],
        },
      })
    }
  }
}

async function seedTriathlonPlan(
  prisma: PrismaClient,
  userId: string,
  planId: string,
  name: string,
  totalWeeks: number,
  startDate: Date,
  checkIns: Array<{ wn: number; wkg: number; hr: number; sleep: number; score: number; rpe: number; adh: number; pain: boolean; energy: number; notes: string }>,
) {
  const plan = await prisma.trainingPlan.upsert({
    where: { id: planId },
    update: {},
    create: {
      id: planId, userId, name, totalWeeks,
      startDate, endDate: addDays(startDate, totalWeeks * 7),
      status: PlanStatus.ACTIVE, generatedBy: PlanSource.AI,
      hrZones: { z1: { min: 88, max: 111 }, z2: { min: 112, max: 131 }, z3: { min: 132, max: 151 }, z4: { min: 152, max: 170 }, z5: { min: 171, max: 190 } },
    },
  })

  const weekCount = Math.min(checkIns.length, Math.ceil((Date.now() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)))

  for (let wn = 1; wn <= weekCount; wn++) {
    const phase = wn <= 4 ? Phase.BASE : wn <= 9 ? Phase.DESARROLLO : Phase.ESPECIFICO
    const isRecovery = wn % 4 === 0
    const wStart = addDays(startDate, (wn - 1) * 7)

    const week = await prisma.planWeek.upsert({
      where: { planId_weekNumber: { planId: plan.id, weekNumber: wn } },
      update: {},
      create: {
        planId: plan.id, weekNumber: wn, phase,
        focusDescription: isRecovery ? 'Semana recuperación — volumen reducido' : 'Multidisciplina — nado + bici + run',
        isRecoveryWeek: isRecovery,
        startDate: wStart, endDate: addDays(wStart, 6),
      },
    })

    const sessDefs = isRecovery
      ? [
          { d: 1, type: SessionType.NATACION, dur: 40, zone: 'Z1-Z2', detail: 'Nado técnico — 2000m suave' },
          { d: 3, type: SessionType.CICLA,    dur: 60, zone: 'Z2',    detail: 'Bici suave 60 min Z2' },
          { d: 5, type: SessionType.RODAJE_Z2, dur: 30, zone: 'Z2',   detail: 'Run fácil 30 min' },
        ]
      : [
          { d: 1, type: SessionType.NATACION, dur: 60, zone: 'Z2-Z3', detail: 'Nado 3000m — series 100m Z3 + 200m Z2' },
          { d: 2, type: SessionType.CICLA,    dur: 90, zone: 'Z2',    detail: 'Bici 90 min Z2 + 15 min Z3 al final' },
          { d: 4, type: SessionType.INTERVALOS, dur: 60, zone: 'Z4',  detail: 'Bici intervalos + brick run 20 min Z3' },
          { d: 5, type: SessionType.NATACION, dur: 50, zone: 'Z3-Z4', detail: 'Nado 2500m — series 400m a ritmo competencia' },
          { d: 6, type: SessionType.TIRADA_LARGA, dur: 75, zone: 'Z2', detail: 'Long run 75 min Z2' },
        ]

    for (const s of sessDefs) {
      await prisma.plannedSession.upsert({
        where: { id: `${planId}-w${wn}-d${s.d}` },
        update: {},
        create: {
          id: `${planId}-w${wn}-d${s.d}`,
          weekId: week.id, dayOfWeek: s.d, type: s.type,
          durationMin: s.dur, zoneTarget: s.zone, detailText: s.detail,
          date: addDays(wStart, s.d - 1),
        },
      })
    }
  }

  for (const ci of checkIns) {
    const _existsCi = await prisma.weeklyCheckIn.findFirst({
      where: { userId, planId: null, weekNumber: ci.wn },
      select: { id: true },
    })
    if (!_existsCi) {
      await prisma.weeklyCheckIn.create({
        data: {
          userId, planId: null, weekNumber: ci.wn,
          weightKg: ci.wkg, hrResting: ci.hr, sleepHours: ci.sleep, sleepScore: ci.score,
          hardestSessionRpe: ci.rpe, painFlag: ci.pain,
          dietAdherencePct: ci.adh, energyLevel: ci.energy, notes: ci.notes, adjustmentsTriggered: [],
        },
      })
    }
  }

  // Librería de alimentos
  await seedFoods()

  console.log('✅ Seed completo')
}

// ─── LIBRERÍA DE ALIMENTOS ──────────────────────────────────────────────────

async function seedFoods() {
  const existing = await prisma.food.count()
  if (existing > 0) {
    console.log(`  ✓ Alimentos ya sembrados (${existing} registros) — saltando`)
    return
  }

  // Macros y micronutrientes por 100g, basados en tablas USDA / ICBF
  const foods = [
    // ── PROTEÍNAS ──
    { name: 'Pechuga de pollo cocida',     category: 'PROTEIN', kcalPer100g: 165, proteinPer100g: 31.0, carbsPer100g: 0.0,  fatPer100g: 3.6,  fiberPer100g: 0,    calciumMg: 15,  ironMg: 1.0, potassiumMg: 256, vitaminCMg: 0,    magnesiumMg: 29,  servingG: 200, servingLabel: '1 pechuga mediana' },
    { name: 'Muslo de pollo cocido',        category: 'PROTEIN', kcalPer100g: 209, proteinPer100g: 26.0, carbsPer100g: 0.0,  fatPer100g: 11.0, fiberPer100g: 0,    calciumMg: 12,  ironMg: 1.0, potassiumMg: 238, vitaminCMg: 0,    magnesiumMg: 23,  servingG: 150, servingLabel: '1 muslo mediano' },
    { name: 'Carne de res magra (lomo)',    category: 'PROTEIN', kcalPer100g: 215, proteinPer100g: 26.0, carbsPer100g: 0.0,  fatPer100g: 12.0, fiberPer100g: 0,    calciumMg: 18,  ironMg: 2.6, potassiumMg: 318, vitaminCMg: 0,    magnesiumMg: 21,  servingG: 150, servingLabel: '1 porción mediana' },
    { name: 'Atún en agua (escurrido)',     category: 'PROTEIN', kcalPer100g: 99,  proteinPer100g: 22.0, carbsPer100g: 0.0,  fatPer100g: 1.0,  fiberPer100g: 0,    calciumMg: 12,  ironMg: 1.4, potassiumMg: 214, vitaminCMg: 0,    magnesiumMg: 35,  servingG: 120, servingLabel: '1 lata estándar' },
    { name: 'Salmón cocido',               category: 'PROTEIN', kcalPer100g: 208, proteinPer100g: 28.0, carbsPer100g: 0.0,  fatPer100g: 10.0, fiberPer100g: 0,    calciumMg: 12,  ironMg: 0.8, potassiumMg: 490, vitaminCMg: 3.5,  magnesiumMg: 29,  servingG: 150, servingLabel: '1 filete mediano' },
    { name: 'Tilapia cocida',              category: 'PROTEIN', kcalPer100g: 128, proteinPer100g: 26.0, carbsPer100g: 0.0,  fatPer100g: 2.7,  fiberPer100g: 0,    calciumMg: 10,  ironMg: 0.6, potassiumMg: 380, vitaminCMg: 0,    magnesiumMg: 27,  servingG: 150, servingLabel: '1 filete mediano' },
    { name: 'Sardinas en agua',            category: 'PROTEIN', kcalPer100g: 185, proteinPer100g: 25.0, carbsPer100g: 0.0,  fatPer100g: 10.0, fiberPer100g: 0,    calciumMg: 382, ironMg: 2.9, potassiumMg: 397, vitaminCMg: 0,    magnesiumMg: 39,  servingG: 100, servingLabel: '1 lata pequeña' },
    { name: 'Huevo entero',                category: 'PROTEIN', kcalPer100g: 155, proteinPer100g: 13.0, carbsPer100g: 1.1,  fatPer100g: 11.0, fiberPer100g: 0,    calciumMg: 56,  ironMg: 1.8, potassiumMg: 138, vitaminCMg: 0,    magnesiumMg: 12,  servingG: 50,  servingLabel: '1 huevo grande' },
    { name: 'Clara de huevo',              category: 'PROTEIN', kcalPer100g: 52,  proteinPer100g: 11.0, carbsPer100g: 0.7,  fatPer100g: 0.2,  fiberPer100g: 0,    calciumMg: 7,   ironMg: 0.1, potassiumMg: 163, vitaminCMg: 0,    magnesiumMg: 11,  servingG: 120, servingLabel: '4 claras' },
    { name: 'Proteína whey (polvo)',        category: 'PROTEIN', kcalPer100g: 370, proteinPer100g: 80.0, carbsPer100g: 7.0,  fatPer100g: 5.0,  fiberPer100g: 0,    calciumMg: 130, ironMg: 1.0, potassiumMg: 500, vitaminCMg: 0,    magnesiumMg: 55,  servingG: 30,  servingLabel: '1 medida (30g)' },

    // ── LÁCTEOS ──
    { name: 'Yogur griego 0% grasa',       category: 'DAIRY', kcalPer100g: 59,  proteinPer100g: 10.0, carbsPer100g: 3.6,  fatPer100g: 0.4,  fiberPer100g: 0,    calciumMg: 110, ironMg: 0.1, potassiumMg: 141, vitaminCMg: 0,    magnesiumMg: 11,  servingG: 200, servingLabel: '1 taza' },
    { name: 'Yogur griego entero',         category: 'DAIRY', kcalPer100g: 97,  proteinPer100g: 9.0,  carbsPer100g: 3.9,  fatPer100g: 5.0,  fiberPer100g: 0,    calciumMg: 100, ironMg: 0.1, potassiumMg: 141, vitaminCMg: 0,    magnesiumMg: 11,  servingG: 200, servingLabel: '1 taza' },
    { name: 'Queso cottage 1% grasa',      category: 'DAIRY', kcalPer100g: 72,  proteinPer100g: 12.0, carbsPer100g: 3.0,  fatPer100g: 1.0,  fiberPer100g: 0,    calciumMg: 83,  ironMg: 0.1, potassiumMg: 84,  vitaminCMg: 0,    magnesiumMg: 8,   servingG: 150, servingLabel: '¾ taza' },
    { name: 'Leche descremada',            category: 'DAIRY', kcalPer100g: 35,  proteinPer100g: 3.4,  carbsPer100g: 5.0,  fatPer100g: 0.1,  fiberPer100g: 0,    calciumMg: 122, ironMg: 0.1, potassiumMg: 156, vitaminCMg: 1.0,  magnesiumMg: 11,  servingG: 250, servingLabel: '1 vaso' },
    { name: 'Leche entera',                category: 'DAIRY', kcalPer100g: 61,  proteinPer100g: 3.2,  carbsPer100g: 4.8,  fatPer100g: 3.3,  fiberPer100g: 0,    calciumMg: 113, ironMg: 0.1, potassiumMg: 150, vitaminCMg: 0.9,  magnesiumMg: 10,  servingG: 250, servingLabel: '1 vaso' },

    // ── LEGUMBRES ──
    { name: 'Lentejas cocidas',            category: 'LEGUME', kcalPer100g: 116, proteinPer100g: 9.0,  carbsPer100g: 20.0, fatPer100g: 0.4,  fiberPer100g: 7.9,  calciumMg: 19,  ironMg: 3.3, potassiumMg: 369, vitaminCMg: 1.5,  magnesiumMg: 36,  servingG: 200, servingLabel: '1 taza cocida' },
    { name: 'Frijoles negros cocidos',     category: 'LEGUME', kcalPer100g: 132, proteinPer100g: 8.9,  carbsPer100g: 24.0, fatPer100g: 0.5,  fiberPer100g: 8.7,  calciumMg: 27,  ironMg: 2.1, potassiumMg: 355, vitaminCMg: 0,    magnesiumMg: 70,  servingG: 180, servingLabel: '1 taza cocida' },
    { name: 'Frijoles rojos cocidos',      category: 'LEGUME', kcalPer100g: 127, proteinPer100g: 8.7,  carbsPer100g: 23.0, fatPer100g: 0.5,  fiberPer100g: 7.4,  calciumMg: 28,  ironMg: 2.2, potassiumMg: 405, vitaminCMg: 1.4,  magnesiumMg: 45,  servingG: 180, servingLabel: '1 taza cocida' },
    { name: 'Garbanzos cocidos',           category: 'LEGUME', kcalPer100g: 164, proteinPer100g: 8.9,  carbsPer100g: 27.0, fatPer100g: 2.6,  fiberPer100g: 7.6,  calciumMg: 49,  ironMg: 2.9, potassiumMg: 291, vitaminCMg: 1.3,  magnesiumMg: 48,  servingG: 180, servingLabel: '1 taza cocida' },
    { name: 'Edamame cocido',              category: 'LEGUME', kcalPer100g: 122, proteinPer100g: 11.0, carbsPer100g: 10.0, fatPer100g: 5.0,  fiberPer100g: 5.2,  calciumMg: 63,  ironMg: 2.3, potassiumMg: 436, vitaminCMg: 6.1,  magnesiumMg: 64,  servingG: 150, servingLabel: '1 taza' },

    // ── CARBOHIDRATOS ──
    { name: 'Arroz blanco cocido',         category: 'CARB', kcalPer100g: 130, proteinPer100g: 2.7,  carbsPer100g: 28.0, fatPer100g: 0.3,  fiberPer100g: 0.4,  calciumMg: 2,   ironMg: 0.2, potassiumMg: 35,  vitaminCMg: 0,    magnesiumMg: 12,  servingG: 180, servingLabel: '1 taza cocida' },
    { name: 'Arroz integral cocido',       category: 'CARB', kcalPer100g: 111, proteinPer100g: 2.6,  carbsPer100g: 23.0, fatPer100g: 0.9,  fiberPer100g: 1.8,  calciumMg: 10,  ironMg: 0.5, potassiumMg: 79,  vitaminCMg: 0,    magnesiumMg: 44,  servingG: 180, servingLabel: '1 taza cocida' },
    { name: 'Avena en hojuelas (cruda)',   category: 'CARB', kcalPer100g: 389, proteinPer100g: 17.0, carbsPer100g: 66.0, fatPer100g: 7.0,  fiberPer100g: 10.6, calciumMg: 54,  ironMg: 4.7, potassiumMg: 429, vitaminCMg: 0,    magnesiumMg: 177, servingG: 80,  servingLabel: '½ taza cruda' },
    { name: 'Pasta de trigo cocida',       category: 'CARB', kcalPer100g: 158, proteinPer100g: 5.8,  carbsPer100g: 31.0, fatPer100g: 0.9,  fiberPer100g: 1.8,  calciumMg: 7,   ironMg: 1.3, potassiumMg: 44,  vitaminCMg: 0,    magnesiumMg: 18,  servingG: 200, servingLabel: '1 taza cocida' },
    { name: 'Papa blanca cocida',          category: 'CARB', kcalPer100g: 87,  proteinPer100g: 1.9,  carbsPer100g: 20.0, fatPer100g: 0.1,  fiberPer100g: 1.8,  calciumMg: 12,  ironMg: 0.3, potassiumMg: 379, vitaminCMg: 13.0, magnesiumMg: 22,  servingG: 200, servingLabel: '1 papa mediana' },
    { name: 'Batata / camote cocida',      category: 'CARB', kcalPer100g: 90,  proteinPer100g: 2.0,  carbsPer100g: 21.0, fatPer100g: 0.1,  fiberPer100g: 3.0,  calciumMg: 30,  ironMg: 0.6, potassiumMg: 337, vitaminCMg: 19.0, magnesiumMg: 25,  servingG: 200, servingLabel: '1 unidad mediana' },
    { name: 'Quinoa cocida',               category: 'CARB', kcalPer100g: 120, proteinPer100g: 4.4,  carbsPer100g: 21.0, fatPer100g: 1.9,  fiberPer100g: 2.8,  calciumMg: 17,  ironMg: 1.5, potassiumMg: 172, vitaminCMg: 0,    magnesiumMg: 64,  servingG: 180, servingLabel: '1 taza cocida' },
    { name: 'Arepa de maíz (sin relleno)', category: 'CARB', kcalPer100g: 175, proteinPer100g: 4.0,  carbsPer100g: 34.0, fatPer100g: 2.0,  fiberPer100g: 2.5,  calciumMg: 3,   ironMg: 1.8, potassiumMg: 142, vitaminCMg: 0,    magnesiumMg: 25,  servingG: 100, servingLabel: '1 arepa mediana' },
    { name: 'Yuca / mandioca cocida',      category: 'CARB', kcalPer100g: 112, proteinPer100g: 0.7,  carbsPer100g: 27.0, fatPer100g: 0.3,  fiberPer100g: 1.0,  calciumMg: 16,  ironMg: 0.3, potassiumMg: 271, vitaminCMg: 20.0, magnesiumMg: 21,  servingG: 200, servingLabel: '1 porción mediana' },
    { name: 'Pan integral',                category: 'CARB', kcalPer100g: 247, proteinPer100g: 13.0, carbsPer100g: 41.0, fatPer100g: 3.4,  fiberPer100g: 6.9,  calciumMg: 73,  ironMg: 2.7, potassiumMg: 248, vitaminCMg: 0,    magnesiumMg: 76,  servingG: 60,  servingLabel: '2 rebanadas' },
    { name: 'Maíz en grano cocido',        category: 'CARB', kcalPer100g: 108, proteinPer100g: 3.3,  carbsPer100g: 25.0, fatPer100g: 1.2,  fiberPer100g: 2.7,  calciumMg: 3,   ironMg: 0.5, potassiumMg: 270, vitaminCMg: 6.8,  magnesiumMg: 37,  servingG: 150, servingLabel: '1 mazorca mediana' },
    { name: 'Plátano verde cocido',        category: 'CARB', kcalPer100g: 116, proteinPer100g: 1.2,  carbsPer100g: 28.0, fatPer100g: 0.2,  fiberPer100g: 1.5,  calciumMg: 3,   ironMg: 0.3, potassiumMg: 260, vitaminCMg: 9.0,  magnesiumMg: 25,  servingG: 150, servingLabel: '½ plátano mediano' },

    // ── FRUTAS ──
    { name: 'Banano / plátano maduro',     category: 'FRUIT', kcalPer100g: 89,  proteinPer100g: 1.1,  carbsPer100g: 23.0, fatPer100g: 0.3,  fiberPer100g: 2.6,  calciumMg: 5,   ironMg: 0.3, potassiumMg: 358, vitaminCMg: 8.7,  magnesiumMg: 27,  servingG: 120, servingLabel: '1 banano mediano' },
    { name: 'Mango',                       category: 'FRUIT', kcalPer100g: 60,  proteinPer100g: 0.8,  carbsPer100g: 15.0, fatPer100g: 0.4,  fiberPer100g: 1.6,  calciumMg: 11,  ironMg: 0.2, potassiumMg: 168, vitaminCMg: 36.0, magnesiumMg: 10,  servingG: 200, servingLabel: '1 mango mediano' },
    { name: 'Naranja',                     category: 'FRUIT', kcalPer100g: 47,  proteinPer100g: 0.9,  carbsPer100g: 12.0, fatPer100g: 0.1,  fiberPer100g: 2.4,  calciumMg: 40,  ironMg: 0.1, potassiumMg: 181, vitaminCMg: 53.0, magnesiumMg: 10,  servingG: 150, servingLabel: '1 naranja mediana' },
    { name: 'Manzana',                     category: 'FRUIT', kcalPer100g: 52,  proteinPer100g: 0.3,  carbsPer100g: 14.0, fatPer100g: 0.2,  fiberPer100g: 2.4,  calciumMg: 6,   ironMg: 0.1, potassiumMg: 107, vitaminCMg: 4.6,  magnesiumMg: 5,   servingG: 180, servingLabel: '1 manzana mediana' },
    { name: 'Piña',                        category: 'FRUIT', kcalPer100g: 50,  proteinPer100g: 0.5,  carbsPer100g: 13.0, fatPer100g: 0.1,  fiberPer100g: 1.4,  calciumMg: 13,  ironMg: 0.3, potassiumMg: 109, vitaminCMg: 47.8, magnesiumMg: 12,  servingG: 200, servingLabel: '2 tazas en trozos' },
    { name: 'Papaya',                      category: 'FRUIT', kcalPer100g: 43,  proteinPer100g: 0.5,  carbsPer100g: 11.0, fatPer100g: 0.3,  fiberPer100g: 1.7,  calciumMg: 20,  ironMg: 0.3, potassiumMg: 182, vitaminCMg: 60.0, magnesiumMg: 10,  servingG: 200, servingLabel: '2 tazas en trozos' },
    { name: 'Fresas',                      category: 'FRUIT', kcalPer100g: 32,  proteinPer100g: 0.7,  carbsPer100g: 7.7,  fatPer100g: 0.3,  fiberPer100g: 2.0,  calciumMg: 16,  ironMg: 0.4, potassiumMg: 153, vitaminCMg: 58.8, magnesiumMg: 13,  servingG: 150, servingLabel: '1 taza' },
    { name: 'Uvas',                        category: 'FRUIT', kcalPer100g: 69,  proteinPer100g: 0.7,  carbsPer100g: 18.0, fatPer100g: 0.2,  fiberPer100g: 0.9,  calciumMg: 10,  ironMg: 0.4, potassiumMg: 191, vitaminCMg: 3.2,  magnesiumMg: 7,   servingG: 150, servingLabel: '1 racimo pequeño' },
    { name: 'Maracuyá / granadilla',       category: 'FRUIT', kcalPer100g: 97,  proteinPer100g: 2.2,  carbsPer100g: 23.0, fatPer100g: 0.7,  fiberPer100g: 10.4, calciumMg: 12,  ironMg: 1.6, potassiumMg: 348, vitaminCMg: 30.0, magnesiumMg: 29,  servingG: 80,  servingLabel: '2 maracuyás' },

    // ── GRASAS SALUDABLES ──
    { name: 'Aguacate',                    category: 'FAT', kcalPer100g: 160, proteinPer100g: 2.0,  carbsPer100g: 9.0,  fatPer100g: 15.0, fiberPer100g: 6.7,  calciumMg: 12,  ironMg: 0.6, potassiumMg: 485, vitaminCMg: 10.0, magnesiumMg: 29,  servingG: 100, servingLabel: '½ aguacate mediano' },
    { name: 'Almendras',                   category: 'FAT', kcalPer100g: 579, proteinPer100g: 21.0, carbsPer100g: 22.0, fatPer100g: 50.0, fiberPer100g: 12.5, calciumMg: 264, ironMg: 3.7, potassiumMg: 733, vitaminCMg: 0,    magnesiumMg: 270, servingG: 30,  servingLabel: '1 puñado (30g)' },
    { name: 'Maní tostado sin sal',        category: 'FAT', kcalPer100g: 567, proteinPer100g: 26.0, carbsPer100g: 16.0, fatPer100g: 49.0, fiberPer100g: 8.5,  calciumMg: 92,  ironMg: 2.3, potassiumMg: 705, vitaminCMg: 0,    magnesiumMg: 168, servingG: 30,  servingLabel: '1 puñado (30g)' },
    { name: 'Nueces',                      category: 'FAT', kcalPer100g: 654, proteinPer100g: 15.0, carbsPer100g: 14.0, fatPer100g: 65.0, fiberPer100g: 6.7,  calciumMg: 98,  ironMg: 2.9, potassiumMg: 441, vitaminCMg: 1.3,  magnesiumMg: 158, servingG: 30,  servingLabel: '1 puñado (30g)' },
    { name: 'Semillas de chía',            category: 'FAT', kcalPer100g: 486, proteinPer100g: 17.0, carbsPer100g: 42.0, fatPer100g: 31.0, fiberPer100g: 34.4, calciumMg: 631, ironMg: 7.7, potassiumMg: 407, vitaminCMg: 1.6,  magnesiumMg: 335, servingG: 25,  servingLabel: '2 cucharadas' },
    { name: 'Semillas de linaza',          category: 'FAT', kcalPer100g: 534, proteinPer100g: 18.0, carbsPer100g: 29.0, fatPer100g: 42.0, fiberPer100g: 27.3, calciumMg: 255, ironMg: 5.7, potassiumMg: 813, vitaminCMg: 0.6,  magnesiumMg: 392, servingG: 20,  servingLabel: '2 cucharadas' },
    { name: 'Mantequilla de maní natural', category: 'FAT', kcalPer100g: 588, proteinPer100g: 25.0, carbsPer100g: 20.0, fatPer100g: 50.0, fiberPer100g: 6.0,  calciumMg: 49,  ironMg: 1.9, potassiumMg: 649, vitaminCMg: 0,    magnesiumMg: 154, servingG: 30,  servingLabel: '2 cucharadas' },
    { name: 'Aceite de oliva extra virgen',category: 'FAT', kcalPer100g: 884, proteinPer100g: 0.0,  carbsPer100g: 0.0,  fatPer100g: 100.0, fiberPer100g: 0,   calciumMg: 1,   ironMg: 0.6, potassiumMg: 1,   vitaminCMg: 0,    magnesiumMg: 0,   servingG: 15,  servingLabel: '1 cucharada' },
    { name: 'Aceite de coco',              category: 'FAT', kcalPer100g: 862, proteinPer100g: 0.0,  carbsPer100g: 0.0,  fatPer100g: 100.0, fiberPer100g: 0,   calciumMg: 0,   ironMg: 0.1, potassiumMg: 0,   vitaminCMg: 0,    magnesiumMg: 0,   servingG: 15,  servingLabel: '1 cucharada' },

    // ── VEGETALES ──
    { name: 'Brócoli',                     category: 'VEGETABLE', kcalPer100g: 34,  proteinPer100g: 2.8,  carbsPer100g: 7.0,  fatPer100g: 0.4,  fiberPer100g: 2.6, calciumMg: 47,  ironMg: 0.7, potassiumMg: 316, vitaminCMg: 89.2,  magnesiumMg: 21, servingG: 150, servingLabel: '1 taza en floretes' },
    { name: 'Espinaca',                    category: 'VEGETABLE', kcalPer100g: 23,  proteinPer100g: 2.9,  carbsPer100g: 3.6,  fatPer100g: 0.4,  fiberPer100g: 2.2, calciumMg: 99,  ironMg: 2.7, potassiumMg: 558, vitaminCMg: 28.1,  magnesiumMg: 79, servingG: 80,  servingLabel: '2 tazas crudas' },
    { name: 'Kale / col rizada',           category: 'VEGETABLE', kcalPer100g: 49,  proteinPer100g: 4.3,  carbsPer100g: 9.0,  fatPer100g: 0.9,  fiberPer100g: 3.6, calciumMg: 150, ironMg: 1.5, potassiumMg: 491, vitaminCMg: 93.4,  magnesiumMg: 47, servingG: 80,  servingLabel: '2 tazas crudas' },
    { name: 'Tomate',                      category: 'VEGETABLE', kcalPer100g: 18,  proteinPer100g: 0.9,  carbsPer100g: 3.9,  fatPer100g: 0.2,  fiberPer100g: 1.2, calciumMg: 10,  ironMg: 0.3, potassiumMg: 237, vitaminCMg: 13.7,  magnesiumMg: 11, servingG: 150, servingLabel: '1 tomate mediano' },
    { name: 'Zanahoria',                   category: 'VEGETABLE', kcalPer100g: 41,  proteinPer100g: 0.9,  carbsPer100g: 10.0, fatPer100g: 0.2,  fiberPer100g: 2.8, calciumMg: 33,  ironMg: 0.3, potassiumMg: 320, vitaminCMg: 5.9,   magnesiumMg: 12, servingG: 100, servingLabel: '1 zanahoria mediana' },
    { name: 'Pimentón rojo',               category: 'VEGETABLE', kcalPer100g: 31,  proteinPer100g: 1.0,  carbsPer100g: 6.0,  fatPer100g: 0.3,  fiberPer100g: 2.1, calciumMg: 7,   ironMg: 0.4, potassiumMg: 211, vitaminCMg: 127.7, magnesiumMg: 10, servingG: 120, servingLabel: '1 pimentón mediano' },
    { name: 'Calabacín / zucchini',        category: 'VEGETABLE', kcalPer100g: 17,  proteinPer100g: 1.2,  carbsPer100g: 3.1,  fatPer100g: 0.3,  fiberPer100g: 1.0, calciumMg: 16,  ironMg: 0.4, potassiumMg: 261, vitaminCMg: 17.9,  magnesiumMg: 18, servingG: 150, servingLabel: '1 zucchini mediano' },
    { name: 'Pepino',                      category: 'VEGETABLE', kcalPer100g: 15,  proteinPer100g: 0.7,  carbsPer100g: 3.6,  fatPer100g: 0.1,  fiberPer100g: 0.5, calciumMg: 16,  ironMg: 0.3, potassiumMg: 147, vitaminCMg: 2.8,   magnesiumMg: 13, servingG: 200, servingLabel: '1 pepino mediano' },
    { name: 'Champiñones',                 category: 'VEGETABLE', kcalPer100g: 22,  proteinPer100g: 3.1,  carbsPer100g: 3.3,  fatPer100g: 0.3,  fiberPer100g: 1.0, calciumMg: 3,   ironMg: 0.5, potassiumMg: 318, vitaminCMg: 2.1,   magnesiumMg: 9,  servingG: 100, servingLabel: '1 taza' },
    { name: 'Coliflor',                    category: 'VEGETABLE', kcalPer100g: 25,  proteinPer100g: 1.9,  carbsPer100g: 5.0,  fatPer100g: 0.3,  fiberPer100g: 2.0, calciumMg: 22,  ironMg: 0.4, potassiumMg: 299, vitaminCMg: 48.2,  magnesiumMg: 15, servingG: 150, servingLabel: '1 taza en floretes' },
    { name: 'Lechuga romana',              category: 'VEGETABLE', kcalPer100g: 17,  proteinPer100g: 1.2,  carbsPer100g: 3.3,  fatPer100g: 0.3,  fiberPer100g: 2.1, calciumMg: 33,  ironMg: 0.9, potassiumMg: 247, vitaminCMg: 24.0,  magnesiumMg: 14, servingG: 100, servingLabel: '2 tazas crudas' },
    { name: 'Repollo verde',               category: 'VEGETABLE', kcalPer100g: 25,  proteinPer100g: 1.3,  carbsPer100g: 5.8,  fatPer100g: 0.1,  fiberPer100g: 2.5, calciumMg: 40,  ironMg: 0.5, potassiumMg: 170, vitaminCMg: 36.6,  magnesiumMg: 12, servingG: 100, servingLabel: '1 taza rallada' },
    { name: 'Remolacha cocida',            category: 'VEGETABLE', kcalPer100g: 44,  proteinPer100g: 1.7,  carbsPer100g: 10.0, fatPer100g: 0.2,  fiberPer100g: 2.0, calciumMg: 16,  ironMg: 0.8, potassiumMg: 305, vitaminCMg: 3.6,   magnesiumMg: 23, servingG: 150, servingLabel: '1 remolacha mediana' },
    { name: 'Cebolla',                     category: 'VEGETABLE', kcalPer100g: 40,  proteinPer100g: 1.1,  carbsPer100g: 9.3,  fatPer100g: 0.1,  fiberPer100g: 1.7, calciumMg: 23,  ironMg: 0.2, potassiumMg: 146, vitaminCMg: 7.4,   magnesiumMg: 10, servingG: 80,  servingLabel: '½ cebolla mediana' },
  ]

  await prisma.food.createMany({ data: foods })
  console.log(`  ✓ ${foods.length} alimentos sembrados`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
