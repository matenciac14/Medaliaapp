/**
 * seed.e2e.ts — Seed exclusivo para tests E2E
 *
 * Crea los usuarios mínimos para que global.setup.ts pueda autenticarse.
 * Idempotente — usa upsert, se puede correr múltiples veces.
 *
 * Uso: tsx prisma/seed.e2e.ts
 * (o via package.json: pnpm seed:e2e)
 *
 * NUNCA ejecutar en producción.
 */
import 'dotenv/config'
import {
  PrismaClient,
  UserRole,
  SubscriptionTier,
  CoachSubscriptionTier,
} from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)

const PASSWORD = 'Test1234!'

async function main() {
  console.log('🌱 [E2E] Seeding usuarios de test...')

  const hash = await bcrypt.hash(PASSWORD, 10)

  // ── 1. Admin de test ──────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'e2e-admin@test.medaliq.com' },
    update: {},
    create: {
      email: 'e2e-admin@test.medaliq.com',
      name: 'Admin Test',
      password: hash,
      role: UserRole.ADMIN,
      onboardingCompleted: true,
      needsRoleSelection: false,
      featurePlan: true,
      featureCheckin: true,
      featureNutrition: true,
      featureProgress: true,
      featureLog: true,
      featureGym: true,
      featureCoach: false,
    },
  })
  console.log(`  ✓ Admin: ${admin.email}`)

  // ── 2. Coach de test ──────────────────────────────────────────────────────
  const coach = await prisma.user.upsert({
    where: { email: 'e2e-coach@test.medaliq.com' },
    update: {},
    create: {
      email: 'e2e-coach@test.medaliq.com',
      name: 'Diego Test Coach',
      password: hash,
      role: UserRole.COACH,
      onboardingCompleted: true,
      needsRoleSelection: false,
      featureCoach: true,
      featurePlan: false,
      featureCheckin: false,
      featureNutrition: false,
      featureProgress: false,
      featureLog: false,
      featureGym: false,
    },
  })

  await prisma.userSubscription.upsert({
    where: { userId: coach.id },
    update: {},
    create: {
      userId: coach.id,
      tier: SubscriptionTier.PRO,
      coachTier: CoachSubscriptionTier.GROWTH,
    },
  })

  await prisma.coachProfile.upsert({
    where: { coachId: coach.id },
    update: {},
    create: {
      coachId: coach.id,
      slug: 'diego-test-coach',
      headline: 'Coach de test E2E',
      bio: 'Coach creado por seed E2E',
    },
  })
  console.log(`  ✓ Coach: ${coach.email}`)

  // ── 3. Atleta B2C (sin plan — tests verifican estado vacío realista) ────────
  const atletaB2C = await prisma.user.upsert({
    where: { email: 'e2e-atleta-b2c@test.medaliq.com' },
    update: {},
    create: {
      email: 'e2e-atleta-b2c@test.medaliq.com',
      name: 'Ana Test B2C',
      password: hash,
      role: UserRole.ATHLETE,
      onboardingCompleted: true,
      needsRoleSelection: false,
      featurePlan: true,
      featureCheckin: true,
      featureNutrition: true,
      featureProgress: true,
      featureLog: true,
      featureGym: true,
      featureCoach: false,
    },
  })

  await prisma.userSubscription.upsert({
    where: { userId: atletaB2C.id },
    update: {},
    create: { userId: atletaB2C.id, tier: SubscriptionTier.PRO },
  })

  // HealthProfile mínimo para que no falle el dashboard
  await prisma.healthProfile.upsert({
    where: { userId: atletaB2C.id },
    update: {},
    create: {
      userId: atletaB2C.id,
      age: 28,
      weightKg: 62,
      heightCm: 165,
      sportGoal: 'RACE_10K',
      sport: 'RUNNING',
    },
  })
  console.log(`  ✓ Atleta B2C: ${atletaB2C.email}`)

  // ── 4. Atleta B2B vinculado al coach de test ──────────────────────────────
  const atletaB2B = await prisma.user.upsert({
    where: { email: 'e2e-atleta-b2b@test.medaliq.com' },
    update: {},
    create: {
      email: 'e2e-atleta-b2b@test.medaliq.com',
      name: 'Carlos Test B2B',
      password: hash,
      role: UserRole.ATHLETE,
      onboardingCompleted: true,
      needsRoleSelection: false,
      featurePlan: true,
      featureCheckin: true,
      featureNutrition: true,
      featureProgress: true,
      featureLog: true,
      featureGym: true,
      featureCoach: false,
    },
  })

  await prisma.healthProfile.upsert({
    where: { userId: atletaB2B.id },
    update: {},
    create: {
      userId: atletaB2B.id,
      age: 32,
      weightKg: 75,
      heightCm: 178,
      sportGoal: 'RACE_5K',
      sport: 'RUNNING',
    },
  })

  // Vincular B2B al coach
  await prisma.coachAthlete.upsert({
    where: {
      coachId_athleteId: { coachId: coach.id, athleteId: atletaB2B.id },
    },
    update: {},
    create: {
      coachId: coach.id,
      athleteId: atletaB2B.id,
      status: 'ACTIVE',
    },
  })
  console.log(`  ✓ Atleta B2B: ${atletaB2B.email} → vinculado a ${coach.email}`)

  // ── 5. Atleta nuevo (sin onboarding, para test de onboarding) ─────────────
  const atletaNuevo = await prisma.user.upsert({
    where: { email: 'e2e-atleta-nuevo@test.medaliq.com' },
    update: {},
    create: {
      email: 'e2e-atleta-nuevo@test.medaliq.com',
      name: 'Luis Test Nuevo',
      password: hash,
      role: UserRole.ATHLETE,
      onboardingCompleted: false,
      needsRoleSelection: false,
      featurePlan: false,
      featureCheckin: false,
      featureNutrition: false,
      featureProgress: false,
      featureLog: false,
      featureGym: false,
      featureCoach: false,
    },
  })
  console.log(`  ✓ Atleta nuevo: ${atletaNuevo.email}`)

  console.log('\n✅ [E2E] Seed completado. Usuarios listos para tests.')
  console.log('   Todos con password: Test1234!')
}

main()
  .catch((e) => {
    console.error('[E2E] Seed falló:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
