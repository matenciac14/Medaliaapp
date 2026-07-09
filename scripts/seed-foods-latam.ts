/**
 * NUT-02 — Seed alimentos Colombia + México
 * Ejecutar: pnpm tsx scripts/seed-foods-latam.ts
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)

const foods = [
  // ── COLOMBIA — Panadería ──────────────────────────────────────────────
  { name: 'Pandebono', category: 'OTHER',    country: 'CO', kcal: 340, protein: 8.0,  carbs: 38.0, fat: 16.0, servingG: 60,  servingLabel: '1 unidad' },
  { name: 'Almojábana', category: 'OTHER',   country: 'CO', kcal: 310, protein: 9.0,  carbs: 35.0, fat: 14.0, servingG: 70,  servingLabel: '1 unidad' },
  { name: 'Buñuelo',    category: 'OTHER',   country: 'CO', kcal: 290, protein: 7.0,  carbs: 32.0, fat: 13.0, servingG: 65,  servingLabel: '1 unidad' },
  { name: 'Arepa de maíz (blanca)', category: 'CARB', country: 'CO', kcal: 160, protein: 3.5, carbs: 31.0, fat: 2.0, servingG: 80, servingLabel: '1 arepa mediana' },
  { name: 'Arepa de chócolo', category: 'CARB', country: 'CO', kcal: 180, protein: 4.0, carbs: 33.0, fat: 3.5, servingG: 90, servingLabel: '1 arepa' },
  { name: 'Pan de yuca', category: 'CARB',   country: 'CO', kcal: 320, protein: 6.0,  carbs: 42.0, fat: 12.0, servingG: 60,  servingLabel: '1 unidad' },

  // ── COLOMBIA — Platos principales ────────────────────────────────────
  { name: 'Bandeja paisa (porción)', category: 'PROTEIN', country: 'CO', kcal: 780, protein: 45.0, carbs: 65.0, fat: 32.0, servingG: 500, servingLabel: '1 porción' },
  { name: 'Ajiaco bogotano', category: 'CARB', country: 'CO', kcal: 210, protein: 18.0, carbs: 25.0, fat: 4.5, servingG: 400, servingLabel: '1 plato hondo' },
  { name: 'Sancocho de pollo', category: 'PROTEIN', country: 'CO', kcal: 240, protein: 22.0, carbs: 20.0, fat: 6.0, servingG: 400, servingLabel: '1 plato hondo' },
  { name: 'Tamal tolimense', category: 'CARB', country: 'CO', kcal: 420, protein: 22.0, carbs: 40.0, fat: 18.0, servingG: 250, servingLabel: '1 tamal' },
  { name: 'Frijoles antioqueños', category: 'LEGUME', country: 'CO', kcal: 150, protein: 9.0, carbs: 22.0, fat: 2.5, servingG: 200, servingLabel: '1 taza cocida' },
  { name: 'Arroz blanco (cocido)', category: 'CARB', country: 'CO', kcal: 130, protein: 2.5, carbs: 28.0, fat: 0.5, servingG: 150, servingLabel: '1 taza' },
  { name: 'Chicharrón (cerdo frito)', category: 'FAT', country: 'CO', kcal: 540, protein: 30.0, carbs: 1.0, fat: 46.0, servingG: 100, servingLabel: '100g' },
  { name: 'Empanada de pipián', category: 'CARB', country: 'CO', kcal: 220, protein: 5.0, carbs: 28.0, fat: 9.0, servingG: 80, servingLabel: '1 unidad' },

  // ── COLOMBIA — Frutas exóticas ────────────────────────────────────────
  { name: 'Lulo', category: 'FRUIT', country: 'CO', kcal: 47, protein: 0.7, carbs: 10.0, fat: 0.3, servingG: 100, servingLabel: '100g' },
  { name: 'Curuba', category: 'FRUIT', country: 'CO', kcal: 38, protein: 0.5, carbs: 8.5, fat: 0.1, servingG: 100, servingLabel: '100g' },
  { name: 'Uchuva', category: 'FRUIT', country: 'CO', kcal: 53, protein: 1.9, carbs: 11.0, fat: 0.7, servingG: 100, servingLabel: '100g' },
  { name: 'Feijoa', category: 'FRUIT', country: 'CO', kcal: 55, protein: 1.2, carbs: 12.0, fat: 0.8, servingG: 100, servingLabel: '100g' },
  { name: 'Maracuyá', category: 'FRUIT', country: 'CO', kcal: 97, protein: 2.2, carbs: 23.0, fat: 0.7, servingG: 100, servingLabel: '100g' },
  { name: 'Guanábana', category: 'FRUIT', country: 'CO', kcal: 66, protein: 1.0, carbs: 16.8, fat: 0.3, servingG: 150, servingLabel: '1 porción' },
  { name: 'Pitahaya amarilla', category: 'FRUIT', country: 'CO', kcal: 50, protein: 0.4, carbs: 13.0, fat: 0.1, servingG: 100, servingLabel: '100g' },
  { name: 'Tomate de árbol', category: 'FRUIT', country: 'CO', kcal: 31, protein: 1.5, carbs: 7.0, fat: 0.2, servingG: 100, servingLabel: '100g' },

  // ── COLOMBIA — Proteínas ──────────────────────────────────────────────
  { name: 'Carne de res (bistec a la plancha)', category: 'PROTEIN', country: 'CO', kcal: 215, protein: 26.0, carbs: 0.0, fat: 12.0, servingG: 120, servingLabel: '1 bistec' },
  { name: 'Pollo desmechado', category: 'PROTEIN', country: 'CO', kcal: 185, protein: 28.0, carbs: 1.0, fat: 6.5, servingG: 130, servingLabel: '130g' },
  { name: 'Chorizo colombiano', category: 'PROTEIN', country: 'CO', kcal: 310, protein: 13.0, carbs: 2.0, fat: 27.0, servingG: 80, servingLabel: '1 unidad' },
  { name: 'Hogao (sofrito criollo)', category: 'OTHER', country: 'CO', kcal: 65, protein: 1.0, carbs: 7.0, fat: 3.5, servingG: 60, servingLabel: '2 cucharadas' },

  // ── MÉXICO — Base ─────────────────────────────────────────────────────
  { name: 'Tortilla de maíz', category: 'CARB', country: 'MX', kcal: 104, protein: 2.5, carbs: 21.0, fat: 1.5, servingG: 45, servingLabel: '2 tortillas' },
  { name: 'Masa para tamales (cruda)', category: 'CARB', country: 'MX', kcal: 180, protein: 3.0, carbs: 30.0, fat: 6.5, servingG: 100, servingLabel: '100g' },
  { name: 'Tortilla de harina (grande)', category: 'CARB', country: 'MX', kcal: 230, protein: 6.0, carbs: 38.0, fat: 6.0, servingG: 80, servingLabel: '1 tortilla' },
  { name: 'Frijoles negros (cocidos)', category: 'LEGUME', country: 'MX', kcal: 132, protein: 8.9, carbs: 24.0, fat: 0.5, servingG: 180, servingLabel: '1 taza' },
  { name: 'Frijoles pinto (cocidos)', category: 'LEGUME', country: 'MX', kcal: 143, protein: 9.0, carbs: 27.0, fat: 0.6, servingG: 180, servingLabel: '1 taza' },
  { name: 'Arroz rojo (cocido)', category: 'CARB', country: 'MX', kcal: 145, protein: 2.8, carbs: 30.0, fat: 1.8, servingG: 160, servingLabel: '1 taza' },

  // ── MÉXICO — Platos principales ───────────────────────────────────────
  { name: 'Quesadilla con queso', category: 'OTHER', country: 'MX', kcal: 340, protein: 14.0, carbs: 35.0, fat: 16.0, servingG: 150, servingLabel: '1 quesadilla' },
  { name: 'Tacos de pollo (2 piezas)', category: 'PROTEIN', country: 'MX', kcal: 280, protein: 20.0, carbs: 28.0, fat: 9.0, servingG: 180, servingLabel: '2 tacos' },
  { name: 'Tacos al pastor (2 piezas)', category: 'PROTEIN', country: 'MX', kcal: 310, protein: 18.0, carbs: 28.0, fat: 12.0, servingG: 180, servingLabel: '2 tacos' },
  { name: 'Pozole rojo (bowl)', category: 'CARB', country: 'MX', kcal: 310, protein: 22.0, carbs: 32.0, fat: 9.0, servingG: 400, servingLabel: '1 bowl' },
  { name: 'Enchiladas verdes', category: 'CARB', country: 'MX', kcal: 380, protein: 16.0, carbs: 42.0, fat: 16.0, servingG: 250, servingLabel: '3 enchiladas' },
  { name: 'Tamales de rajas con queso', category: 'CARB', country: 'MX', kcal: 290, protein: 8.0, carbs: 35.0, fat: 13.0, servingG: 170, servingLabel: '1 tamal' },
  { name: 'Sopa de lima yucateca', category: 'PROTEIN', country: 'MX', kcal: 190, protein: 15.0, carbs: 18.0, fat: 5.0, servingG: 350, servingLabel: '1 tazón' },
  { name: 'Caldo de pollo mexicano', category: 'PROTEIN', country: 'MX', kcal: 140, protein: 14.0, carbs: 10.0, fat: 4.0, servingG: 350, servingLabel: '1 tazón' },
  { name: 'Chiles rellenos', category: 'PROTEIN', country: 'MX', kcal: 290, protein: 16.0, carbs: 18.0, fat: 17.0, servingG: 200, servingLabel: '1 chile' },
  { name: 'Guacamole', category: 'FAT', country: 'MX', kcal: 160, protein: 2.0, carbs: 9.0, fat: 15.0, servingG: 100, servingLabel: '2 cucharadas grandes' },

  // ── MÉXICO — Frutas ───────────────────────────────────────────────────
  { name: 'Mamey sapote', category: 'FRUIT', country: 'MX', kcal: 124, protein: 1.5, carbs: 32.0, fat: 0.4, servingG: 175, servingLabel: '1 porción' },
  { name: 'Zapote negro', category: 'FRUIT', country: 'MX', kcal: 78, protein: 0.6, carbs: 20.0, fat: 0.1, servingG: 100, servingLabel: '100g' },
  { name: 'Nopal (cocido)', category: 'VEGETABLE', country: 'MX', kcal: 22, protein: 1.5, carbs: 4.0, fat: 0.1, servingG: 100, servingLabel: '100g' },
  { name: 'Jícama', category: 'VEGETABLE', country: 'MX', kcal: 38, protein: 0.7, carbs: 9.0, fat: 0.1, servingG: 100, servingLabel: '100g' },
  { name: 'Tamarindo (pulpa)', category: 'FRUIT', country: 'MX', kcal: 239, protein: 2.8, carbs: 63.0, fat: 0.6, servingG: 50, servingLabel: '50g pulpa' },
  { name: 'Tuna (fruta de nopal)', category: 'FRUIT', country: 'MX', kcal: 50, protein: 0.7, carbs: 13.0, fat: 0.1, servingG: 100, servingLabel: '1 tuna' },

  // ── REGIONAL COMPARTIDO CO+MX ────────────────────────────────────────
  { name: 'Plátano maduro (frito)', category: 'CARB', country: null, kcal: 210, protein: 1.2, carbs: 32.0, fat: 8.5, servingG: 80, servingLabel: '2 tajadas' },
  { name: 'Yuca cocida', category: 'CARB', country: null, kcal: 160, protein: 1.4, carbs: 38.0, fat: 0.3, servingG: 150, servingLabel: '1 porción' },
  { name: 'Aguacate', category: 'FAT', country: null, kcal: 160, protein: 2.0, carbs: 9.0, fat: 15.0, servingG: 100, servingLabel: '½ aguacate' },
  { name: 'Mango (Tommy)', category: 'FRUIT', country: null, kcal: 60, protein: 0.8, carbs: 15.0, fat: 0.4, servingG: 150, servingLabel: '1 porción' },
  { name: 'Guayaba roja', category: 'FRUIT', country: null, kcal: 68, protein: 2.6, carbs: 14.0, fat: 1.0, servingG: 100, servingLabel: '100g' },
  { name: 'Papaya (lechosa)', category: 'FRUIT', country: null, kcal: 43, protein: 0.5, carbs: 11.0, fat: 0.3, servingG: 200, servingLabel: '1 porción' },
  { name: 'Piña fresca', category: 'FRUIT', country: null, kcal: 50, protein: 0.5, carbs: 13.0, fat: 0.1, servingG: 150, servingLabel: '1 porción' },
]

async function main() {
  console.log(`Seeding ${foods.length} LatAm foods...`)

  let created = 0
  let skipped = 0

  for (const f of foods) {
    const existing = await prisma.food.findFirst({
      where: { name: f.name, isActive: true },
      select: { id: true },
    })
    if (existing) { skipped++; continue }

    await prisma.food.create({
      data: {
        name: f.name,
        category: f.category,
        country: f.country ?? undefined,
        kcalPer100g: (f.kcal / f.servingG) * 100,
        proteinPer100g: (f.protein / f.servingG) * 100,
        carbsPer100g: (f.carbs / f.servingG) * 100,
        fatPer100g: (f.fat / f.servingG) * 100,
        servingG: f.servingG,
        servingLabel: f.servingLabel,
        isActive: true,
        isVerified: true,
        source: 'system',
      },
    })
    created++
  }

  console.log(`Done: ${created} created, ${skipped} skipped (ya existían).`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
