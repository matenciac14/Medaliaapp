import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  const b2bEmails = ['andres_b2b@medaliq.com', 'felipe_run@medaliq.com', 'maria_gym@medaliq.com']
  const users = await prisma.user.findMany({
    where: { email: { in: b2bEmails } },
    select: { id: true, email: true },
  })
  const emailById: Record<string, string> = {}
  users.forEach(u => { emailById[u.id] = u.email })
  const ids = users.map(u => u.id)

  console.log('\n=== CHECK-INS (campos que lee el coach) ===')
  const cis = await prisma.weeklyCheckIn.findMany({
    where: { userId: { in: ids } },
    select: {
      userId: true, weekNumber: true,
      weightKg: true, hrResting: true,
      sleepHours: true, sleepScore: true,
      energyLevel: true, hardestSessionRpe: true,
      dietAdherencePct: true,
      stressLevel: true, motivationLevel: true, painLevel: true,
      waistCm: true, armsCm: true,
    },
    orderBy: [{ userId: 'asc' }, { weekNumber: 'asc' }],
  })
  for (const ci of cis) {
    const email = emailById[ci.userId]
    const issues: string[] = []
    if (ci.sleepScore === null) issues.push('sleepScore=null')
    if (ci.dietAdherencePct === null) issues.push('dietAdherencePct=null')
    if (ci.stressLevel === null) issues.push('stressLevel=null')
    if (ci.motivationLevel === null) issues.push('motivationLevel=null')
    if (ci.painLevel === null) issues.push('painLevel=null')
    const status = issues.length === 0 ? '✅' : `❌ ${issues.join(', ')}`
    console.log(`  ${email} wk${ci.weekNumber}: peso=${ci.weightKg}kg sleep=${ci.sleepScore} energy=${ci.energyLevel} diet=${ci.dietAdherencePct}% stress=${ci.stressLevel} motiv=${ci.motivationLevel} pain=${ci.painLevel} ${status}`)
  }

  console.log('\n=== TRAINING PLANS ===')
  const plans = await prisma.trainingPlan.findMany({
    where: { userId: { in: ids } },
    select: { userId: true, name: true, status: true, totalWeeks: true, startDate: true, endDate: true },
  })
  for (const p of plans) {
    console.log(`  ${emailById[p.userId]}: "${p.name}" ${p.status} ${p.totalWeeks}w`)
  }
  const usersWithPlan = plans.map(p => p.userId)
  const withoutPlan = ids.filter(id => !usersWithPlan.includes(id))
  for (const id of withoutPlan) {
    console.log(`  ${emailById[id]}: ❌ Sin TrainingPlan`)
  }

  console.log('\n=== SESSION LOGS (running) ===')
  const sessionLogs = await prisma.sessionLog.findMany({
    where: { userId: { in: ids } },
    select: { userId: true, discipline: true, completedAt: true, distanceKm: true, durationMin: true },
    orderBy: { completedAt: 'desc' },
  })
  const countByUser: Record<string, number> = {}
  for (const sl of sessionLogs) {
    countByUser[sl.userId] = (countByUser[sl.userId] ?? 0) + 1
  }
  for (const id of ids) {
    const count = countByUser[id] ?? 0
    console.log(`  ${emailById[id]}: ${count} SessionLogs`)
  }

  console.log('\n=== GYM SESSIONS ===')
  const gymSessions = await prisma.gymSession.findMany({
    where: { athleteId: { in: ids }, completed: true },
    select: { athleteId: true, date: true },
    orderBy: { date: 'desc' },
  })
  const gymByUser: Record<string, number> = {}
  for (const gs of gymSessions) {
    gymByUser[gs.athleteId] = (gymByUser[gs.athleteId] ?? 0) + 1
  }
  for (const id of ids) {
    const count = gymByUser[id] ?? 0
    console.log(`  ${emailById[id]}: ${count} GymSessions completadas`)
  }

  console.log('\n=== GYM SET LOGS (para Tab Sesiones — muscleGroups via exercise) ===')
  const setLogs = await prisma.setLog.findMany({
    where: { session: { athleteId: { in: ids } } },
    select: {
      session: { select: { athleteId: true } },
      exerciseName: true,
      weightKg: true,
      repsCompleted: true,
      workoutExercise: { select: { exercise: { select: { target: true, secondaryMuscles: true, name: true } } } },
    },
    take: 6,
  })
  for (const sl of setLogs) {
    const id = sl.session?.athleteId ?? ''
    const ex = sl.workoutExercise?.exercise
    const mg = ex ? [ex.target, ...(ex.secondaryMuscles ?? [])].filter(Boolean) : null
    const exName = ex?.name ?? sl.exerciseName ?? '?'
    const mgStatus = mg === null ? '⚠ sesión libre (ok)' : mg.length > 0 ? `✅ [${mg.slice(0, 2).join(', ')}]` : '❌ target vacío'
    console.log(`  ${emailById[id]}: ${exName} ${sl.weightKg}kg×${sl.repsCompleted} muscles: ${mgStatus}`)
  }

  console.log('\n=== NUTRITION PLANS ===')
  const nutPlans = await prisma.nutritionPlan.findMany({
    where: { userId: { in: ids } },
    select: { userId: true, targetKcalHard: true, targetKcalEasy: true, proteinG: true },
  })
  for (const np of nutPlans) {
    console.log(`  ${emailById[np.userId]}: kcal hard=${np.targetKcalHard} easy=${np.targetKcalEasy} prot=${np.proteinG}g ✅`)
  }
  const usersWithNut = nutPlans.map(p => p.userId)
  for (const id of ids) {
    if (!usersWithNut.includes(id)) {
      console.log(`  ${emailById[id]}: ❌ Sin NutritionPlan`)
    }
  }

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
