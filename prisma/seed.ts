import 'dotenv/config'
import { PrismaClient, UserRole, GoalType, GoalStatus, PlanStatus, PlanSource, Phase, SessionType, EquipmentType, ExerciseCategory } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import { FULL_ATHLETE_CONFIG, COACH_CONFIG, DEFAULT_USER_CONFIG } from '../src/lib/config/user-config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  console.log('🌱 Seeding...')

  // ── Coach ────────────────────────────────────────────────────────────────
  const coachPassword = await bcrypt.hash('coach123', 12)
  const coach = await prisma.user.upsert({
    where: { email: 'coach@medaliq.com' },
    update: { config: COACH_CONFIG },
    create: {
      email: 'coach@medaliq.com',
      name: 'Carlos Entrenador',
      password: coachPassword,
      role: UserRole.COACH,
      config: COACH_CONFIG,
    },
  })

  // ── Atleta 1 (con plan activo) ───────────────────────────────────────────
  const athletePassword = await bcrypt.hash('atleta123', 12)
  const athlete1 = await prisma.user.upsert({
    where: { email: 'miguel@medaliq.com' },
    update: { config: FULL_ATHLETE_CONFIG },
    create: {
      email: 'miguel@medaliq.com',
      name: 'Miguel Atleta',
      password: athletePassword,
      role: UserRole.ATHLETE,
      config: FULL_ATHLETE_CONFIG,
      profile: {
        create: {
          age: 30,
          heightCm: 175,
          weightKg: 75,
          weightGoalKg: 70,
          hrResting: 55,
          hrMax: 185,
          altitudeMeters: 2600,
          injuries: [],
          conditions: [],
          medications: [],
          sleepHoursAvg: 7,
          sleepScoreAvg: 78,
        },
      },
      goals: {
        create: {
          type: GoalType.RACE_HALF_MARATHON,
          raceDate: new Date('2026-10-01'),
          targetTimeSecs: 6300, // 1:45:00
          status: GoalStatus.ACTIVE,
        },
      },
    },
    include: { goals: true },
  })

  // Vincular coach ↔ atleta1
  await prisma.coachAthlete.upsert({
    where: { coachId_athleteId: { coachId: coach.id, athleteId: athlete1.id } },
    update: {},
    create: { coachId: coach.id, athleteId: athlete1.id },
  })

  // Plan de entrenamiento para atleta1
  const startDate = new Date('2026-06-02')
  const endDate = new Date('2026-10-01')

  const plan = await prisma.trainingPlan.upsert({
    where: { id: 'seed-plan-1' },
    update: {},
    create: {
      id: 'seed-plan-1',
      userId: athlete1.id,
      goalId: athlete1.goals[0].id,
      name: 'Plan Media Maratón — 18 semanas',
      totalWeeks: 18,
      startDate,
      endDate,
      status: PlanStatus.ACTIVE,
      generatedBy: PlanSource.AI,
      hrZones: {
        z1: { min: 95, max: 114 },
        z2: { min: 115, max: 133 },
        z3: { min: 134, max: 152 },
        z4: { min: 153, max: 171 },
        z5: { min: 172, max: 185 },
      },
    },
  })

  // Semana 1 con sesiones de ejemplo
  const week1Start = new Date(startDate)
  const week1End = new Date(startDate)
  week1End.setDate(week1End.getDate() + 6)

  const week1 = await prisma.planWeek.upsert({
    where: { planId_weekNumber: { planId: plan.id, weekNumber: 1 } },
    update: {},
    create: {
      planId: plan.id,
      weekNumber: 1,
      phase: Phase.BASE,
      volumeKm: 30,
      focusDescription: 'Semana de adaptación — rodajes suaves Z2',
      isRecoveryWeek: false,
      startDate: week1Start,
      endDate: week1End,
    },
  })

  const sessions = [
    { dayOfWeek: 1, type: SessionType.RODAJE_Z2, durationMin: 40, zoneTarget: 'Z2', detailText: '40 min fácil Z2 — conversacional todo el tiempo' },
    { dayOfWeek: 3, type: SessionType.FARTLEK, durationMin: 50, zoneTarget: 'Z2-Z3', detailText: '10 min calentamiento + 6×2 min Z3 / 2 min Z2 + 10 min vuelta calma' },
    { dayOfWeek: 5, type: SessionType.RODAJE_Z2, durationMin: 35, zoneTarget: 'Z2', detailText: '35 min rodaje suave de recuperación' },
    { dayOfWeek: 6, type: SessionType.TIRADA_LARGA, durationMin: 75, zoneTarget: 'Z2', detailText: 'Tirada larga 75 min — todo Z2, hidratación cada 20 min' },
  ]

  for (const s of sessions) {
    const sessionDate = new Date(week1Start)
    sessionDate.setDate(sessionDate.getDate() + s.dayOfWeek - 1)

    await prisma.plannedSession.upsert({
      where: { id: `seed-w1-d${s.dayOfWeek}` },
      update: {},
      create: {
        id: `seed-w1-d${s.dayOfWeek}`,
        weekId: week1.id,
        dayOfWeek: s.dayOfWeek,
        type: s.type,
        durationMin: s.durationMin,
        zoneTarget: s.zoneTarget,
        detailText: s.detailText,
        date: sessionDate,
      },
    })
  }

  // Check-in semana 1
  await prisma.weeklyCheckIn.upsert({
    where: { userId_weekNumber: { userId: athlete1.id, weekNumber: 1 } },
    update: {},
    create: {
      userId: athlete1.id,
      weekNumber: 1,
      weightKg: 75.2,
      hrResting: 55,
      sleepHours: 7.5,
      sleepScore: 82,
      hardestSessionRpe: 7,
      dietAdherencePct: 85,
      painFlag: false,
      energyLevel: 4,
      notes: 'Semana bien, las piernas respondieron bien al volumen',
      adjustmentsTriggered: [],
    },
  })

  // ── Atleta 2 (sin coach, directo B2C) ────────────────────────────────────
  const athlete2 = await prisma.user.upsert({
    where: { email: 'ana@medaliq.com' },
    update: {},
    create: {
      email: 'ana@medaliq.com',
      name: 'Ana Runner',
      password: await bcrypt.hash('atleta123', 12),
      role: UserRole.ATHLETE,
      config: DEFAULT_USER_CONFIG,  // recién registrada, sin features aún
      profile: {
        create: {
          age: 27,
          heightCm: 163,
          weightKg: 62,
          weightGoalKg: 60,
          hrResting: 52,
          hrMax: 192,
          altitudeMeters: 0,
          injuries: ['Rodilla derecha (2024)'],
          conditions: [],
          medications: [],
          sleepHoursAvg: 8,
          sleepScoreAvg: 85,
        },
      },
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
      config: { ...DEFAULT_USER_CONFIG, onboarding: { completed: true, completedAt: new Date().toISOString() } },
    },
  })

  // ── Ejercicios globales (librería base Medaliq) ───────────────────────────
  const globalExercises: Array<{
    id: string
    name: string
    muscleGroups: string[]
    equipment: EquipmentType
    category: ExerciseCategory
  }> = [
    // QUADRICEPS
    { id: 'global-exercise-sentadilla-frontal',      name: 'Sentadilla frontal',              muscleGroups: ['QUADRICEPS', 'GLUTES'],                   equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-sentadilla-sumo',         name: 'Sentadilla sumo',                 muscleGroups: ['QUADRICEPS', 'GLUTES', 'HAMSTRINGS'],      equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-prensa',                  name: 'Prensa',                          muscleGroups: ['QUADRICEPS', 'GLUTES'],                   equipment: EquipmentType.MACHINE,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-extension-rodillas',      name: 'Extensión de rodillas',           muscleGroups: ['QUADRICEPS'],                             equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-avanzadas',               name: 'Avanzadas (Lunges)',               muscleGroups: ['QUADRICEPS', 'GLUTES'],                   equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-sentadilla-hack',         name: 'Sentadilla hack',                 muscleGroups: ['QUADRICEPS'],                             equipment: EquipmentType.MACHINE,    category: ExerciseCategory.COMPOUND },
    // HAMSTRINGS
    { id: 'global-exercise-flexion-rodillas-acostado', name: 'Flexión de rodillas acostado', muscleGroups: ['HAMSTRINGS'],                             equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-flexion-rodillas-sentado',  name: 'Flexión de rodillas sentado',  muscleGroups: ['HAMSTRINGS'],                             equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-peso-muerto',             name: 'Peso muerto',                     muscleGroups: ['HAMSTRINGS', 'GLUTES', 'BACK'],           equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-hip-thrust',              name: 'Hip Thrust',                      muscleGroups: ['GLUTES', 'HAMSTRINGS'],                   equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    // GLUTES
    { id: 'global-exercise-patada-gluteos-maquina',  name: 'Patada de glúteos en máquina',    muscleGroups: ['GLUTES'],                                 equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-abduccion-maquina',       name: 'Abducción en máquina',            muscleGroups: ['GLUTES'],                                 equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-aduccion-maquina',        name: 'Aducción en máquina',             muscleGroups: ['GLUTES'],                                 equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    // CHEST
    { id: 'global-exercise-press-plano-barra',       name: 'Press plano con barra',           muscleGroups: ['CHEST'],                                  equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-press-inclinado-barra',   name: 'Press inclinado con barra',       muscleGroups: ['CHEST'],                                  equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-press-declinado-mancuernas', name: 'Press declinado con mancuernas', muscleGroups: ['CHEST'],                               equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-cruces-polea-alta',       name: 'Cruces en polea alta',            muscleGroups: ['CHEST'],                                  equipment: EquipmentType.CABLE,      category: ExerciseCategory.ISOLATION },
    // BACK
    { id: 'global-exercise-remo-barra',              name: 'Remo con barra',                  muscleGroups: ['BACK'],                                   equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-remo-mancuernas',         name: 'Remo con mancuernas',             muscleGroups: ['BACK'],                                   equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-jalon-polea-alta',        name: 'Jalón polea alta',                muscleGroups: ['BACK'],                                   equipment: EquipmentType.CABLE,      category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-dominadas',               name: 'Dominadas',                       muscleGroups: ['BACK'],                                   equipment: EquipmentType.BODYWEIGHT, category: ExerciseCategory.COMPOUND },
    // SHOULDERS
    { id: 'global-exercise-press-militar-barra',     name: 'Press militar con barra',         muscleGroups: ['SHOULDERS'],                              equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-press-arnold',            name: 'Press Arnold',                    muscleGroups: ['SHOULDERS'],                              equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-elevacion-lateral',       name: 'Elevación lateral',               muscleGroups: ['SHOULDERS'],                              equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-elevacion-frontal',       name: 'Elevación frontal',               muscleGroups: ['SHOULDERS'],                              equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-pajaros',                 name: 'Pájaros (Reverse Fly)',            muscleGroups: ['SHOULDERS'],                              equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.ISOLATION },
    // BICEPS
    { id: 'global-exercise-flexion-barra-z',         name: 'Flexión de codo con barra Z',     muscleGroups: ['BICEPS'],                                 equipment: EquipmentType.BARBELL,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-martillo-mancuernas',     name: 'Martillo con mancuernas',         muscleGroups: ['BICEPS'],                                 equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-concentrado-mancuernas',  name: 'Concentrado con mancuernas',      muscleGroups: ['BICEPS'],                                 equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-predicador',              name: 'Predicador',                      muscleGroups: ['BICEPS'],                                 equipment: EquipmentType.BARBELL,    category: ExerciseCategory.ISOLATION },
    // TRICEPS
    { id: 'global-exercise-press-frances',           name: 'Press francés',                   muscleGroups: ['TRICEPS'],                                equipment: EquipmentType.BARBELL,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-push-down',               name: 'Push down en polea',              muscleGroups: ['TRICEPS'],                                equipment: EquipmentType.CABLE,      category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-extension-codo',          name: 'Extensión de codo',               muscleGroups: ['TRICEPS'],                                equipment: EquipmentType.CABLE,      category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-patada-triceps',          name: 'Patada de tríceps',               muscleGroups: ['TRICEPS'],                                equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.ISOLATION },
    // CALVES
    { id: 'global-exercise-elevacion-talones-maquina', name: 'Elevación de talones en máquina', muscleGroups: ['CALVES'],                              equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-extension-plantar-prensa',  name: 'Extensión plantar en prensa',   muscleGroups: ['CALVES'],                                 equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-elevacion-talones-sentado', name: 'Elevación de talones sentado',  muscleGroups: ['CALVES'],                                 equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    // ABS
    { id: 'global-exercise-elevacion-piernas-colgado', name: 'Elevación de piernas colgado',  muscleGroups: ['ABS'],                                    equipment: EquipmentType.BODYWEIGHT, category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-abs-roller',              name: 'Abs roller',                      muscleGroups: ['ABS'],                                    equipment: EquipmentType.OTHER,      category: ExerciseCategory.ISOLATION },
  ]

  for (const ex of globalExercises) {
    await prisma.exercise.upsert({
      where: { id: ex.id },
      update: { name: ex.name, muscleGroups: ex.muscleGroups, equipment: ex.equipment, category: ex.category },
      create: {
        id: ex.id,
        coachId: null,
        name: ex.name,
        muscleGroups: ex.muscleGroups,
        equipment: ex.equipment,
        category: ex.category,
        isGlobal: true,
      },
    })
  }

  console.log(`✅ Ejercicios: ${globalExercises.length} ejercicios globales`)
  console.log(`✅ Coach:    coach@medaliq.com    / coach123`)
  console.log(`✅ Atleta 1: miguel@medaliq.com   / atleta123  (con plan + coach)`)
  console.log(`✅ Atleta 2: ana@medaliq.com      / atleta123  (B2C sin coach)`)
  console.log(`✅ Admin:    admin@medaliq.com    / admin123!`)
  console.log(`\n🎉 Seed completo.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
