import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'miguel@medaliq.com' },
    select: { id: true, email: true, name: true },
  })
  if (!user) { console.log('Usuario no encontrado'); return }

  console.log(`Usuario: ${user.email} (${user.id})\n`)

  const plans = await prisma.trainingPlan.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true, name: true, status: true,
      startDate: true, endDate: true, createdAt: true, totalWeeks: true,
      weeks: {
        orderBy: { weekNumber: 'asc' },
        select: {
          weekNumber: true, phase: true, volumeKm: true,
          sessions: {
            orderBy: { dayOfWeek: 'asc' },
            select: {
              dayOfWeek: true, type: true, durationMin: true,
              log: { select: { id: true } },
            },
          },
        },
      },
    },
  })

  const DAY = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  for (const p of plans) {
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - new Date(p.startDate).getTime()) / 86400000)
    const currentWeek = Math.max(1, Math.min(p.totalWeeks, Math.floor(diffDays / 7) + 1))

    console.log(`━━━ Plan: "${p.name}"`)
    console.log(`    ID: ${p.id} | Status: ${p.status}`)
    console.log(`    startDate: ${new Date(p.startDate).toISOString().slice(0,10)} | Semana calculada hoy: ${currentWeek}/${p.totalWeeks}`)
    console.log(`    PlanWeeks en DB: ${p.weeks.length}`)

    if (p.weeks.length === 0) {
      console.log('    ⚠️  NO HAY PlanWeek records — plan vacío (solo cabecera)')
    } else {
      const weekNums = p.weeks.map(w => w.weekNumber)
      console.log(`    Semanas disponibles: ${weekNums.join(', ')}`)

      const week9 = p.weeks.find(w => w.weekNumber === currentWeek)
      if (!week9) {
        console.log(`    ⚠️  Semana ${currentWeek} NO EXISTE en DB`)
        console.log(`    Fallback en dashboard → última semana (${p.weeks[p.weeks.length - 1]?.weekNumber})`)
        const lastWeek = p.weeks[p.weeks.length - 1]
        if (lastWeek) {
          console.log(`    Sesiones semana ${lastWeek.weekNumber} (las que ve el dashboard):`)
          for (const s of lastWeek.sessions) {
            const done = s.log ? '✓' : '·'
            console.log(`      [${done}] ${DAY[s.dayOfWeek]}: ${s.type} ${s.durationMin}min`)
          }
        }
      } else {
        console.log(`    ✅ Semana ${currentWeek} existe | Fase: ${week9.phase} | Sesiones: ${week9.sessions.length}`)
        for (const s of week9.sessions) {
          const done = s.log ? '✓' : '·'
          console.log(`      [${done}] ${DAY[s.dayOfWeek]}: ${s.type} ${s.durationMin}min`)
        }
      }
    }
    console.log()
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
