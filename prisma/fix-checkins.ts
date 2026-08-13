import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  const demoEmails = [
    'sebastian_gym@medaliq.com',
    'valentina_run@medaliq.com',
    'andres_b2b@medaliq.com',
    'felipe_run@medaliq.com',
    'maria_gym@medaliq.com',
  ]
  const users = await prisma.user.findMany({
    where: { email: { in: demoEmails } },
    select: { id: true },
  })
  const userIds = users.map(u => u.id)

  // Delete check-ins
  const ci = await prisma.weeklyCheckIn.deleteMany({ where: { userId: { in: userIds } } })
  console.log(`Deleted ${ci.count} WeeklyCheckIns`)

  // Delete training plans (cascade deletes PlanWeek, PlannedSession)
  const tp = await prisma.trainingPlan.deleteMany({ where: { userId: { in: userIds } } })
  console.log(`Deleted ${tp.count} TrainingPlans`)

  // Delete gym sessions (cascade deletes SetLog)
  const gs = await prisma.gymSession.deleteMany({ where: { athleteId: { in: userIds } } })
  console.log(`Deleted ${gs.count} GymSessions`)

  // Delete session logs
  const sl = await prisma.sessionLog.deleteMany({ where: { userId: { in: userIds } } })
  console.log(`Deleted ${sl.count} SessionLogs`)

  // Delete nutrition plans
  const np = await prisma.nutritionPlan.deleteMany({ where: { userId: { in: userIds } } })
  console.log(`Deleted ${np.count} NutritionPlans`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
