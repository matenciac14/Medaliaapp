export type Competitor = {
  name: string
  url: string
  priceMonthly: string
  priceAnnual?: string
  inSpanish: boolean
  hasAI: boolean
  targetUser: string
  topFeatures: string[]
  weakness: string
  region: 'global' | 'latam' | 'colombia'
}

export const COMPETITORS: Competitor[] = [
  {
    name: 'TrainingPeaks (atleta)',
    url: 'https://www.trainingpeaks.com/athlete-premium/',
    priceMonthly: '$19.95/mes',
    priceAnnual: '$134.99/año (~$11.25/mes)',
    inSpanish: false,
    hasAI: false,
    targetUser: 'atleta élite / triatleta',
    topFeatures: [
      'Análisis avanzado de carga (ATL/CTL/TSB)',
      'Integración con Garmin, Wahoo y más de 80 dispositivos',
      'Zonas de entrenamiento y HR personalizadas',
      'Registro de disponibilidad y preferencias',
      'Alertas de récords personales',
    ],
    weakness: 'Sin AI real, sin español, precio alto para LatAm, orientado a atletas avanzados con dispositivos caros',
    region: 'global',
  },
  {
    name: 'TrainingPeaks (coach)',
    url: 'https://www.trainingpeaks.com/coach-edition/',
    priceMonthly: '$54.99/mes',
    priceAnnual: undefined,
    inSpanish: false,
    hasAI: false,
    targetUser: 'entrenador profesional con múltiples atletas',
    topFeatures: [
      'Gestión de atletas ilimitados (Basic)',
      'Dashboard unificado de rendimiento',
      'Creación y asignación de planes',
      'Métricas de carga por atleta',
      '1 cuenta Premium de atleta incluida',
    ],
    weakness: 'Sin AI, sin español, cara para coaches LatAm, curva de aprendizaje alta',
    region: 'global',
  },
  {
    name: 'Freeletics',
    url: 'https://www.freeletics.com/en/pricing/',
    priceMonthly: '~$11/mes (plan anual)',
    priceAnnual: '~$79-$99/año según plan',
    inSpanish: false,
    hasAI: true,
    targetUser: 'fitness general / HIIT bodyweight',
    topFeatures: [
      'AI Coach que adapta entrenamientos al feedback',
      'Entrenamientos sin equipamiento (bodyweight)',
      'Plan de nutrición + entrenamiento integrado',
      'Progresión semanal estructurada',
      'Comunidad y gamificación',
    ],
    weakness: 'Sin periodización deportiva real, sin integración coach humano, sin deporte específico (carrera, ciclismo), AI limitada a HIIT',
    region: 'global',
  },
  {
    name: 'Strava',
    url: 'https://www.strava.com/subscribe',
    priceMonthly: '$11.99/mes',
    priceAnnual: '$79.99/año (~$6.67/mes)',
    inSpanish: true,
    hasAI: false,
    targetUser: 'corredor / ciclista social',
    topFeatures: [
      'Análisis avanzado de actividades GPS',
      'Fitness & Freshness (carga de entrenamiento)',
      'Segmentos y comparativas contra histórico',
      'Rutas y mapas',
      'Beacon (seguridad en carrera)',
    ],
    weakness: 'Sin planes de entrenamiento, sin coach, sin nutrición, es principalmente una red social deportiva',
    region: 'global',
  },
  {
    name: 'MyFitnessPal',
    url: 'https://www.myfitnesspal.com/premium',
    priceMonthly: '$19.99/mes',
    priceAnnual: '$79.99/año (~$6.67/mes)',
    inSpanish: false,
    hasAI: false,
    targetUser: 'persona en dieta / control calórico',
    topFeatures: [
      'Base de datos de +18 millones de alimentos',
      'Objetivos de macros personalizados por día',
      'Escaneo de código de barras',
      'Registro detallado de comidas y calorías',
      'Plan de comidas 7 días (Premium+)',
    ],
    weakness: 'Solo nutrición, sin planes de entrenamiento deportivo, sin periodización, sin coach, sin AI real',
    region: 'global',
  },
  {
    name: 'Fitpal',
    url: 'https://fitpal.co',
    priceMonthly: '$109.000 COP/mes (~$27 USD)',
    priceAnnual: undefined,
    inSpanish: true,
    hasAI: false,
    targetUser: 'persona casual que quiere acceso a múltiples gimnasios',
    topFeatures: [
      'Acceso a red de +500 gimnasios y estudios en Colombia',
      'Reservas de clases presenciales y virtuales',
      'Entrenadores a domicilio (plan Premium)',
      'Cobertura en 23 ciudades colombianas',
      'Valoración física mensual (plan Premium)',
    ],
    weakness: 'Sin planes personalizados ni AI, es un marketplace de acceso físico, no coaching ni periodización',
    region: 'colombia',
  },
]
