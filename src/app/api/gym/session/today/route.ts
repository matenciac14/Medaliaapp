import { NextRequest, NextResponse } from 'next/server'
import { jsToOurDow } from '@/lib/core/date-utils'
import { auth } from '@/auth'
import { prisma } from '@/lib/db/prisma'
import { getMobileUser } from '@/lib/mobile-auth'
import { parseUserConfig } from '@/lib/config/user-config'


export async function GET(req: NextRequest) {
  const mobile = await getMobileUser(req)
  const athleteId = mobile?.id ?? (await auth())?.user?.id
  if (!athleteId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Feature gate
  const userRecord = await prisma.user.findUnique({ where: { id: athleteId }, select: { config: true } })
  if (!parseUserConfig(userRecord?.config).features.gym) {
    return NextResponse.json({ error: 'La función de Gym está disponible en el plan Pro.' }, { status: 403 })
  }

  const todayDow = jsToOurDow(new Date().getDay())

  // Parallel: fetch active plan + assigned workout + coach relation
  const [activePlan, assigned, coachRelation] = await Promise.all([
    prisma.trainingPlan.findFirst({
      where: { userId: athleteId, status: 'ACTIVE' },
      select: { id: true, startDate: true },
    }),
    prisma.assignedWorkout.findFirst({
      where: { athleteId, isActive: true },
      include: {
        template: {
          include: {
            days: {
              where: { dayOfWeek: todayDow },
              include: {
                exercises: {
                  orderBy: { order: 'asc' },
                  include: { exercise: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.coachAthlete.findFirst({
      where: { athleteId, status: 'ACTIVE' },
      select: { coachId: true },
    }),
  ])

  const hasCoach = !!coachRelation
  const todayDay = assigned?.template.days[0] ?? null

  // ─── AssignedWorkout path ───────────────────────────────────────────────────
  if (assigned && todayDay) {
    if (todayDay.isRestDay) {
      return NextResponse.json({
        assignedWorkoutId: assigned.id,
        plannedSessionId: null,
        templateName: assigned.template.name,
        dayOfWeek: todayDow,
        isRestDay: true,
        hasCoach,
        workoutDay: todayDay,
        exercises: [],
        previousLogs: [],
        plannedSession: null,
      })
    }

    const previousSession = await prisma.gymSession.findFirst({
      where: { athleteId, assignedWorkoutId: assigned.id, dayOfWeek: todayDow, completed: true },
      orderBy: { date: 'desc' },
      include: { setLogs: true },
    })

    return NextResponse.json({
      assignedWorkoutId: assigned.id,
      plannedSessionId: null,
      templateName: assigned.template.name,
      dayOfWeek: todayDow,
      isRestDay: false,
      hasCoach,
      workoutDay: {
        id: todayDay.id,
        label: todayDay.label,
        muscleGroups: todayDay.muscleGroups,
        warmupNotes: todayDay.warmupNotes,
        cardioNotes: todayDay.cardioNotes,
      },
      exercises: todayDay.exercises.map((we) => ({
        id: we.id,
        order: we.order,
        sets: we.sets,
        repsScheme: we.repsScheme,
        restSeconds: we.restSeconds,
        notes: we.notes,
        setType: we.setType,
        supersetWith: we.supersetWith,
        exercise: {
          id: we.exercise.id,
          name: we.exercise.name,
          muscleGroups: we.exercise.muscleGroups,
          equipment: we.exercise.equipment,
          category: we.exercise.category,
          description: we.exercise.description,
          tips: we.exercise.tips,
        },
        previousLogs: (previousSession?.setLogs ?? [])
          .filter(sl => sl.workoutExerciseId === we.id)
          .map(sl => ({
            setNumber: sl.setNumber,
            weightKg: sl.weightKg,
            repsCompleted: sl.repsCompleted,
          })),
      })),
      previousLogs: previousSession?.setLogs ?? [],
      plannedSession: null,
    })
  }

  // ─── Plan-based fallback (FUERZA session with workoutDayId) ────────────────
  if (activePlan) {
    const planStart = new Date(activePlan.startDate)
    planStart.setHours(0, 0, 0, 0)
    const todayDate = new Date()
    todayDate.setHours(0, 0, 0, 0)
    const targetWeekNumber = Math.floor((todayDate.getTime() - planStart.getTime()) / 86_400_000 / 7) + 1

    if (targetWeekNumber >= 1) {
      const fuerzaSession = await prisma.plannedSession.findFirst({
        where: {
          week: { planId: activePlan.id, weekNumber: targetWeekNumber },
          dayOfWeek: todayDow,
          type: 'FUERZA',
          workoutDayId: { not: null },
        },
        include: {
          workoutDay: {
            include: {
              exercises: {
                orderBy: { order: 'asc' },
                include: { exercise: true },
              },
            },
          },
        },
      })

      if (fuerzaSession?.workoutDay) {
        const { workoutDay } = fuerzaSession

        // Previous logs: find most recent GymSession with same workoutDayId
        const previousSession = await prisma.gymSession.findFirst({
          where: {
            athleteId,
            plannedSession: { workoutDayId: fuerzaSession.workoutDayId },
            completed: true,
            NOT: { plannedSessionId: fuerzaSession.id },
          },
          orderBy: { date: 'desc' },
          include: { setLogs: true },
        })

        return NextResponse.json({
          assignedWorkoutId: null,
          plannedSessionId: fuerzaSession.id,
          templateName: workoutDay.label,
          dayOfWeek: todayDow,
          isRestDay: false,
          hasCoach,
          workoutDay: {
            id: workoutDay.id,
            label: workoutDay.label,
            muscleGroups: workoutDay.muscleGroups,
            warmupNotes: workoutDay.warmupNotes ?? null,
            cardioNotes: workoutDay.cardioNotes ?? null,
          },
          exercises: workoutDay.exercises.map((we) => ({
            id: we.id,
            order: we.order,
            sets: we.sets,
            repsScheme: we.repsScheme,
            restSeconds: we.restSeconds,
            notes: we.notes,
            setType: we.setType,
            supersetWith: we.supersetWith,
            exercise: {
              id: we.exercise.id,
              name: we.exercise.name,
              muscleGroups: we.exercise.muscleGroups,
              equipment: we.exercise.equipment,
              category: we.exercise.category,
              description: we.exercise.description,
              tips: we.exercise.tips,
            },
            previousLogs: (previousSession?.setLogs ?? [])
              .filter(sl => sl.workoutExerciseId === we.id)
              .map(sl => ({
                setNumber: sl.setNumber,
                weightKg: sl.weightKg,
                repsCompleted: sl.repsCompleted,
              })),
          })),
          previousLogs: previousSession?.setLogs ?? [],
          plannedSession: null,
        })
      }
    }
  }

  return NextResponse.json({ error: 'Sin rutina asignada' }, { status: 404 })
}
