import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)
const EMAIL = 'juanatencia@medaliq.com'

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: EMAIL },
    include: {
      profile: true,
      trainingPlans: {
        include: {
          weeks: {
            include: {
              sessions: {
                select: { id: true, type: true, intensity: true, durationMin: true, date: true, dayOfWeek: true },
                orderBy: { date: 'asc' },
              },
            },
            orderBy: { weekNumber: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      nutritionPlan: true,
      mealPlan: true,
      checkIns: { orderBy: { recordedAt: 'desc' }, take: 3 },
      coachedBy: { include: { coach: { select: { email: true, name: true } } } },
    },
  })

  if (!user) { console.log('Usuario no encontrado'); return }

  console.log('\n=== USUARIO ===')
  console.log(`ID: ${user.id}`)
  console.log(`Email: ${user.email}`)
  console.log(`Nombre: ${user.name}`)
  console.log(`Role: ${user.role}`)
  console.log(`Creado: ${user.createdAt}`)

  console.log('\n=== CONFIG ===')
  const config = user.config as any
  console.log(JSON.stringify(config, null, 2))

  console.log('\n=== PERFIL DE SALUD ===')
  if (user.profile) {
    const p = user.profile
    console.log(`Age: ${p.age}, Height: ${p.heightCm}cm, Weight: ${p.weightKg}kg, Gender: ${p.gender}`)
    console.log(`Sport: ${p.sport}, Level: ${p.experienceLevel}`)
    console.log(`HR: resting=${p.hrResting}, max=${p.hrMax}`)
    console.log(`SportDetails: ${JSON.stringify(p.sportDetails)}`)
    console.log(`DataSources: ${JSON.stringify(p.dataSources)}`)
  } else {
    console.log('Sin perfil')
  }

  console.log('\n=== PLANES ===')
  console.log(`Total planes: ${user.trainingPlans.length}`)
  for (const plan of user.trainingPlans) {
    console.log(`\nPlan: ${plan.name}`)
    console.log(`  ID: ${plan.id}`)
    console.log(`  Status: ${plan.status}`)
    console.log(`  GeneratedBy: ${plan.generatedBy}`)
    console.log(`  Semanas en DB: ${plan.weeks.length}`)
    let totalSessions = 0
    const sessionTypes = new Set<string>()
    for (const week of plan.weeks) {
      totalSessions += week.sessions.length
      week.sessions.forEach(s => sessionTypes.add(s.type))
    }
    console.log(`  Sesiones totales: ${totalSessions}`)
    console.log(`  Tipos de sesión: ${[...sessionTypes].join(', ')}`)
    if (plan.weeks.length > 0) {
      const w1 = plan.weeks[0]
      console.log(`  Semana 1 (${w1.phase}): ${w1.sessions.length} sesiones`)
      w1.sessions.slice(0, 5).forEach(s => {
        console.log(`    - ${s.type} | ${s.intensity} | ${s.durationMin}min | día ${s.dayOfWeek}`)
      })
    }
  }

  console.log('\n=== NUTRICIÓN ===')
  if (user.nutritionPlan) {
    const n = user.nutritionPlan
    console.log(`TDEE: ${n.tdee} kcal`)
    console.log(`Kcal hard/easy/rest: ${n.targetKcalHard}/${n.targetKcalEasy}/${n.targetKcalRest}`)
    console.log(`Proteína: ${n.proteinG}g, CarbosHard: ${n.carbsHardG}g, CarbosEasy: ${n.carbsEasyG}g, Grasa: ${n.fatG}g`)
  } else {
    console.log('Sin plan nutricional')
  }

  console.log('\n=== MEAL PLAN ===')
  console.log(user.mealPlan ? `Generado: ${user.mealPlan.generatedAt}` : 'Sin meal plan')

  console.log('\n=== CHECK-INS ===')
  console.log(`Total: ${user.checkIns.length}`)
  user.checkIns.forEach(c => console.log(`  ${c.recordedAt.toISOString().slice(0, 10)} | RPE: ${c.hardestSessionRpe} | Weight: ${c.weightKg}`))

  console.log('\n=== COACH ===')
  if (user.coachedBy.length > 0) {
    user.coachedBy.forEach(r => console.log(`  Coach: ${r.coach.email} (${r.coach.name})`))
  } else {
    console.log('Sin coach (B2C)')
  }
}

async function checkGym() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL }, select: { id: true } })
  if (!user) return

  const assigned = await prisma.assignedWorkout.findFirst({
    where: { athleteId: user.id, isActive: true },
    include: {
      template: {
        include: {
          days: {
            include: { exercises: { select: { id: true } } },
            orderBy: { dayOfWeek: 'asc' },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  console.log('\n=== RUTINA GYM ASIGNADA ===')
  if (!assigned) {
    console.log('Sin rutina asignada')
    const templates = await prisma.workoutTemplate.findMany({ where: { isPublic: true, isActive: true }, select: { id: true, name: true } })
    console.log('Templates públicos disponibles:', templates.map(t => t.name).join(', '))
  } else {
    console.log(`Template: ${assigned.template.name}`)
    console.log(`Inicio: ${assigned.startDate}`)
    console.log(`Días:`)
    assigned.template.days.forEach(d => {
      console.log(`  Día ${d.dayOfWeek} (${['', 'Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][d.dayOfWeek]}): ${d.isRestDay ? 'Descanso' : `${d.label} (${d.exercises.length} ejercicios)`}`)
    })
  }
}

main().then(() => checkGym()).catch(console.error).finally(() => prisma.$disconnect())
