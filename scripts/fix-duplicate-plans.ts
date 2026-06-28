/**
 * fix-duplicate-plans.ts
 * Limpia planes ACTIVE duplicados por usuario.
 * Mantiene el plan con más SessionLogs. Si hay empate, el más reciente.
 * Run: cd MEDALIQ-PROJECT && npx tsx --env-file=.env scripts/fix-duplicate-plans.ts
 */

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  console.log('=== fix-duplicate-plans ===\n')

  // Traer todos los planes ACTIVE con sus session logs
  const activePlans = await prisma.trainingPlan.findMany({
    where: { status: 'ACTIVE' as any },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userId: true,
      name: true,
      createdAt: true,
      weeks: {
        select: {
          sessions: {
            select: { log: { select: { id: true } } },
          },
        },
      },
    },
  })

  // Agrupar por userId
  const byUser = new Map<string, typeof activePlans>()
  for (const plan of activePlans) {
    const list = byUser.get(plan.userId) ?? []
    list.push(plan)
    byUser.set(plan.userId, list)
  }

  let totalFixed = 0
  let totalClean = 0

  for (const [userId, plans] of byUser) {
    if (plans.length === 1) {
      totalClean++
      continue
    }

    console.log(`\nUsuario ${userId}: ${plans.length} planes ACTIVE`)

    // Calcular logs por plan
    const withLogs = plans.map(p => ({
      ...p,
      logCount: p.weeks.flatMap(w => w.sessions).filter(s => s.log).length,
    }))

    // Ordenar: más logs primero, más reciente si empate
    withLogs.sort((a, b) => {
      if (b.logCount !== a.logCount) return b.logCount - a.logCount
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    const winner = withLogs[0]
    const losers = withLogs.slice(1)

    console.log(`  ✅ MANTENER: "${winner.name}" (${winner.logCount} logs, creado ${winner.createdAt.toISOString().slice(0, 10)})`)

    for (const loser of losers) {
      console.log(`  ❌ DESACTIVAR: "${loser.name}" (${loser.logCount} logs, creado ${loser.createdAt.toISOString().slice(0, 10)})`)
    }

    const loserIds = losers.map(p => p.id)
    await prisma.trainingPlan.updateMany({
      where: { id: { in: loserIds } },
      data: { status: 'COMPLETED' as any },
    })

    totalFixed++
  }

  console.log(`\n=== Resultado ===`)
  console.log(`Usuarios ya limpios: ${totalClean}`)
  console.log(`Usuarios con duplicados corregidos: ${totalFixed}`)
  console.log('Listo.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
