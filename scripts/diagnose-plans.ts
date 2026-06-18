import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  // Buscar todos los usuarios con planes ACTIVE
  const plans = await prisma.trainingPlan.findMany({
    where: { status: 'ACTIVE' as any },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      userId: true,
      name: true,
      status: true,
      startDate: true,
      createdAt: true,
      totalWeeks: true,
      weeks: {
        select: {
          weekNumber: true,
          phase: true,
          sessions: {
            select: {
              dayOfWeek: true,
              type: true,
              durationMin: true,
              log: { select: { id: true } },
            },
          },
        },
      },
      user: { select: { email: true, name: true } },
    },
  })

  const byUser = new Map<string, typeof plans>()
  for (const p of plans) {
    const list = byUser.get(p.userId) ?? []
    list.push(p)
    byUser.set(p.userId, list)
  }

  // Reportar usuarios con más de 1 plan ACTIVE
  let foundDuplicates = false
  for (const [userId, userPlans] of byUser) {
    const email = userPlans[0].user.email
    console.log(`\n📋 ${email} (${userId.slice(0,8)}) — ${userPlans.length} plan(es) ACTIVE`)

    for (const p of userPlans) {
      const now = new Date()
      const diffDays = Math.floor((now.getTime() - new Date(p.startDate).getTime()) / 86400000)
      const currentWeek = Math.max(1, Math.min(p.totalWeeks, Math.floor(diffDays / 7) + 1))
      const currentPlanWeek = p.weeks.find(w => w.weekNumber === currentWeek)
      const logCount = p.weeks.flatMap(w => w.sessions).filter(s => s.log).length

      console.log(`  Plan: "${p.name}"`)
      console.log(`  ID: ${p.id}`)
      console.log(`  Creado: ${p.createdAt.toISOString().slice(0,10)}`)
      console.log(`  Semana actual del plan: ${currentWeek}/${p.totalWeeks}`)
      console.log(`  Fase semana actual: ${currentPlanWeek?.phase ?? 'N/A'}`)
      console.log(`  Total SessionLogs: ${logCount}`)
      console.log(`  Sesiones semana ${currentWeek}:`)

      const DAY = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
      for (const s of (currentPlanWeek?.sessions ?? [])) {
        const done = s.log ? '✓' : '·'
        console.log(`    [${done}] ${DAY[s.dayOfWeek] ?? s.dayOfWeek}: ${s.type} ${s.durationMin}min`)
      }

      if (userPlans.length > 1) foundDuplicates = true
    }
  }

  if (!foundDuplicates) {
    console.log('\n✅ No hay duplicados — todos los usuarios tienen exactamente 1 plan ACTIVE')
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
