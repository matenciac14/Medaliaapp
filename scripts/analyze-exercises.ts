import 'dotenv/config'
import { prisma } from '../src/lib/db/prisma'

async function main() {
  // 1. Ejercicios sin GIF — sus nombres
  const noGif = await prisma.exercise.findMany({
    where: { coachId: null, gifStoredUrl: null, gifUrl: null },
    select: { id: true, name: true, nameEs: true, source: true },
    orderBy: { name: 'asc' },
  })

  // 2. ¿Cuántos ejercicios AscendAPI tienen gifStoredUrl mal formado?
  const badStored = await prisma.exercise.findMany({
    where: {
      coachId: null,
      source: 'ascendapi',
      gifStoredUrl: { not: null },
      NOT: { gifStoredUrl: { startsWith: 'https://static.exercisedb.dev' } },
    },
    select: { id: true, gifStoredUrl: true },
    take: 5,
  })

  // 3. ¿Hay solapamiento de nombres entre manuales y AscendAPI?
  const manualNames = noGif.map(e => (e.nameEs ?? e.name).toLowerCase().trim())
  const ascendExercises = await prisma.exercise.findMany({
    where: { coachId: null, source: 'ascendapi' },
    select: { id: true, name: true },
  })
  const overlaps = ascendExercises.filter(a => manualNames.includes(a.name.toLowerCase().trim()))

  console.log(`\n=== Ejercicios sin GIF (${noGif.length}) ===`)
  noGif.slice(0, 15).forEach(e => console.log(`  [${e.source}] ${e.id} | en: ${e.name} | es: ${e.nameEs ?? '-'}`))

  console.log(`\n=== gifStoredUrl fuera de exercisedb.dev: ${badStored.length} ===`)
  badStored.forEach(e => console.log(`  ${e.id}: ${e.gifStoredUrl}`))

  console.log(`\n=== Solapamientos nombre manual ↔ AscendAPI: ${overlaps.length} ===`)
  overlaps.slice(0, 10).forEach(e => console.log(`  ${e.id}: ${e.name}`))

  // 4. Muestra de gifStoredUrl de AscendAPI
  const sample = await prisma.exercise.findMany({
    where: { source: 'ascendapi' },
    select: { id: true, name: true, gifStoredUrl: true },
    take: 5,
  })
  console.log(`\n=== Muestra gifStoredUrl AscendAPI ===`)
  sample.forEach(e => console.log(`  ${e.id}: ${e.gifStoredUrl}`))

  await prisma.$disconnect()
}
main()
