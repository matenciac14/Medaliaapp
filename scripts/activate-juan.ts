import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'juanatencia@medaliq.com' }, select: { id: true, config: true } })
  if (!user) return console.log('Not found')
  const rel = await prisma.coachAthlete.findFirst({ where: { athleteId: user.id } })
  console.log('CoachAthlete:', rel ? `coachId=${rel.coachId}` : 'NONE')
  const plans = await prisma.trainingPlan.findMany({ where: { userId: user.id }, select: { id: true, name: true, status: true } })
  console.log('Plans:', plans.length, plans.map(p => p.name + ' [' + p.status + ']').join(', ') || 'none')
  const config = user.config as any
  console.log('features.plan:', config?.features?.plan)
}
main().catch(console.error).finally(() => prisma.$disconnect())
