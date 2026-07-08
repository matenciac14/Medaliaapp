import 'dotenv/config'
import { prisma } from '../src/lib/db/prisma'

async function main() {
  // Find admin user to keep
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true, email: true } })
  if (!admin) { console.error('No ADMIN found — aborting'); process.exit(1) }
  console.log('Keeping admin:', admin.email)

  const toDelete = await prisma.user.findMany({
    where: { id: { not: admin.id } },
    select: { id: true, email: true, role: true },
  })
  console.log('Users to delete:', toDelete.map(u => u.email))

  if (toDelete.length === 0) { console.log('Nothing to delete'); return }
  const ids = toDelete.map(u => u.id)

  // Delete in dependency order (explicit > cascade, safer)

  // Gym: SetLog → GymSession (SetLog has onDelete:Cascade from GymSession, but explicit first)
  await prisma.setLog.deleteMany({ where: { session: { athleteId: { in: ids } } } })
  await prisma.gymSession.deleteMany({ where: { athleteId: { in: ids } } })

  // Workout templates: WorkoutDay/WorkoutExercise/AssignedWorkout cascade from WorkoutTemplate
  // Exercise.coachId has no onDelete → delete before WorkoutTemplate
  await prisma.exercise.deleteMany({ where: { coachId: { in: ids } } })
  await prisma.assignedWorkout.deleteMany({ where: { OR: [{ athleteId: { in: ids } }, { coachId: { in: ids } }] } })
  await prisma.workoutTemplate.deleteMany({ where: { OR: [{ coachId: { in: ids } }, { athleteId: { in: ids } }] } })

  // AssignedNutritionPlan.coachId has no onDelete → delete before User
  await prisma.assignedNutritionPlan.deleteMany({ where: { OR: [{ athleteId: { in: ids } }, { coachId: { in: ids } }] } })

  // Plans: PlannedSession → PlanWeek → TrainingPlan all cascade, but explicit for safety
  await prisma.sessionLog.deleteMany({ where: { userId: { in: ids } } })
  await prisma.dailyLog.deleteMany({ where: { userId: { in: ids } } })
  await prisma.plannedSession.deleteMany({ where: { week: { plan: { userId: { in: ids } } } } })
  await prisma.planWeek.deleteMany({ where: { plan: { userId: { in: ids } } } })
  await prisma.trainingPlan.deleteMany({ where: { userId: { in: ids } } })

  // Nutrition, check-ins, goals — all have onDelete:Cascade but explicit for safety
  await prisma.nutritionPlan.deleteMany({ where: { userId: { in: ids } } })
  await prisma.weeklyCheckIn.deleteMany({ where: { userId: { in: ids } } })
  await prisma.healthProfile.deleteMany({ where: { userId: { in: ids } } })
  await prisma.coachAthlete.deleteMany({ where: { OR: [{ athleteId: { in: ids } }, { coachId: { in: ids } }] } })

  // CoachProfile (coachId has no explicit onDelete) — CoachPost/CoachProgram cascade from it
  await prisma.coachProfile.deleteMany({ where: { coachId: { in: ids } } })

  // Auth records
  await prisma.account.deleteMany({ where: { userId: { in: ids } } })
  await prisma.session.deleteMany({ where: { userId: { in: ids } } })

  // Finally: User (remaining cascade-linked models auto-delete: UserSubscription, FoodLog, etc.)
  await prisma.user.deleteMany({ where: { id: { in: ids } } })

  console.log(`Deleted ${ids.length} users successfully`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
