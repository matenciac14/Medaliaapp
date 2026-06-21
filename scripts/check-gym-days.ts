import { prisma } from '../src/lib/db/prisma'

async function main() {
  const miguel = await prisma.user.findUnique({ where: { email: 'miguel@medaliq.com' } })
  if (!miguel) { console.log('Not found'); return }

  const aw = await prisma.assignedWorkout.findFirst({
    where: { athleteId: miguel.id, isActive: true },
    include: { template: { include: { days: { orderBy: { order: 'asc' } } } } }
  })
  console.log('Template:', aw?.template.name)
  aw?.template.days.forEach(d => {
    const DOW_NAMES = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    console.log(` DOW=${d.dayOfWeek} (${DOW_NAMES[d.dayOfWeek]}) label=${d.label} rest=${d.isRestDay} muscles=${JSON.stringify(d.muscleGroups)}`)
  })

  const plan = await prisma.trainingPlan.findFirst({
    where: { userId: miguel.id, status: 'ACTIVE' },
    include: { weeks: { where: { weekNumber: 6 }, include: { sessions: { orderBy: { dayOfWeek: 'asc' } } } } }
  })
  console.log('\nPlan startDate:', plan?.startDate.toISOString().split('T')[0])
  console.log('endDate:', plan?.endDate.toISOString().split('T')[0])
  console.log('Week 6 sessions:')
  const DOW_NAMES = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  plan?.weeks[0]?.sessions.forEach(s => {
    console.log(` DOW=${s.dayOfWeek} (${DOW_NAMES[s.dayOfWeek]}) type=${s.type}`)
  })
}

main().catch(console.error).finally(() => process.exit(0))
