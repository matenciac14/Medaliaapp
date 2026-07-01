// Fuente canónica del roadmap — editar aquí para registrar bugs, features y estados
// Al terminar una tarea: marcar done: true y actualizar la note
// Al resolver un bug en la fase `bugs`: marcarlo done: true (desaparece de la UI automáticamente)

export interface RoadmapItem {
  title: string
  done: boolean
  note: string
  priority?: 'P0' | 'P1' | 'P2' | 'P3'
}

export interface RoadmapSubPhase {
  id: string
  label: string
  period: string
  items: RoadmapItem[]
}

export interface RoadmapGroup {
  id: string
  label: string
  color: string
  bgColor: string
  borderColor: string
  // Grupo simple — sin sub-fases
  period?: string
  items?: RoadmapItem[]
  // Grupo con sub-fases internas
  phases?: RoadmapSubPhase[]
  // true = solo muestra items done: false (lista viva — bugs)
  liveList?: boolean
}

export function getAllItems(group: RoadmapGroup): RoadmapItem[] {
  if (group.items) return group.items
  return group.phases?.flatMap((p) => p.items) ?? []
}

export const GROUPS: RoadmapGroup[] = [

  // ─── AUTH & ONBOARDING ───────────────────────────────────────────────────────

  {
    id: 'auth',
    label: 'Auth & Onboarding',
    period: 'Completado',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    items: [
      { title: 'Auth completa: login, registro, JWT — email + Google OAuth placeholder', done: true, note: 'Auth.js v5 estrategia JWT. Payload: id, role, onboardingCompleted, activated, isB2B, userPlan, features, needsRoleSelection.' },
      { title: 'Verificación de email al registrarse (token 24h, Resend)', done: true, note: 'Endpoint /api/auth/verify-email. Email enviado via Resend al registrar.' },
      { title: 'Forgot password web (flujo completo: forgot-password + set-password)', done: true, note: 'Email de reset con link temporal. Verificado en producción.' },
      { title: 'Rate limiting brute-force en login web + mobile (10 intentos/min por cuenta)', done: true, note: 'rateLimitAsync con Upstash Redis.' },
      { title: 'Google OAuth: needsRoleSelection → /select-role → columnas DB por rol', done: true, note: 'POST /api/auth/set-role setea columnas individuales COACH/ATHLETE. session.update() recarga JWT.' },
      { title: 'Onboarding wizard: objetivo salud → ¿deporte? → físico → condición → generando', done: true, note: '5 pasos sin deporte, 7 con deporte. Flujos: RUNNING, STRENGTH, GYM B2C, FREE. Sin day-schedule forzado.' },
      { title: 'Feature flags como columnas Boolean en User (sin JSON blob)', done: true, note: 'featurePlan|featureCheckin|featureNutrition|featureProgress|featureLog|featureCoach|featureGym. Sin User.config JSON.' },
      { title: 'Beta cerrada — acceso bloqueado hasta activación manual del admin', done: true, note: 'JWT campo activated. Middleware → /pending. Polling automático 10s.' },
      { title: 'COACH solo se crea desde admin — /register hardcodea role=ATHLETE', done: true, note: 'Sin selector de rol COACH en /register público.' },
      { title: 'Flujo email-first en /coach/clients/new (check → link → create unificado)', done: true, note: 'GET /api/coach/clients/check. POST /api/coach/clients/link. Un solo punto de entrada.' },
      { title: 'tempPassword eliminada del JSON — link de reset firmado (JWT 1h)', done: true, note: '/api/coach/clients/create y /api/coach/athlete/[id]/reset-password. Contraseña nunca en texto plano.' },
      { title: 'Validación Zod en todos los endpoints de auth', done: true, note: 'emailSchema, passwordSchema, nameSchema, roleSchema + parseBody(). Register, forgot-password, set-password, set-role, mobile/auth/login.' },
    ],
  },

  // ─── INFRAESTRUCTURA ─────────────────────────────────────────────────────────

  {
    id: 'infra',
    label: 'Infraestructura, Deploy & Performance',
    period: 'Completado',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    items: [
      { title: 'PostgreSQL en Neon (serverless) — migraciones aplicadas + seed con atletas y planes de ejemplo', done: true, note: '39 ejercicios globales. Atletas con planes, check-ins históricos y sesiones.' },
      { title: 'Deploy en Vercel + dominio medaliq.com (DNS en Route53)', done: true, note: 'Auto-deploy en cada push a main. A record + CNAME cname.vercel-dns.com.' },
      { title: 'Prisma 7 con PrismaPg adapter + pool max: 10', done: true, note: 'DATABASE_URL → pooler Neon. DIRECT_URL → migraciones. Output: src/generated/prisma.' },
      { title: 'vercel.json: maxDuration 60s en rutas de generación de plan', done: true, note: 'Sin esto Vercel corta planes de 18 semanas a los 10s. Rutas: /api/onboarding/generate, /api/plan/new, /api/coach/athlete/[id]/plan.' },
      { title: 'Rate limiting global (rateLimitAsync + Upstash Redis) en web + mobile', done: true, note: 'Web: register, onboarding/generate, ai/chat, nutrition/scan. Mobile: 11 endpoints — GET 300/min, POST 100/min por usuario.' },
      { title: 'Generator: 36 awaits secuenciales → 2 batches paralelos (Promise.all)', done: true, note: 'De 15-30s a 2-4s. Sin riesgo de timeout en Vercel para planes de 18 semanas.' },
      { title: 'Dashboard: consolidar queries (4 round-trips → 2 en Promise.all)', done: true, note: 'findFirst(COMPLETED) y findUnique(weeklyCheckIn) dentro del Promise.all inicial.' },
      { title: 'Check-in: 3 fases — reads → evaluación pura → $transaction atómica', done: true, note: 'processCheckIn use case. Check-in + ajuste sesiones + sync peso en una transacción. Rollback completo si falla.' },
      { title: 'Índices DB: WeeklyCheckIn(userId), PlannedSession(weekId), PlanWeek(planId)', done: true, note: 'De O(n) a O(log n). Constraints únicos: TrainingPlan(userId, ACTIVE), GymSession(athleteId, date, workoutId), FoodLog(userId, foodId, date, mealType).' },
      { title: 'Cache SystemConfig con unstable_cache TTL 1h', done: true, note: '3 queries eliminadas por request en check-in y dashboard.' },
      { title: 'Middleware fix: atletas FREE no redirigen a /pending en loop', done: true, note: '!activated && userPlan === "INACTIVE" — solo B2B sin activar van a /pending.' },
      { title: 'Helpers centralizados: responses.ts, feature-gate.ts, week-number.ts, calendar.ts', done: true, note: 'ok/badRequest/unauthorized/notFound. requireFeature(). getISOWeekNumber(). jsToOurDow(). Fuentes canónicas únicas.' },
      { title: 'Arquitectura hexagonal: domain/ports/infrastructure separados', done: true, note: 'domain/check-in, domain/plan, domain/onboarding + ports. infrastructure/db repositories. domain no importa Prisma ni Next.js.' },
      { title: 'Localización: User.timezone + User.locale detectados y persistidos', done: true, note: 'Web: PATCH /api/me. Mobile: PATCH /api/mobile/auth/me con expo-localization. Usado en dashboard, plan, check-in, gym.' },
      { title: 'Scope Running + Strength: CICLA/NATACION eliminados de templates y selectores UI', done: true, note: 'Schema DB intacto para compatibilidad histórica. intensity.ts conserva CICLA/NATACION → MODERATE.' },
      { title: 'Error pages personalizadas (404, 500) con diseño Medaliq', done: true, note: 'src/app/not-found.tsx + error.tsx.' },
    ],
  },

  // ─── ATLETA ──────────────────────────────────────────────────────────────────

  {
    id: 'atleta',
    label: 'Atleta',
    color: '#7c3aed',
    bgColor: '#faf5ff',
    borderColor: '#ddd6fe',
    phases: [
      {
        id: 'atleta-core',
        label: 'Core — Plan, Check-in, Nutrición, Gym & Progreso',
        period: 'Completado',
        items: [
          { title: 'Generador de plan determinista (4 templates: 5K, 10K, HM, Recomposición)', done: true, note: 'Sin AI. 100% determinista. generator.ts + templates.ts.' },
          { title: 'Calendario de plan (18 semanas, fases BASE→DESARROLLO→ESPECÍFICO→AFINAMIENTO)', done: true, note: 'Vista semanal en /plan.' },
          { title: 'SessionIntensity enum (HIGH|MODERATE|LOW|REST) + getDailyNutritionTarget()', done: true, note: 'HIGH→targetKcalHard, MODERATE→easy, LOW→easy×0.88, REST→targetKcalRest. Fuente canónica: daily-target.ts.' },
          { title: 'Registro de sesión (log): RPE, FC, distancia, notas', done: true, note: 'POST /api/log/session. SessionLog con plannedSessionId.' },
          { title: 'Check-in semanal + motor de alertas deterministas', done: true, note: 'evaluateRules() puro. Triggers: fc_alta, sueno_bajo, rpe_excesivo, dolor_activo, estres_alto, motivacion_baja, energia_baja, perdida_peso_rap.' },
          { title: 'applyPlanAdjustments: omite sesiones con edición manual del coach', done: true, note: 'Sesiones con coachNotes sin "[AUTO]" se saltan. Nunca sobrescribe ediciones intencionales.' },
          { title: 'FC baseline dinámica en check-in (vs hrResting propio del atleta)', done: true, note: 'fcBaseline = hrRestingBaseline ?? 62. Comparación contra datos propios.' },
          { title: 'Plan nutricional (TDEE Mifflin-St Jeor + macros + buildStaticMealPlan)', done: true, note: 'buildStaticMealPlan() determinista. parseMealPlanData() valida antes de NutritionContent.' },
          { title: 'Dashboard: card "Hoy" con sesión + kcal + macros del día', done: true, note: '"Día duro — 2.850 kcal — Carbos: 340g".' },
          { title: 'Quick log desde dashboard (1 clic para registrar sesión de hoy)', done: true, note: 'QuickLog.tsx. POST /api/log/session. router.refresh() al completar.' },
          { title: 'Streak de días activos (badge si >= 2 días consecutivos)', done: true, note: 'Calculado en dashboard/page.tsx.' },
          { title: 'Adherencia en dashboard: % últimas 4 semanas (badge verde/amber/rojo)', done: true, note: 'Cero queries adicionales — usa activePlan.weeks ya cargadas.' },
          { title: 'Gym tracker: sets/pesos, timer descanso, referencia sesión anterior, supersets', done: true, note: 'Web + mobile. Supersets: border-l coloreado + badge pill.' },
          { title: 'isPR detection (SetLog.isPR) al completar set', done: true, note: 'Comparación vs máximo histórico. Celebration banner web. Icono trofeo mobile.' },
          { title: 'Progresión de cargas persistida (suggestedNextWeightKg en WorkoutExercise)', done: true, note: 'max(weightKg)+2.5 al completar todos los sets objetivo.' },
        ],
      },
      {
        id: 'atleta-ux',
        label: 'UX — Dashboard, Perfil, Métricas & PWA',
        period: 'En construcción',
        items: [
          { title: 'Dashboard: 7 días Lun-Dom siempre visibles, hoy resaltado', done: true, note: 'Sin importar qué días tenga sesiones el plan.' },
          { title: 'Check-in badge "Pendiente" solo si no se ha hecho esta semana', done: true, note: 'Verifica weekNumber actual en DB.' },
          { title: '/profile atleta: ver y editar datos de salud', done: true, note: 'Peso, talla, FC, lesiones, condiciones. IMC y hrMax calculados automáticamente.' },
          { title: 'Formulario de métricas diarias en /profile (peso, FC, sueño, energía, notas)', done: true, note: 'Historial 14 días. Upsert por userId+date.' },
          { title: 'Gráficas SVG en /progress: peso, FC reposo, adherencia, km, bienestar', done: true, note: 'LineChart, HorizontalKmChart, AdherenceVerticalChart, WellbeingChart. Sin dependencias externas.' },
          { title: 'Export PDF del plan semanal', done: true, note: 'GET /api/plan/week-print?week=N → HTML + print CSS + auto-print. Sin react-pdf ni puppeteer.' },
          { title: 'PWA: manifest.json, service worker, meta tags iOS, banner instalación', done: true, note: 'Cache-first assets. Offline fallback. BeforeInstallPrompt Android + instrucciones iOS.' },
          { title: 'Internacionalización ES / EN con selector de banderas', done: true, note: 'Cookie-based, server + client. LanguageSwitcher en navbar y sidebars.' },
          { title: 'Páginas de ayuda por perfil (/help, /coach/help, /admin/help)', done: true, note: 'FAQ por sección, flujos de uso.' },
          { title: 'Resumen de semana determinista en dashboard (sin IA)', done: false, note: '"Esta semana: 4 sesiones. Completaste 2. Hoy: Rodaje Z2." Construido desde datos ya cargados en dashboard/page.tsx.' },
          { title: 'Récords personales visibles en /progress', done: false, note: 'Gym: 1RM máximo por ejercicio (max weightKg en SetLog). Running: best pace. Tabla estática.' },
          { title: 'Offline support para gym session tracker (IndexedDB)', done: false, note: 'Guardar sets localmente y sincronizar al reconectar. Feature más crítica para mobile.' },
          { title: 'Responsive audit completo en móvil real (iPhone SE, iPhone 14, Samsung Galaxy)', done: false, note: 'Fix de padding/overflow por pantalla.' },
        ],
      },
      {
        id: 'atleta-nutricion',
        label: 'Nutrición — Tracking Real & Porciones',
        period: 'En construcción',
        items: [
          { title: 'FoodLog: POST + GET /api/nutrition/log (web + mobile)', done: true, note: 'Totales y % vs target. intensityToDayType() mapea intensity→dayType. calcMacros() por gramos.' },
          { title: 'FoodSetupFlow: usa IDs de Foods de DB (sin nombres libres hardcodeados)', done: true, note: 'buildFoodCategories(allFoods) agrupa por food.category desde DB.' },
          { title: 'FoodLogTracker mobile: 4 barras de progreso + LogFoodModal', done: true, note: 'Búsqueda en librería, quick-picks gramaje (50/100/150/200g), preview macros en tiempo real.' },
          { title: 'Ajuste nutricional por intensidad real: notificación + aceptar/rechazar', done: false, priority: 'P1', note: 'Al completar sesión con intensidad diferente a la planeada: calcular delta nutricional (kcal+carbos) → notificar atleta → acepta: ajusta NutritionLog del día / rechaza: mantiene plan base. El ajuste es solo para el día actual — no propaga hacia días futuros. Check-in semanal resume desvíos acumulados para el entrenador/nutricionista.' },
          { title: 'Validar MealPlan JSON con Zod antes de renderizar en NutritionContent', done: false, note: 'nutrition/page.tsx pasa mealPlan.data as any. Schema Zod para { hard, easy, rest }. Fallback: empty state con CTA a regenerar.' },
          { title: 'Estandarizar REST carbs: NutritionContent debe usar getDailyNutritionTarget()', done: false, note: 'NutritionContent.tsx recalcula carbs REST localmente. Importar daily-target.ts — una sola fuente de verdad.' },
          { title: 'getDayType a lib compartida — eliminar duplicado web vs mobile', done: false, note: 'Crear src/lib/nutrition/day-type.ts. Hoy hay dos implementaciones con lógicas distintas.' },
          { title: 'buildStaticMealPlan: porciones en gramos reales usando Foods de DB', done: false, note: 'Resultado: "Pechuga de pollo — 150g (220 kcal, 34g prot)".' },
          { title: 'UI: mostrar gramos y macros por porción en NutritionContent', done: false, note: '"150g · 220 kcal · 34g prot". Backward-compatible con planes legacy sin porciones.' },
        ],
      },
      {
        id: 'atleta-avanzado',
        label: 'Tracking Avanzado & Tracker Libre',
        period: 'Próximo',
        items: [
          { title: 'Medidas corporales en check-in (cintura, brazos, caderas, piernas)', done: false, note: 'Migración DB: waistCm, armsCm, hipsCm, thighsCm Float? en WeeklyCheckIn. UI web: sección colapsable. Mobile: mismos campos.' },
          { title: 'Gráficas de circunferencias en /progress (web + mobile)', done: false, note: 'El atleta ve la recomposición corporal aunque el peso no baje.' },
          { title: 'Fotos de progreso semanales (Vercel Blob)', done: false, note: 'Modelo ProgressPhoto { userId, url, takenAt }. POST /api/progress/photos (multipart). Comparador side-by-side en /progress.' },
          { title: 'Log libre sin plan — sessionId opcional en /api/log/session y /api/mobile/log/session', done: true, note: 'Implementado: /api/mobile/log/session maneja !sessionId → freeSessionType. /api/log/run con plannedSessionId: null. /api/log/session con plannedSessionId opcional.' },
          { title: 'UI mobile: pantalla de log libre sin sessionId (selector tipo + RPE + duración + notas)', done: true, note: 'log.tsx soporta isFreeMode (cuando !sessionId): selector de 3 tipos (Correr/Fuerza/Otro), RPE, duración, distancia, FC, notas. Accesible desde dashboard.' },
          { title: 'Gym tracker libre sin AssignedWorkout ni TrainingPlan', done: false, note: 'Modo libre: selector de ejercicios desde DB global. GymSession sin assignedWorkoutId. Aparece en historial.' },
          { title: 'Dashboard sin plan: mostrar logs reales de la semana (web + mobile)', done: false, note: 'Si no hay TrainingPlan activo: últimos 7 SessionLogs. Datos ya disponibles en el endpoint.' },
          { title: 'Historial unificado: plan + libre juntos en /progress cronológico', done: false, note: 'SessionLogs con y sin plannedSessionId mezclados por completedAt desc.' },
        ],
      },
    ],
  },

  // ─── COACH ───────────────────────────────────────────────────────────────────

  {
    id: 'coach',
    label: 'Coach',
    color: '#1e3a5f',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    phases: [
      {
        id: 'coach-core',
        label: 'Core — Panel, Atletas, Mensajería & Finanzas',
        period: 'Completado',
        items: [
          { title: 'Dashboard coach: KPIs de negocio (ingresos, atletas activos, adherencia, distribución deporte)', done: true, note: '/coach/dashboard = métricas CEO. /coach/athletes = lista operacional.' },
          { title: 'Panel atleta: tabs Resumen, Plan, Progreso, Nutrición, Gym, Benchmarks (datos reales de DB)', done: true, note: 'Promise.all: HealthProfile, TrainingPlan+weeks+sessions, CheckIns×8, NutritionPlan. Verificación coach-atleta.' },
          { title: 'Coach activa features del atleta (PATCH /api/coach/athlete/[id]/config)', done: true, note: 'features: { plan, checkin, nutrition, progress, log, gym } = true. Atleta siempre empieza con features=false.' },
          { title: 'Feed de alertas en dashboard (sin check-in >7d, RPE ≥8, pérdida peso >750g/semana)', done: true, note: 'Lista con link directo al atleta.' },
          { title: 'Editor de sesión inline en Tab Plan (tipo, duración, zona, descripción)', done: true, note: 'API PATCH /api/coach/sessions/[id]. intensity recalculada al cambiar el tipo.' },
          { title: 'Log de ajustes automáticos en Tab Resumen (semana, fecha, triggers aplicados)', done: true, note: 'Columna RPE y Ajustes en tabla check-ins.' },
          { title: 'Tab Plan coach: carga semanal (HIGH=3, MODERATE=2, LOW=1, REST=0)', done: true, note: 'Badge "Carga: X pts" por semana. Alerta roja si incremento >20% vs semana anterior.' },
          { title: 'Tab Nutrición coach: editor de targets por fase del plan', done: true, note: 'PHASE_KCAL_DELTA: BASE -200, DESARROLLO 0, ESPECIFICO +100, AFINAMIENTO -100.' },
          { title: 'CoachAthlete.status ACTIVE/PAUSED — tab Pausados + toggle optimista', done: true, note: 'API PATCH /api/coach/athlete/[id]/status.' },
          { title: 'Mensajería asíncrona coach ↔ atleta (web + mobile)', done: true, note: 'Modelo Message. 4 endpoints web + 4 mobile. Badge unread sidebar. Polling 5s chat, 30s lista.' },
          { title: 'Finanzas: Payment model + CRUD + /coach/finanzas + badge mora', done: true, note: 'GET auto-marca OVERDUE. PaymentAuditLog trail (CREATED|MARKED_PAID|REMINDED). Badge mora en panel atletas.' },
          { title: 'Notificación al coach cuando atleta completa onboarding B2B', done: true, note: 'sendAthleteReadyEmail + sendPushNotification. Fire-and-forget.' },
          { title: 'applyPlanAdjustments: omite sesiones con edición manual del coach', done: true, note: 'Sesiones con coachNotes sin "[AUTO]" se saltan.' },
          { title: 'Off-by-one fecha sesión corregido — dayOfWeek - 1 en sessions y copy-prev', done: true, note: 'dayOfWeek=1 (lunes) + startDate(lunes) = lunes correctamente.' },
          { title: 'CoachAthlete.coachGoal + privateNotes: meta visible del atleta + notas privadas en Tab Resumen', done: true, note: 'Campos String? en schema CoachAthlete (db push). PATCH /api/coach/athlete/[id]/config acepta coachGoal y privateNotes junto a features. UI en AthleteDetailClient Tab Resumen: card "Seguimiento del coach" con inputs y botón guardar.' },
          { title: 'Adherencia de atletas calculada correctamente: sessions filtradas por date <= now (no incluye futuras)', done: true, note: 'Fix en athletes/page.tsx query + athletes/_lib/map-athlete.ts usa getPlanWeekNumber() canónico + clampea a totalWeeks. También corregido en /api/mobile/progress.' },
          { title: 'Lista operacional /coach/athletes separada del dashboard — paginación, filtros, SPORT_LABELS ampliados', done: true, note: 'SPORT_LABELS cubre RUNNING|STRENGTH|CYCLING|SWIMMING|TRIATHLON|FOOTBALL en AthleteTabs.tsx y dashboard/page.tsx. Label de alerta unificado: "Carga alta" (antes "RPE alta").' },
        ],
      },
      {
        id: 'coach-gym',
        label: 'Gym — Rutinas, Asignación & WorkoutDays de Sistema',
        period: 'En construcción',
        items: [
          { title: 'Schema DB: Exercise, WorkoutTemplate, WorkoutDay, AssignedWorkout, GymSession, SetLog', done: true, note: 'Migración aplicada. 39 ejercicios globales en seed.' },
          { title: 'Biblioteca de ejercicios del coach (filtros por músculo y equipo)', done: true, note: 'Global + personalizados por coach.' },
          { title: 'Constructor de rutinas wizard 4 pasos (Info → Días → Ejercicios → Revisar)', done: true, note: 'Creación + edición. /coach/gym/routines/[id] wizard pre-cargado desde DB.' },
          { title: 'Asignación de rutina a atleta (un atleta = una rutina activa)', done: true, note: 'Desactiva la anterior automáticamente. Con fecha inicio, duración y notas.' },
          { title: 'Coach ve logs y progresión del atleta en Tab Gym', done: true, note: 'Gráfica de peso por ejercicio + detalle última sesión.' },
          { title: 'WorkoutTemplate de sistema (coachId: null) — plantillas globales sin dueño', done: false, note: 'coachId String? ya nullable. Verificar constraint DB. Distinguir por coachId=null.' },
          { title: 'Seed: WorkoutTemplate "Fuerza corredor" con 2 WorkoutDays (BASE y ESPECÍFICO)', done: false, note: '(1) BASE: sentadillas, lunges, hip thrust, core 3×12. (2) ESPECÍFICO: saltos, elevaciones, isométricos.' },
          { title: 'generate-plan.use-case.ts: vincular sesiones FUERZA al WorkoutDay de sistema según fase', done: false, note: 'Para cada sesión type=FUERZA → PlannedSession.workoutDayId = workoutDay.id correspondiente.' },
          { title: 'Gym tracker: cargar ejercicios del WorkoutDay cuando hay workoutDayId', done: false, note: '/api/gym/session/today: incluir exercises del WorkoutDay vinculado. Tracker muestra ejercicios reales.' },
        ],
      },
      {
        id: 'coach-planes',
        label: 'Constructor Visual de Planes',
        period: 'En construcción',
        items: [
          { title: 'API: POST /api/coach/athlete/[id]/plan/custom', done: true, note: 'Crea TrainingPlan+PlanWeeks en $transaction. Verifica ownership coach-atleta.' },
          { title: 'API: PATCH + DELETE /api/coach/sessions/[id]', done: true, note: 'Edita o elimina sesión. Campos: durationMin, type, zoneTarget, detailText, coachNote.' },
          { title: 'API: POST /api/coach/plan/[planId]/sessions', done: true, note: 'Agregar sesión a una semana de plan existente.' },
          { title: 'API: PATCH /api/coach/plan/[planId]/week/[weekId]', done: true, note: 'Editar metadata: phase, focusDescription, isRecoveryWeek, volumeKm.' },
          { title: 'Página /coach/athlete/[id]/plan/build (full-screen, overlay fixed inset-0 z-50)', done: true, note: 'Cubre el sidebar sin cambiar el layout.' },
          { title: 'WeekGrid, SessionCard, SessionModal — constructor visual completo', done: true, note: '7 columnas Lun-Dom. Type badge + intensity + duración. Form add/edit con quick-pick durationMin.' },
          { title: 'WeekNav: mini-overview horizontal de todas las semanas', done: true, note: 'Punto de color por fase. Gris si vacío, ámbar si recovery. Tooltip fase + sesiones.' },
          { title: '"Copiar semana anterior" para acelerar construcción', done: true, note: 'API copy-prev/route.ts + botón en PlanBuilderClient.tsx. Confirma antes de reemplazar.' },
          { title: 'PlannedSession.structure: bloques zone|duration|description en editor inline y vista Tab Plan', done: true, note: 'Campo String? en schema (db push). PATCH /api/coach/sessions/[sessionId]/edit acepta structure (trim, null si vacío). Editor: textarea con hint "zona|duración|descripción". Vista: bloques por \\n, parsea zona|duración|descripción con colores (azul zona, gris duración, texto descripción).' },
          { title: '"Generar desde template → abrir en constructor" — precarga y edita', done: false, note: 'Coach selecciona template → constructor se abre con sesiones precargadas para personalizar.' },
          { title: 'PlannedSession.sportLabel String? — migración pendiente', done: false, note: 'Etiqueta libre por deporte ("Sweet Spot 2×20min", "CSS 400m × 8"). Crear migración ALTER TABLE.' },
        ],
      },
      {
        id: 'coach-avanzado',
        label: 'Benchmarks & Métricas Avanzadas',
        period: 'Próximo',
        items: [
          { title: 'PerformanceBenchmark model (sport, metric, value, unit, testedAt)', done: true, note: 'Métricas: 5K_TIME|10K_TIME|HM_TIME|MARATHON_TIME|1RM_SQUAT|1RM_BENCH|1RM_DEADLIFT|PACE_Z2.' },
          { title: 'API CRUD: GET + POST /api/coach/athlete/[id]/benchmarks', done: true, note: 'Historial agrupado por metric. Solo coach asignado puede crear.' },
          { title: 'UI coach: Tab Benchmarks en panel atleta (form + lista agrupada por deporte)', done: true, note: 'Tiempos formateados MM:SS.' },
          { title: 'UI atleta: benchmarks en /progress (SectionCard "Tests de Rendimiento")', done: true, note: 'Solo visible si el atleta tiene benchmarks.' },
          { title: 'Medidas corporales en Tab Progreso del coach (cintura, brazos, caderas)', done: false, note: 'Tabla de circunferencias junto al peso. Evolución completa del atleta.' },
          { title: 'Notificación in-app al coach cuando atleta completa una sesión', done: false, note: 'Tabla Notification { coachId, athleteId, type: SESSION_COMPLETED, sessionId, readAt? }. Badge en sidebar.' },
          { title: 'Finanzas: filtro por atleta en /coach/finanzas', done: false, note: 'Con 20+ atletas la lista es inmanejable. Selector de atleta en UI + WHERE athleteId en query.' },
          { title: 'generator.ts: calibrar zonas HR con benchmark reciente de running', done: false, note: 'Si hay 5K_TIME < 90 días → fórmula Riegel → ajusta intensidades del plan.' },
        ],
      },
    ],
  },

  // ─── PLATAFORMA ───────────────────────────────────────────────────────────────

  {
    id: 'plataforma',
    label: 'Plataforma — Marketplace & Admin',
    period: 'En construcción',
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    items: [
      { title: 'Schema DB: CoachProfile, CoachProgram, CoachPost', done: true, note: 'Migración marketplace aplicada.' },
      { title: 'Directorio público /coaches (grid + filtros por deporte)', done: true, note: 'Infraestructura lista.' },
      { title: 'Perfil público /p/[slug] (bio, programas, posts, CTA)', done: true, note: 'Coach edita su perfil, slug, especialidades, publica contenido.' },
      { title: '/join/[code] con branding completo del coach (avatar, headline, bio)', done: true, note: 'Convierte el onboarding B2B en funnel branded del coach.' },
      { title: 'Landing page con hero, pricing y animaciones', done: true, note: 'RevealOnScroll, fadeUp hero, hover lift cards.' },
      { title: 'Panel admin: KPIs, usuarios, coaches, suscripciones, activaciones, configuración, roadmap', done: true, note: 'Control de activaciones manual. Cambio de rol en tiempo real.' },
      { title: 'Middleware: protección completa de rutas por rol', done: true, note: 'Orden: login→roleSelection→onboarding→pending→coach→admin. COACH+/dashboard→/coach/dashboard.' },
      { title: 'Emails transaccionales (Resend): welcome coach, welcome atleta B2B, asignación, forgot password', done: true, note: 'Dominio verificado. DNS en Route53. RESEND_API_KEY en Vercel.' },
      { title: 'Crons: check-in reminder (dom 23:00 UTC), sesión del día (lun 12:00 UTC), pago vencido (diario 14:00 UTC)', done: true, note: 'vercel.json configura los 3 crons. Route handlers en /api/cron/* con CRON_SECRET auth. Panel admin /admin/crons con trigger manual. Activos en Vercel en producción.' },
      { title: 'SEO: meta tags + sitemap dinámico para /coaches y /p/[slug]', done: false, note: 'og:image, og:description. Indexables para "coach running Colombia".' },
      { title: 'Ocultar Marketplace hasta tener 20+ coaches activos', done: false, note: 'Directorio vacío genera fricción. Mantener infraestructura sin promocionar.' },
      { title: 'Admin: métricas de negocio reales en /admin/metrics (5 KPIs + delta semanal)', done: true, note: 'check-ins, sesiones, planes activos, coaches con atletas, tasa onboarding. Implementado en bugfix/18.' },
      { title: 'Admin: búsqueda y filtros en /admin/users + paginación 50/página', done: true, note: 'UsersTable client component con búsqueda por nombre/email/rol. Implementado en bugfix/18.' },
      { title: 'Admin: perfil individual /admin/users/[id] (HealthProfile, plan activo, último check-in)', done: true, note: 'Página creada en bugfix/18. Incluye feature flags, coach asignado y datos de salud.' },
      { title: 'Admin: sincronizar features al cambiar rol', done: true, note: 'role/route.ts actualizado con featuresByRole map. Implementado en bugfix/18.' },
      // ── Admin — features P0 faltantes (fundador) ────────────────────────────────
      { title: 'Admin P0: dashboard financiero — MRR estimado, fee por coach, cobros pendientes', done: true, priority: 'P0', note: 'Fix: /admin/finanzas con MRR atletas Pro ($9.99×count), fee por coach (tramos $6/$5/$3), pagos PAID/PENDING/OVERDUE. Link en sidebar desktop.' },
      { title: 'Admin P0: funnel de activación — registro → onboarding → plan activo → check-in esta semana', done: true, priority: 'P0', note: 'Implementado en /admin (overview). 4 pasos con barra de progreso, % del total y % conversión del paso anterior. Color verde/naranja/rojo según tasa.' },
      { title: 'Admin P1: feed de alertas operativas — atletas en /pending > 48h, coaches sin atletas > 7d', done: true, priority: 'P1', note: '/admin/alerts: lógica pura en domain/admin/alerts.ts (testada), link en sidebar. Severidad medium/high con semáforo. Incluye 21 tests de domain + domain/admin/finanzas.ts también extraído y testeado.' },
      { title: 'Admin P1: log de actividad — audit trail de acciones admin (quién, qué, cuándo)', done: true, priority: 'P1', note: 'AdminAuditLog en schema (db push). domain/admin/audit-log.ts con labelForAction, describeAuditEntry, colorForAction (14 tests). logAdminAction() fire-and-forget en 3 rutas API (CHANGE_ROLE, CHANGE_PLAN, UPDATE_AI_PROFILE). /admin/audit con últimas 200 acciones.' },
      { title: 'Admin P1: eliminar usuario — acción destructiva con confirmación doble', done: true, priority: 'P1', note: 'DELETE /api/admin/users/[id]: audit log ANTES del delete (meta preserva email+name+role), luego prisma.user.delete cascade. DeleteUserButton: 2 pasos inline (confirm1 → confirm2 → delete). Impide auto-eliminación. 250 tests pasando (5 nuevos DELETE_USER en audit-log.test.ts).' },
      { title: 'Admin P2: revenue por coach — ranking de coaches por atletas activos y fee generado', done: true, priority: 'P2', note: 'Cubierto por /admin/finanzas: tabla de coaches ordenada por fee desc con tramo, nº atletas activos y total.' },
      { title: 'Admin P2: gestión de invite codes — ver, revocar y generar códigos manualmente', done: true, priority: 'P2', note: '/admin/invite-codes: GET/POST /api/admin/invite-codes + DELETE /api/admin/invite-codes/[id]. Tabla con estado activo/usado/vencido, coach y atleta que lo usó. Generador con selector de coach.' },
      { title: 'Admin P2: reset contraseña manual — admin puede disparar link de reset para cualquier usuario', done: true, priority: 'P2', note: 'ResetPasswordButton en /admin/users/[id]: llama POST /api/auth/forgot-password con el email del usuario. Feedback inline.' },
      { title: 'Admin P2: estado de crons — última ejecución y trigger manual desde el panel', done: true, priority: 'P2', note: '/admin/crons: tabla de los 3 crons con schedule human-readable + botón "Ejecutar ahora" → POST /api/admin/crons/trigger (llama internamente con CRON_SECRET). Última ejecución pendiente (Vercel no expone API pública de historial).' },
      { title: 'Admin P2: banner "AI desactivada" en /admin/ai — evitar confusión al editar prompt sin efecto', done: true, priority: 'P2', note: 'Banner amber en /admin/ai indicando AI_ONBOARDING_ENABLED = false, qué sí funciona (chat) y cómo reactivar.' },
      { title: 'Admin P3: búsqueda global (⌘K) — encontrar cualquier usuario/coach desde cualquier página admin', done: true, priority: 'P3', note: 'AdminSearchPalette en layout: ⌘K/Ctrl+K abre overlay, debounce 200ms, rankResults domain puro (17 tests), flechas+Enter para navegar, ESC cierra. GET /api/admin/search?q= con Prisma contains insensitive.' },
      { title: 'Admin P3: editor de ejercicios globales desde /admin', done: true, priority: 'P3', note: '/admin/exercises: CRUD completo (GET+POST /api/admin/exercises, PATCH+DELETE /[id]). validateExercise domain puro (23 tests). Formulario inline con selects de categoría y equipamiento. Filtro client-side por nombre/categoría.' },
    ],
  },

  // ─── MOBILE ───────────────────────────────────────────────────────────────────

  {
    id: 'mobile',
    label: 'Mobile',
    color: '#0891b2',
    bgColor: '#f0f9ff',
    borderColor: '#a5f3fc',
    phases: [
      {
        id: 'mobile-core',
        label: 'Core & QA',
        period: 'En construcción',
        items: [
          { title: 'Auth nativa: login email/password con JWT en SecureStore', done: true, note: 'src/api/auth.ts. Token Bearer en todas las requests. Boot: index.tsx → getMe → route guard.' },
          { title: 'Bottom tabs: Dashboard, Plan, Gym, AI Coach, Check-in, Nutrición, Perfil', done: true, note: 'Expo Router file-based. Safe area insets en todos.' },
          { title: 'Dashboard, Plan, Check-in, Nutrición, Progreso, Log, Perfil — pantallas completas', done: true, note: 'Pull-to-refresh, error con retry. /api/mobile/* endpoints.' },
          { title: 'Gym session tracker mobile (sets/reps/peso, timer, FinishModal RPE)', done: true, note: 'app/(app)/gym-session.tsx + gym-history.tsx.' },
          { title: 'Mensajería mobile: messages + coach-inbox + coach-chat', done: true, note: 'Polling 5s chat atleta, 30s lista coach. Badge unread.' },
          { title: 'Google OAuth mobile: expo-auth-session + POST /api/mobile/auth/google', done: true, note: 'id_token → JWT. Si needsRoleSelection → pantalla select-role.' },
          { title: 'Rate limiting mobile (11 endpoints) y feature gating PRO en endpoints mobile', done: true, note: 'requireFeature() en nutrition/log, progress, gym/week, nutrition/generate-meals.' },
          { title: 'Onboarding mobile: steps por deporte, hr-fitness, stepHistory stack', done: true, note: 'Sincronizado con flujo web. Ruta corta GYM/BODY.' },
          { title: 'Fix React Rules of Hooks: hooks antes de returns condicionales en 6 pantallas', done: true, note: 'gym, checkin, plan, ai-coach, nutrition, progress.' },
          { title: 'UX: headers homogéneos LinearGradient (#1e3a5f→#2d5a8e), safe area insets en todos los screens', done: true, note: 'nutrition, progress, gym-history — patrón uniforme.' },
          { title: 'Pantalla /upgrade para INACTIVE + boot check trial expirado', done: true, note: 'app/(app)/upgrade.tsx. index.tsx: userPlan === "INACTIVE" → upgrade.' },
          { title: 'AI Coach chat mobile — UI implementada, /api/mobile/ai/chat NO existe aún', done: true, note: 'app/(app)/(tabs)/ai-coach.tsx con FlatList + UpgradeWall. AI removida intencionalmente.' },
          { title: 'Push notifications: recordatorio sesión del día', done: false, note: 'Backend /api/mobile/push-token YA implementado. Falta: expo-notifications + FCM/APNs + permisos + EAS.' },
        ],
      },
      {
        id: 'mobile-platform',
        label: 'Platform, BLE & Stores',
        period: 'Futuro',
        items: [
          { title: 'Instalar Xcode 15+ y Android Studio (SDK 34+)', done: false, note: 'Requerido para BLE, HealthKit, Health Connect en dispositivo real.' },
          { title: 'EAS Build: perfiles dev/preview/production + publicar en App Store y Google Play', done: false, note: 'Apple Developer ($99/año) + Google Play ($25). Assets: icono 1024x1024, screenshots, Privacy Policy en medaliq.com/privacy.' },
          { title: 'OTA Updates con EAS Update para hotfixes post-publicación', done: false, note: 'eas update --branch production. Cambios JS/UI sin re-review de store.' },
          { title: 'Monorepo pnpm (apps/web + apps/mobile + packages/shared-types)', done: false, note: 'Hoy web y mobile tienen tipos duplicados. pnpm-workspace.yaml cuando sea prioritario.' },
          { title: 'BLE: conectar HRM (Polar, Wahoo, Garmin) — FC en tiempo real durante sesión', done: false, note: 'react-native-ble-plx. UUID 0x180D (Heart Rate). Requiere expo bare workflow o config plugin.' },
          { title: 'Apple HealthKit + Google Health Connect (actividades, FC, sueño)', done: false, note: 'Requiere dispositivo real. Sync desde cualquier wearable.' },
          { title: 'Strava OAuth: importar actividades completadas → auto-completa SessionLog', done: false, note: 'OAuth in-app + polling de actividades.' },
          { title: 'Garmin Connect API: HRV, Training Status, sueño', done: false, note: 'Muy popular en LatAm gyms. OAuth + webhook.' },
        ],
      },
    ],
  },

  // ─── PRE-LANZAMIENTO ─────────────────────────────────────────────────────────

  {
    id: 'pre-launch',
    label: 'Pre-lanzamiento — QA & Tests E2E',
    period: 'En construcción',
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    items: [
      { title: 'Limpiar usuarios de prueba de producción antes del lanzamiento', done: false, priority: 'P0', note: 'Eliminar coach@medaliq.com, miguel@medaliq.com, ana@medaliq.com de la DB de producción. Mantener admin@medaliq.com temporalmente hasta que Miguel cree usuario real de control. Separar seed en seed.dev.ts (usuarios de prueba) y seed.prod.ts (solo admin + datos esenciales).' },
      { title: 'Google OAuth activar con dominio real en producción', done: false, note: '[STANDBY] Google Cloud Console → Client ID + Secret → GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET en Vercel. Código implementado.' },
      { title: 'Sentry para monitoreo de errores en producción', done: false, note: '[STANDBY] Pospuesto hasta tener usuarios reales activos. @sentry/nextjs. Gratis hasta 5k errores/mes.' },
      { title: 'Zod validation en endpoints POST/PATCH restantes', done: true, note: 'Zod v4 schemas agregados a: /api/gym/session/complete (GymCompleteSchema + nested SetPayload/ExerciseOverride), /api/log/session, /api/mobile/log/session, /api/coach/gym/routines (CreateRoutineSchema + DaySchema + DayExerciseSchema). Redundant manual checks eliminados.' },
      { title: 'Test E2E: flujo B2B completo (coach crea → onboarding → /pending → activa → dashboard)', done: false, note: 'Verificar todos los pasos del flujo email-first unificado sin fricción.' },
      { title: 'Test E2E: flujo invite code (genera → /join/[code] → registro → vinculación → /pending)', done: false, note: 'POST /api/coach/invite → código → atleta visita /join → coach activa.' },
      { title: 'Test E2E: onboarding STRENGTH → plan BODY_RECOMPOSITION_16W → gym tracker', done: false, note: 'Verificar plan con semanas + sesiones en DB. Gym tracker carga ejercicios.' },
      { title: 'Test E2E: atleta sin plan → log libre → historial → dashboard con actividad', done: false, note: 'POST /api/mobile/log/session con sessionId null → aparece en historial.' },
      { title: 'Uptime Robot: alertas de disponibilidad (ping cada 5 min)', done: false, note: 'Email/SMS si la app cae. Gratis hasta 50 monitores.' },
    ],
  },

  // ─── NEGOCIO ─────────────────────────────────────────────────────────────────

  {
    id: 'negocio',
    label: 'Negocio — Pagos & Revenue',
    period: 'Post-lanzamiento',
    color: '#0891b2',
    bgColor: '#f0f9ff',
    borderColor: '#7dd3fc',
    items: [
      { title: 'Trial 30 días + página /upgrade con comparativa de features', done: true, note: 'UserSubscription model en DB (TRIAL|FREE|PRO). Botón temporal mailto: hasta integrar pasarela.' },
      { title: 'Feature flags: derivación por tier + límites de asesorados para entrenadores', done: false, priority: 'P1', note: 'Atletas B2C: computeAthleteFeatures(tier) deriva flags de UserSubscription.tier. Entrenadores: getCoachLimits(CoachSubscriptionTier) retorna maxAthletes. Enforcement en POST /api/coach/clients/create. Requiere extender UserSubscription con CoachSubscriptionTier: STARTER|GROWTH|PRO|SCALE.' },
      { title: 'Wompi (Colombia): suscripción atleta Pro $9.99/mes', done: false, note: 'Wompi primero por mercado principal. Checkout → webhook → activa PRO en DB. Precio validado por análisis de mercado LatAm (techo Colombia ~$10 USD).' },
      { title: 'Webhook Wompi/Stripe: pago exitoso → activa Pro, fallo → downgrade', done: false, note: 'POST /api/webhooks/wompi. Mismo mecanismo que activación manual del admin.' },
      { title: 'Facturación mensual al coach por asesorados directos', done: false, note: '1-50: $6/atleta, 51-100: $5/atleta, +100: $3/atleta. Calculado automáticamente.' },
      { title: 'Stripe para usuarios internacionales', done: false, note: 'Después de validar el mercado colombiano con Wompi.' },
      { title: 'Página de gestión de suscripción del atleta (ver plan, cancelar, cambiar método)', done: false, note: 'Ver plan actual, próximo cobro, cancelar, cambiar método de pago.' },
      { title: 'Admin: MRR, churn mensual, funnel trial→Pro, ranking coaches por revenue', done: false, note: 'Suma suscripciones activas + fees coaches. Gráfica histórica.' },
      { title: 'Cobro en Nequi / PSE (Wompi los cubre para Colombia)', done: false, note: 'Tarjeta sola excluye buena parte del mercado LatAm.' },
    ],
  },

  // ─── ADMIN — BUSINESS INTELLIGENCE ──────────────────────────────────────────
  // Métricas identificadas en revisión CO (2026-06-30) — no cubiertas por el admin actual

  {
    id: 'admin-bi',
    label: 'Admin — Business Intelligence',
    period: 'Próximo',
    color: '#0891b2',
    bgColor: '#f0f9ff',
    borderColor: '#7dd3fc',
    items: [
      {
        title: 'MRR estimado: coaches activos × fee por tier (tabla + total mensual en /admin)',
        done: true,
        priority: 'P0',
        note: 'Implementado en /admin/finanzas. Domain: src/domain/admin/finanzas.ts (coachFeeRate, mrrAthletes, mrrCoaches). Cards: MRR atletas Pro + fee coaches + total. Tabla breakdown por coach con tramo y fee.',
      },
      {
        title: 'WAU (Weekly Active Users) con tendencia 8 semanas — gráfica en /admin/metrics',
        done: true,
        priority: 'P1',
        note: 'Implementado en /admin/metrics. Domain: src/domain/admin/wau.ts (isoWeekKey, computeWAU, lastNWeekKeys). Bar chart nativo sin deps. "Activo" = SessionLog o WeeklyCheckIn en esa semana. 11 tests.',
      },
      {
        title: 'Retención 14 días: % atletas con al menos 1 check-in o log en los últimos 14 días',
        done: true,
        priority: 'P1',
        note: 'Implementado en /admin/metrics junto al WAU (grid 2/3 + 1/3). Domain: retention.ts (activeUserIdsInWindow, computeRetention, retentionColor). Base = featurePlan:true. Reutiliza eventos ya cargados para WAU. 13 tests.',
      },
      {
        title: 'Coaches activos esta semana (al menos 1 acción en los últimos 7 días)',
        done: true,
        priority: 'P1',
        note: 'Pendiente: agregar User.lastActiveAt (updatedAt en cada request autenticado) o usar AuditLog para detectar actividad de coaches. Mostrar coaches activos / coaches totales en /admin/coaches.',
      },
      {
        title: 'Conversión de invite codes: códigos generados vs usados (tasa y tiempo promedio)',
        done: true,
        priority: 'P2',
        note: 'InviteCode ya tiene usedAt. Query: count(usedAt IS NOT NULL) / count(*) por coach. Tiempo promedio: avg(usedAt - createdAt). Visible en /admin/invite-codes o en ficha de coach.',
      },
      {
        title: 'Uso del AI chat: mensajes enviados esta semana y % de cuota mensual utilizada',
        done: false,
        priority: 'P3',
        note: 'STANDBY — AI deshabilitado intencionalmente (AI_ONBOARDING_ENABLED = false). Activar solo cuando AI esté habilitado en producción.',
      },
    ],
  },

  // ─── IA & FUTURO ─────────────────────────────────────────────────────────────

  {
    id: 'ia-futuro',
    label: 'Coach AI & IA Proactiva',
    period: 'Futuro',
    color: '#6b7280',
    bgColor: '#f9fafb',
    borderColor: '#d1d5db',
    items: [
      { title: 'Chat AI en panel coach con contexto completo del asesorado', done: false, note: 'Coach pregunta sobre un atleta. AI tiene acceso a HealthProfile, plan, check-ins, logs.' },
      { title: 'Sugerencia de rutina gym según perfil del atleta (lesiones, objetivos, nivel)', done: false, note: '"¿Qué rutina le recomiendas?" → AI analiza contexto + WorkoutTemplates del coach.' },
      { title: 'Coach AI gratis para coaches con 50+ asesorados directos (incentivo de volumen)', done: false, note: 'Coaches más pequeños lo pagan como add-on.' },
      { title: 'Briefing de lunes — resumen IA (1 llamada Haiku/semana/usuario, resultado cacheado)', done: false, note: 'Costo estimado <$0.01/usuario/semana. Sin regenerar en reloads.' },
      { title: 'Insight post check-in — análisis de tendencia en 2 líneas', done: false, note: '1 llamada con contexto 3 últimos check-ins. Visible en pantalla de confirmación.' },
      { title: 'Regla: sin chat abierto — IA solo en 3 momentos acotados (check-in, log, inicio semana)', done: false, note: 'Cada momento = 1 llamada cacheada. Controla costos y experiencia.' },
      { title: 'Dashboard de costos AI por usuario en admin (tokens, llamadas, costo $)', done: false, note: 'Detectar outliers antes de que el costo escale.' },
    ],
  },

  // ─── BUGS ACTIVOS — lista viva ────────────────────────────────────────────────
  // Agregar con done: false | Al resolver: marcar done: true (desaparece automáticamente)

  {
    id: 'bugs',
    label: 'Bugs Activos',
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    liveList: true,
    phases: [

      // ── GYM & TRACKING ────────────────────────────────────────────────────────
      {
        id: 'bugs-gym',
        label: 'Gym & Tracking',
        period: 'Urgente',
        items: [
          { title: 'BUG-001 — Gym: "Finalizar sesión" no persiste en desktop (modal no monta)', done: true, priority: 'P0', note: 'Root cause: animate-fade-up en AthleteLayout aplica CSS transform → nuevo stacking context → fixed modal queda atrapado dentro del <main>. Fix: createPortal en gym/session/page.tsx monta CompleteModal directamente en document.body.' },
          { title: 'BUG-016 — Plan "Gym / Ganar músculo" incluye 3 sesiones de running/semana', done: true, priority: 'P1', note: 'Fix: nuevo STRENGTH_TRAINING_16W en templates.ts — Upper/Lower 4 días (Lun/Mar/Jue/Vie), sin RODAJE_Z2. Push/Quad/Pull/Posterior con progressión de fases BASE→DESARROLLO→ESPECIFICO→AFINAMIENTO. PLAN_TEMPLATES apunta STRENGTH_TRAINING al nuevo template.' },
          { title: 'BUG-017 — Registro de sesión del plan es binario (Sí/No), sin métricas reales', done: false, priority: 'P1', note: 'Modal no captura km/ritmo/FC ni sets/peso/reps. Fix: tipar el modal por SessionType. Running: km+tiempo+FC. Fuerza: conectar al logger de gym.' },
        ],
      },

      // ── ONBOARDING & PLAN ─────────────────────────────────────────────────────
      {
        id: 'bugs-onboarding',
        label: 'Onboarding & Plan',
        period: 'Urgente',
        items: [
          { title: 'BUG-002 — Onboarding "Plan personalizado" no genera el plan automáticamente', done: true, priority: 'P0', note: 'Fix: onboarding/page.tsx redirige RUNNING/BOTH a /new-goal tras completar setup (antes iba a /dashboard vacío). dashboard/page.tsx agrega CTA "Crear plan" para modo FREE sin historial previo. El onboarding por diseño solo configura nutrición + perfil; el plan se genera en /new-goal.' },
          { title: 'BUG-005 — /new-goal no hereda la meta elegida en onboarding; falta opción "Ganar músculo"', done: false, priority: 'P1', note: 'Fix: pre-rellenar /new-goal con goalType del HealthProfile. Agregar opción STRENGTH/HYPERTROPHY al selector.' },
          { title: 'BUG-021 — Onboarding pregunta el deporte 3 veces y los días disponibles 2 veces', done: false, priority: 'P2', note: 'Fix: consolidar y reutilizar respuestas entre pasos.' },
        ],
      },

      // ── DATOS & CÁLCULOS ──────────────────────────────────────────────────────
      {
        id: 'bugs-datos',
        label: 'Datos & Cálculos',
        period: 'Urgente',
        items: [
          { title: 'BUG-003 — FC máxima inconsistente: onboarding Fox (211-0.64×edad) vs perfil Tanaka (208-0.7×edad)', done: true, priority: 'P1', note: 'Fix: ProfileClient.tsx ahora usa Fox (211-0.64×edad). generate-plan.use-case persiste hrMax calculado a HealthProfile en Phase 3. help/page.tsx actualizado. Fox es fuente canónica en todo el sistema.' },
          { title: 'BUG-004 — TDEE inconsistente entre vistas (4 valores distintos el mismo día)', done: true, priority: 'P1', note: 'Fix: nutrition/page.tsx lazy init ahora usa daysPerWeek=5 (igual que syncWeight y nutrition/generate). Todas las recalculaciones de TDEE usan factor 1.725. Vistas solo leen NutritionPlan.tdee.' },
          { title: 'BUG-007 — Progreso: "Objetivo 0 kg · Faltan 77 kg" sin meta de peso definida', done: true, priority: 'P2', note: 'Fix: ProgressClient.tsx cambia weightGoal !== null → !!weightGoal. Si no hay meta: CTA "Define tu meta de peso" con Link a /profile en lugar de mostrar 0 kg.' },
          { title: 'BUG-009 — FC reposo del check-in no sincroniza al perfil de salud', done: true, priority: 'P2', note: 'Ya implementado: process-check-in.use-case línea 145-148 hace txHealthProfile.updateHrResting(userId, data.heartRate). Web y mobile checkin routes mapean body.hrResting → heartRate correctamente.' },
          { title: 'BUG-010 — Dos métricas de adherencia distintas en la misma pantalla (/plan)', done: true, priority: 'P2', note: 'Fix: KPICard ahora dice "Adherencia / esta semana". Chart renombrado a "Historial de adherencia / Promedio histórico X%". Labels dejan claro que miden períodos distintos.' },
          { title: 'BUG-011 — "Adherencia promedio 2%" engañoso en usuario nuevo (promedia semanas vacías)', done: true, priority: 'P2', note: 'Ya implementado: pastSlots = slots.filter(s => !s.isFuture) excluye semanas futuras. El promedio solo considera semanas pasadas + semana actual hasta el día de hoy.' },
          { title: 'EDGE-06 — /api/checkin y /api/mobile/checkin: validar min/max en todos los campos numéricos', done: false, priority: 'P2', note: 'Parcialmente corregido en bugfix/17. Verificar bodyWeight, sleepHours y todos los campos numéricos.' },
        ],
      },

      // ── UI / UX ATLETA ────────────────────────────────────────────────────────
      {
        id: 'bugs-ux',
        label: 'UI/UX Atleta',
        period: 'Urgente',
        items: [
          { title: 'BUG-006 — Bottom-nav mobile omite Nutrición, Progreso y Mensajes', done: true, priority: 'P1', note: 'Nav tiene 6 tabs visibles: Inicio · Plan · Gym · Nutrición · Progreso · Perfil. Mensajes accesible desde Perfil con badge de unread count — patrón correcto para no saturar la barra. Checkin oculto del nav (href:null) pero accesible como ruta.' },
          { title: 'BUG-008 — Guardar no refresca la vista hasta recargar (stale UI)', done: false, priority: 'P2', note: 'Editar sesión y perfil persisten server-side pero la vista muestra el valor viejo. Fix: router.refresh() o mutación optimista.' },
          { title: 'BUG-018 — KPI cards hermanas con 3 tratamientos visuales distintos', done: false, priority: 'P2', note: 'Fix: un solo patrón de card KPI en toda la app.' },
          { title: 'BUG-012 — Enums crudos visibles en UI (RACE_10K, HYPERTROPHY, CHEST…)', done: false, priority: 'P3', note: 'Fix: capa de labels por enum en toda la app.' },
          { title: 'BUG-013 — "Zona N/A" en sesiones de fuerza', done: false, priority: 'P3', note: 'Fix: ocultar chip de zona en SessionType de fuerza o mostrar "Fuerza" como label.' },
          { title: 'BUG-014 — Leyenda "KM por fase" repite la etiqueta ESPECÍFICO', done: false, priority: 'P3', note: 'Dos entradas del chart con mismo label. Fix: revisar mapeo de fases en gráfico de progreso.' },
          { title: 'BUG-015 — Dos lugares para registrar métricas (Check-in vs Perfil)', done: false, priority: 'P3', note: 'Fix: unificar en un punto de entrada o aclarar diferencia en la UI.' },
          { title: 'BUG-019 — Sin escala consistente de border-radius (0/4/10/18px mezclados)', done: false, priority: 'P3', note: 'Fix: tokens sm/md/lg radius aplicados de forma consistente.' },
          { title: 'BUG-020 — Touch targets < 44px (selector idioma ~20px, links 15px)', done: false, priority: 'P3', note: 'Fix: mínimo 44×44px de área táctil en todos los controles interactivos.' },
          { title: 'A11Y-02 — lang="pt" en HTML root (debería ser "es")', done: false, priority: 'P3', note: 'Fix: verificar layout.tsx y la configuración del i18n.' },
        ],
      },

      // ── ADMIN ─────────────────────────────────────────────────────────────────
      {
        id: 'bugs-admin',
        label: 'Admin',
        period: 'Urgente',
        items: [
          { title: 'ADMIN-BUG-01 — /admin/settings hardcodeado con datos desactualizados', done: true, priority: 'P2', note: 'Fix: stack actualizado (Next.js 16, Resend, Expo). Integraciones con estado real. (es 16), "Vercel + Neon (pendiente)" (ya deployado), "Google OAuth pendiente" (implementado), "AWS SES" (se usa Resend). Fix: actualizar valores o eliminar la sección y mostrar solo estado real.' },
          { title: 'ADMIN-BUG-02 — /admin/metrics solo muestra 2 contadores — sin contexto real', done: true, priority: 'P2', note: 'Faltan: usuarios activos (logueados últimos 7d), adherencia promedio de la plataforma, coaches con atletas activos, tasa de onboarding completado. Fix: expandir con queries útiles para el negocio.' },
          { title: 'ADMIN-BUG-03 — Sin búsqueda ni filtros en /admin/users y /admin/coaches', done: true, priority: 'P2', note: 'Con 50+ usuarios la tabla es inmanejable. Fix: input de búsqueda por nombre/email + filtro por rol en users, búsqueda por nombre en coaches.' },
          { title: 'ADMIN-BUG-04 — Sin acceso a perfil individual de atleta desde admin', done: true, priority: 'P3', note: 'Solo se ve la tabla, no hay link al perfil completo. Fix: link en columna nombre → /admin/users/[id] con vista de HealthProfile, plan activo, último check-in.' },
          { title: 'ADMIN-BUG-05 — ChangeRoleButton no resetea feature flags al cambiar rol', done: true, priority: 'P1', note: 'Fix: /api/admin/user/[id]/role ahora sincroniza features según el rol destino vía featuresByRole map. ATHLETE→todas true, COACH→solo featureCoach, ADMIN→todas false.' },
          { title: 'ADMIN-BUG-06 — Plan FREE y PRO activan features idénticas en /api/admin/users/[id]/plan', done: true, priority: 'P1', note: 'Fix: rama FREE ahora activa solo featureLog=true (log manual), resto false. PRO mantiene todas activas.' },
          { title: 'ADMIN-BUG-07 — /admin/help expone credenciales de producción en texto plano', done: true, priority: 'P1', note: 'Fix: bloque de credenciales eliminado. Reemplazado por aviso que apunta a CLAUDE.md + comando pnpm prisma db seed.' },
          { title: 'ADMIN-BUG-08 — Sidebar admin 9 items — ilegible en laptops y sin agrupar', done: true, priority: 'P2', note: 'Fix: bottom nav mobile reducido a 5 items principales. Desktop sidebar mantiene todos los items + /admin/metrics agregado.' },
          { title: 'ADMIN-BUG-09 — /admin/plans y /admin/metrics no aparecen en el sidebar', done: true, priority: 'P2', note: 'Fix: /admin/metrics agregado al sidebar desktop con icono BarChart2. /admin/plans pendiente de consolidar en métricas.' },
          { title: 'ADMIN-BUG-10 — Sin paginación en tablas de usuarios, coaches y suscripciones', done: true, priority: 'P3', note: 'Con 100+ usuarios la tabla carga todo en memoria. Fix: cursor-based pagination con page/limit en los endpoints.' },
          { title: 'ADMIN-BUG-11 — Sin confirmación antes de cambiar rol o desactivar usuario', done: true, priority: 'P3', note: 'ChangeRoleButton ejecuta el PATCH directamente sin confirm dialog. Fix: modal de confirmación con resumen del cambio.' },
          { title: 'ADMIN-BUG-12 — inferPlanTier marca atletas inactivos como "Pro"', done: true, priority: 'P2', note: 'Fix: inferPlanTier ahora recibe featurePlan + featureLog. INACTIVE=sin features, FREE=solo log, PRO=featurePlan. Badge "Inactivo" en /admin/users y tier correcto en /admin/subscriptions.' },
          { title: 'ADMIN-BUG-13 — completedOnboarding usa findMany en lugar de count', done: true, priority: 'P3', note: 'Fix: reemplazado por prisma.user.count({ where: { onboardingCompleted: true } }). Eliminado el filter en JS.' },
        ],
      },

      // ── COACH ─────────────────────────────────────────────────────────────────
      {
        id: 'bugs-coach',
        label: 'Coach',
        period: 'Urgente',
        items: [
          { title: 'COACH-BUG-02 — Constructor de plan abre en semana 1, debería abrir en la semana activa del atleta', done: false, priority: 'P1', note: 'PlanBuilderClient.tsx línea 150: useState(0) = semana 1 siempre. Fix: calcular índice inicial con getPlanWeekNumber(startDate, totalWeeks) - 1, clampeado al rango [0, weeks.length-1]. Requiere pasar startDate como prop al builder.' },
          { title: 'COACH-BUG-03 — Coach ve "Semana 6/18", atleta ve "11/18" — semana activa inconsistente', done: true, priority: 'P1', note: 'Fix aplicado en athletes/_lib/map-athlete.ts: usa getPlanWeekNumber(startDate, totalWeeks) + clamp a totalWeeks. Lado coach (lista /coach/athletes) corregido.' },
          { title: 'COACH-BUG-04 — Coach ve "FASE: DESARROLLO", atleta ve "BASE" — fase activa inconsistente', done: false, priority: 'P1', note: 'La fase se deriva de currentWeek. Si currentWeek difiere (ver COACH-BUG-03), la fase también difiere. Pendiente verificar panel atleta individual (AthleteDetailClient).' },
          { title: 'COACH-BUG-01 — Columna DEPORTE vacía en lista atletas y "Sin datos de deporte" en dashboard', done: true, priority: 'P2', note: 'Fix: SPORT_LABELS ampliado en AthleteTabs.tsx y dashboard/page.tsx cubre RUNNING|STRENGTH|CYCLING|SWIMMING|TRIATHLON|FOOTBALL. Datos vienen de HealthProfile.sport vía map-athlete.ts.' },
          { title: 'COACH-BUG-05 — Campos Estrés/Motivación/Dolor siempre "—" en Tab Resumen del coach', done: true, priority: 'P2', note: 'Verificado: AthleteDetailClient.tsx muestra stressLevel/motivationLevel/painLevel con colores semafóricos (líneas 807-820 card resumen, 983-1007 tabla check-ins). El dato viene de page.tsx que los mapea con ?? null desde WeeklyCheckIn.' },
          { title: 'COACH-BUG-07 — Finanzas sin filtro por atleta — inmanejable con escala', done: false, priority: 'P2', note: 'Fix: selector de atleta en UI + WHERE athleteId en query.' },
          { title: 'COACH-BUG-06 — /coach/settings = "Próximamente" — item de nav lleva a página vacía', done: false, priority: 'P3', note: 'Fix: implementar Settings básico o remover el link del nav.' },
        ],
      },

    ],
  },
]
