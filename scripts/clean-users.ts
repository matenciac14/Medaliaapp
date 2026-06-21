import { prisma } from '../src/lib/db/prisma'

const KEEP = ['admin@medaliq.com', 'coach@medaliq.com', 'miguel@medaliq.com', 'ana@medaliq.com']

async function main() {
  const toDelete = await prisma.user.findMany({
    where: { email: { notIn: KEEP } },
    select: { id: true, email: true },
  })

  const ids = toDelete.map(u => u.id)
  console.log(`Eliminando ${ids.length} usuarios:`, toDelete.map(u => u.email))

  if (ids.length === 0) { console.log('Nada que eliminar'); return }

  // FK cascade order
  await prisma.setLog.deleteMany({ where: { session: { athleteId: { in: ids } } } })
  await prisma.gymSession.deleteMany({ where: { athleteId: { in: ids } } })
  await prisma.assignedWorkout.deleteMany({ where: { athleteId: { in: ids } } })
  await prisma.weeklyCheckIn.deleteMany({ where: { userId: { in: ids } } })
  await prisma.sessionLog.deleteMany({ where: { userId: { in: ids } } })
  await prisma.dailyLog.deleteMany({ where: { userId: { in: ids } } })
  await prisma.foodLog.deleteMany({ where: { userId: { in: ids } } })
  await prisma.mealPlan.deleteMany({ where: { userId: { in: ids } } })
  await prisma.foodProfile.deleteMany({ where: { userId: { in: ids } } })
  await prisma.nutritionPlan.deleteMany({ where: { userId: { in: ids } } })
  await prisma.performanceBenchmark.deleteMany({ where: { userId: { in: ids } } })
  await prisma.coachAthlete.deleteMany({ where: { OR: [{ athleteId: { in: ids } }, { coachId: { in: ids } }] } })
  await prisma.inviteCode.deleteMany({ where: { coachId: { in: ids } } })
  await prisma.plannedSession.deleteMany({ where: { week: { plan: { userId: { in: ids } } } } })
  await prisma.planWeek.deleteMany({ where: { plan: { userId: { in: ids } } } })
  await prisma.trainingPlan.deleteMany({ where: { userId: { in: ids } } })
  await prisma.goal.deleteMany({ where: { userId: { in: ids } } })
  await prisma.healthProfile.deleteMany({ where: { userId: { in: ids } } })

  // CoachProfile para coaches eliminados
  await prisma.coachProfile.deleteMany({ where: { coachId: { in: ids } } })

  await prisma.account.deleteMany({ where: { userId: { in: ids } } })
  await prisma.session.deleteMany({ where: { userId: { in: ids } } })
  await prisma.user.deleteMany({ where: { id: { in: ids } } })

  console.log('✅ Limpieza completa')

  const remaining = await prisma.user.findMany({ select: { email: true, role: true } })
  console.table(remaining)

  await prisma.$disconnect()
}

main().catch(console.error)
