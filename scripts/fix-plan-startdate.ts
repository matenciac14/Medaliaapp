/**
 * Fixes Miguel's training plan startDate so today falls on week 6 (last existing week in DB).
 * The plan was seeded with only 6 of 18 weeks. Moving startDate so currentWeek=6.
 */
import { prisma } from '../src/lib/db/prisma'

async function main() {
  const miguel = await prisma.user.findUnique({
    where: { email: 'miguel@medaliq.com' },
    select: { id: true },
  })
  if (!miguel) { console.log('Usuario miguel@medaliq.com no encontrado'); return }

  const plan = await prisma.trainingPlan.findFirst({
    where: { userId: miguel.id, status: 'ACTIVE' },
    include: { weeks: { orderBy: { weekNumber: 'asc' }, select: { weekNumber: true } } },
  })
  if (!plan) { console.log('No hay plan activo para miguel'); return }

  console.log(`Plan encontrado: ${plan.name}`)
  console.log(`startDate actual: ${plan.startDate.toISOString().split('T')[0]}`)
  console.log(`Semanas en DB: ${plan.weeks.map(w => w.weekNumber).join(', ')}`)

  const maxWeek = Math.max(...plan.weeks.map(w => w.weekNumber))
  console.log(`Última semana disponible: ${maxWeek}`)

  // We want: rawWeek = floor(diffDays/7) + 1 = maxWeek
  // → floor(diffDays/7) = maxWeek - 1
  // → diffDays = (maxWeek - 1) * 7  (use floor to put today at start of week maxWeek)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const targetDiffDays = (maxWeek - 1) * 7
  const newStartDate = new Date(today)
  newStartDate.setDate(today.getDate() - targetDiffDays)

  // endDate = startDate + totalWeeks * 7
  const newEndDate = new Date(newStartDate)
  newEndDate.setDate(newStartDate.getDate() + plan.totalWeeks * 7)

  console.log(`\nNuevo startDate: ${newStartDate.toISOString().split('T')[0]}`)
  console.log(`Nuevo endDate: ${newEndDate.toISOString().split('T')[0]}`)
  console.log(`Verificación: hoy=${today.toISOString().split('T')[0]}, diffDays=${targetDiffDays}, rawWeek=${Math.floor(targetDiffDays/7)+1}`)

  await prisma.trainingPlan.update({
    where: { id: plan.id },
    data: { startDate: newStartDate, endDate: newEndDate },
  })

  console.log('\n✅ startDate actualizado correctamente')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
