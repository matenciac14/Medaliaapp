// scripts/backfill-integrity.ts
// Backfill one-time para corregir violaciones de integridad en DB existente.
// Seguro de correr múltiples veces (idempotente).
//
// Uso: npx tsx scripts/backfill-integrity.ts

import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { calculateTDEE, calculateMacros } from '../src/lib/plan/formulas'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  console.log('\n🔧 Medaliq — DB Integrity Backfill\n')

  // ── 1. Crear UserSubscription para usuarios que no tienen ─────────────────
  const usersWithoutSub = await prisma.user.findMany({
    where: { subscription: null },
    select: { id: true, email: true, role: true },
  })
  console.log(`Found ${usersWithoutSub.length} users without UserSubscription`)
  for (const user of usersWithoutSub) {
    const isCoach = user.role === 'COACH'
    await prisma.userSubscription.create({
      data: {
        userId:   user.id,
        tier:     isCoach ? 'PRO' : 'TRIAL',
        ...(isCoach
          ? { coachTier: 'STARTER' }
          : { trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }),
      },
    })
    console.log(`  ✅ Created UserSubscription for ${user.email} (${user.role})`)
  }

  // ── 2. Crear CoachProfile para coaches que no tienen ─────────────────────
  const coachesWithoutProfile = await prisma.user.findMany({
    where: { role: 'COACH', coachProfile: null },
    select: { id: true, email: true, name: true },
  })
  console.log(`\nFound ${coachesWithoutProfile.length} coaches without CoachProfile`)
  for (const coach of coachesWithoutProfile) {
    const slug = (coach.name ?? coach.email ?? coach.id)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    // Ensure unique slug
    const existing = await prisma.coachProfile.findUnique({ where: { slug } })
    const finalSlug = existing ? `${slug}-${coach.id.slice(-4)}` : slug
    await prisma.coachProfile.create({
      data: {
        coachId:      coach.id,
        slug:         finalSlug,
        specialties:  ['RUNNING', 'GYM'],
        country:      'CO',
        isPublic:     false,
      },
    })
    console.log(`  ✅ Created CoachProfile for ${coach.email} (slug: ${finalSlug})`)
  }

  // ── 3. Vincular WeeklyCheckIn al plan activo del usuario ──────────────────
  const orphanCheckIns = await prisma.$queryRaw<{ id: string; userId: string; weekNumber: number }[]>`
    SELECT ci.id, ci."userId", ci."weekNumber"
    FROM "WeeklyCheckIn" ci
    JOIN "TrainingPlan" tp ON tp."userId" = ci."userId" AND tp.status = 'ACTIVE'
    WHERE ci."planId" IS NULL
  `
  console.log(`\nFound ${orphanCheckIns.length} WeeklyCheckIns with planId=null despite active plan`)
  for (const ci of orphanCheckIns) {
    const activePlan = await prisma.trainingPlan.findFirst({
      where: { userId: ci.userId, status: 'ACTIVE' },
      select: { id: true },
    })
    if (!activePlan) continue
    // Check if a linked check-in for this plan+week already exists to avoid unique violation
    const exists = await prisma.weeklyCheckIn.findFirst({
      where: { userId: ci.userId, planId: activePlan.id, weekNumber: ci.weekNumber },
    })
    if (exists) {
      // Delete the duplicate null-planId one
      await prisma.weeklyCheckIn.delete({ where: { id: ci.id } })
      console.log(`  🗑️  Deleted duplicate null-planId check-in ${ci.id} (week ${ci.weekNumber})`)
    } else {
      await prisma.weeklyCheckIn.update({
        where: { id: ci.id },
        data:  { planId: activePlan.id },
      })
      console.log(`  ✅ Linked check-in ${ci.id} (week ${ci.weekNumber}) → plan ${activePlan.id}`)
    }
  }


// ── 4. Backfill TrainingPlan.goalType desde Goal.type ─────────────────────
const plansWithoutGoalType = await prisma.trainingPlan.findMany({
  where: { goalId: { not: null }, goalType: null },
  select: { id: true, goalId: true },
})
console.log(`\nFound ${plansWithoutGoalType.length} TrainingPlans with goalId but no goalType`)
for (const plan of plansWithoutGoalType) {
  const goal = await prisma.goal.findUnique({ where: { id: plan.goalId! }, select: { type: true } })
  if (!goal) continue
  await prisma.trainingPlan.update({
    where: { id: plan.id },
    data: { goalType: goal.type },
  })
  console.log(`  ✅ Set goalType=${goal.type} for plan ${plan.id}`)
}
  // ── 5. Crear NutritionPlan para atletas sin uno ───────────────────────────
  const athletesWithoutNutrition = await prisma.user.findMany({
    where: {
      role: 'ATHLETE',
      onboardingCompleted: true,
      nutritionPlan: null,
    },
    select: {
      id: true,
      email: true,
      profile: {
        select: {
          weightKg: true,
          heightCm: true,
          age: true,
          gender: true,
        },
      },
    },
  })
  console.log(`\nFound ${athletesWithoutNutrition.length} athletes without NutritionPlan`)
  for (const athlete of athletesWithoutNutrition) {
    const hp = athlete.profile
    if (!hp?.weightKg || !hp.heightCm || !hp.age) {
      console.log(`  ⚠️  Skipped ${athlete.email} — missing HealthProfile data`)
      continue
    }
    const gender = (hp.gender === 'female' ? 'female' : 'male') as 'male' | 'female'
    const tdee = calculateTDEE(hp.weightKg, hp.heightCm, hp.age, gender, 3)
    const macros = calculateMacros(tdee, hp.weightKg, false)
    await prisma.nutritionPlan.create({
      data: {
        userId:         athlete.id,
        tdee,
        targetKcalHard: macros.hard.kcal,
        targetKcalEasy: macros.easy.kcal,
        targetKcalRest: macros.rest.kcal,
        proteinG:       macros.hard.protein,
        carbsHardG:     macros.hard.carbs,
        carbsEasyG:     macros.easy.carbs,
        fatG:           macros.hard.fat,
      },
    })
    console.log(`  ✅ Created NutritionPlan for ${athlete.email} (tdee=${tdee})`)
  }

  console.log('\n✅ Backfill complete\n')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
