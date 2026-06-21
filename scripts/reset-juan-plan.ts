import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)
async function main() {
  const admin = await prisma.user.findUnique({ where: { email: 'admin@medaliq.com' }, select: { id: true } })
  if (!admin) { console.log('Admin not found'); return }
  const ids = (await prisma.user.findMany({ where: { id: { not: admin.id } }, select: { id: true } })).map(u => u.id)
  console.log(`Borrando datos de ${ids.length} usuarios...`)

  // CoachProfile → CoachPost + CoachProgram
  const profiles = await prisma.coachProfile.findMany({ where: { coachId: { in: ids } }, select: { id: true } })
  const profileIds = profiles.map(p => p.id)
  await prisma.coachPost.deleteMany({ where: { profileId: { in: profileIds } } })
  await prisma.coachProgram.deleteMany({ where: { profileId: { in: profileIds } } })
  await prisma.coachProfile.deleteMany({ where: { id: { in: profileIds } } })

  // GymSession → SetLog
  const gymSessions = await prisma.gymSession.findMany({ where: { athleteId: { in: ids } }, select: { id: true } })
  await prisma.setLog.deleteMany({ where: { sessionId: { in: gymSessions.map(s => s.id) } } })
  await prisma.gymSession.deleteMany({ where: { athleteId: { in: ids } } })

  await prisma.sessionLog.deleteMany({ where: { userId: { in: ids } } })
  await prisma.dailyLog.deleteMany({ where: { userId: { in: ids } } })
  await prisma.weeklyCheckIn.deleteMany({ where: { userId: { in: ids } } })
  await prisma.foodLog.deleteMany({ where: { userId: { in: ids } } })
  await prisma.mealPlan.deleteMany({ where: { userId: { in: ids } } })
  await prisma.foodProfile.deleteMany({ where: { userId: { in: ids } } })
  await prisma.nutritionPlan.deleteMany({ where: { userId: { in: ids } } })
  await prisma.performanceBenchmark.deleteMany({ where: { userId: { in: ids } } })
  await prisma.assignedWorkout.deleteMany({ where: { athleteId: { in: ids } } })
  await prisma.coachAthlete.deleteMany({ where: { OR: [{ coachId: { in: ids } }, { athleteId: { in: ids } }] } })
  await prisma.inviteCode.deleteMany({ where: { coachId: { in: ids } } })
  await prisma.plannedSession.deleteMany({ where: { week: { plan: { userId: { in: ids } } } } })
  await prisma.planWeek.deleteMany({ where: { plan: { userId: { in: ids } } } })
  await prisma.trainingPlan.deleteMany({ where: { userId: { in: ids } } })
  await prisma.goal.deleteMany({ where: { userId: { in: ids } } })
  await prisma.healthProfile.deleteMany({ where: { userId: { in: ids } } })
  await prisma.account.deleteMany({ where: { userId: { in: ids } } })
  await prisma.session.deleteMany({ where: { userId: { in: ids } } })
  const deleted = await prisma.user.deleteMany({ where: { id: { in: ids } } })
  console.log(`Usuarios eliminados: ${deleted.count}`)

  const remaining = await prisma.user.findMany({ select: { email: true, role: true } })
  console.log('Usuarios restantes:')
  remaining.forEach(u => console.log(`  ${u.email} — ${u.role}`))
}
main().catch(console.error).finally(() => prisma.$disconnect())
