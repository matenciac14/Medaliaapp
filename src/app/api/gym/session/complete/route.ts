import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { autoCompleteStrengthSession } from '@/domain/gym/auto-complete-strength'

type SetPayload = {
  workoutExerciseId: string
  setNumber: number
  weightKg: number | null
  repsCompleted: number | null
  completed: boolean
}

type ExerciseOverride = {
  originalWorkoutExerciseId: string
  replacedWithExerciseId: string
  replacedExerciseName: string
  reason?: string
}

export async function POST(req: NextRequest) {
  const mobile = await getMobileUser(req)
  const athleteId = mobile?.id ?? (await auth())?.user?.id
  if (!athleteId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  // Feature gate
  const userRecord = await prisma.user.findUnique({ where: { id: athleteId }, select: { featureGym: true } })
  if (!userRecord?.featureGym) {
    return NextResponse.json({ error: 'La función de Gym está disponible en el plan Pro.' }, { status: 403 })
  }

  let body: {
    assignedWorkoutId?: string
    plannedSessionId?: string
    dayOfWeek: number
    rpe?: number
    durationMin?: number
    notes?: string
    sets?: SetPayload[]
    exerciseOverrides?: ExerciseOverride[]
  }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Body inválido' }, { status: 400 }) }

  const { dayOfWeek, rpe, durationMin, notes } = body
  const sets = body.sets ?? []
  const exerciseOverrides = body.exerciseOverrides ?? null

  if (!dayOfWeek || !Array.isArray(sets))
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })

  // Pre-fetch exercise names + exerciseId for denormalization and PR detection
  const weIds = [...new Set(sets.map(s => s.workoutExerciseId).filter(Boolean))]
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

    const historicalSets = await prisma.setLog.findMany({
      where: {
        workoutExerciseId: { in: allWE.map(we => we.id) },
        session: { athleteId },
        completed: true,
        weightKg: { not: null },
      },
      select: { workoutExerciseId: true, weightKg: true },
    })

    for (const sl of historicalSets) {
      if (!sl.workoutExerciseId || sl.weightKg === null) continue
      const exId = weToExerciseId.get(sl.workoutExerciseId)
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
            workoutExerciseId: s.workoutExerciseId,
            exerciseName: weNameMap.get(s.workoutExerciseId) ?? null,
            setNumber: s.setNumber,
            weightKg: s.weightKg ?? null,
            repsCompleted: s.repsCompleted ?? null,
            completed: s.completed,
            isPR: isPRSet(s.workoutExerciseId, s.weightKg, s.completed),
          })),
        },
      },
      select: { id: true },
    })

    const newPRs = sets.filter(s => isPRSet(s.workoutExerciseId, s.weightKg, s.completed))
      .map(s => ({ exerciseName: weNameMap.get(s.workoutExerciseId) ?? null, weightKg: s.weightKg }))

    autoCompleteStrengthSession({ athleteId, rpe, durationMin, notes }).catch(() => {})
    persistProgression(sets)
    return NextResponse.json({ sessionId: gymSession.id, newPRs }, { status: 201 })
  }

  // ─── AssignedWorkout path ────────────────────────────────────────────────────
  if (!body.assignedWorkoutId)
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })

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
          workoutExerciseId: s.workoutExerciseId,
          exerciseName: weNameMap.get(s.workoutExerciseId) ?? null,
          setNumber: s.setNumber,
          weightKg: s.weightKg ?? null,
          repsCompleted: s.repsCompleted ?? null,
          completed: s.completed,
          isPR: isPRSet(s.workoutExerciseId, s.weightKg, s.completed),
        })),
      },
    },
    select: { id: true },
  })

  const newPRs = sets.filter(s => isPRSet(s.workoutExerciseId, s.weightKg, s.completed))
    .map(s => ({ exerciseName: weNameMap.get(s.workoutExerciseId) ?? null, weightKg: s.weightKg }))

  autoCompleteStrengthSession({ athleteId, rpe, durationMin, notes }).catch(() => {})
  persistProgression(sets)

  return NextResponse.json({ sessionId: gymSession.id, newPRs }, { status: 201 })
}
