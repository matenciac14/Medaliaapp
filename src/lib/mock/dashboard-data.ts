export const mockUser = {
  id: 'demo-user',
  name: 'Miguel Atencia',
  role: 'ATHLETE',
  // Feature flags — se reemplazarán por datos reales de DB
  hasPlan: true,
  hasNutrition: true,
  hasCheckIns: true,
}

export const mockPlan = {
  id: 'plan-demo',
  name: 'Media Maratón — Objetivo 1:45',
  totalWeeks: 18,
  currentWeek: 1,
  startDate: '2026-05-01',
  endDate: '2026-09-06',
  phase: 'BASE',
  hrZones: {
    z1: { min: 114, max: 133 },
    z2: { min: 133, max: 152 },
    z3: { min: 152, max: 162 },
    z4: { min: 162, max: 171 },
    z5: { min: 171, max: 190 },
  }
}

export const mockTodaySession = {
  type: 'RODAJE_Z2',
  durationMin: 45,
  zoneTarget: 'Z2',
  detailText: '45 min en Z2 (133-152 bpm). Ritmo cómodo, puedes hablar en frases.',
  phase: 'BASE',
  completed: false,
}

export const mockWeekSessions = [
  { day: 'Lun', type: 'DESCANSO', label: 'Descanso activo', done: false },
  { day: 'Mar', type: 'RODAJE_Z2', label: '45 min Z2', done: false },
  { day: 'Mié', type: 'FARTLEK', label: 'Fartlek 8×1min', done: false },
  { day: 'Jue', type: 'CICLA', label: 'Cicla 60 min Z2', done: false },
  { day: 'Vie', type: 'FUERZA', label: 'Rodaje + fuerza', done: false },
  { day: 'Sáb', type: 'NATACION', label: 'Natación técnica', done: false },
  { day: 'Dom', type: 'TIRADA_LARGA', label: 'Tirada 8 km Z2', done: false },
]

export const mockMetrics = {
  weightKg: 100,
  weightGoalKg: 88,
  hrResting: 56,
  sleepScore: 74,
  weeklyKm: 0,
  adherencePct: 0,
}

export const mockBenchmarks = [
  { label: 'Test 5km', week: 4, status: 'PROXIMO' as const },
  { label: 'Test 10km', week: 8, status: 'PROXIMO' as const },
  { label: 'Simulacro 16km', week: 14, status: 'PROXIMO' as const },
]

export const mockCoach = null // null = sin coach asignado

// 18 semanas completas para el calendario
export const mockWeeks = Array.from({ length: 18 }, (_, i) => ({
  weekNumber: i + 1,
  phase: i < 4 ? 'BASE' : i < 10 ? 'DESARROLLO' : i < 15 ? 'ESPECÍFICO' : 'AFINAMIENTO',
  volumeKm: [25, 28, 32, 22, 38, 42, 46, 28, 48, 52, 50, 54, 56, 42, 52, 40, 28, 18][i],
  isRecoveryWeek: [3, 7, 13].includes(i),
  hasTest: [3, 7, 13].includes(i),
  focusDescription: ['Adaptación inicial. Todo en Z2.', 'Progresión de volumen.', 'Carga máxima de la fase.', 'Descarga y test 5km.'][Math.min(i % 4, 3)],
  sessions: mockWeekSessions,
}))
