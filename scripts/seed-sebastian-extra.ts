/**
 * Adds extra gym sessions for sebastian_gym@medaliq.com
 * to fill week Jul 27 - Aug 2 with 5 sessions (currently has 3: Jul 28, 30, Aug 1)
 * Adds: Jul 27 (Dom) and Jul 29 (Mar)
 *
 * Run: npx tsx scripts/seed-sebastian-extra.ts
 */

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'sebastian_gym@medaliq.com' } })
  if (!user) throw new Error('sebastian_gym@medaliq.com not found')

  const sessions = [
    {
      date: '2026-07-27',
      dayOfWeek: 0, // Sunday
      label: 'Push — Pecho y Hombros',
      rpe: 7,
      durationMin: 55,
      exercises: [
        { name: 'Press Banca', sets: [[82.5, 10], [82.5, 10], [87.5, 8], [87.5, 8]] },
        { name: 'Press Inclinado Mancuerna', sets: [[32, 12], [32, 12], [34, 10]] },
        { name: 'Elevaciones Laterales', sets: [[12, 15], [12, 15], [14, 12]] },
      ],
    },
    {
      date: '2026-07-29',
      dayOfWeek: 2, // Tuesday
      label: 'Pull — Espalda y Bíceps',
      rpe: 8,
      durationMin: 60,
      exercises: [
        { name: 'Dominadas', sets: [[0, 10], [0, 10], [0, 8]] },
        { name: 'Remo con Barra', sets: [[72.5, 10], [72.5, 10], [77.5, 8]] },
        { name: 'Curl Bíceps Barra', sets: [[35, 12], [35, 12], [37, 10]] },
      ],
    },
    {
      date: '2026-08-02',
      dayOfWeek: 6, // Saturday
      label: 'Legs — Full Piernas',
      rpe: 8,
      durationMin: 65,
      exercises: [
        { name: 'Sentadilla', sets: [[105, 10], [105, 10], [110, 8]] },
        { name: 'Peso Muerto Rumano', sets: [[92.5, 10], [92.5, 10], [97.5, 8]] },
        { name: 'Prensa', sets: [[185, 12], [185, 12], [195, 10]] },
      ],
    },
    {
      date: '2026-08-03',
      dayOfWeek: 0, // Sunday
      label: 'Push — Hombros y Tríceps',
      rpe: 7,
      durationMin: 50,
      exercises: [
        { name: 'Press Militar', sets: [[62.5, 10], [62.5, 10], [67.5, 8]] },
        { name: 'Elevaciones Laterales', sets: [[14, 15], [14, 15], [14, 12]] },
        { name: 'Fondos Tríceps', sets: [[0, 15], [0, 15], [0, 12]] },
      ],
    },
  ]

  for (const s of sessions) {
    const existing = await prisma.gymSession.findFirst({
      where: { athleteId: user.id, date: new Date(`${s.date}T10:00:00.000Z`) },
    })
    if (existing) {
      console.log(`  Skip ${s.date} — already exists`)
      continue
    }

    const gymSession = await prisma.gymSession.create({
      data: {
        athleteId: user.id,
        date: new Date(`${s.date}T10:00:00.000Z`),
        dayOfWeek: s.dayOfWeek,
        durationMin: s.durationMin,
        rpe: s.rpe,
        completed: true,
        notes: s.label,
      },
    })

    let setNumber = 1
    for (const ex of s.exercises) {
      for (const [weightKg, reps] of ex.sets) {
        await prisma.setLog.create({
          data: {
            sessionId: gymSession.id,
            exerciseName: ex.name,
            setNumber: setNumber++,
            weightKg,
            repsCompleted: reps,
            completed: true,
          },
        })
      }
    }
    console.log(`  Created ${s.date} — ${s.label} (${s.exercises.reduce((a, e) => a + e.sets.length, 0)} sets)`)
  }

  console.log('\nDone! Sebastian now has sessions on:')
  console.log('  Jul 23, 25, 27, 28, 29, 30, Aug 1, 2, 3, 4')
  console.log('  Week Jul 27-Aug 2: 5 sessions (Jul 27, 28, 29, 30, Aug 1, 2)')
  console.log('  Streak: ~12 days (Jul 23 to Aug 4, with gaps)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
