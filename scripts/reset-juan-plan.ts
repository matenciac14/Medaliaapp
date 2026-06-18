import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'juanatencia@medaliq.com' }, select: { id: true, config: true } })
  if (!user) return console.log('Not found')
  const config = user.config as any
  await prisma.user.update({
    where: { id: user.id },
    data: { config: { ...config, features: { ...config.features, aiCoach: false, aiPlan: false }, ai: { ...config.ai, monthlyLimit: 0 } } }
  })
  console.log('Done — aiCoach=false, aiPlan=false, monthlyLimit=0')
}
main().catch(console.error).finally(() => prisma.$disconnect())
