import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { autoCompleteStrengthSession } from '@/infrastructure/db/auto-complete-strength'
import { revalidatePath } from 'next/cache'
import { sendPushNotification } from '@/lib/push'
import { z } from 'zod'

const SetPayloadSchema = z.object({
  workoutExerciseId: z.string().min(1).optional(),
  exerciseName: z.string().max(200).optional(),
  setNumber: z.number().int().min(1).max(20),
  weightKg: z.number().min(0).max(1000).nullable(),
  repsCompleted: z.number().int().min(0).max(200).nullable(),
  completed: z.boolean(),
})

const ExerciseOverrideSchema = z.object({
  originalWorkoutExerciseId: z.string().min(1),
  replacedWithExerciseId: z.string().min(1),
  replacedExerciseName: z.string().max(200),
  reason: z.string().max(500).optional(),
})

const GymCompleteSchema = z.object({
  assignedWorkoutId: z.string().min(1).optional(),
  plannedSessionId: z.string().min(1).optional(),
  dayOfWeek: z.number().int().min(0).max(6),
  rpe: z.number().int().min(1).max(10).optional(),
  durationMin: z.number().int().min(0).max(600).optional(),
  notes: z.string().max(2000).optional(),
  sets: z.array(SetPayloadSchema).optional(),
  exerciseOverrides: z.array(ExerciseOverrideSchema).optional(),
})

type SetPayload = z.infer<typeof SetPayloadSchema>
type ExerciseOverride = z.infer<typeof ExerciseOverrideSchema>

