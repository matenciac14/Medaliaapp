import { prisma } from '../src/lib/db/prisma'
import bcrypt from 'bcryptjs'

const hash = (p: string) => bcrypt.hash(p, 10)

async function main() {
  // Coach
  const coach = await prisma.user.upsert({
    where: { email: 'coach@medaliq.com' },
    update: {},
    create: {
      email: 'coach@medaliq.com',
      name: 'Coach Demo',
      password: await hash('coach123'),
      role: 'COACH',
      featureCoach: true,
      featurePlan: false, featureCheckin: false, featureNutrition: false,
      featureProgress: false, featureLog: false, featureGym: false,
      onboardingCompleted: true, needsRoleSelection: false,
    },
  })
  console.log('✅ Coach:', coach.email)

  // CoachProfile
  const existingProfile = await prisma.coachProfile.findUnique({ where: { coachId: coach.id } })
  if (!existingProfile) {
    await prisma.coachProfile.create({
      data: {
        coachId: coach.id,
        slug: 'coach-demo',
        bio: 'Coach de prueba para testing',
        specialties: ['RUNNING', 'STRENGTH'],
        isPublic: false,
      },
    })
    console.log('✅ CoachProfile creado')
  } else {
    console.log('✅ CoachProfile ya existe')
  }

  // Atleta B2C (miguel)
  const miguel = await prisma.user.upsert({
    where: { email: 'miguel@medaliq.com' },
    update: {},
    create: {
      email: 'miguel@medaliq.com',
      name: 'Miguel Demo',
      password: await hash('atleta123'),
      role: 'ATHLETE',
      featurePlan: true, featureCheckin: true, featureNutrition: true,
      featureProgress: true, featureLog: true, featureGym: true,
      onboardingCompleted: true,
    },
  })
  console.log('✅ Atleta B2C:', miguel.email)

  // Atleta con coach (ana)
  const ana = await prisma.user.upsert({
    where: { email: 'ana@medaliq.com' },
    update: {},
    create: {
      email: 'ana@medaliq.com',
      name: 'Ana Demo',
      password: await hash('atleta123'),
      role: 'ATHLETE',
      featurePlan: true, featureCheckin: true, featureNutrition: true,
      featureProgress: true, featureLog: true, featureGym: true,
      onboardingCompleted: true,
    },
  })
  console.log('✅ Atleta con coach:', ana.email)

  // Vincular ana con coach
  const existingRelation = await prisma.coachAthlete.findUnique({
    where: { coachId_athleteId: { coachId: coach.id, athleteId: ana.id } },
  })
  if (!existingRelation) {
    await prisma.coachAthlete.create({
      data: { coachId: coach.id, athleteId: ana.id, status: 'ACTIVE' },
    })
    console.log('✅ Relación coach → ana creada')
  } else {
    console.log('✅ Relación coach → ana ya existe')
  }

  // Verificar resultado
  const users = await prisma.user.findMany({ select: { email: true, role: true } })
  console.log('\nUsuarios en DB:')
  console.table(users)

  await prisma.$disconnect()
}

main().catch(console.error)
