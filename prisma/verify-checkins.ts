import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  const emails = ['andres_b2b@medaliq.com', 'felipe_run@medaliq.com', 'maria_gym@medaliq.com']
  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true },
  })
  const ids = users.map(u => u.id)
  const cis = await prisma.weeklyCheckIn.findMany({
    where: { userId: { in: ids } },
    select: {
      userId: true,
      weekNumber: true,
      sleepHours: true,
      sleepScore: true,
      dietAdherencePct: true,
      stressLevel: true,
      motivationLevel: true,
      painLevel: true,
    },
    orderBy: [{ userId: 'asc' }, { weekNumber: 'asc' }],
    take: 9,
  })
  // Map userId back to email
  const emailMap: Record<string, string> = {}
  users.forEach(u => { emailMap[u.id] = u.email })
  for (const ci of cis) {
    const email = emailMap[ci.userId] ?? ci.userId
    console.log(`${email} wk${ci.weekNumber}: sleep=${ci.sleepHours}h score=${ci.sleepScore} diet=${ci.dietAdherencePct}% stress=${ci.stressLevel} motiv=${ci.motivationLevel} pain=${ci.painLevel}`)
  }
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