async function notifyCoach(athleteId: string, athleteName: string | null, sessionLabel: string) {
  const relation = await prisma.coachAthlete.findFirst({
    where: { athleteId, status: 'ACTIVE' },
    select: { coach: { select: { pushToken: true } } },
  })
  if (!relation?.coach.pushToken) return
  const name = athleteName ?? 'Tu atleta'
  sendPushNotification(relation.coach.pushToken, `${name} completó una sesión`, sessionLabel, { screen: 'coach' }).catch(() => {})
}

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  const athleteId = mobile?.id ?? (await auth())?.user?.id
  if (!athleteId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Feature gate
  const userRecord = await prisma.user.findUnique({ where: { id: athleteId }, select: { featureGym: true, name: true } })
  if (!userRecord?.featureGym) {
    return NextResponse.json({ error: 'La función de Ejercicios está disponible en el plan Pro.' }, { status: 403 })
  }

  const parsed = GymCompleteSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Body inválido' }, { status: 400 })
  const body = parsed.data

  const { dayOfWeek, rpe, durationMin, notes } = body
  const sets = body.sets ?? []
  const exerciseOverrides = body.exerciseOverrides ?? null

  // Pre-fetch exercise names + exerciseId for denormalization and PR detection
  const weIds = [...new Set(sets.map(s => s.workoutExerciseId).filter((id): id is string => Boolean(id)))]
  const workoutExercises = weIds.length > 0
    ? await prisma.workoutExercise.findMany({
        where: { id: { in: weIds } },
        select: { id: true, exerciseId: true, sets: true, exercise: { select: { name: true } } },
      })
    : []
  const weNameMap = new Map(workoutExercises.map(we => [we.id, we.exercise.name]))
  const weExIdMap = new Map(workoutExercises.map(we => [we.id, we.exerciseId]))
  const weSetsCountMap = new Map(workoutExercises.map(we => [we.id, we.sets]))

  // ── PR detection: max weightKg per exercise across all sessions ──────────────
  const exerciseIds = [...new Set(workoutExercises.map(we => we.exerciseId))]
  const maxPerExercise = new Map<string, number>()

  if (exerciseIds.length > 0) {
    const allWE = await prisma.workoutExercise.findMany({
      where: { exerciseId: { in: exerciseIds } },
      select: { id: true, exerciseId: true },
    })
    const weToExerciseId = new Map(allWE.map(we => [we.id, we.exerciseId]))

    // Mapeo nombre → exerciseId para recuperar sets históricos con workoutExerciseId=null
    // (ocurre cuando el coach edita la rutina y los WorkoutExercise se recrean)
    const nameToExerciseId = new Map<string, string>()
    for (const we of workoutExercises) {
      nameToExerciseId.set(we.exercise.name, we.exerciseId)
    }
    const exerciseNames = [...nameToExerciseId.keys()]

    const [historicalSets, orphanSets] = await Promise.all([
      // Sets con workoutExerciseId (rutina actual o versiones anteriores del mismo exercise)
      prisma.setLog.findMany({
        where: {
          workoutExerciseId: { in: allWE.map(we => we.id) },
          session: { athleteId },
          completed: true,
          weightKg: { not: null },
        },
        select: { workoutExerciseId: true, weightKg: true },
      }),
      // Sets huérfanos (workoutExerciseId=null) pero con exerciseName conocido
      exerciseNames.length > 0
        ? prisma.setLog.findMany({
            where: {
              workoutExerciseId: null,
              exerciseName: { in: exerciseNames },
              session: { athleteId },
              completed: true,
              weightKg: { not: null },
            },
            select: { exerciseName: true, weightKg: true },
          })
        : Promise.resolve([]),
    ])

    for (const sl of historicalSets) {
      if (!sl.workoutExerciseId || sl.weightKg === null) continue
      const exId = weToExerciseId.get(sl.workoutExerciseId)
      if (!exId) continue
      const cur = maxPerExercise.get(exId) ?? 0
      if (sl.weightKg > cur) maxPerExercise.set(exId, sl.weightKg)
    }

    for (const sl of orphanSets) {
      if (!sl.exerciseName || sl.weightKg === null) continue
      const exId = nameToExerciseId.get(sl.exerciseName)
      if (!exId) continue
      const cur = maxPerExercise.get(exId) ?? 0
      if (sl.weightKg > cur) maxPerExercise.set(exId, sl.weightKg)
    }
  }

  function isPRSet(weId: string, weightKg: number | null, completed: boolean): boolean {
    if (!completed || weightKg === null) return false
    const exId = weExIdMap.get(weId)
    return exId ? weightKg > (maxPerExercise.get(exId) ?? 0) : false
  }

  // Persiste suggestedNextWeightKg: si todos los sets de un ejercicio se completaron → max+2.5kg
  function persistProgression(completedSets: SetPayload[]) {
    const byWeId = new Map<string, SetPayload[]>()
    for (const s of completedSets) {
      if (!s.workoutExerciseId) continue
      const arr = byWeId.get(s.workoutExerciseId) ?? []
      arr.push(s)
      byWeId.set(s.workoutExerciseId, arr)
    }
    const updates: Promise<unknown>[] = []
    for (const [weId, weSets] of byWeId) {
      const targetSets = weSetsCountMap.get(weId) ?? weSets.length
      const allDone = weSets.length >= targetSets && weSets.every(s => s.completed)
      if (!allDone) continue
      const weights = weSets.map(s => s.weightKg ?? 0).filter(w => w > 0)
      if (weights.length === 0) continue
      const suggested = Math.max(...weights) + 2.5
      updates.push(prisma.workoutExercise.update({ where: { id: weId }, data: { suggestedNextWeightKg: suggested } }))
    }
    if (updates.length > 0) Promise.all(updates).catch(() => {})
  }

  // ── Name-based PR detection for free sessions ─────────────────────────────
  const freeExerciseNames = [...new Set(
    sets.filter(s => !s.workoutExerciseId && s.exerciseName).map(s => s.exerciseName as string)
  )]
  const maxPerFreeExerciseName = new Map<string, number>()
  if (freeExerciseNames.length > 0) {
    const historicalFree = await prisma.setLog.findMany({
      where: { exerciseName: { in: freeExerciseNames }, session: { athleteId }, completed: true, weightKg: { not: null } },
      select: { exerciseName: true, weightKg: true },
    })
    for (const sl of historicalFree) {
      if (!sl.exerciseName || sl.weightKg === null) continue
      const cur = maxPerFreeExerciseName.get(sl.exerciseName) ?? 0
      if (sl.weightKg > cur) maxPerFreeExerciseName.set(sl.exerciseName, sl.weightKg)
    }
  }

  function isPRByName(exerciseName: string | null | undefined, weightKg: number | null, completed: boolean): boolean {
    if (!completed || weightKg === null || !exerciseName) return false
    return weightKg > (maxPerFreeExerciseName.get(exerciseName) ?? 0)
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)

  // ─── Plan-based path ────────────────────────────────────────────────────────
  if (body.plannedSessionId) {
    const fuerzaSession = await prisma.plannedSession.findFirst({
      where: {
        id: body.plannedSessionId,
        week: { plan: { userId: athleteId, status: 'ACTIVE' } },
        type: 'FUERZA',
      },
      select: { id: true },
    })
    if (!fuerzaSession) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })

    const gymSession = await prisma.gymSession.create({
      data: {
        athleteId,
        plannedSessionId: fuerzaSession.id,
        assignedWorkoutId: null,
        dayOfWeek,
        date: today,
        durationMin: durationMin ?? null,
        rpe: rpe ?? null,
        notes: notes ?? null,
        completed: true,
        exerciseOverrides: exerciseOverrides ? exerciseOverrides : undefined,
        setLogs: {
          create: sets.map(s => ({
            workoutExerciseId: s.workoutExerciseId ?? null,
            exerciseName: weNameMap.get(s.workoutExerciseId ?? '') ?? null,
            setNumber: s.setNumber,
            weightKg: s.weightKg ?? null,
            repsCompleted: s.repsCompleted ?? null,
            completed: s.completed,
            isPR: isPRSet(s.workoutExerciseId ?? '', s.weightKg, s.completed),
          })),
        },
      },
      select: { id: true },
    })

    const newPRs = sets.filter(s => isPRSet(s.workoutExerciseId ?? '', s.weightKg, s.completed))
      .map(s => ({ exerciseName: weNameMap.get(s.workoutExerciseId ?? '') ?? null, weightKg: s.weightKg }))

    autoCompleteStrengthSession({ athleteId, rpe, durationMin, notes }).catch(() => {})
    persistProgression(sets)
    notifyCoach(athleteId, userRecord.name, 'Sesión de fuerza completada 💪').catch(() => {})
    revalidatePath('/dashboard')
    return NextResponse.json({ sessionId: gymSession.id, newPRs }, { status: 201 })
  }

  // ─── Free session path (no template, no plan) ───────────────────────────────
  if (!body.assignedWorkoutId) {
    const gymSession = await prisma.gymSession.create({
      data: {
        athleteId,
        assignedWorkoutId: null,
        plannedSessionId: null,
        dayOfWeek,
        date: today,
        durationMin: durationMin ?? null,
        rpe: rpe ?? null,
        notes: notes ?? null,
        completed: true,
        setLogs: {
          create: sets.map(s => ({
            workoutExerciseId: null,
            exerciseName: s.exerciseName ?? null,
            setNumber: s.setNumber,
            weightKg: s.weightKg ?? null,
            repsCompleted: s.repsCompleted ?? null,
            completed: s.completed,
            isPR: isPRByName(s.exerciseName, s.weightKg, s.completed),
          })),
        },
      },
      select: { id: true },
    })
    const newPRsFree = sets.filter(s => isPRByName(s.exerciseName, s.weightKg, s.completed))
      .map(s => ({ exerciseName: s.exerciseName ?? null, weightKg: s.weightKg }))
    notifyCoach(athleteId, userRecord.name, 'Sesión libre de gym completada 💪').catch(() => {})
    revalidatePath('/dashboard')
    return NextResponse.json({ sessionId: gymSession.id, newPRs: newPRsFree }, { status: 201 })
  }

  // ─── AssignedWorkout path ────────────────────────────────────────────────────

  const assigned = await prisma.assignedWorkout.findFirst({
    where: { id: body.assignedWorkoutId, athleteId, isActive: true },
  })
  if (!assigned) return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 })

  const gymSession = await prisma.gymSession.create({
    data: {
      athleteId,
      assignedWorkoutId: body.assignedWorkoutId,
      plannedSessionId: null,
      dayOfWeek,
      date: today,
      durationMin: durationMin ?? null,
      rpe: rpe ?? null,
      notes: notes ?? null,
      completed: true,
      exerciseOverrides: exerciseOverrides ? exerciseOverrides : undefined,
      setLogs: {
        create: sets.map(s => ({
          workoutExerciseId: s.workoutExerciseId ?? null,
          exerciseName: weNameMap.get(s.workoutExerciseId ?? '') ?? null,
          setNumber: s.setNumber,
          weightKg: s.weightKg ?? null,
          repsCompleted: s.repsCompleted ?? null,
          completed: s.completed,
          isPR: isPRSet(s.workoutExerciseId ?? '', s.weightKg, s.completed),
        })),
      },
    },
    select: { id: true },
  })

  const newPRs = sets.filter(s => isPRSet(s.workoutExerciseId ?? '', s.weightKg, s.completed))
    .map(s => ({ exerciseName: weNameMap.get(s.workoutExerciseId ?? '') ?? null, weightKg: s.weightKg }))

  autoCompleteStrengthSession({ athleteId, rpe, durationMin, notes }).catch(() => {})
  persistProgression(sets)
  notifyCoach(athleteId, userRecord.name, 'Sesión de gym completada 💪').catch(() => {})
  revalidatePath('/dashboard')

  return NextResponse.json({ sessionId: gymSession.id, newPRs }, { status: 201 })
}
