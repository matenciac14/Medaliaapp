import { prisma } from '../src/lib/db/prisma'

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'miguel@medaliq.com' },
    include: {
      profile: { select: { weightKg: true, weightGoalKg: true, sport: true } },
      trainingPlans: {
        where: { status: 'ACTIVE' },
        include: {
          weeks: {
            orderBy: { weekNumber: 'asc' },
            include: { sessions: { orderBy: { dayOfWeek: 'asc' }, include: { log: { select: { id: true } } } } },
          },
        },
      },
      checkIns: { orderBy: { recordedAt: 'desc' }, take: 2, select: { weekNumber: true, recordedAt: true, weightKg: true, energyLevel: true, hardestSessionRpe: true } },
    },
  })

  if (!user) { console.log('Usuario no encontrado'); return }

  const plan = user.trainingPlans[0]
  const now = new Date()

  console.log('\n=== USUARIO ===')
  console.log('Email:', user.email)
  console.log('Config features:', JSON.stringify((user.config as any)?.features, null, 2))

  console.log('\n=== PLAN ACTIVO ===')
  if (!plan) {
    console.log('❌ Sin plan activo')
  } else {
    const start = new Date(plan.startDate)
    const diffDays = Math.floor((now.getTime() - start.getTime()) / 86400000)
    const currentWeek = Math.max(1, Math.min(plan.totalWeeks, Math.floor(diffDays / 7) + 1))
    const totalSessions = plan.weeks.flatMap(w => w.sessions).length
    const completedSessions = plan.weeks.flatMap(w => w.sessions).filter(s => s.log).length

    console.log('Nombre:', plan.name)
    console.log('Semana actual calculada:', currentWeek, '/', plan.totalWeeks)
    console.log('Start date:', plan.startDate.toISOString().split('T')[0])
    console.log('Total semanas en DB:', plan.weeks.length)
    console.log('Total sesiones:', totalSessions)
    console.log('Sesiones completadas:', completedSessions)

    const currentWeekData = plan.weeks.find(w => w.weekNumber === currentWeek)
    console.log('\n=== SEMANA ACTUAL (semana', currentWeek, ') ===')
    if (currentWeekData) {
      console.log('Fase:', currentWeekData.phase)
      console.log('Descripción:', currentWeekData.focusDescription)
      console.log('Sesiones:')
      currentWeekData.sessions.forEach(s => {
        console.log(`  Día ${s.dayOfWeek}: ${s.type} ${s.durationMin}min [${s.intensity}] ${s.log ? '✅' : '⬜'}`)
      })
    } else {
      console.log('❌ No se encontró la semana', currentWeek, 'en DB')
    }
  }

  console.log('\n=== PERFIL ===')
  console.log(user.profile ?? 'Sin perfil')

  console.log('\n=== CHECK-INS ===')
  console.table(user.checkIns)

  await prisma.$disconnect()
}

main().catch(console.error)
