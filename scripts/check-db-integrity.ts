// scripts/check-db-integrity.ts
// Auditoría de integridad de datos — ejecutar antes de cada release
//
// Uso: npx tsx scripts/check-db-integrity.ts
// O con DB explícita: DATABASE_URL="..." npx tsx scripts/check-db-integrity.ts

import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)

type Severity = 'CRITICAL' | 'WARNING' | 'INFO'
type Result = { name: string; severity: Severity; violations: unknown[] }

const results: Result[] = []

async function check(name: string, severity: Severity, fn: () => Promise<unknown[]>) {
  try {
    const violations = await fn()
    results.push({ name, severity, violations })
  } catch (err) {
    results.push({ name, severity: 'CRITICAL', violations: [{ error: String(err) }] })
  }
}

async function main() {
  console.log('\n🔍 Medaliq — DB Integrity Check\n')

  // ── CRITICAL ────────────────────────────────────────────────────────────────

  await check('Users sin UserSubscription', 'CRITICAL', () =>
    prisma.user.findMany({
      where: { subscription: null },
      select: { id: true, email: true, role: true },
    })
  )

  await check('Athletes ACTIVE con más de 1 TrainingPlan ACTIVE', 'CRITICAL', () =>
    prisma.$queryRaw`
      SELECT "userId", COUNT(*) as "planCount"
      FROM "TrainingPlan"
      WHERE status = 'ACTIVE'
      GROUP BY "userId"
      HAVING COUNT(*) > 1
    ` as Promise<unknown[]>
  )

  await check('WeeklyCheckIn planId=null con TrainingPlan ACTIVE del mismo user', 'CRITICAL', () =>
    prisma.$queryRaw`
      SELECT ci.id, ci."userId", ci."weekNumber"
      FROM "WeeklyCheckIn" ci
      JOIN "TrainingPlan" tp ON tp."userId" = ci."userId" AND tp.status = 'ACTIVE'
      WHERE ci."planId" IS NULL
      LIMIT 20
    ` as Promise<unknown[]>
  )

  await check('Payment PAID sin paidAt', 'CRITICAL', () =>
    prisma.payment.findMany({
      where: { status: 'PAID', paidAt: null },
      select: { id: true, coachId: true, athleteId: true, amount: true },
    })
  )

  await check('Coaches sin CoachProfile', 'CRITICAL', () =>
    prisma.user.findMany({
      where: { role: 'COACH', coachProfile: null },
      select: { id: true, email: true },
    })
  )

  // ── WARNING ─────────────────────────────────────────────────────────────────

  await check('Athletes con onboardingCompleted=true sin HealthProfile', 'WARNING', () =>
    prisma.user.findMany({
      where: { role: 'ATHLETE', onboardingCompleted: true, profile: null },
      select: { id: true, email: true },
    })
  )

  await check('Athletes con onboardingCompleted=true sin NutritionPlan', 'WARNING', () =>
    prisma.user.findMany({
      where: { role: 'ATHLETE', onboardingCompleted: true, nutritionPlan: null },
      select: { id: true, email: true },
    })
  )

  await check('TrainingPlan sin goalType', 'WARNING', () =>
    prisma.trainingPlan.findMany({
      where: { goalType: null },
      select: { id: true, userId: true, name: true },
    })
  )

  await check('TrainingPlan endDate <= startDate', 'WARNING', () =>
    prisma.$queryRaw`
      SELECT id, "userId", "startDate", "endDate"
      FROM "TrainingPlan"
      WHERE "endDate" <= "startDate"
      LIMIT 10
    ` as Promise<unknown[]>
  )

  // PlannedSession.type=FUERZA sin workoutDayId: esperado en body plans (el coach vincula workout por separado)

  await check('HealthProfile con gender distinto de male/female', 'WARNING', () =>
    prisma.$queryRaw`
      SELECT id, "userId", gender
      FROM "HealthProfile"
      WHERE gender IS NOT NULL AND gender NOT IN ('male', 'female')
      LIMIT 10
    ` as Promise<unknown[]>
  )

  await check('Exercise isGlobal=true pero con coachId', 'WARNING', () =>
    prisma.exercise.findMany({
      where: { isGlobal: true, coachId: { not: null } },
      select: { id: true, name: true, coachId: true },
    })
  )

  await check('NutritionPlan con targetKcalEasy >= targetKcalHard', 'WARNING', () =>
    prisma.$queryRaw`
      SELECT id, "userId", "targetKcalHard", "targetKcalEasy"
      FROM "NutritionPlan"
      WHERE "targetKcalEasy" >= "targetKcalHard"
      LIMIT 10
    ` as Promise<unknown[]>
  )

  await check('UserSubscription TRIAL sin trialEndsAt', 'WARNING', () =>
    prisma.userSubscription.findMany({
      where: { tier: 'TRIAL', trialEndsAt: null },
      select: { id: true, userId: true },
    })
  )

  // ── INFO ────────────────────────────────────────────────────────────────────

  await check('Athletes B2B (con coach) con featurePlan=true pero onboardingCompleted=false', 'INFO', () =>
    prisma.user.findMany({
      where: {
        role: 'ATHLETE',
        featurePlan: true,
        onboardingCompleted: false,
        coachedBy: { some: {} },
      },
      select: { id: true, email: true },
    })
  )

  await check('PlanWeek sin startDate o endDate', 'INFO', () =>
    prisma.$queryRaw`
      SELECT id, "planId", "weekNumber"
      FROM "PlanWeek"
      WHERE "startDate" IS NULL OR "endDate" IS NULL
      LIMIT 10
    ` as Promise<unknown[]>
  )

  // ── REPORTE ─────────────────────────────────────────────────────────────────

  const critical = results.filter(r => r.severity === 'CRITICAL')
  const warnings = results.filter(r => r.severity === 'WARNING')
  const infos    = results.filter(r => r.severity === 'INFO')

  let hasFailures = false

  for (const group of [critical, warnings, infos]) {
    for (const r of group) {
      const icon = r.violations.length > 0
        ? (r.severity === 'CRITICAL' ? '🔴' : r.severity === 'WARNING' ? '🟡' : '🔵')
        : '✅'
      const label = r.violations.length > 0 ? `${r.violations.length} violación(es)` : 'OK'
      console.log(`${icon} [${r.severity.padEnd(8)}] ${r.name} — ${label}`)
      if (r.violations.length > 0) {
        hasFailures = true
        console.log('   ', JSON.stringify(r.violations.slice(0, 3), null, 2).replace(/\n/g, '\n    '))
      }
    }
  }

  const totalViolations = results.reduce((acc, r) => acc + r.violations.length, 0)
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`Total checks: ${results.length} | Violaciones: ${totalViolations}`)
  if (totalViolations > 0) {
    console.log('⚠️  Hay violaciones de integridad que requieren atención.\n')
    process.exit(1)
  } else {
    console.log('✅  Base de datos íntegra.\n')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
