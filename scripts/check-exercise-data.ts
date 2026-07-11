import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL!, max: 1 })
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  const exercises = await prisma.exercise.findMany({
    where: { source: 'workoutx' },
    select: { id: true, name: true, instructions: true, secondaryMuscles: true },
    take: 3,
  })
  console.log(JSON.stringify(exercises, null, 2))

  const stats = await prisma.$queryRaw<{ total: bigint; with_instructions: bigint; with_secondary: bigint }[]>`
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN array_length(instructions, 1) > 0 THEN 1 END) as with_instructions,
      COUNT(CASE WHEN array_length("secondaryMuscles", 1) > 0 THEN 1 END) as with_secondary
    FROM "Exercise" WHERE source = 'workoutx'
  `
  const s = stats[0]
  console.log('\nStats: total=' + s.total + ' with_instructions=' + s.with_instructions + ' with_secondary=' + s.with_secondary)
}

main().finally(() => prisma.$disconnect())
