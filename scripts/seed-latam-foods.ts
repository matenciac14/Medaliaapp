/**
 * Script idempotente: agrega alimentos LatAm al catálogo de Medaliq.
 * Uso: npx ts-node --project tsconfig.scripts.json scripts/seed-latam-foods.ts
 * O:   pnpm tsx scripts/seed-latam-foods.ts
 *
 * Fuentes: USDA FoodData Central, ICBF Colombia, FAO LatAm tablas de composición.
 * Solo inserta alimentos que no existen por nombre (safe re-run).
 */

import { PrismaClient } from '../src/generated/prisma/client'

const prisma = new PrismaClient()

const LATAM_FOODS = [
  // ── ARGENTINA ──
  { name: 'Milanesa de res (rebozada)', category: 'PROTEIN', kcalPer100g: 250, proteinPer100g: 18.0, carbsPer100g: 18.0, fatPer100g: 10.0, fiberPer100g: 0.8, calciumMg: 40,  ironMg: 2.4, potassiumMg: 290, vitaminCMg: 0,    magnesiumMg: 20,  servingG: 200, servingLabel: '1 milanesa grande',      country: 'AR' },
  { name: 'Milanesa de pollo (rebozada)',category: 'PROTEIN', kcalPer100g: 220, proteinPer100g: 20.0, carbsPer100g: 15.0, fatPer100g: 8.0,  fiberPer100g: 0.7, calciumMg: 30,  ironMg: 1.0, potassiumMg: 260, vitaminCMg: 0,    magnesiumMg: 22,  servingG: 180, servingLabel: '1 milanesa mediana',     country: 'AR' },
  { name: 'Empanada criolla (carne)',    category: 'CARB',    kcalPer100g: 268, proteinPer100g: 9.0,  carbsPer100g: 27.0, fatPer100g: 14.0, fiberPer100g: 1.2, calciumMg: 22,  ironMg: 1.8, potassiumMg: 180, vitaminCMg: 0,    magnesiumMg: 15,  servingG: 90,  servingLabel: '1 empanada',              country: 'AR' },
  { name: 'Empanada de queso',          category: 'CARB',    kcalPer100g: 290, proteinPer100g: 10.0, carbsPer100g: 28.0, fatPer100g: 16.0, fiberPer100g: 1.0, calciumMg: 120, ironMg: 1.0, potassiumMg: 120, vitaminCMg: 0,    magnesiumMg: 12,  servingG: 90,  servingLabel: '1 empanada',              country: 'AR' },
  { name: 'Choripán (chorizo + pan)',    category: 'CARB',    kcalPer100g: 285, proteinPer100g: 11.0, carbsPer100g: 22.0, fatPer100g: 17.0, fiberPer100g: 1.0, calciumMg: 40,  ironMg: 2.0, potassiumMg: 250, vitaminCMg: 1,    magnesiumMg: 18,  servingG: 200, servingLabel: '1 choripán completo',     country: 'AR' },
  { name: 'Dulce de leche',             category: 'FAT',     kcalPer100g: 321, proteinPer100g: 6.6,  carbsPer100g: 54.0, fatPer100g: 8.7,  fiberPer100g: 0,   calciumMg: 200, ironMg: 0.2, potassiumMg: 290, vitaminCMg: 1,    magnesiumMg: 18,  servingG: 30,  servingLabel: '2 cucharadas',            country: 'AR' },
  { name: 'Asado (costillas res)',       category: 'PROTEIN', kcalPer100g: 291, proteinPer100g: 19.0, carbsPer100g: 0.0,  fatPer100g: 23.0, fiberPer100g: 0,   calciumMg: 15,  ironMg: 2.0, potassiumMg: 290, vitaminCMg: 0,    magnesiumMg: 20,  servingG: 250, servingLabel: '1 porción asado',         country: 'AR' },
  { name: 'Facturas / medialunas',       category: 'CARB',    kcalPer100g: 380, proteinPer100g: 7.0,  carbsPer100g: 48.0, fatPer100g: 17.0, fiberPer100g: 1.0, calciumMg: 30,  ironMg: 1.5, potassiumMg: 90,  vitaminCMg: 0,    magnesiumMg: 10,  servingG: 60,  servingLabel: '2 medialunas',            country: 'AR' },
  { name: 'Yerba mate (cebada)',         category: 'OTHER',   kcalPer100g: 3,   proteinPer100g: 0.0,  carbsPer100g: 0.5,  fatPer100g: 0.0,  fiberPer100g: 0,   calciumMg: 5,   ironMg: 0.1, potassiumMg: 30,  vitaminCMg: 0,    magnesiumMg: 3,   servingG: 250, servingLabel: '1 mate (250ml)',          country: 'AR' },

  // ── PERÚ ──
  { name: 'Lomo saltado',               category: 'PROTEIN', kcalPer100g: 190, proteinPer100g: 15.0, carbsPer100g: 13.0, fatPer100g: 9.0,  fiberPer100g: 1.5, calciumMg: 20,  ironMg: 2.5, potassiumMg: 380, vitaminCMg: 12,   magnesiumMg: 24,  servingG: 300, servingLabel: '1 plato (sin arroz)',     country: 'PE' },
  { name: 'Ceviche de pescado',         category: 'PROTEIN', kcalPer100g: 88,  proteinPer100g: 14.0, carbsPer100g: 5.0,  fatPer100g: 1.5,  fiberPer100g: 0.8, calciumMg: 22,  ironMg: 0.8, potassiumMg: 310, vitaminCMg: 18,   magnesiumMg: 30,  servingG: 300, servingLabel: '1 porción mediana',       country: 'PE' },
  { name: 'Aji amarillo (pasta)',        category: 'VEGETABLE', kcalPer100g: 43, proteinPer100g: 1.5, carbsPer100g: 9.0,  fatPer100g: 0.5,  fiberPer100g: 2.0, calciumMg: 14,  ironMg: 0.6, potassiumMg: 340, vitaminCMg: 95,   magnesiumMg: 14,  servingG: 15,  servingLabel: '1 cucharada',             country: 'PE' },
  { name: 'Maca en polvo',              category: 'OTHER',   kcalPer100g: 325, proteinPer100g: 14.0, carbsPer100g: 74.0, fatPer100g: 2.2,  fiberPer100g: 8.5, calciumMg: 450, ironMg: 13.0, potassiumMg: 1600, vitaminCMg: 1.5, magnesiumMg: 70,  servingG: 15,  servingLabel: '1 cucharada (15g)',       country: 'PE' },
  { name: 'Causa limeña (porción)',      category: 'CARB',    kcalPer100g: 148, proteinPer100g: 4.5,  carbsPer100g: 22.0, fatPer100g: 5.0,  fiberPer100g: 1.5, calciumMg: 18,  ironMg: 0.6, potassiumMg: 280, vitaminCMg: 14,   magnesiumMg: 16,  servingG: 200, servingLabel: '1 porción mediana',       country: 'PE' },
  { name: 'Anticuchos de res (corazón)',category: 'PROTEIN', kcalPer100g: 172, proteinPer100g: 21.0, carbsPer100g: 2.0,  fatPer100g: 9.0,  fiberPer100g: 0,   calciumMg: 8,   ironMg: 4.0, potassiumMg: 290, vitaminCMg: 2,    magnesiumMg: 20,  servingG: 150, servingLabel: '3 anticuchos',            country: 'PE' },
  { name: 'Choclo desgranado cocido',   category: 'CARB',    kcalPer100g: 103, proteinPer100g: 3.5,  carbsPer100g: 21.0, fatPer100g: 1.4,  fiberPer100g: 2.5, calciumMg: 5,   ironMg: 0.6, potassiumMg: 250, vitaminCMg: 7,    magnesiumMg: 37,  servingG: 150, servingLabel: '1 taza desgranada',       country: 'PE' },

  // ── VENEZUELA ──
  { name: 'Arepa venezolana (harina PAN)',  category: 'CARB', kcalPer100g: 190, proteinPer100g: 4.0,  carbsPer100g: 40.0, fatPer100g: 2.0,  fiberPer100g: 2.0, calciumMg: 5,   ironMg: 2.5, potassiumMg: 140, vitaminCMg: 0,    magnesiumMg: 24,  servingG: 100, servingLabel: '1 arepa venezolana',     country: 'VE' },
  { name: 'Pabellón criollo (plato)',   category: 'PROTEIN', kcalPer100g: 155, proteinPer100g: 12.0, carbsPer100g: 19.0, fatPer100g: 3.5,  fiberPer100g: 3.5, calciumMg: 28,  ironMg: 2.8, potassiumMg: 380, vitaminCMg: 5,    magnesiumMg: 42,  servingG: 400, servingLabel: '1 plato completo',       country: 'VE' },
  { name: 'Cachapa de budare',          category: 'CARB',    kcalPer100g: 178, proteinPer100g: 4.0,  carbsPer100g: 34.0, fatPer100g: 3.0,  fiberPer100g: 1.5, calciumMg: 10,  ironMg: 0.8, potassiumMg: 200, vitaminCMg: 4,    magnesiumMg: 20,  servingG: 120, servingLabel: '1 cachapa mediana',       country: 'VE' },
  { name: 'Caraotas negras cocidas',    category: 'LEGUME',  kcalPer100g: 132, proteinPer100g: 8.9,  carbsPer100g: 24.0, fatPer100g: 0.5,  fiberPer100g: 8.7, calciumMg: 27,  ironMg: 2.1, potassiumMg: 355, vitaminCMg: 0,    magnesiumMg: 70,  servingG: 180, servingLabel: '1 taza cocida',           country: 'VE' },
  { name: 'Hallaca venezolana',         category: 'CARB',    kcalPer100g: 205, proteinPer100g: 7.0,  carbsPer100g: 26.0, fatPer100g: 8.0,  fiberPer100g: 2.0, calciumMg: 18,  ironMg: 1.5, potassiumMg: 220, vitaminCMg: 2,    magnesiumMg: 18,  servingG: 250, servingLabel: '1 hallaca',               country: 'VE' },
  { name: 'Tequeños (palitos de queso)',category: 'CARB',    kcalPer100g: 355, proteinPer100g: 12.0, carbsPer100g: 33.0, fatPer100g: 19.0, fiberPer100g: 0.5, calciumMg: 170, ironMg: 1.2, potassiumMg: 100, vitaminCMg: 0,    magnesiumMg: 12,  servingG: 120, servingLabel: '4 tequeños',              country: 'VE' },

  // ── CHILE ──
  { name: 'Pastel de choclo',           category: 'CARB',    kcalPer100g: 183, proteinPer100g: 7.0,  carbsPer100g: 24.0, fatPer100g: 6.5,  fiberPer100g: 2.5, calciumMg: 32,  ironMg: 1.5, potassiumMg: 310, vitaminCMg: 8,    magnesiumMg: 22,  servingG: 350, servingLabel: '1 porción mediana',       country: 'CL' },
  { name: 'Sopaipilla frita',           category: 'CARB',    kcalPer100g: 285, proteinPer100g: 4.0,  carbsPer100g: 34.0, fatPer100g: 14.0, fiberPer100g: 1.5, calciumMg: 10,  ironMg: 1.2, potassiumMg: 180, vitaminCMg: 2,    magnesiumMg: 15,  servingG: 80,  servingLabel: '1 sopaipilla grande',     country: 'CL' },
  { name: 'Sopaipilla pasada (almíbar)',category: 'CARB',    kcalPer100g: 310, proteinPer100g: 3.5,  carbsPer100g: 52.0, fatPer100g: 8.5,  fiberPer100g: 1.0, calciumMg: 15,  ironMg: 1.0, potassiumMg: 160, vitaminCMg: 1,    magnesiumMg: 10,  servingG: 120, servingLabel: '2 sopaipillas con almíbar', country: 'CL' },
  { name: 'Completo chileno',           category: 'CARB',    kcalPer100g: 260, proteinPer100g: 9.0,  carbsPer100g: 26.0, fatPer100g: 13.0, fiberPer100g: 1.5, calciumMg: 45,  ironMg: 1.8, potassiumMg: 220, vitaminCMg: 5,    magnesiumMg: 15,  servingG: 220, servingLabel: '1 completo con todo',     country: 'CL' },
  { name: 'Chorrillana (plato)',        category: 'CARB',    kcalPer100g: 220, proteinPer100g: 8.0,  carbsPer100g: 24.0, fatPer100g: 10.0, fiberPer100g: 2.0, calciumMg: 25,  ironMg: 1.5, potassiumMg: 380, vitaminCMg: 12,   magnesiumMg: 20,  servingG: 400, servingLabel: '1 plato individual',      country: 'CL' },
  { name: 'Mote con huesillos',         category: 'CARB',    kcalPer100g: 108, proteinPer100g: 2.5,  carbsPer100g: 24.0, fatPer100g: 0.5,  fiberPer100g: 2.0, calciumMg: 12,  ironMg: 0.8, potassiumMg: 180, vitaminCMg: 2,    magnesiumMg: 18,  servingG: 350, servingLabel: '1 vaso grande',           country: 'CL' },

  // ── COLOMBIA extra (no presentes en seed base) ──
  { name: 'Bandeja paisa (plato completo)', category: 'PROTEIN', kcalPer100g: 175, proteinPer100g: 13.0, carbsPer100g: 16.0, fatPer100g: 6.5, fiberPer100g: 3.5, calciumMg: 50,  ironMg: 3.5, potassiumMg: 450, vitaminCMg: 8,    magnesiumMg: 55,  servingG: 500, servingLabel: '1 bandeja paisa',         country: 'CO' },
  { name: 'Pandebono',                  category: 'CARB',    kcalPer100g: 290, proteinPer100g: 8.0,  carbsPer100g: 38.0, fatPer100g: 11.0, fiberPer100g: 0.5, calciumMg: 120, ironMg: 0.8, potassiumMg: 80,  vitaminCMg: 0,    magnesiumMg: 8,   servingG: 60,  servingLabel: '1 pandebono (60g)',       country: 'CO' },
  { name: 'Ajiaco bogotano (por porción)', category: 'PROTEIN', kcalPer100g: 68, proteinPer100g: 6.0,  carbsPer100g: 8.0,  fatPer100g: 1.5,  fiberPer100g: 1.5, calciumMg: 20,  ironMg: 0.8, potassiumMg: 290, vitaminCMg: 12,   magnesiumMg: 18,  servingG: 400, servingLabel: '1 plato mediano',         country: 'CO' },
  { name: 'Changua (sopa de leche)',    category: 'PROTEIN', kcalPer100g: 52,  proteinPer100g: 3.5,  carbsPer100g: 4.0,  fatPer100g: 2.0,  fiberPer100g: 0,   calciumMg: 100, ironMg: 0.5, potassiumMg: 140, vitaminCMg: 1,    magnesiumMg: 10,  servingG: 300, servingLabel: '1 tazón',                 country: 'CO' },
  { name: 'Mazamorra de maíz',          category: 'CARB',    kcalPer100g: 85,  proteinPer100g: 2.0,  carbsPer100g: 19.0, fatPer100g: 0.5,  fiberPer100g: 1.5, calciumMg: 8,   ironMg: 0.4, potassiumMg: 90,  vitaminCMg: 0,    magnesiumMg: 15,  servingG: 250, servingLabel: '1 taza servida',          country: 'CO' },
  { name: 'Buñuelo colombiano',         category: 'CARB',    kcalPer100g: 310, proteinPer100g: 9.0,  carbsPer100g: 30.0, fatPer100g: 16.0, fiberPer100g: 0.5, calciumMg: 140, ironMg: 0.7, potassiumMg: 70,  vitaminCMg: 0,    magnesiumMg: 10,  servingG: 50,  servingLabel: '1 buñuelo',               country: 'CO' },
  { name: 'Chicharrón de cerdo',        category: 'PROTEIN', kcalPer100g: 544, proteinPer100g: 27.0, carbsPer100g: 0.0,  fatPer100g: 48.0, fiberPer100g: 0,   calciumMg: 14,  ironMg: 1.0, potassiumMg: 290, vitaminCMg: 0,    magnesiumMg: 15,  servingG: 60,  servingLabel: '1 porción pequeña',       country: 'CO' },

  // ── MÉXICO (común en LatAm / turistas) ──
  { name: 'Tortilla de maíz',           category: 'CARB',    kcalPer100g: 218, proteinPer100g: 5.7,  carbsPer100g: 46.0, fatPer100g: 2.5,  fiberPer100g: 4.6, calciumMg: 46,  ironMg: 2.4, potassiumMg: 157, vitaminCMg: 0,    magnesiumMg: 56,  servingG: 60,  servingLabel: '2 tortillas medianas',    country: 'MX' },
  { name: 'Guacamole casero',           category: 'FAT',     kcalPer100g: 150, proteinPer100g: 2.0,  carbsPer100g: 8.5,  fatPer100g: 13.0, fiberPer100g: 5.0, calciumMg: 12,  ironMg: 0.6, potassiumMg: 410, vitaminCMg: 10,   magnesiumMg: 25,  servingG: 80,  servingLabel: '4 cucharadas (80g)',      country: 'MX' },
  { name: 'Frijoles refritos',          category: 'LEGUME',  kcalPer100g: 120, proteinPer100g: 6.5,  carbsPer100g: 16.5, fatPer100g: 2.5,  fiberPer100g: 5.5, calciumMg: 38,  ironMg: 1.8, potassiumMg: 300, vitaminCMg: 0,    magnesiumMg: 38,  servingG: 100, servingLabel: '½ taza',                  country: 'MX' },
  { name: 'Tacos de bistec (2 tacos)', category: 'PROTEIN', kcalPer100g: 210, proteinPer100g: 14.0, carbsPer100g: 18.0, fatPer100g: 8.0,  fiberPer100g: 2.0, calciumMg: 35,  ironMg: 2.0, potassiumMg: 270, vitaminCMg: 5,    magnesiumMg: 22,  servingG: 200, servingLabel: '2 tacos medianos',        country: 'MX' },
] as const

async function main() {
  console.log('Seeding LatAm foods...')

  const names = LATAM_FOODS.map(f => f.name)
  const existing = await prisma.food.findMany({
    where: { name: { in: names } },
    select: { name: true },
  })
  const existingNames = new Set(existing.map(f => f.name))

  const toCreate = LATAM_FOODS.filter(f => !existingNames.has(f.name)).map(f => ({
    ...f,
    source: 'system',
    isActive: true,
    isVerified: true,
  }))

  if (toCreate.length === 0) {
    console.log('  ✓ Todos los alimentos LatAm ya existen — nada que insertar')
    return
  }

  // @ts-expect-error — category type mismatch between const string and enum
  await prisma.food.createMany({ data: toCreate })
  console.log(`  ✓ ${toCreate.length} alimentos LatAm insertados (${existingNames.size} ya existían)`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
