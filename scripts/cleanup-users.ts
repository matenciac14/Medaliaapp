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

  // Delete in dependency order
  await prisma.setLog.deleteMany({ where: { session: { athleteId: { in: ids } } } })
  await prisma.gymSession.deleteMany({ where: { athleteId: { in: ids } } })
  await prisma.sessionLog.deleteMany({ where: { userId: { in: ids } } })
  await prisma.dailyLog.deleteMany({ where: { userId: { in: ids } } })
  await prisma.plannedSession.deleteMany({ where: { week: { plan: { userId: { in: ids } } } } })
  await prisma.planWeek.deleteMany({ where: { plan: { userId: { in: ids } } } })
  await prisma.trainingPlan.deleteMany({ where: { userId: { in: ids } } })
  await prisma.nutritionPlan.deleteMany({ where: { userId: { in: ids } } })
  await prisma.weeklyCheckIn.deleteMany({ where: { userId: { in: ids } } })
  await prisma.assignedWorkout.deleteMany({ where: { OR: [{ athleteId: { in: ids } }, { coachId: { in: ids } }] } })
  // WorkoutDay/WorkoutExercise cascade from WorkoutTemplate
  await prisma.workoutTemplate.deleteMany({ where: { coachId: { in: ids } } })
  await prisma.goal.deleteMany({ where: { userId: { in: ids } } })
  await prisma.healthProfile.deleteMany({ where: { userId: { in: ids } } })
  await prisma.coachAthlete.deleteMany({ where: { OR: [{ athleteId: { in: ids } }, { coachId: { in: ids } }] } })
  // CoachPost and CoachProgram cascade from CoachProfile
  await prisma.coachProfile.deleteMany({ where: { coachId: { in: ids } } })
  await prisma.account.deleteMany({ where: { userId: { in: ids } } })
  await prisma.session.deleteMany({ where: { userId: { in: ids } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })

  console.log(`Deleted ${ids.length} users successfully`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
