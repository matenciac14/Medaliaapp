export const mockNutritionPlan = {
  tdee: 2900,
  targetKcalHard: 2500,
  targetKcalEasy: 2300,
  targetKcalRest: 2100,
  proteinG: 200,
  carbsHardG: 290,
  carbsEasyG: 170,
  fatG: 75,
}

// Detectar tipo de día según el calendario (mock)
export const todaySessionType = 'RODAJE_Z2' // día fácil

export const mockMeals = {
  hard: [
    { time: '6:30 am', label: 'Pre-entreno', foods: '60g avena + 1 plátano + 1 cda miel + 3 claras + 1 huevo + café', kcal: 480, protein: 22, carbs: 75, fat: 10 },
    { time: 'Post-entreno', label: 'Recuperación', foods: 'Yogur griego 250g + 30g avena + frutos rojos + 1 scoop whey', kcal: 420, protein: 45, carbs: 40, fat: 8 },
    { time: '12:30 pm', label: 'Almuerzo', foods: '200g pollo a la plancha + 1 taza arroz + ensalada + 1 cda aceite', kcal: 680, protein: 52, carbs: 80, fat: 18 },
    { time: '3:30 pm', label: 'Merienda', foods: '30g almendras + 1 manzana + 1 huevo duro', kcal: 380, protein: 14, carbs: 25, fat: 25 },
    { time: '5:30 pm', label: 'Cena', foods: '180g carne magra + brócoli + espárragos + ½ aguacate', kcal: 540, protein: 50, carbs: 18, fat: 28 },
  ],
  easy: [
    { time: '7:00 am', label: 'Desayuno', foods: '4 huevos + 2 claras + 50g avena + canela + café', kcal: 480, protein: 42, carbs: 40, fat: 18 },
    { time: '12:30 pm', label: 'Almuerzo', foods: '180g carne magra + ½ taza arroz + ensalada + 1 cda aceite', kcal: 580, protein: 45, carbs: 50, fat: 20 },
    { time: '3:30 pm', label: 'Merienda', foods: '1 scoop whey + 1 fruta + 20g nueces', kcal: 340, protein: 28, carbs: 25, fat: 16 },
    { time: '5:30 pm', label: 'Cena', foods: '180g salmón + vegetales asados + ¼ aguacate + 1 cda aceite', kcal: 520, protein: 42, carbs: 15, fat: 30 },
  ],
  rest: [
    { time: '8:00 am', label: 'Desayuno', foods: '3 huevos + 40g avena + canela + café', kcal: 380, protein: 30, carbs: 35, fat: 14 },
    { time: '1:00 pm', label: 'Almuerzo', foods: '150g pollo a la plancha + ensalada grande + 1 cda aceite', kcal: 420, protein: 38, carbs: 15, fat: 20 },
    { time: '4:00 pm', label: 'Merienda', foods: '20g almendras + 1 fruta pequeña', kcal: 220, protein: 6, carbs: 20, fat: 14 },
    { time: '5:30 pm', label: 'Cena', foods: '160g pescado blanco + vegetales al vapor + ½ aguacate', kcal: 420, protein: 38, carbs: 12, fat: 22 },
  ],
}

export const mockSupplements = [
  { name: 'Whey isolate', dose: '1-2 scoops', when: 'Post-entreno', purpose: 'Alcanzar 200g proteína' },
  { name: 'Creatina monohidratada', dose: '5g/día', when: 'Con cualquier comida', purpose: 'Fuerza y recuperación' },
  { name: 'Omega 3 (EPA+DHA)', dose: '2g/día', when: 'Con la cena', purpose: 'Antiinflamatorio' },
  { name: 'Vitamina D3', dose: '2000 UI', when: 'Con desayuno', purpose: 'Compensar altitud' },
  { name: 'Electrolitos', dose: '1 sobre', when: 'Sesiones >60 min', purpose: 'Evitar calambres' },
]

export const mockProgressData = [
  { week: 1, weightKg: 100, hrResting: 56, sleepScore: 74, adherencePct: 0, kmRun: 0, energyLevel: 7 },
  { week: 2, weightKg: 99.2, hrResting: 55, sleepScore: 76, adherencePct: 72, kmRun: 25, energyLevel: 8 },
  { week: 3, weightKg: 98.5, hrResting: 57, sleepScore: 71, adherencePct: 65, kmRun: 28, energyLevel: 6 },
  { week: 4, weightKg: 97.8, hrResting: 54, sleepScore: 78, adherencePct: 88, kmRun: 22, energyLevel: 8 },
  { week: 5, weightKg: 97.1, hrResting: 54, sleepScore: 80, adherencePct: 90, kmRun: 38, energyLevel: 9 },
]
