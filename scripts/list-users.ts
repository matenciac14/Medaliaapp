import { prisma } from '../src/lib/db/prisma'

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { createdAt: 'asc' },
  })
  console.table(users)

  const relations = await prisma.coachAthlete.findMany({
    select: { coachId: true, athleteId: true, status: true },
  })
  console.log('\nRelaciones coach-atleta:')
  console.table(relations)

  await prisma.$disconnect()
}

main()
