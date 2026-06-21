import { prisma } from '../src/lib/db/prisma'

async function main() {
  const assignments = await prisma.assignedWorkout.findMany({
    include: {
      template: { select: { name: true } },
      athlete: { select: { email: true } },
      coach: { select: { email: true } },
    },
  })
  console.log('\n=== AssignedWorkouts ===')
  console.table(assignments.map(a => ({
    template: a.template.name,
    athlete: a.athlete.email,
    coach: a.coach?.email ?? 'sin coach',
    isActive: a.isActive,
    startDate: a.startDate.toISOString().split('T')[0],
  })))

  const relations = await prisma.coachAthlete.findMany({
    include: {
      coach: { select: { email: true } },
      athlete: { select: { email: true } },
    },
  })
  console.log('\n=== CoachAthlete relations ===')
  console.table(relations.map(r => ({
    coach: r.coach.email,
    athlete: r.athlete.email,
    status: r.status,
  })))

  await prisma.$disconnect()
}
main().catch(console.error)
