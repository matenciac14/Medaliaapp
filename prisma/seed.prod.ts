/**
 * seed.prod.ts — Seed de PRODUCCIÓN
 *
 * Solo datos esenciales para el producto:
 *   • Admin user
 *   • Librería de ejercicios globales (necesaria para gym feature)
 *   • Rutinas públicas del sistema
 *
 * NO incluye usuarios de prueba (coaches/atletas de desarrollo).
 *
 * Uso: DATABASE_URL=... tsx prisma/seed.prod.ts
 */
import 'dotenv/config'
import { PrismaClient, UserRole, EquipmentType, ExerciseCategory } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  console.log('🌱 Seeding producción...')

  // ── Admin ────────────────────────────────────────────────────────────────────
  // IMPORTANTE: cambiar la contraseña después del primer login.
  await prisma.user.upsert({
    where: { email: 'admin@medaliq.com' },
    update: { role: UserRole.ADMIN },
    create: {
      email: 'admin@medaliq.com',
      name: 'Admin Medaliq',
      password: await bcrypt.hash('admin123!', 12),
      role: UserRole.ADMIN,
      onboardingCompleted: true,
    },
  })
  console.log('✅ Admin:         admin@medaliq.com')

  // ── Ejercicios globales ──────────────────────────────────────────────────────
  const globalExercises: Array<{
    id: string; name: string; muscleGroups: string[]; equipment: EquipmentType; category: ExerciseCategory
  }> = [
    { id: 'global-exercise-sentadilla-frontal',         name: 'Sentadilla frontal',              muscleGroups: ['QUADRICEPS', 'GLUTES'],                  equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-sentadilla-sumo',            name: 'Sentadilla sumo',                 muscleGroups: ['QUADRICEPS', 'GLUTES', 'HAMSTRINGS'],     equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-prensa',                     name: 'Prensa',                          muscleGroups: ['QUADRICEPS', 'GLUTES'],                   equipment: EquipmentType.MACHINE,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-extension-rodillas',         name: 'Extensión de rodillas',           muscleGroups: ['QUADRICEPS'],                             equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-avanzadas',                  name: 'Avanzadas (Lunges)',               muscleGroups: ['QUADRICEPS', 'GLUTES'],                   equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-sentadilla-hack',            name: 'Sentadilla hack',                 muscleGroups: ['QUADRICEPS'],                             equipment: EquipmentType.MACHINE,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-flexion-rodillas-acostado',  name: 'Flexión de rodillas acostado',    muscleGroups: ['HAMSTRINGS'],                             equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-flexion-rodillas-sentado',   name: 'Flexión de rodillas sentado',     muscleGroups: ['HAMSTRINGS'],                             equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-peso-muerto',                name: 'Peso muerto',                     muscleGroups: ['HAMSTRINGS', 'GLUTES', 'BACK'],           equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-hip-thrust',                 name: 'Hip Thrust',                      muscleGroups: ['GLUTES', 'HAMSTRINGS'],                   equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-patada-gluteos-maquina',     name: 'Patada de glúteos en máquina',    muscleGroups: ['GLUTES'],                                 equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-abduccion-maquina',          name: 'Abducción en máquina',            muscleGroups: ['GLUTES'],                                 equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-aduccion-maquina',           name: 'Aducción en máquina',             muscleGroups: ['GLUTES'],                                 equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-press-plano-barra',          name: 'Press plano con barra',           muscleGroups: ['CHEST'],                                  equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-press-inclinado-barra',      name: 'Press inclinado con barra',       muscleGroups: ['CHEST'],                                  equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-press-declinado-mancuernas', name: 'Press declinado con mancuernas',  muscleGroups: ['CHEST'],                                  equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-cruces-polea-alta',          name: 'Cruces en polea alta',            muscleGroups: ['CHEST'],                                  equipment: EquipmentType.CABLE,      category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-remo-barra',                 name: 'Remo con barra',                  muscleGroups: ['BACK'],                                   equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-remo-mancuernas',            name: 'Remo con mancuernas',             muscleGroups: ['BACK'],                                   equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-jalon-polea-alta',           name: 'Jalón polea alta',                muscleGroups: ['BACK'],                                   equipment: EquipmentType.CABLE,      category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-dominadas',                  name: 'Dominadas',                       muscleGroups: ['BACK'],                                   equipment: EquipmentType.BODYWEIGHT, category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-press-militar-barra',        name: 'Press militar con barra',         muscleGroups: ['SHOULDERS'],                              equipment: EquipmentType.BARBELL,    category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-press-arnold',               name: 'Press Arnold',                    muscleGroups: ['SHOULDERS'],                              equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.COMPOUND },
    { id: 'global-exercise-elevacion-lateral',          name: 'Elevación lateral',               muscleGroups: ['SHOULDERS'],                              equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-elevacion-frontal',          name: 'Elevación frontal',               muscleGroups: ['SHOULDERS'],                              equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-pajaros',                    name: 'Pájaros (Reverse Fly)',            muscleGroups: ['SHOULDERS'],                              equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-flexion-barra-z',            name: 'Flexión de codo con barra Z',     muscleGroups: ['BICEPS'],                                 equipment: EquipmentType.BARBELL,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-martillo-mancuernas',        name: 'Martillo con mancuernas',         muscleGroups: ['BICEPS'],                                 equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-concentrado-mancuernas',     name: 'Concentrado con mancuernas',      muscleGroups: ['BICEPS'],                                 equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-predicador',                 name: 'Predicador',                      muscleGroups: ['BICEPS'],                                 equipment: EquipmentType.BARBELL,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-press-frances',              name: 'Press francés',                   muscleGroups: ['TRICEPS'],                                equipment: EquipmentType.BARBELL,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-push-down',                  name: 'Push down en polea',              muscleGroups: ['TRICEPS'],                                equipment: EquipmentType.CABLE,      category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-extension-codo',             name: 'Extensión de codo',               muscleGroups: ['TRICEPS'],                                equipment: EquipmentType.CABLE,      category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-patada-triceps',             name: 'Patada de tríceps',               muscleGroups: ['TRICEPS'],                                equipment: EquipmentType.DUMBBELL,   category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-extension-triceps-polea',    name: 'Extensión de tríceps en polea',   muscleGroups: ['TRICEPS'],                                equipment: EquipmentType.CABLE,      category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-elevacion-talones-maquina',  name: 'Elevación de talones en máquina', muscleGroups: ['CALVES'],                                 equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-extension-plantar-prensa',   name: 'Extensión plantar en prensa',     muscleGroups: ['CALVES'],                                 equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-elevacion-talones-sentado',  name: 'Elevación de talones sentado',    muscleGroups: ['CALVES'],                                 equipment: EquipmentType.MACHINE,    category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-elevacion-piernas-colgado',  name: 'Elevación de piernas colgado',    muscleGroups: ['ABS'],                                   equipment: EquipmentType.BODYWEIGHT, category: ExerciseCategory.ISOLATION },
    { id: 'global-exercise-abs-roller',                 name: 'Abs roller',                      muscleGroups: ['ABS'],                                   equipment: EquipmentType.OTHER,      category: ExerciseCategory.ISOLATION },
  ]

  for (const ex of globalExercises) {
    await prisma.exercise.upsert({
      where: { id: ex.id },
      update: { name: ex.name, muscleGroups: ex.muscleGroups, equipment: ex.equipment, category: ex.category },
      create: { id: ex.id, coachId: null, name: ex.name, muscleGroups: ex.muscleGroups, equipment: ex.equipment, category: ex.category, isGlobal: true },
    })
  }
  console.log(`✅ Ejercicios:    ${globalExercises.length} globales`)

  // ── Rutinas públicas del sistema ─────────────────────────────────────────────
  type PublicTemplate = {
    id: string; name: string; description: string; goal: string; level: string
    daysPerWeek: number; category: string
    days: Array<{
      dayOfWeek: number; label: string; muscleGroups: string[]; isRestDay: boolean
      exercises?: Array<{ exerciseId: string; order: number; sets: number; repsScheme: string; restSeconds: number }>
    }>
  }

  const publicTemplates: PublicTemplate[] = [
    {
      id: 'public-template-ppl-3x',
      name: 'Push Pull Legs — 3 días',
      description: 'Divide los músculos en empuje, jalón y piernas. Ideal para ganar músculo con 3 días/semana.',
      goal: 'HYPERTROPHY', level: 'INTERMEDIATE', daysPerWeek: 3, category: 'PPL',
      days: [
        { dayOfWeek: 1, label: 'Lunes — Push (Pecho, Hombros, Tríceps)', muscleGroups: ['CHEST', 'SHOULDERS', 'TRICEPS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-press-plano-barra',       order: 1, sets: 4, repsScheme: '8-10',  restSeconds: 120 },
          { exerciseId: 'global-exercise-press-inclinado-barra',   order: 2, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-press-arnold',            order: 3, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-elevacion-lateral',       order: 4, sets: 3, repsScheme: '12-15', restSeconds: 60 },
          { exerciseId: 'global-exercise-extension-triceps-polea', order: 5, sets: 3, repsScheme: '12-15', restSeconds: 60 },
        ]},
        { dayOfWeek: 3, label: 'Miércoles — Pull (Espalda, Bíceps)', muscleGroups: ['BACK', 'BICEPS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-dominadas',         order: 1, sets: 4, repsScheme: '6-8',   restSeconds: 120 },
          { exerciseId: 'global-exercise-remo-barra',        order: 2, sets: 4, repsScheme: '8-10',  restSeconds: 120 },
          { exerciseId: 'global-exercise-jalon-polea-alta',  order: 3, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-flexion-barra-z',   order: 4, sets: 3, repsScheme: '10-12', restSeconds: 60 },
          { exerciseId: 'global-exercise-remo-mancuernas',   order: 5, sets: 3, repsScheme: '12',    restSeconds: 60 },
        ]},
        { dayOfWeek: 5, label: 'Viernes — Legs (Cuádriceps, Isquios, Glúteos)', muscleGroups: ['QUADRICEPS', 'HAMSTRINGS', 'GLUTES'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-frontal', order: 1, sets: 4, repsScheme: '8-10',  restSeconds: 180 },
          { exerciseId: 'global-exercise-prensa',             order: 2, sets: 3, repsScheme: '10-12', restSeconds: 120 },
          { exerciseId: 'global-exercise-peso-muerto',        order: 3, sets: 3, repsScheme: '8-10',  restSeconds: 180 },
          { exerciseId: 'global-exercise-extension-rodillas', order: 4, sets: 3, repsScheme: '12-15', restSeconds: 60 },
          { exerciseId: 'global-exercise-hip-thrust',         order: 5, sets: 3, repsScheme: '12-15', restSeconds: 90 },
        ]},
        { dayOfWeek: 2, label: 'Martes — Descanso',  muscleGroups: [], isRestDay: true },
        { dayOfWeek: 4, label: 'Jueves — Descanso',  muscleGroups: [], isRestDay: true },
        { dayOfWeek: 6, label: 'Sábado — Descanso',  muscleGroups: [], isRestDay: true },
        { dayOfWeek: 7, label: 'Domingo — Descanso', muscleGroups: [], isRestDay: true },
      ],
    },
    {
      id: 'public-template-fullbody-3x',
      name: 'Full Body — 3 días',
      description: 'Trabaja todo el cuerpo en cada sesión. Perfecto para principiantes o quienes buscan eficiencia.',
      goal: 'HYPERTROPHY', level: 'BEGINNER', daysPerWeek: 3, category: 'FULL_BODY',
      days: [
        { dayOfWeek: 1, label: 'Lunes — Full Body A', muscleGroups: ['CHEST', 'BACK', 'QUADRICEPS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-frontal',  order: 1, sets: 3, repsScheme: '10-12', restSeconds: 120 },
          { exerciseId: 'global-exercise-press-plano-barra',   order: 2, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-remo-barra',          order: 3, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-press-arnold',        order: 4, sets: 3, repsScheme: '10-12', restSeconds: 60 },
          { exerciseId: 'global-exercise-hip-thrust',          order: 5, sets: 3, repsScheme: '12-15', restSeconds: 60 },
        ]},
        { dayOfWeek: 3, label: 'Miércoles — Full Body B', muscleGroups: ['CHEST', 'BACK', 'HAMSTRINGS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-peso-muerto',             order: 1, sets: 3, repsScheme: '8-10',  restSeconds: 180 },
          { exerciseId: 'global-exercise-press-inclinado-barra',   order: 2, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-jalon-polea-alta',        order: 3, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-elevacion-lateral',       order: 4, sets: 3, repsScheme: '12-15', restSeconds: 60 },
          { exerciseId: 'global-exercise-avanzadas',               order: 5, sets: 3, repsScheme: '12 c/lado', restSeconds: 60 },
        ]},
        { dayOfWeek: 5, label: 'Viernes — Full Body C', muscleGroups: ['QUADRICEPS', 'CHEST', 'BACK'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-prensa',                      order: 1, sets: 4, repsScheme: '12-15', restSeconds: 120 },
          { exerciseId: 'global-exercise-press-declinado-mancuernas',  order: 2, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-remo-mancuernas',             order: 3, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-press-militar-barra',         order: 4, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-flexion-rodillas-acostado',   order: 5, sets: 3, repsScheme: '12-15', restSeconds: 60 },
        ]},
        { dayOfWeek: 2, label: 'Martes — Descanso',  muscleGroups: [], isRestDay: true },
        { dayOfWeek: 4, label: 'Jueves — Descanso',  muscleGroups: [], isRestDay: true },
        { dayOfWeek: 6, label: 'Sábado — Descanso',  muscleGroups: [], isRestDay: true },
        { dayOfWeek: 7, label: 'Domingo — Descanso', muscleGroups: [], isRestDay: true },
      ],
    },
    {
      id: 'public-template-upper-lower-4x',
      name: 'Upper / Lower — 4 días',
      description: 'Alterna tren superior e inferior. Mayor frecuencia por músculo con 4 sesiones semanales.',
      goal: 'HYPERTROPHY', level: 'INTERMEDIATE', daysPerWeek: 4, category: 'UPPER_LOWER',
      days: [
        { dayOfWeek: 1, label: 'Lunes — Upper (fuerza)', muscleGroups: ['CHEST', 'BACK', 'SHOULDERS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-press-plano-barra',     order: 1, sets: 4, repsScheme: '5-6',   restSeconds: 180 },
          { exerciseId: 'global-exercise-remo-barra',            order: 2, sets: 4, repsScheme: '5-6',   restSeconds: 180 },
          { exerciseId: 'global-exercise-press-inclinado-barra', order: 3, sets: 3, repsScheme: '8-10',  restSeconds: 120 },
          { exerciseId: 'global-exercise-dominadas',             order: 4, sets: 3, repsScheme: '6-8',   restSeconds: 120 },
          { exerciseId: 'global-exercise-press-militar-barra',   order: 5, sets: 3, repsScheme: '8-10',  restSeconds: 90 },
        ]},
        { dayOfWeek: 2, label: 'Martes — Lower (fuerza)', muscleGroups: ['QUADRICEPS', 'HAMSTRINGS', 'GLUTES'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-frontal',        order: 1, sets: 4, repsScheme: '5-6',   restSeconds: 180 },
          { exerciseId: 'global-exercise-peso-muerto',               order: 2, sets: 4, repsScheme: '5-6',   restSeconds: 180 },
          { exerciseId: 'global-exercise-prensa',                    order: 3, sets: 3, repsScheme: '10-12', restSeconds: 120 },
          { exerciseId: 'global-exercise-hip-thrust',                order: 4, sets: 3, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-flexion-rodillas-acostado', order: 5, sets: 3, repsScheme: '12-15', restSeconds: 60 },
        ]},
        { dayOfWeek: 4, label: 'Jueves — Upper (volumen)', muscleGroups: ['CHEST', 'BACK', 'BICEPS', 'TRICEPS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-press-inclinado-barra',  order: 1, sets: 4, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-jalon-polea-alta',       order: 2, sets: 4, repsScheme: '10-12', restSeconds: 90 },
          { exerciseId: 'global-exercise-press-arnold',           order: 3, sets: 3, repsScheme: '10-12', restSeconds: 60 },
          { exerciseId: 'global-exercise-flexion-barra-z',        order: 4, sets: 3, repsScheme: '10-12', restSeconds: 60 },
          { exerciseId: 'global-exercise-extension-triceps-polea', order: 5, sets: 3, repsScheme: '12-15', restSeconds: 60 },
        ]},
        { dayOfWeek: 5, label: 'Viernes — Lower (volumen)', muscleGroups: ['QUADRICEPS', 'GLUTES'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-hack',   order: 1, sets: 4, repsScheme: '10-12',     restSeconds: 120 },
          { exerciseId: 'global-exercise-avanzadas',         order: 2, sets: 3, repsScheme: '12 c/lado', restSeconds: 90 },
          { exerciseId: 'global-exercise-extension-rodillas', order: 3, sets: 3, repsScheme: '12-15',    restSeconds: 60 },
          { exerciseId: 'global-exercise-hip-thrust',        order: 4, sets: 3, repsScheme: '12-15',     restSeconds: 90 },
          { exerciseId: 'global-exercise-abduccion-maquina', order: 5, sets: 3, repsScheme: '15-20',     restSeconds: 60 },
        ]},
        { dayOfWeek: 3, label: 'Miércoles — Descanso', muscleGroups: [], isRestDay: true },
        { dayOfWeek: 6, label: 'Sábado — Descanso',    muscleGroups: [], isRestDay: true },
        { dayOfWeek: 7, label: 'Domingo — Descanso',   muscleGroups: [], isRestDay: true },
      ],
    },
    {
      id: 'public-template-fuerza-5x5',
      name: 'Fuerza 5×5',
      description: 'Protocolo clásico para ganar fuerza máxima. 3 días, 5 series de 5 repeticiones en los grandes movimientos.',
      goal: 'STRENGTH', level: 'INTERMEDIATE', daysPerWeek: 3, category: 'STRENGTH',
      days: [
        { dayOfWeek: 1, label: 'Lunes — Día A', muscleGroups: ['CHEST', 'BACK', 'QUADRICEPS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-frontal', order: 1, sets: 5, repsScheme: '5', restSeconds: 180 },
          { exerciseId: 'global-exercise-press-plano-barra',  order: 2, sets: 5, repsScheme: '5', restSeconds: 180 },
          { exerciseId: 'global-exercise-remo-barra',         order: 3, sets: 5, repsScheme: '5', restSeconds: 180 },
        ]},
        { dayOfWeek: 3, label: 'Miércoles — Día B', muscleGroups: ['BACK', 'SHOULDERS', 'HAMSTRINGS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-frontal', order: 1, sets: 5, repsScheme: '5', restSeconds: 180 },
          { exerciseId: 'global-exercise-press-militar-barra', order: 2, sets: 5, repsScheme: '5', restSeconds: 180 },
          { exerciseId: 'global-exercise-peso-muerto',        order: 3, sets: 1, repsScheme: '5', restSeconds: 300 },
        ]},
        { dayOfWeek: 5, label: 'Viernes — Día A (repetir)', muscleGroups: ['CHEST', 'BACK', 'QUADRICEPS'], isRestDay: false, exercises: [
          { exerciseId: 'global-exercise-sentadilla-frontal', order: 1, sets: 5, repsScheme: '5', restSeconds: 180 },
          { exerciseId: 'global-exercise-press-plano-barra',  order: 2, sets: 5, repsScheme: '5', restSeconds: 180 },
          { exerciseId: 'global-exercise-remo-barra',         order: 3, sets: 5, repsScheme: '5', restSeconds: 180 },
        ]},
        { dayOfWeek: 2, label: 'Martes — Descanso',  muscleGroups: [], isRestDay: true },
        { dayOfWeek: 4, label: 'Jueves — Descanso',  muscleGroups: [], isRestDay: true },
        { dayOfWeek: 6, label: 'Sábado — Descanso',  muscleGroups: [], isRestDay: true },
        { dayOfWeek: 7, label: 'Domingo — Descanso', muscleGroups: [], isRestDay: true },
      ],
    },
  ]

  for (const tmpl of publicTemplates) {
    await prisma.workoutTemplate.upsert({
      where: { id: tmpl.id },
      update: {},
      create: { id: tmpl.id, name: tmpl.name, description: tmpl.description, goal: tmpl.goal, level: tmpl.level, daysPerWeek: tmpl.daysPerWeek, isPublic: true, category: tmpl.category },
    })
    for (const day of tmpl.days) {
      const dayId = `${tmpl.id}-day-${day.dayOfWeek}`
      await prisma.workoutDay.upsert({
        where: { id: dayId },
        update: {},
        create: { id: dayId, templateId: tmpl.id, dayOfWeek: day.dayOfWeek, label: day.label, muscleGroups: day.muscleGroups, isRestDay: day.isRestDay, order: day.dayOfWeek },
      })
      if (!day.isRestDay && day.exercises) {
        for (const ex of day.exercises) {
          const exId = `${dayId}-ex-${ex.exerciseId}`
          await prisma.workoutExercise.upsert({
            where: { id: exId },
            update: {},
            create: { id: exId, dayId, exerciseId: ex.exerciseId, order: ex.order, sets: ex.sets, repsScheme: ex.repsScheme, restSeconds: ex.restSeconds },
          })
        }
      }
    }
  }
  console.log(`✅ Rutinas:       ${publicTemplates.length} públicas del sistema`)
  console.log('\n🎉 Seed prod completado.')
  console.log('⚠️  Cambiar contraseña de admin@medaliq.com después del primer login.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
