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
      { title: 'Onboarding B2C mobile: UX nativa — progress indicator, contexto por campo, sensación de rapidez', done: false, priority: 'P2', note: 'El wizard de 2 pasos es correcto y no debe crecer. La mejora es en percepción: (1) barra de progreso "Paso 1 de 2", (2) subtexto explicativo por campo ("Tu peso nos permite calcular tu nutrición diaria"), (3) inputs nativos mobile (number pad, date picker), (4) animación de transición entre pasos. B2B ya tiene pre-llenado del coach — no aplica aquí.' },
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
      { title: 'DB — Índices faltantes: SessionLog.completedAt, CoachProfile.isPublic, WorkoutTemplate(isPublic, isActive)', done: true, priority: 'P2', note: 'Fix: migración 20260630000001_fix_invitecode_fk_and_db_indices. Agregados: SessionLog(completedAt), CoachProfile(isPublic), WorkoutTemplate(isPublic,isActive), InviteCode(coachId), InviteCode(expiresAt), CoachAthlete(athleteId).' },
      { title: 'DB — Payment.amount Float → Int o Decimal(12,2) para valores monetarios', done: true, priority: 'P2', note: 'Fix: migración 20260701000001 → Decimal @db.Decimal(12,2). Number() en todos los sitios de aritmética: coach/finanzas, admin/finanzas, cron/payment-overdue, email/resend.' },
      { title: 'DB — TrainingPlan.goalType String? → GoalType enum para constraint a nivel DB', done: true, priority: 'P3', note: 'Fix: migración 20260701000001 → goalType GoalType?. Cast a nivel infra en plan.repository.ts (domain mantiene string para evitar importar enum de Prisma en domain/).' },
      { title: 'DB — SessionLog.freeSessionType String? → SessionType enum', done: true, priority: 'P3', note: 'Fix: migración 20260701000001 → freeSessionType SessionType?. Cast en /api/mobile/log/session/route.ts.' },
      { title: 'DB — CoachAthlete sin updatedAt — sin auditoría de cuándo cambió el status', done: true, priority: 'P3', note: 'Fix: updatedAt DateTime @updatedAt agregado a CoachAthlete en schema.prisma + migración 20260630000001. DEFAULT NOW() para filas existentes.' },
      { title: 'PERF-01 — GET /api/nutrition/foods carga toda la librería sin límite ni búsqueda', done: true, priority: 'P2', note: 'Fix: ?q= search param con where: { name: { contains: q, mode: "insensitive" } } + take: 50. Aplicado en api/nutrition/foods/route.ts (NextRequest) y api/mobile/nutrition/foods/route.ts. Tests en route.test.ts.' },
      { title: 'PERF-02 — cron/session-reminder carga TODOS los weeks de TODOS los planes activos en memoria', done: true, priority: 'P2', note: 'Fix: fase 1 carga solo planes (id, startDate, totalWeeks, user). Fase 2 computa weekNumber por plan y lanza una sola query PlannedSession con OR de filtros {planId, weekNumber}. Elimina la carga de 12,600 filas innecesarias. Tests en route.test.ts.' },

      // ── DEUDA DBA — identificada en auditoría de módulos (2026-07) ────────────
      { title: 'DBA-P0 — FoodLog sin snapshot de macros: histórico nutricional mutable si Food se actualiza', done: true, priority: 'P0', note: 'Fix (migración 20260702000001): kcalLogged/proteinLogged/carbsLogged/fatLogged Float? en FoodLog. Routes POST web+mobile calculan snapshot con calcMacros() al crear. buildFoodLogResponse() usa snapshot si presente, Food.* como fallback backward-compat. pnpm prisma generate + tsc sin errores.' },
      { title: 'DBA-P0 — FoodLog.mealType String sin enum: duplicados silenciosos por case mismatch', done: true, priority: 'P0', note: 'Fix (migración 20260702000001): UPDATE UPPER() + CREATE TYPE "MealType" + ALTER COLUMN TYPE. Schema: mealType MealType. Domain: VALID_MEAL_TYPES + MealType type + validación en parseFoodLogPost con mensaje de error claro.' },
      { title: 'DBA-P0 — GymSession sin CHECK constraint: assignedWorkoutId y plannedSessionId pueden estar poblados simultáneamente', done: true, priority: 'P0', note: 'Fix (migración 20260702000001): ALTER TABLE "GymSession" ADD CONSTRAINT "gym_session_exclusive_fk" CHECK ("assignedWorkoutId" IS NULL OR "plannedSessionId" IS NULL). Aplicado en producción.' },
      { title: 'DBA-P0 — Partial indexes de WeeklyCheckIn y TrainingPlan(ACTIVE) fuera del schema Prisma: se pierden con migrate reset', done: true, priority: 'P0', note: 'Verificado: los partial indexes SÍ persisten en migrate reset porque están en archivos SQL de migración (20260628000001 y 20260623000002). El riesgo real es prisma db push. Fix: comentario en migración 20260702000001 + regla en CLAUDE.md: NUNCA usar prisma db push en producción, solo migrate deploy.' },
      { title: 'DBA-P1 — SessionLog sin sessionDate: completedAt mezcla fecha de sesión y fecha de registro', done: true, priority: 'P1', note: 'Fix (migración 20260702000002): sessionDate DateTime? @db.Date en SessionLog. Schema + migración. LogSessionSchema web + mobile: sessionDate z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/).optional(). SessionDate persistida en ambos paths (log vinculado + log libre). Registros históricos tienen null, usan completedAt como fallback.' },
      { title: 'DBA-P1 — Message onDelete: Cascade: coach pierde historial de conversación si atleta elimina su cuenta', done: true, priority: 'P1', note: 'Fix (migración 20260702000002): fromId String? + toId String? nullable. FK recreadas con onDelete: SetNull. admin/coaches/page.tsx: .filter((id): id is string => id !== null). Mensajes con emisor/receptor eliminado preservados en DB con fromId/toId = null. UI puede mostrar "[Usuario eliminado]" si fromId es null.' },
      { title: 'DBA-P1 — Goal model zombie: ningún flow crea un Goal en producción', done: true, priority: 'P1', note: 'Decisión: mantener modelo Goal. TrainingPlan.goalType y HealthProfile.sportGoal ya capturan el goalType. El modelo Goal se reserva para la futura feature de metas explícitas (raceDate, targetTimeSecs) que se integrará cuando el coach pueda asignar objetivos con fecha. No eliminar — riesgo de migración vs beneficio bajo.' },
      { title: 'DBA-P1 — PerformanceBenchmark.sport y .metric son String sin enum: benchmark puede guardarse invisible', done: true, priority: 'P1', note: 'Fix (migración 20260702000002): los valores usan 5K_TIME y 1RM_SQUAT (empiezan con número) — no son válidos como identifiers Prisma enum. Alternativa adoptada: CHECK constraints en DB (benchmark_sport_valid + benchmark_metric_valid) + normalización UPPER() de existentes + validación en benchmarks/route.ts POST con lista VALID_SPORTS/VALID_METRICS + toUpperCase() antes de persistir.' },
      { title: 'DBA-P2 — SetLog sin índice para PR detection por exerciseName: table scan en atletas con 1000+ sets', done: true, priority: 'P2', note: 'Fix (migración 20260702000003): @@index([exerciseName, completed]) en SetLog. Cubre isPRByName() que busca max weight WHERE exerciseName = X AND completed = true. No se desnormalizó athleteId — el índice en exerciseName+completed es suficiente para el caso de uso.' },
      { title: 'DBA-P2 — CoachAthlete sin @@index([coachId, status]): conteo de atletas activos lento con coaches grandes', done: true, priority: 'P2', note: 'Fix (migración 20260702000003): @@index([coachId, status]) en CoachAthlete. Cubre COUNT WHERE coachId = X AND status = "ACTIVE" de getCoachLimits(). El @@unique([coachId, athleteId]) existente no servía para filtrar por status.' },
      { title: 'DBA-P3 — WeeklyCheckIn sin @@index([userId, weekNumber]): lookup de semana actual ineficiente', done: true, priority: 'P3', note: 'Fix (migración 20260702000003): @@index([userId, weekNumber]) en WeeklyCheckIn. findFirst({ where: { userId, weekNumber } }) ahora usa índice compuesto en lugar de filtrar weekNumber en memoria sobre @@index([userId]).' },
      { title: 'DBA-P3 — SessionLog sin @@index([userId, completedAt]): historial cronológico del atleta necesita sort adicional', done: true, priority: 'P3', note: 'Fix (migración 20260702000003): @@index([userId, completedAt(sort: Desc)]) en SessionLog. Queries de historial con orderBy: { completedAt: "desc" } ahora usan índice compuesto — elimina el sort adicional en memoria.' },

      // ── INTEGRIDAD DE DATOS — auditoría julio 2026 ────────────────────────────
      { title: 'INT-P0 — User creation no garantiza registros dependientes: UserSubscription y CoachProfile pueden no existir', done: true, priority: 'P0', note: 'Fix en bugfix/43-module-hardening: /api/auth/register crea UserSubscription atómicamente tras User.create. /api/coach/clients/create crea UserSubscription dentro del $transaction existente. Backfill: scripts/backfill-integrity.ts corrigió 18 users sin subscription + 2 coaches sin CoachProfile en DB prod.' },
      { title: 'INT-P0 — Auditoría exhaustiva DB + código: identificar todas las invariantes sin enforce en create use cases', done: true, priority: 'P0', note: 'Completado en bugfix/43-module-hardening: scripts/check-db-integrity.ts (15 checks) + scripts/backfill-integrity.ts (5 pasos idempotentes). DB prod: 15/15 OK, 0 violaciones. Fixes Tanda 1: gym/today null guard, plan route early 400 sin profile. Fixes Tanda 2: upsertNutrition dentro de $transaction en completeOnboardingUseCase, map-athlete.ts goal/phase/weightKg nullable.' },

      // ── AUDITORÍA FK + PARIDAD WEB/MOBILE — julio 2026 ───────────────────────
      { title: 'DBI-01 — InviteCode race condition: dos atletas pueden canjear el mismo código simultáneamente', done: true, priority: 'P0', note: 'Fix: updateMany WHERE usedBy IS NULL + expiresAt > now() — atómico, sin $transaction extra. Si count===0 → 400. Después fetch coachId y upsert CoachAthlete. src/app/api/invite/[code]/route.ts.' },
      { title: 'DBI-02 — AssignedWorkout.templateId sin onDelete: borrar WorkoutTemplate activo → P2003', done: true, priority: 'P0', note: 'DONE: Agregado onDelete: Cascade en prisma/schema.prisma + migración SQL 20260703100000_add_assigned_workout_cascade. Ahora borrar un WorkoutTemplate elimina en cascada sus AssignedWorkout.' },
      { title: 'DBI-03 — WorkoutExercise.exerciseId sin onDelete: borrar Exercise usado en rutinas → P2003', done: true, priority: 'P0', note: 'FIXED: admin/exercises/[id]/route.ts DELETE ahora verifica workoutExercise.count() y retorna 409 si el ejercicio está en uso en rutinas.' },
      { title: 'DBI-04 — AssignedNutritionPlan.templateId sin onDelete: borrar NutritionTemplate activa → P2003', done: true, priority: 'P0', note: 'VERIFIED: ya implementado — coach/nutrition/templates/[templateId]/route.ts ya tiene guard assignedNutritionPlan.count() → 409. Falso positivo del audit.' },
      { title: 'DBI-05 — PlannedSession.workoutDayId sin onDelete: SetNull: borrar WorkoutDay deja FK huérfana', done: true, priority: 'P1', note: 'Fix: onDelete: SetNull añadido a relación workoutDay en PlannedSession. Migración 20260702050350_add_setnull_nullable_fks. prisma/schema.prisma L344.' },
      { title: 'DBI-06 — SessionLog.plannedSessionId sin onDelete: SetNull: borrar PlannedSession deja FK huérfana', done: true, priority: 'P1', note: 'Fix: onDelete: SetNull añadido a relación plannedSession en SessionLog. SessionLog queda como log libre cuando PlannedSession se borra. Migración 20260702050350. prisma/schema.prisma L392.' },
      { title: 'DBI-07 — Mobile PATCH /log/session/[logId] no actualiza distanceKm: inconsistencia web vs mobile', done: true, priority: 'P1', note: 'Fix: añadido bloque if (typeof body.distanceKm === "number" && body.distanceKm > 0) data.distanceKm = body.distanceKm. Paridad con web. src/app/api/mobile/log/session/[logId]/route.ts L30.' },
      { title: 'DBI-08 — TrainingPlan sin PlanWeeks si goalType sin template: plan vacío en dashboard atleta', done: true, priority: 'P1', note: 'FIXED: generate-plan.use-case.ts lanza error antes del $transaction si getTemplate() retorna null. Eliminado fallback ?? 18 y rama else. Plan vacío imposible ahora.' },
      { title: 'DBI-09 — CoachAthlete link sin filtro status=ACTIVE: atleta puede vincularse a coach PAUSED', done: true, priority: 'P2', note: 'FIXED: coach/clients/link/route.ts findFirst ahora incluye status: "ACTIVE" en where. Atletas con coach inactivo histórico pueden vincularse a nuevo coach.' },
      { title: 'DBI-10 — progress/page.tsx: weightKg/hrResting cast a number sin null check → NaN en gráficas', done: true, priority: 'P2', note: 'Fix: type guard en filter — .filter((c): c is typeof c & { weightKg: number } => c.weightKg !== null) elimina el cast as number. TypeScript narra el narrowing correctamente. Mismo patrón para hrResting. src/app/(athlete)/progress/page.tsx.' },
      { title: 'DBI-11 — Nutrition foods mobile sin micronutrientes: select 8 campos vs 12 en web', done: true, priority: 'P2', note: 'FIXED: mobile/nutrition/foods/route.ts select ahora incluye fiberPer100g, calciumMg, ironMg, potassiumMg, vitaminCMg, magnesiumMg — paridad completa con web.' },
      { title: 'DBI-12 — CoachProfile no se crea en registro: coach sin CoachProfile hasta primer PATCH', done: true, priority: 'P3', note: 'FIXED: register/route.ts ahora crea CoachProfile skeleton (coachId, slug) en $transaction junto a UserSubscription. Slug: {name-slug}-{id[-6:]}. CoachProfile siempre existe al registrar un coach.' },
      { title: 'DBI-13 — Goal model nunca se popula: TrainingPlan.goalId siempre null', done: false, priority: 'P3', note: 'Modelo Goal existe en schema pero ningún flujo lo crea. Fix (cuando aplique): crear Goal en generate-plan.use-case.ts + cerrar Goal anterior si existe.' },

      // ── HALLAZGOS AGENTES — auditoría completa julio 2026 ────────────────────
      { title: 'DBI-14 — Mobile JWT stale 30d: coach activa features pero atleta necesita re-login', done: true, priority: 'P1', note: 'FIXED: creado POST /api/mobile/auth/refresh. Verifica JWT existente, lee features frescas de DB, emite nuevo token. Mobile debe llamar este endpoint tras notificación de activación de features.' },
      { title: 'DBI-15 — Payment cascade: eliminar atleta borra todos sus registros de pago al coach', done: true, priority: 'P1', note: 'FIXED: Payment.athleteId → String? + athlete User? + onDelete: SetNull. Migración 20260702060000_payment_athlete_setnull. Pagos preservados con athleteId=null cuando atleta es eliminado.' },
      { title: 'DBI-16 — Web API endpoints sin rate limiting: mensajes, nutrition, log vulnerables a DoS', done: true, priority: 'P2', note: 'FIXED: rateLimitAsync añadido a /api/messages (GET 300/min, POST 100/min), /api/nutrition/log (GET 300/min, POST 100/min), /api/log/session (POST 100/min).' },
      { title: 'DBI-17 — PerformanceBenchmark sin @@unique: permite múltiples del mismo (sport, metric)', done: true, priority: 'P2', note: 'BY DESIGN: múltiples benchmarks del mismo (sport, metric) son intencionales — permiten tracking histórico de evolución (5K_TIME de hace 3 meses vs hoy). @@unique no aplica. No requiere fix.' },
      { title: 'DBI-18 — Payment delete: ownership check fuera de $transaction puede crear AuditLog orphan', done: true, priority: 'P2', note: 'FIXED: payments/[paymentId]/route.ts DELETE ahora usa $transaction interactiva — findFirst ownership check dentro del tx antes de auditLog.create + payment.delete.' },
      { title: 'DBI-19 — gym/session/[id]/route.ts mezcla auth web y mobile: getMobileUser ?? auth() en mismo endpoint', done: true, priority: 'P3', note: 'FIXED: mobile no usa este endpoint (usa /api/mobile/gym/*). Eliminado getMobileUser() — route usa solo auth(). src/app/api/gym/session/[id]/route.ts.' },
      { title: 'DBI-20 — Payment.paidAt sin CHECK en DB: status=PAID puede persistir sin paidAt', done: true, priority: 'P3', note: 'FIXED: migración 20260702070000_payment_paidat_check — CHECK constraint payment_paid_status_requires_paid_at: status != PAID OR paidAt IS NOT NULL. La validación en app layer (PATCH route L35) ya asigna paidAt si status=PAID.' },
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
          { title: 'Eliminar RACE_HALF_MARATHON y RACE_MARATHON de selectores UI (/new-goal + coach plan builder)', done: true, priority: 'P1', note: 'Eliminados de NewGoalClient.tsx, coach/clients/new/page.tsx y AthleteDetailClient.tsx (TEMPLATE_PREVIEW + select + estado inicial). GoalType enum y templates en DB intactos.' },
          { title: 'Recortar templates BODY_RECOMPOSITION y STRENGTH_TRAINING de 16 a 12 semanas', done: true, priority: 'P1', note: 'DONE (PR #45): templates.ts — BODY_RECOMPOSITION_16W y STRENGTH_TRAINING_16W recortados a 12 semanas (semanas 13-16 eliminadas). totalWeeks: 12. Semana 12 termina en ESPECIFICO. Tests actualizados.' },
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
          { title: 'Resumen de semana determinista en dashboard (sin IA)', done: true, note: 'TRAINING: buildWeeklySummary() → "Llevas X de Y sesiones. Volumen: Z km." FREE/RECOVERY: buildFreeModeSummary() → "X de Y sesiones esta semana. Hoy: Gym/Salida a correr." Ambos usando datos ya cargados en dashboard/page.tsx.' },
          { title: 'Récords personales visibles en /progress', done: true, note: 'Fix: progress/page.tsx consulta setLog.findMany({ where: { isPR:true, session:{athleteId} }, take:20 }). GymPR type exportado a ProgressClient. Sección "Récords Personales Gym" con ejercicio, weightKg, reps, fecha + badge PR. Tests TS pasan.' },
          { title: 'Offline support para gym session tracker (IndexedDB)', done: false, note: 'Guardar sets localmente y sincronizar al reconectar. Feature más crítica para mobile.' },
          { title: 'Responsive audit completo en móvil real (iPhone SE, iPhone 14, Samsung Galaxy)', done: false, note: 'Fix de padding/overflow por pantalla.' },
          { title: 'Dashboard FREE — pantalla de bienvenida dedicada para atleta sin plan', done: true, priority: 'P1', note: 'buildFreeModeSummary() ya existía. Implementado: banner FREE con "Busca un entrenador" (→ /coaches) + "Entrena libre" (→ /log). Elimina CTA /new-goal. worktree at-01-athlete-ux item 1.' },
          { title: 'Pantalla de celebración al completar plan + elección de siguiente paso', done: true, priority: 'P1', note: 'PlanCompletionCard.tsx — componente server con stats (nombre plan, semanas, sesiones, adherencia %). B2B → info box "Tu coach preparará tu siguiente plan". B2C → CTAs "Busca un entrenador" + "Seguir entrenando". Aparece en dashboard cuando dashboardMode=RECOVERY. worktree at-01-athlete-ux item 8.' },
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
          { title: 'Ajuste nutricional por intensidad real: notificación + aceptar/rechazar', done: true, priority: 'P1', note: 'Domain + API completos. UI mobile: NutritionAdjustmentCard (amber-themed) con botones Aceptar/Rechazar en nutrition.tsx. Tipos PendingNutritionAdjustment + acceptNutritionAdjustment/rejectNutritionAdjustment en api/nutrition.ts. Card aparece sobre sección de macros cuando data.pendingAdjustment existe. worktree at-01-athlete-ux item 6.' },
          { title: 'Validar MealPlan JSON con Zod antes de renderizar en NutritionContent', done: true, note: 'parseMealPlanData() en domain/nutrition/generate-meal-plan.ts valida estructura { hard, easy, rest } y retorna null si es inválido. nutrition/page.tsx usa parsedMealPlan: si null → fallback UI con CTA regenerar. normalizeMealPlan() en NutritionContent maneja DayMeals con arrays vacíos como fallback secundario.' },
          { title: 'Estandarizar REST carbs: NutritionContent debe usar getDailyNutritionTarget()', done: true, note: 'Fix: NutritionContent importa getDailyNutritionTarget de daily-target.ts + intensityToDayType de day-type.ts. Eliminada la lógica inline duplicada (low: ×0.88, rest: ×0.7). Campos renombrados a proteinG/carbsG/fatG.' },
          { title: 'getDayType a lib compartida — eliminar duplicado web vs mobile', done: true, note: 'day-type.ts ya existía como lib compartida. NutritionContent tenía `type DayType` local duplicando la def. Fix: eliminado local, importado de day-type.ts. Tests en day-type.test.ts.' },
          { title: 'buildStaticMealPlan: porciones en gramos reales usando Foods de DB', done: true, note: 'describeFood() con weighsFood=true: "Pollo — 200g (240 kcal, 34g prot)". Vegetales: "Brócoli — 80g (27 kcal)". Snacks: "Almendras — 30g (180 kcal, 5g prot)". Separador \\n cuando weighsFood=true. 9 tests nuevos en generate-meal-plan.test.ts.' },
          { title: 'UI: mostrar gramos y macros por porción en NutritionContent', done: true, note: 'Fix: Meal type extendido con items?: MealFoodItem[]. normalizeDay popula items desde formato coach (foodName+grams+macros). UI: si items disponibles → fila por alimento "Arroz · 150g · 220 kcal · P34g · C28g · G4g". Fallback a foods string para planes AI. Backward-compatible.' },
          { title: 'Atleta ve cuánto le falta para el target del día: número exacto (kcal + macros restantes)', done: true, priority: 'P2', note: 'TrackingSection.tsx: texto "Faltan X{unit}" bajo cada barra cuando val < tgt. Calculado en cliente desde tgt-val, sin query adicional.' },
          { title: 'Nutrición: comidas guardadas (meal templates) — registrar comida habitual en 1 tap', done: true, priority: 'P1', note: 'DB: MealTemplate + MealTemplateItem en schema.prisma, migración aplicada en Neon prod. API: GET/POST /api/nutrition/meal-templates, DELETE /api/nutrition/meal-templates/[id], ídem /api/mobile/*. UI web: sección "Mis comidas" en LogFoodModal (search step) + paso "Guardar como plantilla". UI mobile: ídem en LogFoodModal.tsx con useQuery + mutaciones. worktree at-01-athlete-ux item 9.' },
          { title: 'Nutrición: resumen semanal de adherencia al plan nutricional', done: false, priority: 'P2', note: 'Mostrar al atleta cuántos días de la semana llegó a su meta de kcal ± 10%. "Esta semana cumpliste tu meta 5 de 7 días." Visible en /nutrition y en el dashboard. Si el atleta tiene coach → el dato también aparece en el panel del coach (Tab Nutrición). Fuente: FoodLog vs NutritionPlan.targetKcal* por día.' },
          { title: 'Nutrición: recetas propias con cálculo automático de macros', done: false, priority: 'P2', note: 'Atleta crea su receta (nombre + ingredientes + porciones) → sistema calcula kcal/proteína/carbs/grasa totales → guarda como un alimento registrable en 1 tap. Reduce fricción de comidas caseras complejas. DB: Recipe { userId, name, ingredients: RecipeIngredient[], totalMacros, isPublic }.' },
          { title: 'Nutrición: módulo de recetas comunitarias — usuarios contribuyen recetas con macros', done: false, priority: 'P3', note: 'Extensión del módulo de recetas propias. El atleta puede marcar su receta como pública → aparece en el catálogo comunitario. Otros atletas la encuentran, la usan y la registran en 1 tap. Crea efecto de red: más usuarios = mejor catálogo. Moderación básica (reportar receta). El sistema sugiere calorías por comida, no alimentos específicos — las recetas comunitarias son la capa que conecta targets con comida real LATAM.' },
          { title: 'Nutrición: pantalla principal — barra de progreso diaria como elemento hero', done: true, priority: 'P1', note: 'TrackingSection.tsx rediseñado: kcal en text-3xl font-black naranja, % color-coded (rojo≥100%/naranja≥80%/gris), barra h-3, botón "+ Registrar" inline en hero. Movida a primer lugar en nutrition/page.tsx (antes de NutritionContent). Mobile: TrackingSection movida al inicio en nutrition.tsx. worktree at-01-athlete-ux item 7.' },
          { title: 'Nutrición: coach propone ajuste nutricional en tiempo real — atleta acepta/rechaza', done: false, priority: 'P1', note: 'Coach ve FoodLog del atleta en tiempo real desde Tab Nutrición. Detecta déficit/exceso → propone ajuste ("Aumenta 30g de proteína esta semana"). Atleta recibe notificación in-app → acepta o rechaza. Acepta → target actualizado. Rechaza → plan base intacto. Patrón idéntico a PendingNutritionAdjustment del sistema — extender para propuestas manuales del coach. DB: NutritionSuggestion { coachId, athleteId, message, delta{kcal,protein,carbs,fat}, status: PENDING|ACCEPTED|REJECTED, createdAt }.' },
        ],
      },
      {
        id: 'atleta-avanzado',
        label: 'Tracking Avanzado & Tracker Libre',
        period: 'Próximo',
        items: [
          { title: 'Medidas corporales en check-in (cintura, brazos, caderas, piernas)', done: true, priority: 'P1', note: 'UI mobile completa: sección colapsable "Medidas corporales" en checkin.tsx con 4 TextInputs (cintura/brazos/caderas/muslos). Payload enviado en handleSubmit. CheckinPayload tipado con waistCm/armsCm/hipsCm/thighsCm opcionales. worktree at-01-athlete-ux item 4.' },
          { title: 'Gráficas de circunferencias en /progress (web + mobile)', done: false, priority: 'P2', note: 'Web completo: MeasurementPoint type + MeasurementsChart con 4 LineChart en ProgressClient.tsx. API mobile /api/mobile/progress devuelve measurementPoints[] con los 4 campos. PENDIENTE: UI mobile — progress screen no renderiza las gráficas de circunferencias ni tipifica measurementPoints en la respuesta. Los datos llegan pero se ignoran.' },
          { title: 'Fotos de progreso semanales (Vercel Blob)', done: false, note: 'Modelo ProgressPhoto { userId, url, takenAt }. POST /api/progress/photos (multipart). Comparador side-by-side en /progress.' },
          { title: 'Log libre sin plan — sessionId opcional en /api/log/session y /api/mobile/log/session', done: true, note: 'Implementado: /api/mobile/log/session maneja !sessionId → freeSessionType. /api/log/run con plannedSessionId: null. /api/log/session con plannedSessionId opcional.' },
          { title: 'UI mobile: pantalla de log libre sin sessionId (selector tipo + RPE + duración + notas)', done: true, note: 'log.tsx soporta isFreeMode (cuando !sessionId): selector de 3 tipos (Correr/Fuerza/Otro), RPE, duración, distancia, FC, notas. Accesible desde dashboard.' },
          { title: 'Gym tracker libre sin AssignedWorkout ni TrainingPlan', done: true, note: 'GET /api/gym/session/today devuelve freeSession:true cuando no hay template/plan FUERZA. POST /api/gym/session/complete: tercera ruta libre (sin assignedWorkoutId/plannedSessionId), workoutExerciseId opcional. UI gym/session/page.tsx: input de nombre de ejercicio + logger de series, canFinish/handleComplete adaptados.' },
          { title: 'Dashboard sin plan: mostrar logs reales de la semana (web + mobile)', done: true, note: 'Fix: dashboard query enriquecida con freeSessionType (SessionLog) + assignedWorkout.template.name (GymSession). weekActivities[] con {dateStr, label, emoji} pasado a DailySessionCard. FREE/RECOVERY mode: "Lo que hiciste esta semana" lista los días con actividad.' },
          { title: 'Historial unificado: plan + libre juntos en /progress cronológico', done: true, note: 'progress/page.tsx: queries paralelas SessionLog + GymSession (últimas 30 c/u) → HistoryItem[] fusionado y ordenado por fecha desc. ProgressClient.tsx: sección "Historial de actividad" con emoji run/gym, label, duración, distancia, RPE.' },
          { title: 'Comparativa sesión actual vs anterior: Δ distancia, Δ ritmo, Δ RPE en pantalla de log', done: true, priority: 'P2', note: 'GET /api/log/last-session?type= devuelve la última sesión libre del mismo tipo. LogRunPage: useEffect por runType → fetch prev → card azul "Última vez — {fecha}" con duración/distancia/RPE previos. Ayuda al atleta a ver progreso sin queries extra.' },
          { title: 'Carga de entrenamiento acumulada: TSS semanal y tendencia ATL/CTL (forma física estimada)', done: false, priority: 'P3', note: 'TSS = (durationH × avgHR/hrMax)² × 100. ATL = promedio 7d, CTL = promedio 42d. Gráfica en /progress. Requiere hrMax y FC registrada en SessionLog.' },
          { title: 'Proyección al objetivo: "A este ritmo llegas a tu meta el DD/MM"', done: false, priority: 'P3', note: 'Basado en adherencia últimas 4 semanas y TrainingPlan.totalWeeks. Cálculo lineal. Si adherencia < 70% → proyección en rojo con sugerencia de ajuste.' },
          { title: 'Editar sesión ya registrada (edit post-log): corregir RPE, distancia o notas después de guardar', done: true, priority: 'P2', note: 'EditRunButton.tsx (client island) embebido en cada RunCard del historial. Muestra "✏️ Editar" footer → inline form (duración, distancia, RPE grid 1-10, notas) → PATCH /api/log/session/[logId] → router.refresh(). src/app/(athlete)/log/history/_components/EditRunButton.tsx.' },
          { title: 'Editar perfil de salud desde mobile (peso, talla, FC reposo, lesiones)', done: true, priority: 'P1', note: 'Nuevo endpoint GET/PATCH /api/mobile/profile/route.ts con getMobileUser + estimateHRMax automático. Pantalla edit-health-profile.tsx con KeyboardAvoidingView + ScrollView: 6 campos editables (peso actual/meta/altura/FC reposo/FC máx/sueño). Acceso desde Profile tab → "Datos físicos" → "Perfil de salud" (solo ATHLETE). worktree at-01-athlete-ux item 5.' },
          { title: '/pending mejorado: progreso visual + CTA log libre + notificación al coach a 48h', done: true, priority: 'P1', note: 'pending/page.tsx rediseñado: stepper 3 pasos (CheckCircle2/Clock, línea conectora), badge "Llevas N días esperando", CTAs "Mientras tanto" — log libre + nutrición + mensaje al coach (condicional si coachId). Middleware actualizado: /log y /nutrition bypasean redirect a /pending para B2B no activados. worktree at-01-athlete-ux item 3.' },
          { title: 'Check-in: pantalla de resultado post-envío con ajustes aplicados', done: true, priority: 'P1', note: 'Web: triggers[] en respuesta API + CheckInResultScreen.tsx (componente inline en CheckInClient.tsx) muestra triggers detectados + ajustes aplicados + recomendación. Mobile: triggers[] en /api/mobile/checkin + CheckinResult type + resultado inline en checkin.tsx ("Lo que detectamos" / "Lo que ajustamos"). Cierra el loop atleta→sistema. worktree at-01-athlete-ux item 2.' },
          { title: 'Centro de notificaciones in-app (campana en navbar)', done: false, priority: 'P2', note: 'Canal principal de notificaciones dentro de la app. Items: sesión del día, check-in disponible, mensaje del coach, plan ajustado, logro desbloqueado, plan asignado. Badge con count no leídas. Modelo Notification { userId, type, title, body, read, createdAt }. Push notifications para cuando la app no está abierta. Email solo para re-engagement (+3 días sin abrir la app).' },
          { title: 'Recompensas Capa 1 — Racha de entrenamiento en dashboard', done: false, priority: 'P2', note: 'Días consecutivos con actividad registrada (SessionLog o GymSession). Visible siempre en el dashboard del atleta. Se rompe si no hay actividad en 48h. Al romper → push notification "¿Volvemos?" al día siguiente. Query: COUNT días distintos con actividad en ventana consecutiva hacia atrás desde hoy.' },
          { title: 'Recompensas Capa 2 — Hitos de consistencia compartibles', done: false, priority: 'P2', note: 'Milestones: 10 check-ins, 50 sesiones, 3 meses activo, plan completado. Al alcanzar un hito → pantalla de celebración con imagen compartible (WhatsApp/Instagram). Imagen generada server-side con OG image o canvas. DB: tabla Achievement { userId, type, unlockedAt }.' },
          { title: 'Recompensas Capa 3 — PR gym con celebración prominente (web + mobile)', done: false, priority: 'P2', note: 'SetLog.isPR ya se detecta en gym/session/complete. Hoy hay banner básico. Mejorar: animación de celebración en mobile (confetti o similar), datos del PR (ejercicio, peso, reps, fecha anterior), opción de compartir. Mobile es el canal principal — priorizar ahí.' },
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
          { title: 'Tab Nutrición coach: logs de alimentos del atleta (últimos 7 días)', done: true, priority: 'P2', note: 'GET /api/coach/athlete/[id]/nutrition ahora devuelve foodLogs (7 días) con snapshot kcal/proteína/carbs/grasa por entrada. AthleteDetailClient tab Nutrición: sección "Registro alimenticio" — logs agrupados por día, totales vs target promedio (kcalHard+Easy+Rest)/3 con % de cumplimiento en color verde/naranja/rojo.' },
          { title: 'CoachAthlete.status ACTIVE/PAUSED — tab Pausados + toggle optimista', done: true, note: 'API PATCH /api/coach/athlete/[id]/status.' },
          { title: 'Mensajería asíncrona coach ↔ atleta (web + mobile)', done: true, note: 'Modelo Message. 4 endpoints web + 4 mobile. Badge unread sidebar. Polling 5s chat, 30s lista.' },
          { title: 'Finanzas: Payment model + CRUD + /coach/finanzas + badge mora', done: true, note: 'GET auto-marca OVERDUE. PaymentAuditLog trail (CREATED|MARKED_PAID|REMINDED). Badge mora en panel atletas.' },
          { title: 'Notificación al coach cuando atleta completa onboarding B2B', done: true, note: 'sendAthleteReadyEmail + sendPushNotification. Fire-and-forget.' },
          { title: 'applyPlanAdjustments: omite sesiones con edición manual del coach', done: true, note: 'Sesiones con coachNotes sin "[AUTO]" se saltan.' },
          { title: 'Off-by-one fecha sesión corregido — dayOfWeek - 1 en sessions y copy-prev', done: true, note: 'dayOfWeek=1 (lunes) + startDate(lunes) = lunes correctamente.' },
          { title: 'CoachAthlete.coachGoal + privateNotes: meta visible del atleta + notas privadas en Tab Resumen', done: true, note: 'Campos String? en schema CoachAthlete (db push). PATCH /api/coach/athlete/[id]/config acepta coachGoal y privateNotes junto a features. UI en AthleteDetailClient Tab Resumen: card "Seguimiento del coach" con inputs y botón guardar.' },
          { title: 'Adherencia de atletas calculada correctamente: sessions filtradas por date <= now (no incluye futuras)', done: true, note: 'Fix en athletes/page.tsx query + athletes/_lib/map-athlete.ts usa getPlanWeekNumber() canónico + clampea a totalWeeks. También corregido en /api/mobile/progress.' },
          { title: 'Lista operacional /coach/athletes separada del dashboard — paginación, filtros, SPORT_LABELS ampliados', done: true, note: 'SPORT_LABELS cubre RUNNING|STRENGTH|CYCLING|SWIMMING|TRIATHLON|FOOTBALL en AthleteTabs.tsx y dashboard/page.tsx. Label de alerta unificado: "Carga alta" (antes "RPE alta").' },
          { title: 'Coach notificado (push + email) cuando atleta completa check-in semanal', done: true, priority: 'P2', note: 'sendCoachCheckInEmail() en resend.ts. Ambos endpoints POST /api/checkin y /api/mobile/checkin hacen prisma.coachAthlete.findFirst() tras processCheckIn y envían email al coach con Energía, RPE y Peso — fire-and-forget vía .catch(() => {}).' },
          { title: 'Coach pre-llena perfil del atleta al crearlo: peso, altura, objetivo, sport — atleta solo confirma y pone contraseña', done: true, priority: 'P1', note: 'POST /api/coach/clients/create acepta opcionales: heightCm, weightKg, dateOfBirth, gender, experienceLevel. Si heightCm+weightKg presentes → tx.healthProfile.create(). Formulario /coach/clients/new tiene sección colapsable "Datos físicos". Derivan sport+goal a HealthProfile.sport/sportGoal.' },
          { title: 'Vista de atletas pendientes de onboarding en /coach/athletes — badge contador + botón reenviar link', done: true, priority: 'P1', note: 'Query paralela en /coach/athletes/page.tsx filtra coachAthletes donde athlete.onboardingCompleted=false. PendingAthletesSection (client component) muestra nombre, email, días desde invitación y botón "Copiar link" que llama GET /api/coach/athlete/[id]/invite-link (JWT 7d).' },
          { title: 'Onboarding mínimo para atletas B2B: nombre + contraseña → adentro, perfil completa después', done: true, priority: 'P2', note: 'GET /api/onboarding/prefilled devuelve HealthProfile del atleta si existe. OnboardingPage llama el endpoint en useEffect si session.user.isB2B. Pre-popula age/heightCm/weightKg/gender/experienceLevel en el estado del wizard. StepPhysical muestra banner azul "Tu entrenador ya registró estos datos" cuando hasPrefilled=true.' },
          { title: 'Dashboard coach: CTA "Copiar link de invitación" prominente junto a "+ Nuevo asesorado"', done: false, priority: 'P2', note: 'El invite link es el flujo principal de adquisición de atletas. Hoy el CTA visible es "+ Nuevo asesorado" (creación manual). Agregar botón "Copiar link" igual de visible en el header del dashboard.' },
          { title: 'Dashboard coach: alertas con tipo diferenciado (fatiga, dolor, estrés, motivación baja)', done: false, priority: 'P2', note: 'Hoy todas las alertas muestran "Carga alta". Mostrar el tipo real del trigger: DOLOR, RPE_ALTO, SUENO_BAJO, MOTIVACION_BAJA, etc. — mismo label que genera evaluateCheckInRules().' },
          { title: 'Dashboard coach: widget "Atletas sin plan asignado" y "Pendientes de onboarding"', done: false, priority: 'P2', note: 'Coach crea atletas pero puede olvidar asignarles plan o que estén en /pending. Agregar sección o badge en dashboard que muestre ambos conteos con link directo.' },
          { title: 'Dashboard coach: pagos vencidos visibles en dashboard principal', done: false, priority: 'P2', note: 'Si el coach tiene pagos OVERDUE (dueDate < now && PENDING), deben aparecer en el dashboard como alerta. Hoy solo están visibles en /coach/finanzas.' },
          { title: 'Dashboard coach: fix "Adherencia promedio 0%" cuando hay check-ins completados', done: true, priority: 'P1', note: 'Fix: filtrar athletesWithPlan (planStatus === ACTIVE) antes de calcular avgAdherence. Retorna null (mostrado como "—") si ningún atleta tiene plan activo. KpiCard actualizada con colores semafóricos. Branch: bugfix/mvp-ux-flows.' },
          { title: 'Dashboard coach: widget "Distribución deporte" sin datos — conectar o eliminar', done: false, priority: 'P3', note: 'Widget muestra "Sin datos de deporte". Si el query no devuelve datos con la data real de producción, eliminar el widget o conectar correctamente a CoachAthlete → User.sport.' },
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
          { title: 'WorkoutTemplate de sistema (coachId: null) — plantillas globales sin dueño', done: true, note: '"Fuerza corredor" (id: system-fuerza-corredor) en seed. coachId: null, isPublic: false.' },
          { title: 'Seed: WorkoutTemplate "Fuerza corredor" con 2 WorkoutDays (BASE y ESPECÍFICO)', done: true, note: 'BASE: sentadilla, lunges, hip thrust, talones 3×12-15. ESPECÍFICO: sentadilla, peso muerto, lunges, talones 4×8-10.' },
          { title: 'generate-plan.use-case.ts: vincular sesiones FUERZA al WorkoutDay de sistema según fase', done: true, note: 'RUNNING_GOALS + FUERZA_CORREDOR_DAY map en use case. BuiltSession.workoutDayId + createSessions lo persiste.' },
          { title: 'Gym tracker: cargar ejercicios del WorkoutDay cuando hay workoutDayId', done: true, note: '/api/gym/session/today ya tenía el plan-based fallback (líneas 127-215). Funcionaba pero sin workoutDayId en DB. Ahora el plan generator lo escribe.' },
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
          { title: '"Generar desde template → abrir en constructor" — precarga y edita', done: true, note: 'TEMPLATE_PREVIEW record en AthleteDetailClient.tsx: 6 goalTypes → {weeks, description, phases[]}. Card de preview bajo el selector de goalType en el modal de creación de plan — muestra semanas, descripción y badges de fases. Coach selecciona el objetivo y ve el template antes de generar.' },
          { title: 'PlannedSession.sportLabel String? — migración pendiente', done: true, note: 'Campo ya existía en schema+migración. UI añadida: campo "Etiqueta de deporte" en SessionModal (PlanBuilderClient.tsx), se muestra en blue-500 sobre la tarjeta de sesión. PATCH/POST sessions APIs actualizadas para persistirlo.' },
          { title: 'Copiar sesión de un atleta a otro — reutilización entre asesorados', done: false, priority: 'P2', note: 'Coach diseña una sesión perfecta para un atleta y quiere aplicarla a otro sin rehacer el trabajo. En el constructor visual: menú contextual en una SessionCard → "Copiar sesión a..." → selector de atleta + semana destino. API: POST /api/coach/plan/[planId]/sessions con body copiado de la sesión origen. Requiere que el coach sea owner de ambos planes. Diferente de "Copiar semana anterior" (que copia dentro del mismo atleta).' },
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
          { title: 'Medidas corporales en Tab Progreso del coach (cintura, brazos, caderas)', done: true, note: 'CheckInData extendido con waistCm/armsCm/hipsCm/thighsCm. Tabla de check-ins añade 4 columnas. Sección "Circunferencias corporales" con mini bar charts (4 colores: índigo/naranja/rosa/teal) en AthleteDetailClient.tsx. page.tsx mapea los 4 campos desde WeeklyCheckIn.' },
          { title: 'Notificación in-app al coach cuando atleta completa una sesión', done: true, note: 'Fix (push): notifyCoach() helper en gym/session/complete/route.ts envía push al coach vía pushToken tras cada sesión de gym. Idem en log/session/route.ts para sesiones de running. Fire-and-forget (catch→noop). Pendiente: badge in-app requeriría tabla Notification en DB.' },
          { title: 'Finanzas: filtro por atleta en /coach/finanzas', done: true, note: 'Ya implementado: filterAthlete state + select "Todos los atletas" visible cuando athletes.length > 1 + filter client-side byAthlete. Verificado en coach/finanzas/page.tsx.' },
          { title: 'generator.ts: calibrar zonas HR con benchmark reciente de running', done: false, note: 'Si hay 5K_TIME < 90 días → fórmula Riegel → ajusta intensidades del plan.' },
          { title: 'Duplicar plan entre atletas: copiar semanas de un atleta a otro con offset de fechas', done: true, priority: 'P1', note: 'POST /api/coach/athlete/[id]/plan/copy-from (body: sourcePlanId + startDate). GET /api/coach/plans lista todos los planes de atletas del coach. UI en AthleteDetailClient: toggle "Desde template" | "Copiar de otro atleta" — dropdown con atleta+plan+semanas, date picker de inicio. Recalcula fechas de semanas y sesiones desde el nuevo startDate.' },
          { title: 'Preview del plan desde perspectiva del atleta (modo lectura en el constructor)', done: true, priority: 'P2', note: 'BuilderHeader: botón "Vista atleta ↗" abre /coach/athlete/[id]/plan/view en nueva pestaña. Página read-only con semanas/sesiones + estado de completado.' },
          { title: 'Alertas de fatiga acumulada: índice compuesto (RPE>7 + sueño<6h + energía<3 en misma semana)', done: true, priority: 'P2', note: 'evaluate-rules.ts: regla compuesta fatiga_acumulada si triggers.length >= 3 → severity critical. Badge ⚠ Fatiga en AthleteTabs desktop + mobile. Trigger incluido en adjustmentsTriggered del check-in.' },
          { title: 'Vista comparativa de adherencia entre atletas (ranking o grid por atleta)', done: true, priority: 'P2', note: 'AthleteTabs: nueva pestaña "Por adherencia" ordena por adherencePct asc (peor primero). Umbrales corregidos: >80% verde, 60-80% ámbar, <60% rojo. Aplicado en table desktop + mobile cards.' },
          { title: 'Perfil público del coach (/join/[code]) con métricas reales: atletas activos, adherencia promedio, PRs del mes', done: true, priority: 'P2', note: 'GET /api/invite/[code] ahora incluye activeAthletes (count ACTIVE), avgAdherence (avg dietAdherencePct de check-ins), prsThisMonth (SetLog.isPR en GymSession del mes). Grid 3 columnas bajo el header del coach — solo visible si activeAthletes > 0. Prueba social anónima para prospectos.' },
          { title: 'Tarjeta de logro compartible para el atleta: semana perfecta, PR nuevo, racha de sesiones', done: false, priority: 'P2', note: 'Cuando el atleta completa todas las sesiones de la semana, bate un PR o alcanza una racha de 7+ días: generar tarjeta visual (imagen o componente) con el logro, nombre del atleta y logo de Medaliq. El atleta la comparte por WhatsApp o Instagram — el coach aparece en el contexto como su entrenador. Ciclo viral: prospectos del coach ven resultados reales.' },
          { title: 'Código de referido coach→coach: entrenador invita a otro, ambos reciben mes extendido', done: false, priority: 'P3', note: 'Coach genera su código de referido en /coach/settings. Nuevo coach se registra con el código → ambos reciben 30 días extra de su tier actual. Sistema de crédito simple: tabla CoachReferral { referrerId, newCoachId, redeemedAt, creditDays }. Crecimiento viral entre entrenadores — el canal de adquisición más barato en LatAm es la recomendación entre pares.' },
        ],
      },
      {
        id: 'coach-nutricion-constructor',
        label: 'Constructor Visual de Nutrición',
        period: 'Próximo',
        items: [
          { title: 'Schema: NutritionTemplate — plan nutricional reutilizable del coach', done: true, priority: 'P1', note: 'Fix: NutritionTemplate + NutritionTemplateDay + NutritionTemplateMeal + NutritionTemplateFoodItem + AssignedNutritionPlan en schema.prisma. enum NutritionDayType (HARD/EASY/REST). Relaciones en User + Food. Migración 20260702030112_nutrition_constructor aplicada en Neon prod.' },
          { title: 'API CRUD: GET + POST /api/coach/nutrition/templates', done: true, priority: 'P1', note: 'Fix: src/app/api/coach/nutrition/templates/route.ts. GET devuelve templates con días/comidas/ítems e _count.assignments. POST crea template + 3 days HARD/EASY/REST automáticamente.' },
          { title: 'API CRUD: GET + PATCH + DELETE /api/coach/nutrition/templates/[templateId]', done: true, priority: 'P1', note: 'Fix: src/app/api/coach/nutrition/templates/[templateId]/route.ts. DELETE bloqueado si assignmentCount > 0 (409).' },
          { title: 'API: POST + DELETE /api/coach/nutrition/templates/[templateId]/meals', done: true, priority: 'P1', note: 'Fix: src/app/api/coach/nutrition/templates/[templateId]/meals/route.ts. POST: upsert meal + create item con snapshot de macros. DELETE: ownership verificada por cadena item→meal→day→template. Validación VALID_DAY_TYPES + VALID_MEAL_TYPES.' },
          { title: 'API: POST /api/coach/nutrition/templates/[templateId]/assign', done: true, priority: 'P1', note: 'Fix: src/app/api/coach/nutrition/templates/[templateId]/assign/route.ts. POST: upsert AssignedNutritionPlan (reemplaza si ya existe). DELETE: desasigna. Verifica CoachAthlete.status=ACTIVE.' },
          { title: 'Página /coach/nutrition/templates — biblioteca de planes nutricionales', done: true, priority: 'P1', note: 'Fix: /coach/nutrition/page.tsx (server) + NutritionTemplatesClient.tsx (client). Grid de cards con totales por tipo de día (HARD/EASY/REST), #atletas asignados, CTA crear + editar + eliminar.' },
          { title: 'Constructor visual /coach/nutrition/templates/[templateId]/build', done: true, priority: 'P1', note: 'Fix: /coach/nutrition/templates/[templateId]/build/page.tsx + NutritionBuilderClient.tsx. Tabs día (HARD/EASY/REST) + comidas ordenadas + totales en tiempo real. Full-screen overlay, sin cambiar layout base.' },
          { title: 'Modal de búsqueda de alimentos en el constructor (reusar FoodSearch de /nutrition)', done: true, priority: 'P1', note: 'Fix: FoodSearchModal en NutritionBuilderClient.tsx. GET /api/nutrition/foods?q= existente. Quick-picks 50/100/150/200g + preview macros en tiempo real antes de agregar.' },
          { title: 'API mobile: GET /api/mobile/nutrition/assigned-plan', done: true, priority: 'P1', note: 'Fix: src/app/api/mobile/nutrition/assigned-plan/route.ts. Devuelve template asignado + comidas del día según intensidad de la sesión de hoy (HARD/EASY/REST). Incluye totales del día + targets NutritionPlan para comparación.' },
          { title: 'Atleta: personalización sobre plan asignado (swap de alimentos)', done: false, priority: 'P2', note: 'El atleta puede sustituir un alimento del plan del coach por otro equivalente en kcal/macros (±10%). El swap se guarda en AthleteNutritionOverride sin tocar el template del coach. Coach puede ver los swaps en Tab Nutrición.' },
          { title: 'Link en sidebar del coach: "Nutrición" → /coach/nutrition/templates', done: true, priority: 'P1', note: 'Fix: CoachSidebarClient.tsx — icono Salad + href /coach/nutrition. isActive añadido a exactMatch.' },
        ],
      },
    ],
  },

  // ─── PLATAFORMA ───────────────────────────────────────────────────────────────

  {
    id: 'plataforma',
    label: 'Plataforma — Marketplace & Admin',
    period: 'En construcción',
    color: '#ea580c',
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
      { title: 'SEO: meta tags + sitemap dinámico para /coaches y /p/[slug]', done: true, note: 'og:image, og:description. Indexables para "coach running Colombia".' },
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

  // ─── LANDING PAGE ─────────────────────────────────────────────────────────────

  {
    id: 'landing',
    label: 'Landing Page — Ventas & Credibilidad',
    period: 'En construcción',
    color: '#7c3aed',
    bgColor: '#faf5ff',
    borderColor: '#c4b5fd',
    phases: [
      {
        id: 'landing-p0',
        label: 'P0 — Legal & SEO Técnico (Bloqueante)',
        period: 'Urgente',
        items: [
          { title: 'Páginas /terminos y /privacidad con contenido real (Ley 1581 Colombia + LGPD Brasil básico)', done: true, priority: 'P0', note: 'Páginas existentes actualizadas: Ley 1581 de 2012 (Colombia) + LGPD Brasil (Lei 13.709/2018) + derechos ARCO + transferencias internacionales + fecha jul-2026.' },
          { title: 'Meta tags: <title>, <meta description> optimizados por página', done: true, priority: 'P0', note: 'layout.tsx ya tenía title/description. Cada page legal tiene su propio metadata export.' },
          { title: 'Open Graph tags (og:title, og:description, og:image) para preview en WhatsApp/LinkedIn/Twitter', done: true, priority: 'P0', note: 'DONE (PR #45): src/app/opengraph-image.tsx — ImageResponse edge (1200×630px). META_IMAGE=https://medaliq.com/opengraph-image. /coaches y /p/[slug] con generateMetadata propio.' },
          { title: 'robots.txt + sitemap.xml (incluyendo /coaches y /p/[slug])', done: true, priority: 'P0', note: 'src/app/robots.ts: allow público, disallow app privada. src/app/sitemap.ts: páginas estáticas + /p/[slug] dinámico desde CoachProfile.' },
          { title: 'hreflang para es/en/pt — indicar a Google el idioma de cada versión', done: true, priority: 'P0', note: 'layout.tsx metadata.alternates.languages: es/en/pt → medaliq.com (single-URL multilingüe). Genera <link rel="alternate" hreflang>.' },
          { title: 'Cookie consent banner — requerido si se usa cualquier analytics/pixel', done: true, priority: 'P0', note: 'src/app/_components/CookieConsent.tsx: banner en footer, Accept/Reject, guarda preferencia en localStorage (medaliq_cookie_consent). Añadido a layout.tsx.' },
          { title: 'Eliminar toda referencia a "Trial" o "30 días gratis" del copy de la landing — producto sin trial', done: true, priority: 'P0', note: 'Aplicado en ES/EN/PT: step1Desc, step5Title/Desc, proCta, freeF1/F2/F3, proF4, guarantee.badgeTitle, guarantee.faq4A. Keys trialLabel..trialF5 eliminadas de types.ts y las 3 traducciones. page.tsx: span "$79.99/año · 30 días gratis" reducido a solo "$79.99/año". Commit: fix(landing): eliminar referencias trial + corregir copy — P0 bloqueante.' },
          { title: 'Corregir paso 2 del flujo "Cómo funciona" — el sistema NO genera planes automáticamente', done: true, priority: 'P0', note: 'Corregido en step2Desc ES/EN/PT: "Medaliq genera su plan automáticamente" → "queda listo en minutos. Tú le asignas el plan desde tu panel." Mismo commit que el item de trial.' },
        ],
      },
      {
        id: 'landing-p1',
        label: 'P1 — Conversión y Credibilidad',
        period: 'Alta prioridad',
        items: [
          { title: 'Schema JSON-LD: Organization + SoftwareApplication — rich results en Google', done: true, priority: 'P1', note: 'DONE (PR #45): src/components/seo/json-ld.tsx. WebSite schema en layout.tsx. Person schema en /p/[slug].' },
          { title: 'Testimonios con foto real o avatar + nombre + ciudad + deporte (reemplazar texto plano)', done: false, priority: 'P1', note: 'Testimonios de texto sin foto tienen ~0% credibilidad. Mínimo: foto de perfil real o avatar generado con iniciales.' },
          { title: 'Contador de coaches/atletas creíble — reemplazar "8 entrenadores reservaron"', done: false, priority: 'P1', note: '"8 spots" suena a que nadie usa el producto. Cuando se tengan 20+ coaches: mostrar número real. Mientras: quitar o reformular.' },
          { title: 'Sección comparativa vs TrueCoach/Excel — tabla con diferenciador 0% fee', done: false, priority: 'P1', note: 'TrueCoach cobra 5% sobre pagos desde enero 2026. Es el diferenciador más fuerte y no se menciona explícitamente en la landing.' },
          { title: 'WhatsApp flotante o widget de contacto directo (estándar en LatAm)', done: true, priority: 'P1', note: 'DONE (PR #45): src/components/ui/whatsapp-button.tsx — flotante bottom-right, visible en rutas públicas. Lee NEXT_PUBLIC_WHATSAPP_NUMBER env.' },
          { title: 'Email capture secundario — formulario "únete a la lista" para quienes no convierten hoy', done: false, priority: 'P1', note: 'El 97% de visitantes no convierte en el primer visit. Sin captura de email no hay forma de hacer nurturing. CTA: "Recibe novedades y el guía gratuita de periodización".' },
          { title: 'Corregir copy mobile en pricing atleta PRO', done: true, priority: 'P1', note: 'proF4 actualizado en ES/EN/PT: "Webapp móvil incluida · App nativa en desarrollo". Aplicado en el mismo commit P0.' },
          { title: 'Google OAuth en /login visible pero en standby — activar o quitar de la UI', done: true, priority: 'P1', note: 'Botón "Continuar con Google" y divider eliminados de login/page.tsx. Flujo en standby — reactivar cuando se configure GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET en Google Cloud Console + Vercel. Branch: bugfix/mvp-ux-flows.' },
          { title: 'Subir el diferenciador 0% fee al hero section — visible en los primeros 3 segundos', done: false, priority: 'P1', note: 'El ahorro real de ~$60 USD/mes para un coach promedio ($1,200/mes en asesorados) vs TrueCoach (5% fee desde ene 2026) es el argumento de ventas más fuerte disponible hoy. Actualmente está enterrado en sección secundaria de pricing. Debe aparecer en el hero o sub-hero inmediatamente. Coaches que llegan desde búsqueda o referido no lo ven en los primeros 3 segundos → baja conversión.' },
          { title: 'Actualizar features del tier Free del atleta en pricing — alinear con modelo real', done: true, priority: 'P1', note: 'freeF1/F2/F3 actualizados en ES/EN/PT: incluye nutrición y gym, quita "dashboard básico". Aplicado en el mismo commit P0.' },
          { title: 'Agregar sección del flujo atleta B2C en landing — mostrar el valor del Free permanente', done: false, priority: 'P1', note: 'El modelo correcto: coach invita atleta → atleta entra gratis → atleta tiene experiencia real del producto → atleta potencialmente paga Pro. La landing no muestra este flujo. El atleta parece ser solo un costo para el coach, no un canal de adquisición independiente. Agregar sección que muestre que el atleta también obtiene valor real en Free.' },
        ],
      },
      {
        id: 'landing-p2',
        label: 'P2 — Ventas y Confianza',
        period: 'Próximo sprint',
        items: [
          { title: 'Video demo de 60-90 segundos — mostrar el flujo real del coach + atleta', done: false, priority: 'P2', note: 'Los coaches necesitan ver el producto antes de registrarse. Sin video demo la tasa de conversión de coaches es ~30% menor. Prioridad: pantalla de coach (panel de atletas + asignación de rutina).' },
          { title: 'Calculadora de ROI para coaches — "¿cuánto tiempo recuperas con Medaliq?"', done: false, priority: 'P2', note: 'Input: número de atletas. Output: horas/semana ahorradas + equivalente en dinero. Ancla el valor antes del precio.' },
          { title: 'Sección seguridad de datos — "Tus datos y los de tus atletas están seguros"', done: false, priority: 'P2', note: 'Los coaches manejan datos de salud de terceros. Un párrafo de seguridad (HTTPS, Neon, backups) reduce fricción de adopción.' },
          { title: 'Garantía con términos explícitos — "30 días o te ayudamos a exportar todo"', done: false, priority: 'P2', note: 'Actualmente mencionado en FAQ pero no destacado visualmente. Necesita un bloque visual propio con badge de garantía.' },
          { title: 'Página 404 personalizada con CTA y navegación de regreso', done: false, priority: 'P2', note: '404 genérico de Next.js pierde usuarios que llegaron por link incorrecto. Incluir: logo, mensaje amigable, botón home.' },
          { title: 'Meta Pixel + Google Tag Manager — tracking de conversiones para ads', done: false, priority: 'P2', note: 'Sin pixel no hay retargeting. Sin GTM no hay medición de conversión. Requerido antes de invertir en cualquier pauta paga.' },
        ],
      },
      {
        id: 'landing-p3',
        label: 'P3 — SEO Orgánico y Crecimiento',
        period: 'Mediano plazo',
        items: [
          { title: 'Blog/recursos — 2-3 artículos iniciales para SEO orgánico', done: false, priority: 'P3', note: 'Artículos target: "Cómo periodizar para runners principiantes", "Gestión de atletas online: guía para coaches". Tráfico orgánico sin inversión en pauta.' },
          { title: 'Landing pages por deporte — /running y /gym con copy específico', done: false, priority: 'P3', note: 'Permite rankear para búsquedas como "app para entrenadores de running Colombia". Copy diferente por segmento.' },
          { title: 'Sección de integraciones — Garmin, Strava, Apple Watch (aunque sea coming soon)', done: false, priority: 'P3', note: 'Genera percepción de producto maduro. Footer o sección "compatible con" con logos grises + "próximamente".' },
          { title: 'manifest.json y PWA básico — instalable desde el navegador móvil', done: false, priority: 'P3', note: 'Permite instalar la landing como app en home screen sin pasar por stores. Aumenta retention de usuarios móviles.' },
          { title: 'Press kit / media page — logo, screenshots, descripción oficial para prensa', done: false, priority: 'P3', note: 'Cuando un influencer fitness o medio quiera escribir sobre Medaliq, necesita assets. /press o /media con logo SVG, paleta, screenshots.' },
          { title: 'A/B testing de hero copy y CTA — validar variantes de conversión', done: false, priority: 'P3', note: 'Test A: copy actual "Tus atletas ven su progreso" vs Test B: copy pain-first "¿Cuántas horas pierdes en Excel cada semana?". Implementar con Vercel Edge Config o PostHog.' },
        ],
      },
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
          { title: 'Fix /upgrade/page.tsx — eliminar referencias a trial, corregir precio $15 → $9.99, actualizar features Free', done: true, priority: 'P0', note: 'Trial eliminado del modelo de negocio (2026-07-03). Corregido: título "Tu trial de 30 días terminó" → "Elige tu plan", Free features actualizadas (nutrición + gym), Pro $15 → $9.99, CTA mailto actualizado. Gap detectado al auditar Figma vs código.' },
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
          { title: 'INT-01 — Apple HealthKit + Google Health Connect: sync automático de actividades, FC, sueño y VO2max', done: false, priority: 'P1', note: 'Mayor impacto/esfuerzo: cualquier wearable que sincronice con el teléfono alimenta Medaliq automáticamente. iOS: expo-health o react-native-health (investigar si requiere bare workflow para VO2max/HRV). Android: react-native-health-connect (Android 9+). Datos: workouts → auto-completa SessionLog, FC en reposo → pre-rellena check-in, VO2max (Apple Watch) → HealthProfile.vo2maxEstimate, HRV → WeeklyCheckIn.hrvMs. Requiere campos nuevos en SessionLog: hrAvg, hrMax, caloriesBurned, avgPaceSecPerKm, dataSource, externalId. Ver integraciones.md.' },
          { title: 'INT-02 — Strava OAuth: importar actividades completadas → auto-completa SessionLog', done: false, priority: 'P1', note: 'API pública, OAuth 2.0, no requiere aprobación especial. Webhook para recibir actividades nuevas en tiempo real. Rate limit: 100 req/15min OK. Datos: tipo, distancia, duración, pace, HR media/máxima, splits por km. Muchos corredores ya tienen Strava — reduce fricción de registro a 0 para running. Ver integraciones.md.' },
          { title: 'INT-03 — Garmin Connect API: VO2max, HRV, Training Status, sueño, Body Battery', done: false, priority: 'P2', note: 'Más popular entre corredores serios en LatAm. Los datos más ricos del mercado: VO2max, HRV, Training Status (productivo/sobrecarga), Body Battery. REQUIERE INVESTIGACIÓN: partnership con Garmin Health API — proceso de aprobación y tiempo estimado desconocidos. Alternativa MVP: importar .fit files manualmente. Ver integraciones.md.' },
          { title: 'INT-04 — BLE HRM: conectar monitor de FC por Bluetooth durante sesión (Polar H10, Wahoo TICKR)', done: false, priority: 'P2', note: 'FC en tiempo real durante entrenamiento — visual de zona actual en gym tracker mobile. react-native-ble-plx, UUID 0x180D (Heart Rate Service). Atletas sin smartwatch pero con banda de FC (~$50-80 USD). Requiere bare workflow o config plugin. FC media/máxima → auto-guardada en SessionLog.' },
          { title: 'INT-05 — Schema DB: campos nuevos para datos de wearables en SessionLog y HealthProfile', done: false, priority: 'P1', note: 'Prerequisito para cualquier integración. Campos: SessionLog.hrAvg Int?, SessionLog.hrMax Int?, SessionLog.caloriesBurned Int?, SessionLog.avgPaceSecPerKm Int?, SessionLog.dataSource String? (MANUAL/STRAVA/GARMIN/HEALTHKIT), SessionLog.externalId String?. HealthProfile.vo2maxEstimate Float?. WeeklyCheckIn.hrvMs Float?. Una migración limpia antes de la primera integración.' },
        ],
      },
    ],
  },

  // ─── PRE-LANZAMIENTO ─────────────────────────────────────────────────────────

  {
    id: 'pre-launch',
    label: 'Pre-lanzamiento — QA & Tests E2E',
    period: 'En construcción',
    color: '#ea580c',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    items: [
      { title: 'Limpiar usuarios de prueba de producción antes del lanzamiento', done: true, priority: 'P0', note: 'EJECUTADO 2026-07-04. Script cleanup-users.ts eliminó 22 usuarios no-admin de Neon prod (incluyendo FKs sin CASCADE: Exercise, WorkoutTemplate, AssignedNutritionPlan). Solo queda admin@medaliq.com.' },
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

      // ── COMPLETADO ──────────────────────────────────────────────────────────
      { title: 'UserSubscription model en DB + /upgrade placeholder', done: true, note: 'UserSubscription model en DB (TRIAL|FREE|PRO). Botón temporal mailto: hasta integrar pasarela. NOTA: Trial fue eliminado del modelo de negocio (2026-07-03) — el enum DB existe pero se ignora en lógica nueva.' },
      { title: 'Feature flags: derivación por tier + límites de asesorados para coaches', done: true, note: 'computeAthleteFeatures(tier) + getCoachLimits(CoachTier) en domain/subscription/tier-features.ts. Enforcement en POST /api/coach/clients/create: 402 si activeCount >= maxAthletes.' },

      // ── P0 — PRERREQUISITOS: ejecutar en este orden antes de conectar Wompi ─
      {
        title: 'FIX — coachFeeRate() → coachTierFee() tier plano en domain/admin/finanzas.ts',
        done: false,
        priority: 'P0',
        note: 'coachFeeRate() usa modelo per-asesorado ELIMINADO ($6/$5/$3). Reemplazar por coachTierFee(coachTier: CoachTier): number que devuelve el fee plano del tier: STARTER→0, GROWTH→39, PRO→79, SCALE→129. Scale+ pendiente (requiere contar atletas sobre 100 → $129 + $1.50 × extra). Actualizar tests en finanzas.test.ts. Admin /admin/finanzas usa esta función para proyectar MRR de coaches — actualmente muestra valores incorrectos.',
      },
      {
        title: 'FIX — Bug tier:TRIAL en atletas B2B al crearlos',
        done: false,
        priority: 'P0',
        note: 'POST /api/coach/clients/create línea 117–123 crea UserSubscription con tier:TRIAL para atletas B2B. TRIAL fue eliminado del modelo. Al conectar Wompi estos atletas caerán a FREE incorrectamente. Fix: no crear UserSubscription para atletas B2B — su acceso viene del plan del coach vía mergeFeatures(), no de un tier. Si UserSubscription es requerida por otras queries, crearla con tier:FREE y sin trialEndsAt.',
      },
      {
        title: 'TIER-MODEL — Actualizar computeAthleteFeatures() al modelo definitivo',
        done: true,
        priority: 'P0',
        note: 'DONE: FREE={ plan:true, checkin:false, nutrition:true, progress:false, log:true, gym:true } — capa de registro. PRO/TRIAL={ todo true excepto coach }. Gate de pago: checkin + progress. Actualizado en tier-features.ts + test. Nótese que note original tenía plan:false incorrecto.',
      },
      {
        title: 'BILLING-PREP — getUserPlan() real + migración usuarios beta',
        done: true,
        priority: 'P0',
        note: 'DONE: getUserPlan() ahora lee BILLING_ENABLED env. Si false (beta) → PRO para todos. Si true → lee subscriptionTier param (TRIAL|PRO|FREE). Script scripts/migrate-beta-users.ts para migrar usuarios sin sub → TRIAL 30 días. Ejecutar con DRY_RUN=false antes de activar Wompi.',
      },
      {
        title: 'Admin — Panel manual de coachTier (P0 para design partners)',
        done: true,
        priority: 'P0',
        note: 'DONE: PATCH /api/admin/coach/[id]/tier + CoachTierDropdown en /admin/coaches. Select con badge por tier (STARTER/GROWTH/PRO/SCALE), upsert UserSubscription.coachTier, audit log. Branch: feature/admin-coach-tier.',
      },
      {
        title: 'B2B-ATHLETE-FREE — Atleta B2B nunca ve pantalla de pago',
        done: false,
        priority: 'P0',
        note: 'Atleta B2B tiene acceso completo incluido en plan del coach. Verificar que /upgrade y cualquier CTA de billing no aparezca si CoachAthlete.status=ACTIVE. getUserPlan() para B2B debe retornar acceso sin consultar UserSubscription.tier.',
      },

      // ── P1 — CHECKOUT Y WEBHOOK: primer cobro real ──────────────────────────
      {
        title: 'Checkout coach — POST /api/billing/coach/checkout',
        done: false,
        priority: 'P1',
        note: 'Flujo: coach llega al límite → 402 → frontend muestra upgrade modal con precio del siguiente tier → coach acepta → POST /api/billing/coach/checkout { targetTier } → server genera link de pago Wompi para el tier ($39/$79/$129/mes) → redirect a Wompi → pago → webhook actualiza coachTier. Validar: targetTier debe ser el tier inmediatamente superior al actual. Registrar en BillingEvent o PaymentAuditLog.',
      },
      {
        title: 'Checkout atleta Pro — POST /api/billing/athlete/checkout',
        done: false,
        priority: 'P1',
        note: 'Flujo: atleta B2C toca feature con gate Pro (checkin o progress) → modal "Activa Pro $9.99/mes" → POST /api/billing/athlete/checkout → server genera link Wompi $9.99/mes → redirect → pago → webhook activa PRO. Validar: solo para atletas con CoachAthlete=null (B2C puro) o CoachAthlete.status=INACTIVE. Atleta B2B activo NUNCA llega aquí.',
      },
      {
        title: 'Webhook Wompi unificado — POST /api/webhooks/wompi',
        done: false,
        priority: 'P1',
        note: 'Endpoint único que maneja eventos de ambos streams. Verificar firma Wompi (header X-Wompi-Signature). Eventos: (1) subscription.charge.success → identificar si es coach o atleta por metadata → actualizar coachTier o tier en UserSubscription → extender período 1 mes. (2) subscription.charge.failed → marcar gracia de 3 días → si falla de nuevo → downgrade. (3) subscription.cancelled → downgrade inmediato al siguiente ciclo. Idempotente: mismo eventId no procesar dos veces.',
      },
      {
        title: 'Downgrade automático — cron diario + lógica de gracia',
        done: false,
        priority: 'P1',
        note: 'Cron diario (POST /api/cron/billing-check): buscar UserSubscription con subscriptionEndDate < hoy y gracePeriodEndsAt < hoy → downgrade a STARTER (coach) o FREE (atleta). Gracia: 3 días desde subscriptionEndDate antes de downgrade efectivo. Email de advertencia al día 1 y día 3. Coach downgrade: CoachAthlete activos > 5 → marcar status=PAUSED los más recientes hasta quedar en ≤5.',
      },
      {
        title: 'Snapshot atleta activo en billing date — validación de tier del coach',
        done: false,
        priority: 'P1',
        note: 'Atleta activo para billing = CoachAthlete.status=ACTIVE + onboardingCompleted=true + al menos 1 SessionLog. El snapshot se toma el día 1 de cada mes (billing date). Si el count cambia de tier → notificación al coach 3 días antes: "Tienes X atletas activos — tu próxima factura será Y tier ($Z)". Sin prorrateo en v1: tier del mes completo basado en snapshot.',
      },
      {
        title: 'Notificación pre-billing al coach — 3 días antes del cobro',
        done: false,
        priority: 'P1',
        note: 'Cron 3 días antes de billing date: calcular atletas activos del coach → determinar tier → enviar email: "Tu próxima factura: X atletas activos → tier Y → $Z el [fecha]". Si el tier cambió respecto al mes anterior → indicarlo. Usa sendCoachBillingReminderEmail() via Resend.',
      },

      // ── P2 — GESTIÓN Y EXPANSIÓN ────────────────────────────────────────────
      {
        title: 'Página gestión de suscripción del atleta — /settings/subscription',
        done: false,
        priority: 'P2',
        note: 'Atleta Pro ve: plan actual, próximo cobro, método de pago, botón cancelar. Al cancelar: suscripción termina al final del período — no downgrade inmediato. Atleta Free ve: CTA upgrade con comparativa Free vs Pro.',
      },
      {
        title: 'Página gestión de suscripción del coach — /coach/settings/plan',
        done: false,
        priority: 'P2',
        note: 'Coach ve: tier actual, atletas activos vs límite, próximo cobro, historial de facturas. Botón upgrade (si no está en Scale) y botón downgrade (si activeCount lo permite). Muestra el precio del siguiente ciclo basado en snapshot actual de atletas.',
      },
      {
        title: 'Scale+ tier — $129 + $1.50/atleta activo sobre 100',
        done: false,
        priority: 'P2',
        note: 'Para coaches con más de 100 atletas activos: base $129/mes + $1.50 por cada atleta sobre 100. Ejemplo: 150 atletas = $129 + (50 × $1.50) = $204/mes. Implementar en coachTierFee() como case adicional. El checkout debe calcular el monto dinámicamente según snapshot del mes.',
      },
      {
        title: 'Admin: MRR real, churn mensual y ranking coaches por revenue',
        done: false,
        priority: 'P2',
        note: 'Reemplazar proyecciones estimadas por datos reales de UserSubscription. MRR = suma de suscripciones activas (coaches + atletas Pro). Churn = cancelaciones del mes / total activos. Gráfica histórica mensual. Ranking coaches: ordenados por número de atletas activos (proxy de revenue que aportan al tier).',
      },
      {
        title: 'Stripe para usuarios internacionales',
        done: false,
        priority: 'P2',
        note: 'Después de validar mercado colombiano con Wompi. Mismo flujo de checkout/webhook pero con Stripe. Detectar país del usuario → Wompi si CO/LatAm → Stripe si internacional.',
      },
      {
        title: 'Cobro en Nequi / PSE (Wompi los cubre nativamente)',
        done: false,
        priority: 'P2',
        note: 'Wompi soporta Nequi y PSE sin integración adicional — se activan en el dashboard de Wompi. Tarjeta sola excluye buena parte del mercado colombiano (bancarización ~50%). Activar Nequi en el dashboard de Wompi antes del lanzamiento público.',
      },
    ],
  },

  // ─── SEGURIDAD & IDENTIDAD DEL COACH ────────────────────────────────────────

  {
    id: 'coach-identidad',
    label: 'Coach — Identidad & Verificación',
    period: 'Pre-lanzamiento',
    color: '#7c3aed',
    bgColor: '#faf5ff',
    borderColor: '#c4b5fd',
    items: [
      {
        title: 'DB migration: User.identification + User.phoneWa únicos para coaches',
        done: false,
        priority: 'P0',
        note: 'Agregar columnas: identification String? @unique (cédula/pasaporte, formato libre, 5-30 chars) y phoneWa String? @unique (E.164: +57XXXXXXXXXX). Unicidad validada solo entre role=COACH. Sin estas columnas no se puede implementar prevención de fraude de múltiples cuentas. Ver domains/coach-identidad.md para reglas completas.',
      },
      {
        title: 'Onboarding coach: recopilar identification + phoneWa antes de invitar atletas',
        done: false,
        priority: 'P0',
        note: 'Flujo: registro coach → primer login → banner "Completa tu perfil profesional" → paso con identification (obligatorio) + phoneWa en E.164 (obligatorio). No bloquea acceso al panel — bloquea POST /api/coach/clients/create hasta completar. Endpoint: PATCH /api/coach/profile con validación de unicidad (409 si ya existe esa cédula o ese WhatsApp en otro coach).',
      },
      {
        title: 'Validación unicidad: identification y phoneWa al completar perfil coach',
        done: false,
        priority: 'P0',
        note: 'POST /api/coach/profile → buscar User con mismo identification o phoneWa donde role=COACH → 409 con mensaje claro: "Ya existe un coach registrado con esa identificación" / "Ya existe un coach registrado con ese número de WhatsApp". Previene creación de múltiples cuentas para obtener Starter gratis N veces.',
      },
      {
        title: 'Bloqueo POST /api/coach/clients/create si perfil coach incompleto',
        done: false,
        priority: 'P1',
        note: 'Si el coach no tiene identification y phoneWa → devolver 403 con code: PROFILE_INCOMPLETE y mensaje: "Completa tu perfil antes de invitar atletas". Esto garantiza que todo coach que invita atletas ya pasó por la validación de identidad.',
      },
      {
        title: 'Definición canónica de atleta activo para billing',
        done: false,
        priority: 'P1',
        note: 'Atleta cuenta como activo si: (1) CoachAthlete.status = ACTIVE + (2) onboardingCompleted = true + (3) al menos 1 SessionLog registrado. Atletas sin sesión no cuentan → previene cuentas fantasma para inflar/desinflar conteo. Usar esta definición en el endpoint de billing snapshot y en el panel admin.',
      },
      {
        title: 'Admin: ver identification y phoneWa del coach — panel de verificación',
        done: false,
        priority: 'P1',
        note: 'En /admin/coaches: columnas identification y phoneWa visibles solo para admin. Permite verificación manual ante sospecha de fraude. Nunca exponer identification en APIs públicas ni en el perfil del coach.',
      },
      {
        title: 'PhoneWa en perfil público del coach (/p/[slug]) — opt-in',
        done: false,
        priority: 'P2',
        note: 'El coach puede autorizar que su número WhatsApp aparezca en su perfil público como link wa.me/. Campo booleano showPhoneWa en CoachProfile o User. Por defecto: false. Si true → link de contacto directo en /p/[slug] y en /coaches marketplace.',
      },
      {
        title: 'Scale+ tier: $129 base + $1.50/atleta activo sobre 100',
        done: false,
        priority: 'P2',
        note: 'Para coaches con más de 100 atletas activos: $129/mes cubre hasta 100. Cada atleta adicional sobre 100 = $1.50/mes. Ejemplo: 150 atletas = $129 + (50 × $1.50) = $204/mes. Implementar en el cálculo de factura mensual del coach. Requiere que la definición de atleta activo esté implementada primero.',
      },
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
        note: 'Implementado via coach-activity.ts: detecta actividad de coaches en los últimos 7 días combinando mensajes enviados (Message.fromId) y pagos creados/actualizados (Payment). Visible en /admin/coaches. User.lastActiveAt descartado — el approach actual es suficiente.',
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

  // ─── PLATAFORMA — ADMIN + MARKETPLACE + NOTIFICACIONES ──────────────────────

  {
    id: 'plataforma',
    label: 'Plataforma — Admin, Marketplace & Notificaciones',
    color: '#7c3aed',
    bgColor: '#faf5ff',
    borderColor: '#c4b5fd',
    phases: [
      {
        id: 'plataforma-admin',
        label: 'Admin — Gestión y BI',
        period: 'P1-P2',
        items: [
          { title: 'PLT-01 — Estados de usuario: ACTIVE / SUSPENDED / BLOCKED / DELETED en DB y admin panel', done: false, priority: 'P1', note: 'Hoy solo existe activación vía feature flags. Agregar enum UserStatus { ACTIVE, SUSPENDED, BLOCKED, DELETED } en User model. SUSPENDED: temporal (pago), BLOCKED: por admin (términos), DELETED: soft-delete con anonimización de datos. Admin puede cambiar estado desde /admin/users/[id]. Middleware chequea status !== ACTIVE → 401. Migración + endpoints + UI en admin.' },
          { title: 'PLT-02 — Distribución geográfica de usuarios en /admin/metrics', done: false, priority: 'P2', note: 'User.timezone ya existe (ej. "America/Bogota"). Derivar país/ciudad desde timezone. Mostrar mapa de calor o tabla: país → coaches activos / atletas. Identifica dónde está la tracción para priorizar marketing y soporte. Sin necesidad de campo country explícito — timezone es suficiente para LatAm.' },
          { title: 'PLT-03 — Atletas sin coach (B2C tracker puro) como segmento visible en /admin/metrics', done: false, priority: 'P2', note: 'Hoy solo se ven coaches y atletas totales. Agregar: atletas con coach activo vs atletas B2C sin coach. Este segmento B2C puro es importante — son usuarios del producto que podrían ser futuros B2B. Query: User[ATHLETE] WHERE NOT EXISTS CoachAthlete[ACTIVE].' },
          { title: 'PLT-04 — Configuración de AI en /admin: modelo, guardrails, kill switch', done: false, priority: 'P3', note: 'Cuando AI-Coach se integre, el admin necesita: (1) selección de modelo Anthropic, (2) edición de system prompt y guardrails desde UI, (3) toggle por tier (¿qué atletas tienen acceso?), (4) métricas de uso: tokens/semana y costo estimado, (5) kill switch para deshabilitar sin deploy. Implementar solo cuando AI esté activa. Requiere SystemConfig en DB para persistir config.' },
        ],
      },
      {
        id: 'plataforma-marketplace',
        label: 'Marketplace — Directorio de coaches',
        period: 'P2 — cuando 20+ coaches activos',
        items: [
          { title: 'PLT-05 — Abrir /coaches con filtros: especialidad, ciudad, nivel, precio referencial', done: false, priority: 'P2', note: 'Hoy /coaches existe en código pero está oculto de la navegación. Condición de apertura: 20+ coaches activos con perfil completo. Filtros: CoachSpecialty (RUNNING/GYM/NUTRITION/ALL), ciudad derivada de timezone, precio referencial (rango). Ordenamiento: atletas activos DESC. Requiere CoachSpecialty en DB (ARCH-02).' },
          { title: 'PLT-06 — Botón "Contactar coach" en /p/[slug] con WhatsApp como canal primario', done: false, priority: 'P2', note: 'Flujo marketplace: atleta descubre coach → click "Contactar" → abre WhatsApp del coach (CoachProfile.whatsapp) con mensaje pre-redactado. Acuerdan términos fuera de la plataforma. Coach activa atleta desde su panel. Medaliq NO intermedia el pago — 0% fee es permanente. El botón es de contacto, no de pago.' },
        ],
      },
      {
        id: 'plataforma-notificaciones',
        label: 'Notificaciones — Centro in-app y crons',
        period: 'P1-P2',
        items: [
          { title: 'PLT-07 — Centro de notificaciones in-app (campana + feed de eventos)', done: false, priority: 'P1', note: 'Modelo Notification { userId, type, title, body, read, createdAt, metadata }. Feed en sidebar con badge de no leídas. Tipos: SESION_HOY, CHECKIN_DISPONIBLE, PLAN_ACTUALIZADO, MENSAJE_COACH, AJUSTE_NUTRICIONAL, LOGRO, PROPUESTA_COACH. El centro in-app es el canal primario — push y email son fallback cuando el atleta no está en la app.' },
          { title: 'PLT-08 — Cron: atleta sin actividad 3+ días → push + email re-engagement', done: false, priority: 'P2', note: 'Query: User[ATHLETE] WHERE max(SessionLog.completedAt) < now()-3d AND onboardingCompleted=true. Push: "Te extrañamos — tu plan te espera". Email: re-engagement con resumen de última sesión y CTA. Frecuencia máxima: 1/semana por usuario. No enviar si ya recibió otro email ese día.' },
          { title: 'PLT-09 — Cron: racha en riesgo → push al atleta (1 día sin actividad)', done: false, priority: 'P2', note: 'Atleta que registró actividad ayer pero no hoy → push "¿Hoy no entrenas? Tu racha de N días sigue activa." Solo si el atleta tiene racha activa ≥ 3 días. Query: users con SessionLog ayer pero no hoy. Hora: 20:00 timezone del atleta.' },
          { title: 'PLT-10 — Cron: atleta en /pending 48h → push + email al coach', done: false, priority: 'P1', note: 'Ya documentado en atleta.md. Query: CoachAthlete[ACTIVE] WHERE User.onboardingCompleted=true AND User.featurePlan=false AND coachAthlete.createdAt < now()-48h. Notificación al coach: "Miguel Atencia completó su perfil hace 2 días. Actívalo para que pueda empezar." Push + email al coach.' },
        ],
      },
    ],
  },

  // ─── MÓDULO NUTRICIÓN ────────────────────────────────────────────────────────
  // Scope independiente para trabajo a profundidad en nutrición (atleta + coach + sistema)
  // Los items de atleta-nutricion y coach-nutricion-constructor permanecen en sus scopes originales
  // Este scope cubre features avanzadas no capturadas allá

  {
    id: 'modulo-nutricion',
    label: 'Módulo Nutrición — Profundización',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    phases: [
      {
        id: 'nutricion-atleta-avanzado',
        label: 'Atleta — Tracking Avanzado',
        period: 'Próximo',
        items: [
          { title: 'Biblioteca de alimentos custom del atleta: agregar alimentos propios (nombre, kcal/100g, macros)', done: false, priority: 'P1', note: 'POST /api/nutrition/foods/custom con userId. Alimento visible solo para ese atleta. Útil para comidas típicas colombianas o productos locales no en la DB global. Aparece en búsqueda con badge "Personalizado".' },
          { title: 'Escaneo de código de barras — Open Food Facts API desde mobile', done: false, priority: 'P2', note: 'Mobile: expo-barcode-scanner + GET https://world.openfoodfacts.org/api/v0/product/{barcode}. Si existe → precargar kcal/macros en LogFoodModal. No requiere DB propia. Fallback a búsqueda manual si no se encuentra.' },
          { title: 'Recetas compuestas: grupo de alimentos guardados como una unidad (ej. "Mi desayuno habitual")', done: false, priority: 'P2', note: 'Modelo Recipe { userId, name } → RecipeIngredient[] { foodId, grams }. Kcal y macros calculados en tiempo real. Aparece en búsqueda de alimentos como item compuesto. Simplifica el log diario para comidas repetidas.' },
          { title: 'Historial de adherencia nutricional diario en /progress (gráfica 30 días)', done: false, priority: 'P2', note: 'FoodLog agrupado por fecha → % vs target del día usando getDailyNutritionTarget(). Gráfica de barras similar a adherencia de entrenamiento. Complementa la vista semanal ya existente en /api/mobile/nutrition/log/summary.' },
          { title: 'Contexto de fase en nutrición: texto explicativo según semana del plan (carga vs descarga)', done: false, priority: 'P2', note: 'PlanWeek.isRecoveryWeek y PlannedSession.intensity ya existen. Texto en NutritionContent: "Semana de carga — prioriza carbos" o "Semana de descarga — baja 10% calorías". Sin cambiar targets automáticamente.' },
          { title: 'Metas de hidratación diaria: log rápido de agua y barra de progreso en dashboard', done: false, priority: 'P3', note: 'WaterLog { userId, date, ml } modelo nuevo. Quick-tap desde dashboard: +250ml. NutritionPlan.waterMlTarget Int? (default 2000ml). Barra de progreso en tarjeta de nutrición del dashboard.' },
        ],
      },
      {
        id: 'nutricion-coach-avanzado',
        label: 'Coach — Supervisión Nutricional',
        period: 'Próximo',
        items: [
          { title: 'Coach ve logs de alimentos del atleta en Tab Nutrición (últimos 7 días + adherencia diaria)', done: true, priority: 'P1', note: 'DONE: API agrega grams al select. FoodLogsSection: filas por día expandibles (resumen kcal/% target/P·C·G + detalle individual alimento/gramos/kcal al expandir). AthleteDetailClient usa FoodLogsSection. Branch: feature/coach-nutrition-logs.' },
          { title: 'Coach ajusta targets de macros del atleta individualmente (sin tocar template base)', done: false, priority: 'P1', note: 'PATCH /api/coach/athlete/[id]/nutrition/targets: { targetKcalHard?, targetKcalEasy?, targetKcalRest?, proteinG? }. Persiste en NutritionPlan del atleta como override. No toca el template del sistema ni del constructor.' },
          { title: 'Vista de adherencia nutricional del atleta en panel del coach (semana actual + tendencia 4 semanas)', done: false, priority: 'P2', note: 'Tab Nutrición en AthleteDetailClient: card "Adherencia nutricional esta semana" con % y badge color. Sparkline de 4 semanas. Query: FoodLog + NutritionPlan por atleta.' },
          { title: 'Alerta al coach cuando atleta tiene adherencia nutricional < 60% tres días seguidos', done: false, priority: 'P2', note: 'Cron diario o trigger post-log. Condición: FoodLog con ratio < 0.6 en 3 días consecutivos. Agrega alerta al feed del coach en /coach/dashboard con severidad "medium".' },
          { title: 'Panel coach: adherencia nutricional calculada (FoodLog) vs auto-reportada (check-in) — vista comparativa', done: false, priority: 'P2', note: 'Hoy el coach ve nutritionAdherencePct del check-in (auto-reportado, subjetivo). Por otro lado, FoodLog tiene la adherencia real calculada. Mostrar ambos en Tab Nutrición del atleta con badge de diferencia: "Reportó 80% · Real: 52% ← posible desconexión". Requiere query de FoodLog para el período del check-in.' },
        ],
      },
      {
        id: 'nutricion-sistema',
        label: 'Sistema — Base de Datos y Precisión',
        period: 'Próximo',
        items: [
          { title: 'Ampliar librería con 200+ alimentos colombianos y latinoamericanos', done: false, priority: 'P1', note: 'Hoy la DB tiene alimentos genéricos. Añadir: arepas, bandeja paisa, sancocho, pandebono, empanadas, calentado, jugos, masato, etc. con macros verificados. Seed con category: "LATAM". Diferenciador vs MyFitnessPal para el mercado colombiano.' },
          { title: 'Categorías de alimentos en búsqueda: proteínas, carbos, grasas, frutas, lácteos, snacks', done: false, priority: 'P2', note: 'FoodProfile.category ya existe en schema. Chips/filtros en modal de búsqueda de alimentos (web + mobile). Reduce fricción del log cuando el atleta no recuerda el nombre exacto.' },
          { title: 'MealPlan versionado: historial de cambios del plan nutricional asignado por el coach', done: false, priority: 'P3', note: 'MealPlan.version ya existe en schema. Agregar MealPlanVersion { userId, version, data, assignedAt, assignedBy }. Coach puede ver cuándo cambió el plan y comparar versiones. Trazabilidad completa.' },
        ],
      },
    ],
  },

  // ─── MÓDULO FUERZA ────────────────────────────────────────────────────────────
  // Scope independiente para trabajo a profundidad en fuerza (tracking, rutinas, progresión)
  // "Fuerza" cubre gym, home workout, calistenia, fortalecimiento corredor — más amplio que "Gym"
  // En UI: renombrar a "Fuerza". En código: mantener gym/GymSession/featureGym para evitar migración.

  {
    id: 'modulo-fuerza',
    label: 'Módulo Fuerza — Profundización',
    color: '#1e3a5f',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    phases: [
      {
        id: 'fuerza-atleta-ux',
        label: 'Atleta — UX del Tracker',
        period: 'Próximo',
        items: [
          { title: 'Timer descanso configurable por ejercicio (coach define restSeconds en constructor)', done: false, priority: 'P1', note: 'WorkoutExercise.restSeconds Int?. Coach lo define en el wizard de rutinas. Gym tracker mobile usa ese valor como default del countdown. Atleta puede sobreescribir en sesión para ese día.' },
          { title: 'Sustitución de ejercicio durante sesión activa (swap in-session)', done: false, priority: 'P1', note: 'Botón "Sustituir" en cada ejercicio del gym tracker. Abre modal de búsqueda por grupo muscular equivalente. Swap registrado en SetLog.exerciseName. Coach ve qué sustituciones hace el atleta en Tab Gym.' },
          { title: 'Curva de fuerza por ejercicio: gráfica de 1RM estimado histórico', done: false, priority: 'P1', note: 'Brzycki: 1RM = peso × (36 / (37 - reps)). Gráfica de línea en /progress y en Tab Gym del coach. Período: últimas 12 semanas. Permite al atleta ver su progresión real más allá del peso máximo en un solo día.' },
          { title: 'Sesión auto-dirigida con búsqueda en librería de ejercicios (sin template requerido)', done: false, priority: 'P1', note: 'Gym libre ya funciona. Mejorar: input de búsqueda en la DB de ejercicios (39 globales + custom del coach) en lugar de solo nombre libre. Filtro por grupo muscular. Nombre libre como fallback.' },
          { title: 'Visualización de sesión anterior mejorada: Δ peso/reps por set (verde si mejora, rojo si baja)', done: false, priority: 'P1', note: 'Ya hay referencia de sesión anterior parcialmente. Mejorar UX: mostrar el delta visual en cada set row (ej. "+2.5kg vs sem anterior"). Atleta ve de inmediato si está progresando.' },
          { title: 'Drop sets y sets de calentamiento: marcar tipo de set (trabajo / calentamiento / drop)', done: false, priority: 'P2', note: 'SetLog.setType enum: WORK | WARMUP | DROPSET. Sets no-WORK excluidos de cálculo de volumen y PR detection. Visual diferenciado en gym tracker (color gris para warmup, naranja para drop).' },
          { title: 'RPE por ejercicio individual al terminar todos sus sets (no solo RPE de sesión completa)', done: false, priority: 'P2', note: 'SetLog.rpe Int? o por WorkoutExercise al completar todos sus sets. Promedio pesa en GymSession.rpe. Coach ve distribución de esfuerzo por ejercicio para ajustar volumen individualmente.' },
        ],
      },
      {
        id: 'fuerza-coach',
        label: 'Coach — Supervisión y Progresión',
        period: 'Próximo',
        items: [
          { title: 'Coach ve historial completo de gym del atleta: tabla de sesiones, ejercicios, volumen, RPE', done: false, priority: 'P1', note: 'Tab Gym en AthleteDetailClient ya tiene gráfica de peso. Ampliar: tabla con fecha, ejercicios completados, volumen total kg, RPE. Paginación 20/página. Exportable a CSV.' },
          { title: 'PRs consolidados en panel del coach: todos los récords del atleta agrupados por ejercicio', done: false, priority: 'P1', note: 'GET /api/coach/athlete/[id]/gym/prs. Query: setLog.findMany({ where: { isPR: true }, include: { session } }). Sección "Récords Personales" en Tab Gym con ejercicio, peso, reps y fecha.' },
          { title: 'Plantillas de rutina reutilizables entre atletas: duplicar plantilla de otro atleta como base', done: true, priority: 'P1', note: 'DONE: POST /api/coach/gym/routines/[id]/copy — deep copy en $transaction (template + days + exercises + supersets). DuplicateRoutineButton en /coach/gym, redirige al clon para edición inmediata. Branch: feature/routine-copy.' },
          { title: 'Progresión automática de cargas ajustada: incremento si >90% sets completados, baja si <60%', done: false, priority: 'P2', note: 'suggestedNextWeightKg ya existe y se incrementa en +2.5 al completar. Agregar lógica: si completedRatio < 0.6 → suggestedNextWeightKg - 2.5. Coach puede desactivar la progresión automática por ejercicio.' },
          { title: 'Carga de entrenamiento semanal por atleta: volumen total kg y alerta >20% vs semana anterior', done: false, priority: 'P2', note: 'KPI en Tab Gym del coach: sum(weightKg × repsCompleted × completed) esta semana vs anterior. Alerta roja si incremento >20% (misma lógica que carga de running en Tab Plan). Previene sobreentrenamiento.' },
          { title: 'Vídeos de referencia por ejercicio en el constructor (URL YouTube o Blob)', done: false, priority: 'P3', note: 'Exercise.videoUrl String?. En gym tracker mobile: botón "Ver técnica" abre video en fullscreen. Útil para atletas remotos. Coach puede asignar video por ejercicio en el constructor de rutinas.' },
        ],
      },
      {
        id: 'fuerza-mobile',
        label: 'Mobile — Offline & Wearables',
        period: 'Futuro',
        items: [
          { title: 'Offline support para gym session tracker (AsyncStorage con sync al reconectar)', done: false, priority: 'P1', note: 'Guardar sets localmente y sincronizar al reconectar. Crítico para gyms sin WiFi o cobertura. AsyncStorage → cola de sync → POST /api/gym/session/complete al volver online. Feature más crítica para mobile gym.' },
          { title: 'Apple Watch companion: iniciar sesión de fuerza y registrar sets desde la muñeca', done: false, priority: 'P3', note: 'watchOS extension con WatchConnectivity. Ejercicio actual + timer descanso + conteo de sets en la muñeca. Sync directo al teléfono. Requiere expo bare workflow + native module.' },
        ],
      },

      // ── EJERCICIOS — PRODUCTO ────────────────────────────────────────────────
      {
        id: 'fuerza-producto',
        label: 'Módulo Ejercicios — producto',
        period: 'P1-P2',
        items: [
          { title: 'EJ-01 — Renombrar "Gym" → "Ejercicios" en UI (nav, labels, títulos)', done: true, priority: 'P2', note: 'Renombrado completo de UI: i18n (es/en/pt), sidebars atleta y coach (vía s.gym), tab "Ejercicios" en AthleteDetail (+ comparaciones activeTab), página /coach/gym h1, historial breadcrumb, DailySessionCard, onboarding labels, coaches page filter, ProfileForm/ProgramForm/ProfileSection, upgrade/admin, help pages, api error msgs, mobile fallback label. Código, DB, feature flags y rutas sin tocar.' },
          { title: 'EJ-02 — Atleta crea su propia rutina (self-coach path sin coach asignado)', done: false, priority: 'P2', note: 'Atleta B2C puede crear una rutina estructurada desde la app: define días de entrenamiento, agrega ejercicios por día desde la biblioteca. Rutina guardada como WorkoutTemplate del atleta (isPublic=false, createdBy=athleteId). Si coach le asigna rutina después → la del coach tiene prioridad y reemplaza la del atleta. API: POST /api/athlete/routines + GET/PATCH/DELETE. UI: /gym/routines (atleta).' },
          { title: 'EJ-03 — Selector de disciplina en sesión libre: Gym / Running / Fortalecimiento / Descanso', done: false, priority: 'P1', note: 'Cuando el atleta registra una sesión libre, debe elegir la disciplina primero. Gym: ejercicios + sets + cargas. Running: distancia + duración + FC + pace + RPE. Fortalecimiento funcional: ejercicios sin carga fija. Descanso/Off: sin campos de actividad, solo nota opcional. Cada disciplina carga su propio formulario. Aplica web y mobile.' },
          { title: 'EJ-04 — Día off/descanso como sesión registrada que cuenta para métricas', done: false, priority: 'P2', note: 'El atleta puede registrar un día de descanso deliberado (SessionType: DESCANSO). Este registro aparece en el historial y cuenta como "día activo en la app" para métricas de racha y consistencia — no como sesión de entrenamiento completada. Diferencia para el coach: día off registrado = atleta siguió el plan de recuperación; sin registro = sin información.' },
          { title: 'EJ-05 — Métricas multi-período en /progress: mensual, trimestral, semestral, anual', done: false, priority: 'P2', note: 'Hoy solo existe vista semanal en dashboard y /progress. Agregar: (1) mensual: volumen total, sesiones, PRs del mes. (2) trimestral: curva de fuerza y tendencia de adherencia en 12 semanas. (3) semestral: progresión de composición corporal (peso + medidas del check-in). (4) anual: hitos y logros del año. Aplica web y mobile /progress.' },
          { title: 'EJ-06 — Benchmarks UI para el atleta: registrar y ver sus propios tests de rendimiento', done: false, priority: 'P3', note: 'PerformanceBenchmark ya existe en DB (1RM_SQUAT, 1RM_BENCH, 5K_TIME, etc.) con CHECK constraints en DB + validación VALID_SPORTS/VALID_METRICS. Pendiente: (1) endpoints /api/mobile/progress/benchmarks (GET+POST) — NO existen todavía, (2) endpoints web /api/progress/benchmarks, (3) UI atleta en web (/progress o /gym), (4) Tab Rendimiento en perfil atleta del coach.' },
          { title: 'EJ-07 — Panel de adherencia del plan por atleta en coach dashboard', done: false, priority: 'P1', note: 'Coach entra al perfil del atleta y ve: % de sesiones completadas vs asignadas esta semana y últimas 4 semanas. Badge semafórico (verde >80%, amarillo 60-80%, rojo <60%). Esta es la señal de gestión principal del coach — no alertas realtime. Tab Adherencia en AthleteDetailClient. Query: PlannedSession.log vs total por período.' },
        ],
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
          { title: 'BUG-025 — Gym: POST /api/gym/session/complete rechaza CUID/slugs con "Invalid UUID"', done: true, priority: 'P0', note: 'Fix: z.string().uuid() → z.string().min(1) en 5 campos de gym/session/complete/route.ts (SetPayloadSchema.workoutExerciseId, ExerciseOverrideSchema x2, GymCompleteSchema.assignedWorkoutId+plannedSessionId). Idem en api/log/session/route.ts:plannedSessionId y api/mobile/log/session/route.ts:sessionId.' },
          { title: 'BUG-026 — Dashboard: dots de consistencia semanal muestran 0 tras completar sesión de gym (modo FREE)', done: true, priority: 'P2', note: 'Root cause: dots w-2 (8px) demasiado pequeños para detectar visualmente + Next.js Router Cache puede servir /dashboard stale. Fix: dots w-2→w-3 (12px) + revalidatePath("/dashboard") en gym/session/complete/route.ts en ambos paths (plannedSession y assignedWorkout). La lógica weekSessionCount era correcta.' },
          { title: 'BUG-016 — Plan "Gym / Ganar músculo" incluye 3 sesiones de running/semana', done: true, priority: 'P1', note: 'Fix: nuevo STRENGTH_TRAINING_16W en templates.ts — Upper/Lower 4 días (Lun/Mar/Jue/Vie), sin RODAJE_Z2. Push/Quad/Pull/Posterior con progressión de fases BASE→DESARROLLO→ESPECIFICO→AFINAMIENTO. PLAN_TEMPLATES apunta STRENGTH_TRAINING al nuevo template.' },
          { title: 'BUG-017 — Registro de sesión del plan es binario (Sí/No), sin métricas reales', done: true, priority: 'P1', note: 'Fix: LogModal ahora detecta tipo de sesión. Running (RODAJE_Z2,FARTLEK,TEMPO,etc): campo distanceKm + ritmo calculado (mm:ss/km). FUERZA: card con link al módulo Gym. EditModal también agrega distanceKm para running. API PATCH /log/session/[logId] acepta distanceKm. Datos mapeados en page.tsx vía logDistanceKm.' },
        ],
      },

      // ── ONBOARDING & PLAN ─────────────────────────────────────────────────────
      {
        id: 'bugs-onboarding',
        label: 'Onboarding & Plan',
        period: 'Urgente',
        items: [
          { title: 'BUG-002 — Onboarding "Plan personalizado" no genera el plan automáticamente', done: true, priority: 'P0', note: 'Fix: onboarding/page.tsx redirige RUNNING/BOTH a /new-goal tras completar setup (antes iba a /dashboard vacío). dashboard/page.tsx agrega CTA "Crear plan" para modo FREE sin historial previo. El onboarding por diseño solo configura nutrición + perfil; el plan se genera en /new-goal.' },
          { title: 'BUG-005 — /new-goal no hereda la meta elegida en onboarding; falta opción "Ganar músculo"', done: true, priority: 'P1', note: 'Fix: page.tsx convertida a server component → lee HealthProfile.sportGoal → pasa defaultGoal a NewGoalClient.tsx (nuevo client component). Pre-selecciona la meta del onboarding con banner informativo. Añadida opción STRENGTH_TRAINING al selector.' },
          { title: 'BUG-021 — Onboarding pregunta el deporte 3 veces y los días disponibles 2 veces', done: true, priority: 'P2', note: 'Resuelto en commit dcdda75 (feat: simplificar wizard a 3 pasos). El onboarding actual tiene solo goal → physical → generating. No hay repetición de deporte ni días disponibles. Tests existentes en onboarding-steps.test.ts verifican los flujos.' },
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
          { title: 'EDGE-06 — /api/checkin y /api/mobile/checkin: validar min/max en todos los campos numéricos', done: true, priority: 'P2', note: 'Fix: weightKg con min(10).max(500) en ambas rutas. Todos los campos numéricos ya tenían min/max en Zod. Web: api/checkin/route.ts, Mobile: api/mobile/checkin/route.ts.' },
          { title: 'BUG-022 — HealthProfile.age almacenado, no calculado — se vuelve stale después del onboarding', done: true, priority: 'P1', note: 'Fix: calcAge(dob) en src/lib/utils/calc-age.ts calcula edad en runtime desde dateOfBirth. health-profile.repository.ts ahora incluye dateOfBirth en find(). process-check-in.use-case.ts usa runtimeAge = calcAge(profile.dateOfBirth) con fallback a profile.age. Tests en calc-age.test.ts (8 casos).' },
          { title: 'BUG-023 — InviteCode.usedBy es String? sin FK — referencia huérfana si el usuario se elimina', done: true, priority: 'P2', note: 'Fix: usedByUser User? @relation("UsedInvites", onDelete: SetNull) en schema.prisma. Migración 20260630000001 aplica FK a prod. Admin page /admin/invite-codes ahora usa include: { usedByUser } en lugar de lookup manual + join manual — elimina segunda query y el Map.' },
        ],
      },

      // ── UI / UX ATLETA ────────────────────────────────────────────────────────
      {
        id: 'bugs-ux',
        label: 'UI/UX Atleta',
        period: 'Urgente',
        items: [
          { title: 'BUG-006 — Bottom-nav mobile omite Nutrición, Progreso y Mensajes', done: true, priority: 'P1', note: 'Nav tiene 6 tabs visibles: Inicio · Plan · Gym · Nutrición · Progreso · Perfil. Mensajes accesible desde Perfil con badge de unread count — patrón correcto para no saturar la barra. Checkin oculto del nav (href:null) pero accesible como ruta.' },
          { title: 'BUG-008 — Guardar no refresca la vista hasta recargar (stale UI)', done: true, priority: 'P2', note: 'Fix dual: (1) PlanClient.tsx SessionDetailCard.onSaved agrega router.refresh() para invalidar cache de Next.js y refrescar props server-side al editar sesión. (2) ProfileClient.tsx calcula displayAge/displayHrMax desde prop p (server-refreshed) en lugar de profileForm state, así FC máxima en modo vista refleja datos actualizados.' },
          { title: 'BUG-018 — KPI cards hermanas con 3 tratamientos visuales distintos', done: true, priority: 'P2', note: 'Fix: KpiCard compartido en src/app/_components/kpi-card.tsx (props: label, value, sub, color, center). Usado en coach/dashboard (local eliminado), admin/metrics y coach/finanzas. getDisplayStatus extraída a src/lib/coach/payment-status.ts con 6 tests.' },
          { title: 'BUG-012 — Enums crudos visibles en UI (RACE_10K, HYPERTROPHY, CHEST…)', done: true, priority: 'P3', note: 'Fix: src/lib/labels/enum-labels.ts fuente canónica (GOAL_LABEL + SPORT_LABEL + ROLE_LABEL + label()). Aplicado en admin/users/_components/UsersTable.tsx (columna Deporte/Objetivo) y admin/users/[id]/page.tsx (Deporte+Objetivo de salud). 25 tests.' },
          { title: 'BUG-013 — "Zona N/A" en sesiones de fuerza', done: true, priority: 'P3', note: 'Fix: shouldShowZone(sessionType, zoneTarget) en src/lib/plan/zone-utils.ts. Guard aplicado en WeekDayStrip.tsx (DashboardCard + GridCell) y PlanBuilderClient.tsx. Oculta zona si FUERZA o zoneTarget es N/A/vacío. 10 tests.' },
          { title: 'BUG-014 — Leyenda "KM por fase" repite la etiqueta ESPECÍFICO', done: true, priority: 'P3', note: 'Fix: normalizePhase() en ProgressClient.tsx elimina tildes antes del lookup en PHASE_BAR_COLOR. DB puede guardar ESPECÍFICO o ESPECIFICO — normalización garantiza color correcto en ambos casos.' },
          { title: 'BUG-015 — Dos lugares para registrar métricas (Check-in vs Perfil)', done: true, priority: 'P3', note: 'Fix: hint en ProfileClient.tsx explicando que Perfil = datos base permanentes, Check-in semanal = seguimiento semanal con link directo a /checkin. No hay lógica duplicada — los endpoints son distintos (healthProfile vs weeklyCheckIn).' },
          { title: 'BUG-019 — Sin escala consistente de border-radius (0/4/10/18px mezclados)', done: true, priority: 'P3', note: 'Fix: rounded-md → rounded-lg en ActivateButton, DeleteUserButton, NutritionConstructor y DailySessionCard (badges). rounded-[8px] → rounded-lg en CheckInClient textareas. Escala canónica: inputs/botones=rounded-lg, cards=rounded-xl, cards grandes=rounded-2xl, badges pequeños=rounded-full.' },
          { title: 'BUG-020 — Touch targets < 44px (selector idioma ~20px, links 15px)', done: true, priority: 'P3', note: 'Fix: min-h-[44px] min-w-[44px] en LanguageSwitcher.tsx (py-3 + px-2.5) y botones logout de los 3 sidebars (athlete SidebarClient, CoachSidebarClient, AdminSidebarClient). Área táctil 44×44px sin cambio visual apreciable.' },
          { title: 'A11Y-02 — lang="pt" en HTML root (debería ser "es")', done: true, priority: 'P3', note: 'Working as designed: layout.tsx usa lang={locale} dinámico via getServerLocale(). DEFAULT_LOCALE="es" — cookieless users reciben "es". User con cookie pt="pt" recibe "pt" correctamente (producto multilingüe es/en/pt).' },
          { title: 'BUG-045 — Landing pública muestra CTAs en inglés cuando browser language=en', done: true, priority: 'P1', note: 'QA-2026-07-03: CTAs en landing (/) aparecen en inglés ("Reserve free access", "I\'m a coach", "I\'m an athlete", "Start free") cuando el Accept-Language del browser es "en". DEFAULT_LOCALE debería forzar español para la landing pública independientemente del browser, ya que el mercado objetivo es LatAm. Investigar getServerLocale() en layout.tsx — ¿usa Accept-Language header en lugar de solo la cookie? Fix: para rutas públicas (/) ignorar Accept-Language y usar siempre DEFAULT_LOCALE="es", o al menos para la landing de marketing.' },
          { title: 'BUG-046 — Check-in viernes: mensaje "espera al viernes" cuando HOY es viernes', done: true, priority: 'P2', note: 'DONE: checkin/page.tsx ya usa nowInTz (timezone America/Bogota) para dayOfWeek. isEarlyInWeek = dayOfWeek >= 1 && dayOfWeek <= 4 → viernes (5) siempre abre formulario directo.' },
          { title: 'BUG-047 — Dashboard Sebastián: hero muestra "Sin plan activo" pero widget semanal muestra plan 5K', done: false, priority: 'P2', note: 'QA-2026-07-03: El dashboard de sebastian.rios@medaliq.com muestra en el hero "Sin plan activo" pero la sección ESTA SEMANA muestra "🏆 5K — 8 semanas · 0/13 sesiones completadas · Recuperación · día 8/14". El plan existe (posiblemente en estado COMPLETED o con status no reconocido por el hero). El hero y el widget semanal deben derivar el plan del mismo source. Investigar qué campo/status hace que el hero muestre "Sin plan" mientras el widget sí lo detecta.' },
          { title: 'BUG-048 — Onboarding paso 2: sin feedback de validación al usuario (valores inválidos bloqueados en silencio)', done: true, priority: 'P2', note: 'Fix: isStepValid() ahora valida rangos (edad 10-100, altura 100-250, peso 30-300). onboarding/page.tsx muestra mensajes de error inline en rojo bajo cada campo fuera de rango. Label "Talla" → "Altura" (UX-02). Branch: bugfix/mvp-ux-flows.' },
          { title: 'BUG-049 — Sidebar idioma persiste en PT (Portugués) entre sesiones de usuarios en ES', done: true, priority: 'P2', note: 'QA-2026-07-03: El sidebar de navegación muestra labels en Portugués ("Sair", "Início", "Meu Plano", "Nutrição") para múltiples usuarios (Ana, Miguel, Juan, Sebastián) aunque el contenido de la página está en español. El selector de idioma muestra "PT" activo. La cookie de idioma queda persistida en PT desde sesiones anteriores y no se limpia al hacer logout o al login de un nuevo usuario. Fix: al hacer login, verificar si hay cookie de idioma y solo resetear a DEFAULT_LOCALE="es" si el usuario no tiene preferencia explícita guardada en DB.' },
          { title: 'BUG-050 — /checkin UI muestra "Semana 6 · 22 may" aunque el check-in se guardó correctamente en semana 12', done: true, priority: 'P1', note: 'Fix: weekData sintético construido cuando PlanWeek no existe en DB. startMs = plan.startDate + (currentWeek-1)*7días. Elimina fallback al último PlanWeek. checkin/page.tsx. Branch: bugfix/mvp-ux-flows.' },
          { title: 'BUG-051 — Botón "Actualizar datos de esta semana" en /checkin redirige al home en lugar de abrir formulario', done: true, priority: 'P2', note: 'DONE: CheckInClient.tsx — onUpdate={() => setOpenForm(true)} abre formulario inline. SubmittedCheckInView recibe y usa onUpdate correctamente.' },
          { title: 'BUG-052 — Click en Guía de alimentos de /nutrition navega a /progress (event bubbling)', done: true, priority: 'P2', note: 'DONE: TrackingSection y FoodGuide son divs independientes en nutrition/page.tsx sin wrapper de Link a /progress. FoodCard usa buttons. No hay propagación.' },
          { title: 'BUG-053 — /nutrition: sin botón eliminar alimento registrado en el log del día (web)', done: true, priority: 'P2', note: 'DONE: TrackingSection.tsx tiene handleDelete() + botón ✕ por cada log entry. Llama DELETE /api/nutrition/log/[id] y refresca la lista.' },
          { title: 'BUG-054 — /gym/session: click en "×" de set de ejercicio colapsado navega al home', done: true, priority: 'P1', note: 'QA-2026-07-03: En la sesión activa de gym (/gym/session), al intentar registrar un set "×" en un ejercicio que no está expandido activamente, el evento navega a https://www.medaliq.com/ (home) en lugar de registrar la serie. Solo funciona registrar sets en el ejercicio que está actualmente expandido. Causa probable: el elemento "×" dentro del acordeón colapsado tiene un link o un ancestor con href="/" que captura el click antes del handler de registrar serie. Verificar GymSessionClient.tsx — los set markers dentro de acordeones colapsados tienen event bubbling hacia un elemento clickeable que apunta al home. Fix: stopPropagation() en el handler de click del set marker, o reestructurar el DOM para que el link padre no envuelva los set markers.' },
          { title: 'BUG-055 — Peso inconsistente: /plan y /profile (75kg) vs /dashboard y /progress (73.5kg)', done: true, priority: 'P2', note: 'Fix: syncWeight compara vs profile.weightKg (base) no vs check-in previo. `const prev = profile.weightKg ?? newWeight`. process-check-in.use-case.ts. Branch: bugfix/mvp-ux-flows.' },
          { title: 'BUG-056 — Dashboard ESTA SEMANA: calendario muestra ✓ Rodaje Z2 (SessionLog) pero DailySessionCard muestra "😴 Descanso hoy" (PlanWeekSession)', done: true, priority: 'P1', note: 'CÓDIGO LOCALIZADO 2026-07-03. Dos componentes independientes con fuentes desincronizadas. (1) DashboardCalendarStrip llama /api/athlete/calendar → buildCalendarWeek() en src/infrastructure/db/calendar.ts:41-105 que consulta PlannedSession + SessionLog + GymSession y los reconcilia en week-day-cells.ts:73-78 → muestra ✓ Rodaje Z2. (2) DailySessionCard usa datos del server en dashboard/page.tsx:330-341 que SOLO consulta PlannedSession → si plan dice DESCANSO, todaySession=null → DailySessionCard línea 125-129 muestra "😴 Descanso hoy". Contador "0/0 completadas" en page.tsx:367-369 también ignora SessionLog. FIX: en dashboard/page.tsx:330, si todayPlanned.type === DESCANSO, revisar también SessionLog del día y pasarlo a DailySessionCard como actividad libre registrada.' },
          { title: 'BUG-057 — Dashboard "0/0 completadas" ignora SessionLog: atleta que entrena libremente no ve progreso semanal', done: true, priority: 'P2', note: 'CÓDIGO LOCALIZADO 2026-07-03. Archivo: src/app/(athlete)/dashboard/page.tsx líneas 367-369. `completedCount = selectedPlanWeekSessions.filter(s => s.log && s.type !== DESCANSO).length` y `totalTraining = selectedPlanWeekSessions.filter(s => s.type !== DESCANSO).length`. Ambos solo cuentan PlannedSession — SessionLog (actividades libres via /log/run) no entra. FIX: consultar también SessionLog de la semana actual y sumar al contador, o mostrar un contador adicional "N actividades libres esta semana" en DailySessionCard.' },
          { title: 'BUG-058 — /plan semanas sin PlanWeek en DB muestran "Día de descanso" sin distinguir de plan incompleto', done: true, priority: 'P1', note: 'Fix: condición !week antes del else → "📋 Semana sin sesiones definidas" vs "😴 Día de descanso". PlanClient.tsx. Branch: bugfix/mvp-ux-flows.' },
          { title: 'BUG-059 — /plan adherencia histórica 0% en semanas con plan vacío: métrica engañosa para atleta', done: true, priority: 'P2', note: 'QA-2026-07-03: El historial de adherencia en /plan muestra 0% para semanas 10-14. Técnicamente correcto (0 sesiones planificadas / 0 sesiones completadas = no aplica), pero se muestra como 0% que parece "mal desempeño". Las semanas donde el plan no tiene sesiones deberían mostrarse como "—" o "sin datos" en lugar de 0%. Fix: en el cálculo de adherencia, si denominador === 0 → mostrar null/"—" en lugar de 0%. Verificar el componente de adherencia en /plan y en /progress.' },
          { title: 'BUG-060 — /nutrition: CTA "¿Quieres un plan de comidas?" aparece aunque el atleta ya tiene NutritionPlan activo', done: false, priority: 'P3', note: 'QA-2026-07-03: En /nutrition, se muestra el CTA "Configura tu plan nutricional →" aunque Miguel ya tiene NutritionPlan con macros completos (1733 kcal REST, 150g P, 118g C, 52g G). El CTA debería desaparecer cuando el usuario ya tiene plan nutricional configurado. Fix: NutritionClient.tsx — condicional que solo muestre el CTA si nutritionPlan === null o si los macros están todos en 0.' },
          { title: 'BUG-061 — /progress adherencia histórica 0% en todas las semanas (doble causa: seed no guarda el campo + API calcula mal)', done: true, priority: 'P1', note: 'CÓDIGO LOCALIZADO 2026-07-03. CAUSA 1 — Seed no persiste el campo: prisma/seed.ts:258-264 crea WeeklyCheckIn con wkg/hr/sleep/score/rpe/pain/energy/notes pero OMITE `adh` (adherencia). El campo DB se llama `dietAdherencePct` (schema.prisma:449) — el seed nunca lo popula, queda en null. CAUSA 2 — API calcula adherencia solo desde logs: src/app/api/mobile/progress/route.ts:86-91 `adherencePct: adherencePct(w.sessions)` que cuenta `PlannedSession.log !== null`. Nunca consulta WeeklyCheckIn.dietAdherencePct. FIX DOBLE: (1) prisma/seed.ts:259 agregar `dietAdherencePct: ci.adh` al create de WeeklyCheckIn. (2) progress/route.ts:86: en la query incluir WeeklyCheckIn para la semana y usar su dietAdherencePct si existe, sino calcular desde sessions.' },
          { title: 'BUG-062 — /progress: texto "ÚLTIMAS 1 SESIONES" gramaticalmente incorrecto', done: false, priority: 'P3', note: 'QA-2026-07-03: El historial de actividad en /progress muestra "HISTORIAL DE ACTIVIDAD — ÚLTIMAS 1 SESIONES". Cuando hay 1 resultado, el texto debería ser "ÚLTIMA SESIÓN" o "ÚLTIMAS N SESIONES" (pluralización condicional). Fix: condicional en ProgressClient.tsx — if (sessions.length === 1) ? "ÚLTIMA SESIÓN" : `ÚLTIMAS ${sessions.length} SESIONES`.' },
          { title: 'BUG-063 — /gym B2B: atleta sin rutina asignada bloqueado sin acceso a plantillas (early return en gym/page.tsx:95-106)', done: true, priority: 'P2', note: 'Fix: early return eliminado. B2B sin rutina ve banner azul "Tu coach aún no te asignó una rutina" + plantillas públicas debajo. B2C sin coach ve plantillas directamente sin banner. Branch: bugfix/mvp-ux-flows.' },
          { title: 'BUG-064 — /gym: sin opción de registrar sesión libre mientras se espera rutina del coach', done: false, priority: 'P2', note: 'QA-2026-07-03: La pantalla "Tu coach gestionará tu rutina" en /gym no ofrece ninguna acción alternativa. El atleta no puede registrar una sesión de fuerza libre, no tiene acceso a /log/gym (si existe), y no hay enlace a ningún logger. Fix: agregar botón "Registrar sesión libre" o enlace a plantillas. Relacionado con BUG-063.' },
          { title: 'BUG-065 — /log/run: sin redirect ni confirmación visual tras guardar corrida', done: true, priority: 'P2', note: 'DONE: log/run/page.tsx ya hace router.push("/dashboard") tras POST exitoso. Feedback visual implícito vía navegación.' },
          { title: 'BUG-066 — /log/run: slider de duración no se resetea al valor default después de guardar', done: false, priority: 'P3', note: 'QA-2026-07-03: El slider de duración en /log/run queda en el último valor usado (ej. 50 min) en lugar de volver al default (45 min) después de guardar o cancelar. Fix: resetear todos los campos del formulario al estado inicial en el handler onSuccess. Verificar LogRunClient.tsx — el reset() del form state.' },
          { title: 'BUG-067 — /profile: fecha de nacimiento vacía pero edad muestra "30 años" (edad hardcodeada en HealthProfile.age)', done: true, priority: 'P2', note: 'DONE: ProfileClient.tsx muestra `{p.dateOfBirth ? calcAge(p.dateOfBirth) : p.age} años` — calcula dinámicamente desde birthDate si existe. Formulario de edición tiene campo dateOfBirth. calcAge() implementada con lógica correcta de cumpleaños.' },
          { title: 'BUG-068 — /progress: gap S7-S11 en gráfico de peso por check-in guardado en semana incorrecta (encadenado con BUG-050)', done: false, priority: 'P2', note: 'QA-2026-07-03: El gráfico de peso en /progress salta de S6 a S12 sin datos intermedios. Causa encadenada: BUG-050 hace que el check-in de hoy (semana real 12) se guarde como WeeklyCheckIn con weekNumber=6. Por lo tanto no existe ningún registro en S7-S11. Cuando BUG-050 se corrija, este gap desaparecerá automáticamente — el check-in se guardará en S12 y el gráfico tendrá el punto correcto. No requiere fix independiente, pero documentar como consecuencia de BUG-050.' },
          { title: 'BUG-069 — Onboarding: contador "Paso X de Y" cambia el total dinámicamente al seleccionar opciones', done: false, priority: 'P3', note: 'QA-2026-07-03: Al entrar al onboarding muestra "Paso 1 de 1". Al seleccionar actividad cambia a "Paso 1 de 2". Al seleccionar género en paso 2 cambia a "Paso 2 de 3". El total es reactivo al state en lugar de ser fijo. Archivo: src/app/onboarding/page.tsx:423 — totalSteps depende de getSteps(data) que recalcula con cada cambio. Fix: calcular totalSteps una sola vez al montar el componente o usar el máximo posible de pasos.' },
          { title: 'BUG-070 — /new-goal: pre-selección de meta no corresponde al deporte elegido en onboarding', done: true, priority: 'P2', note: 'DONE (ARCH-01): onboarding ya no redirige a /new-goal. Flujo normal nunca llega a /new-goal tras onboarding. Bug irrelevante en el flujo actual.' },
          { title: 'BUG-071 — /new-goal: "Error generando plan" (HTTP 500) — WorkoutDay FK no existe en producción', done: true, priority: 'P0', note: 'Fix (UX-04): /new-goal ya no genera plan. NewGoalClient llama PATCH /api/athlete/sport que guarda goalType en HealthProfile y redirige a /dashboard. El plan se genera cuando el coach lo asigne o vía flujo posterior. Branch: bugfix/mvp-ux-flows.' },
          { title: 'NEW-P1-01 — PaywallCard muestra precio inconsistente: $15/mes vs $9.99/mes en /upgrade', done: true, priority: 'P1', note: 'Fix: ctaLabel default en PaywallCard.tsx cambiado de "$15/mes" a "$9.99/mes". Precio canónico: $9.99/mes según upgrade/page.tsx y todos los CTAs de pricing.' },
          { title: 'NEW-P1-02 — GENERAL_FITNESS en selector /new-goal no existe en GoalType enum DB', done: true, priority: 'P1', note: 'Fix: GENERAL_FITNESS eliminado del array GOALS en NewGoalClient.tsx. No hay template ni GoalType::GENERAL_FITNESS en el schema — si algún flujo intentara guardarlo en TrainingPlan.goalType daría error 500. HealthProfile.sportGoal (String) lo aceptaba sin error hoy, pero era una bomba de tiempo. GoalTypes válidos: RACE_5K, RACE_10K, STRENGTH_TRAINING, BODY_RECOMPOSITION.' },
          { title: 'NEW-P0-03 — /progress: calcAdherencePct incluye sesiones DESCANSO en denominador → adherencia siempre menor que en dashboard', done: true, priority: 'P0', note: 'Fix: calcAdherencePct ahora filtra s.type !== DESCANSO antes de calcular. Semana con 5 training + 2 DESCANSO, 5 completados: antes 71%, ahora 100%. Consistente con dashboard/page.tsx que ya filtra DESCANSO explícitamente.' },
          { title: 'NEW-P1-04 — Precio inconsistente $15/mes en paywalls de /plan, /progress, /gym/session, /gym/history', done: true, priority: 'P1', note: 'Fix: 4 CTAs "Pro $15/mes" → "Pro $9.99/mes" en plan/page.tsx, progress/page.tsx, gym/session/page.tsx, gym/history/page.tsx. Precio canónico $9.99/mes. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P2-05 — mapWebCheckinBody defaultea rpe=5, sleepHours=7, stressLevel=0 para campos no enviados → datos fake en DB', done: true, priority: 'P2', note: 'Fix completo web + mobile: CheckInInput hace rpe/sleepHours/energyLevel/stressLevel opcionales; evaluate-rules añade !== undefined guards; mapper web elimina defaults; mapper mobile elimina sleepHours??7 y stressLevel??3; repositorio usa ??undefined para omitir del write. Cubierto en detalle por NEW-P2-10. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P2-06 — gym sessions (GymSession, no SessionLog) no cuentan en streakDays — getDashboardSummary calcula streak solo desde SessionLog', done: true, priority: 'P2', note: 'Fix aplicado — ver NEW-P2-11. DashboardInput recibe gymCompletionDates?: Date[]; streak mergea SessionLog y GymSession. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P2-07 — nutrition/generate fetcha user.goals pero la variable goal nunca se usa (dead code)', done: false, priority: 'P2', note: 'La query include: { goals: {...} } en api/nutrition/generate/route.ts trae datos que se asignan a const goal = user.goals[0] pero goal nunca se referencia. calculateMacros usa profile.weightGoalKg directamente. Fix: eliminar goals del include.' },
          { title: 'NEW-P1-08 — CalendarStrip mostraba semana diferente al dashboard/plan cuando el plan no empezaba en lunes', done: true, priority: 'P1', note: 'buildCalendarWeek() usaba el lunes del calendario como referencia (monday - startDate). getPlanWeekNumber() usa Date.now(). Divergían si el plan empezaba en día no-lunes. Fix: calendar.ts usa currentPlanWeek = getPlanWeekNumber(startDate) + weekOffset — misma fuente de verdad que dashboard, /plan y checkin. weekOffset=0 siempre es la semana actual; -1/+N es navegación relativa coherente. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P1-09 — /gym: banner "Sesión de fuerza programada" nunca aparecía (PlannedSession.date no existe)', done: true, priority: 'P1', note: 'gym/page.tsx buscaba PlannedSession con where: { date: { gte: todayStart } } pero PlannedSession usa dayOfWeek (1-7), no un campo date. La query siempre retornaba null → banner nunca visible. Fix: query usa dayOfWeek: todayDow + week: { planId, weekNumber: currentWeekForBanner } calculado con getPlanWeekNumber. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P2-10 — Check-in mapper persistía valores fake (rpe=5, sleepHours=7, energyLevel=5, stressLevel=0) para campos no enviados por el atleta', done: true, priority: 'P2', note: 'Fix web + mobile: (1) CheckInInput hace rpe/sleepHours/energyLevel/stressLevel opcionales; (2) evaluate-rules añade !== undefined checks antes de disparar trigger; (3) mapper web elimina defaults; (4) mapper mobile elimina sleepHours??7 y stressLevel??3 (opcionales en MobileCheckinBody); (5) repositorio usa ?? undefined para omitir campos del write. muscleSoreness y energyLevel siguen requeridos en mobile. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P2-11 — Streak del dashboard no contaba sesiones de gym (GymSession), solo SessionLog', done: true, priority: 'P2', note: 'getDashboardSummary calculaba streak solo desde recentLogs (SessionLog). Atleta solo-gym con AssignedWorkout tenía streak=0 aunque entrenara todos los días. Fix: DashboardInput recibe gymCompletionDates?: Date[]; el streak ahora merges las dos fuentes. dashboard/page.tsx fetcha GymSession.date (take: 60) y los pasa. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P1-10 — /api/messages/me retornaba coachId incluso cuando la relación CoachAthlete no era ACTIVE', done: true, priority: 'P1', note: 'La query no filtraba status: "ACTIVE". Si el coach había desvinculado al atleta (status INACTIVE/REMOVED), el chat seguía mostrándose y el atleta podía seguir enviando mensajes. Fix: where: { athleteId: userId, status: "ACTIVE" }. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P1-11 — /api/mobile/dashboard no pasa gymCompletionDates al use case → streak 0 para usuarios gym-only en mobile', done: false, priority: 'P1', note: 'getDashboardSummary recibe gymCompletionDates?: Date[] (añadido en NEW-P2-11), pero /api/mobile/dashboard/route.ts no fetcha GymSession ni pasa el campo. Mismo bug que existía en web, ya corregido ahí. Fix: añadir prisma.gymSession.findMany({ where: { athleteId: userId, completed: true }, take: 60, select: { date: true } }) al Promise.all y pasar gymCompletionDates al use case.' },
          { title: 'NEW-P1-12 — nutrition/page.tsx hace upsert (write) durante render de Server Component → GET que escribe a DB', done: false, priority: 'P1', note: 'Líneas 102-128: si no hay NutritionPlan pero sí HealthProfile, calcula TDEE y hace prisma.nutritionPlan.upsert durante el render. Mismo patrón que PERSIST-09 (corregido en mobile). Race condition si dos tabs cargan simultáneamente. Fix: mover a POST /api/nutrition/init que se llama desde onboarding o desde un useEffect en el client. El upsert con update:{} ya es idempotente, pero violarla REST y ralentiza el render.' },
          { title: 'NEW-P1-13 — NEW-P1-09 nota incorrecta: PlannedSession.date SÍ existe en schema como DateTime (no nullable)', done: false, priority: 'P1', note: 'La nota de NEW-P1-09 dice "PlannedSession.date no existe" pero el schema tiene `date DateTime` (requerido, no nullable). El banner no aparecía por timezone mismatch (date en UTC, comparación con fecha local de Bogota). La solución dayOfWeek+weekNumber es igualmente correcta. Verificar si el generador de planes popula PlannedSession.date correctamente — si lo hace, el mobile/progress adherencePct con `where: { date: { lte: new Date() } }` podría tener el mismo timezone bug en atletas con UTC-5.' },
        ],
      },

      // ── ONBOARDING UX — mejoras identificadas QA 2026-07-03 ──────────────────
      {
        id: 'mejoras-onboarding',
        label: 'Onboarding UX',
        period: 'Próximo sprint',
        items: [
          { title: 'UX-01 — Simplificar paso 1 de onboarding: de 4 opciones a 2 (Ejercicios / Running)', done: true, priority: 'P1', note: 'QA-2026-07-03: Las 4 opciones actuales (Ejercicios, Running, Ejercicios+Running, Solo trackear) generan fricción. El usuario promedio LatAm se identifica con "voy al gym" o "corro". Propuesta: 2 opciones — Ejercicios (sub-pregunta interna: objetivo de composición corporal) y Running (sub-pregunta: distancia objetivo + fecha). "Ejercicios+Running" y "Solo trackear" son edge cases que se manejan post-onboarding. Archivos: src/app/onboarding/page.tsx, src/app/onboarding/_types.ts.' },
          { title: 'UX-02 — Cambiar label "Talla (cm)" por "Altura (cm)" en datos personales del onboarding', done: true, priority: 'P3', note: 'Fix incluido en BUG-048. Label cambiado en onboarding/page.tsx. Branch: bugfix/mvp-ux-flows.' },
          { title: 'UX-03 — /new-goal: calcular semanas automáticamente desde fecha evento, no mostrarlas como opción fija', done: true, priority: 'P1', note: 'QA-2026-07-03: Hoy se muestran "8 semanas", "12 semanas" como etiqueta de cada meta. El usuario no debería elegir semanas — el sistema las calcula: si el atleta tiene fecha de evento, semanas = (fechaEvento - hoy) / 7. Si no tiene fecha, usar default por distancia (5K=8, 10K=12). Restricción mínima: al menos 4 semanas desde hoy. Restricción máxima: no fechas pasadas. Archivo: src/app/(athlete)/new-goal/_components/NewGoalClient.tsx.' },
          { title: 'UX-04 — /new-goal: CTA "Generar plan" → "Ir al dashboard" (no generar plan en este punto)', done: true, priority: 'P1', note: 'Fix: CTA renombrado a "Guardar meta". Llama PATCH /api/athlete/sport (nuevo). Redirige a /dashboard. Elimina LOADING_STEPS. Branch: bugfix/mvp-ux-flows.' },
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
          { title: 'COACH-BUG-02 — Constructor de plan abre en semana 1, debería abrir en la semana activa del atleta', done: true, priority: 'P1', note: 'Fix: getInitialWeekIdx(plan) extraída como función pura exportada → usa getPlanWeekNumber(startDate, totalWeeks) - 1, clampeada a [0, weeks.length-1]. useState lazy init en PlanBuilderClient. 8 tests en PlanBuilderClient.test.ts cubren null, semana 1, semanas intermedias, clamp superior e inferior.' },
          { title: 'COACH-BUG-03 — Coach ve "Semana 6/18", atleta ve "11/18" — semana activa inconsistente', done: true, priority: 'P1', note: 'Fix aplicado en athletes/_lib/map-athlete.ts: usa getPlanWeekNumber(startDate, totalWeeks) + clamp a totalWeeks. Lado coach (lista /coach/athletes) corregido.' },
          { title: 'COACH-BUG-04 — Coach ve "FASE: DESARROLLO", atleta ve "BASE" — fase activa inconsistente', done: true, priority: 'P1', note: 'Fix: getInitialWeekIdx() movida a lib/core/week-number.ts como fuente canónica (usa getPlanWeekNumber, UTC-safe). AthleteDetailClient.tsx: reemplazados 2 custom date loops (planViewWeekIdx + currentPhase) por getInitialWeekIdx. 17 tests en week-number.test.ts + 8 tests en PlanBuilderClient.test.ts.' },
          { title: 'COACH-BUG-01 — Columna DEPORTE vacía en lista atletas y "Sin datos de deporte" en dashboard', done: true, priority: 'P2', note: 'Fix: SPORT_LABELS ampliado en AthleteTabs.tsx y dashboard/page.tsx cubre RUNNING|STRENGTH|CYCLING|SWIMMING|TRIATHLON|FOOTBALL. Datos vienen de HealthProfile.sport vía map-athlete.ts.' },
          { title: 'COACH-BUG-05 — Campos Estrés/Motivación/Dolor siempre "—" en Tab Resumen del coach', done: true, priority: 'P2', note: 'Verificado: AthleteDetailClient.tsx muestra stressLevel/motivationLevel/painLevel con colores semafóricos (líneas 807-820 card resumen, 983-1007 tabla check-ins). El dato viene de page.tsx que los mapea con ?? null desde WeeklyCheckIn.' },
          { title: 'COACH-BUG-07 — Finanzas sin filtro por atleta — inmanejable con escala', done: true, priority: 'P2', note: 'Fix: selector "Todos los atletas" en finanzas/page.tsx (visible solo cuando hay >1 atleta). Filtro client-side sobre pagos ya cargados en memoria — byAthlete + filtered en cascada con filterStatus.' },
          { title: 'COACH-BUG-06 — /coach/settings = "Próximamente" — item de nav lleva a página vacía', done: true, priority: 'P3', note: 'Fix: coach/settings/page.tsx redirige a /coach/profile con redirect() — el perfil ya tiene edición completa de nombre, bio, especialidades y disponibilidad.' },
          { title: 'SEC-01 — POST /api/messages y /api/mobile/messages sin validar relación coach-atleta', done: true, priority: 'P1', note: 'Fix: coachAthlete.findFirst en paralelo con recipient lookup (Promise.all). 403 si no existe relación en ambos endpoints. api/messages/route.ts y api/mobile/messages/route.ts.' },
          { title: 'COACH-BUG-08 — coachAthlete.count sin filtro ACTIVE: atletas PAUSED cuentan contra el límite de tier', done: true, priority: 'P2', note: 'Fix: status: "ACTIVE" añadido al where del count en clients/create/route.ts.' },
          { title: 'COACH-BUG-09 — PaymentAuditLog escribe MARKED_PAID también en reversiones a PENDING', done: true, priority: 'P2', note: 'Fix: action derivada del nuevo status → PAID = MARKED_PAID, cualquier otro = REVERTED. payments/[paymentId]/route.ts PATCH.' },
          { title: 'COACH-BUG-10 — DELETE payment sin transacción y sin registro en audit trail', done: true, priority: 'P2', note: 'Fix: $transaction([auditLog.create({ action: "DELETED" }), payment.delete]) en payments/[paymentId]/route.ts DELETE.' },
          { title: 'COACH-BUG-11 — config/route.ts: mergeFeatures + coachAthlete.update con Promise.all sin $transaction', done: true, priority: 'P3', note: 'Fix: prisma.$transaction(async tx => { PrismaUserRepository(tx).mergeFeatures + tx.coachAthlete.update }) en athlete/[id]/config/route.ts.' },
        ],
      },

      // ── ATLETA & CHECK-IN ─────────────────────────────────────────────────────
      {
        id: 'bugs-atleta',
        label: 'Atleta & Check-in',
        period: 'Urgente',
        items: [
          { title: 'BUG-027 — actualIntensity ausente en web /api/log/session: ajuste nutricional nunca se dispara desde web', done: true, priority: 'P1', note: 'Fix: actualIntensity añadido a LogSessionSchema + lógica post-create con try/catch en api/log/session/route.ts.' },
          { title: 'BUG-028 — Race condition en PendingNutritionAdjustment.create: P2002 no capturado rompe el response', done: true, priority: 'P1', note: 'Fix: wrap en try/catch alrededor del bloque de ajuste nutricional en api/mobile/log/session/route.ts para absorber P2002 sin romper el response.' },
          { title: 'BUG-029 — nutritionAdherencePct ausente en schema mobile check-in: regla nutricion_baja nunca activa desde mobile', done: true, priority: 'P2', note: 'Fix: nutritionAdherencePct z.number().min(0).max(100).optional() añadido al schema + mapeado como Math.round(pct/10) al use case en api/mobile/checkin/route.ts.' },
          { title: 'BUG-030 — /api/log/run/route.ts sin Zod: durationMin, distanceKm, rpe sin validación de rango', done: true, priority: 'P2', note: 'Fix: LogRunSchema con z.enum(VALID_RUN_TYPES) + z.number() con min/max en api/log/run/route.ts.' },
          { title: 'BUG-031 — stressLevel: opcional en web (min 0), requerido en mobile (min 1) — asimetría en use case', done: true, priority: 'P3', note: 'Fix: stressLevel ahora .optional() en mobile checkin schema. Fallback scale5to10(body.stressLevel ?? 3) — valor neutro si no se envía.' },
          { title: 'BUG-032 — hrMax solo se registra desde web, mobile lo ignora silenciosamente', done: true, priority: 'P3', note: 'Fix: hrMax z.number().int().min(30).max(250).optional() añadido al schema mobile + persistido en ambos sessionLog.create en api/mobile/log/session/route.ts.' },
        ],
      },

      // ── NUTRICIÓN & PROGRESO ──────────────────────────────────────────────────
      {
        id: 'bugs-nutricion',
        label: 'Nutrición & Progreso',
        period: 'Urgente',
        items: [
          { title: 'BUG-033 — Gym sin running: web muestra macros "día fácil", mobile muestra "día duro" — misma sesión', done: true, priority: 'P2', note: 'Fix: nutrition/page.tsx:113 → hasGymSessionToday ? "hard" : "rest" — unificado con mobile (HIGH → hard). Ambos canales ahora usan macros de día duro para gym-only.' },
          { title: 'BUG-034 — /api/mobile/progress solo busca plan ACTIVE: semanas históricas invisibles cuando plan termina', done: true, priority: 'P2', note: 'Fix: status: { in: ["ACTIVE", "COMPLETED"] } en api/mobile/progress/route.ts.' },
          { title: 'BUG-035 — /api/mobile/nutrition/log/summary: adherencePct siempre vs targetKcalEasy, ignora tipo de día', done: true, priority: 'P2', note: 'Fix: query de PlannedSession por semana + getDailyNutritionTarget(intensity) por día con FoodLog. Adherencia calculada por promedio de ratio diario real/target. api/mobile/nutrition/log/summary/route.ts.' },
          { title: 'BUG-036 — NutritionPlan lazy-init en web pero no en mobile: estado diverge entre canales', done: true, priority: 'P3', note: 'Fix: lazy-init con calculateTDEE+calculateMacros+upsert añadido a api/mobile/nutrition/route.ts. Mismo bloque que nutrition/page.tsx para paridad entre canales.' },
          { title: 'BUG-037 — volumeKm ausente en /api/mobile/progress: semanas sin dato de volumen en mobile', done: true, priority: 'P3', note: 'Fix: volumeKm: w.sessions.reduce((acc, s) => acc + (s.log?.distanceKm ?? 0), 0) añadido al map de semanas en api/mobile/progress/route.ts.' },
          { title: 'INFO-001 — Tres implementaciones del cálculo de macros por tipo de día (riesgo de divergencia futura)', done: true, priority: 'P3', note: 'Fix: api/mobile/nutrition/route.ts reemplazado cálculo inline por getDailyNutritionTarget(sessionIntensity, nutritionPlan). Fuente canónica única usada en mobile, web y summary.' },
          { title: 'BUG-038 — Ajuste nutricional pendiente solo visible y accionable en mobile, no en web', done: true, priority: 'P2', note: 'Fix: (1) creados POST /api/nutrition/adjustment/[id]/accept|reject con auth() web — misma lógica que los mobile. (2) NutritionAdjustmentCard client component con botones Aceptar/Rechazar + router.refresh(). (3) nutrition/page.tsx queries pendingAdjustment del día vía date gte/lt y lo muestra antes del contenido principal.' },
        ],
      },

      // ── GYM & EJERCICIOS ──────────────────────────────────────────────────────
      {
        id: 'bugs-gym-ejercicios',
        label: 'Gym & Ejercicios (integridad)',
        period: 'Urgente',
        items: [
          { title: 'BUG-043 — PR detection falla cuando coach edita rutina: SetLogs históricos quedan con workoutExerciseId=null → cualquier peso es PR', done: true, priority: 'P1', note: 'Fix: query paralela de orphanSets (workoutExerciseId=null, exerciseName in known names), merged con historicalSets en maxPerExercise via nameToExerciseId pivot. api/gym/session/complete/route.ts.' },
          { title: 'BUG-044 — Adherencia coach dashboard siempre baja: denominador incluye sesiones de semanas futuras', done: true, priority: 'P1', note: 'Fix: map-athlete.ts:82 → plan?.weeks.filter((w) => w.weekNumber <= currentWeek).flatMap(...). Antes tomaba todas las semanas del plan como denominador — atleta en semana 1 de plan de 12 semanas mostraba ~8% aunque completara todo.' },
          { title: 'BUG-039 — today/route.ts usa UTC para weekNumber pero timezone atleta para dayOfWeek: semana incorrecta en medianoche Bogotá', done: true, priority: 'P2', note: 'Fix: todayDate calculada con toLocaleString("en-US", { timeZone: tz }) antes de getPlanWeekNumber en api/gym/session/today/route.ts.' },
          { title: 'BUG-040 — assign/route.ts no verifica CoachAthlete.status ACTIVE: coach desvinculado puede asignar rutinas', done: true, priority: 'P2', note: 'Fix: status: "ACTIVE" añadido al where en ambos handlers (POST + DELETE) de api/coach/gym/routines/[id]/assign/route.ts.' },
          { title: 'BUG-041 — isPR siempre false en sesión libre: récords en sesión libre nunca se detectan', done: true, priority: 'P3', note: 'Fix: maxPerFreeExerciseName map + isPRByName() helper + query histórica por exerciseName para PR detection en path libre. api/gym/session/complete/route.ts.' },
          { title: 'BUG-042 — Historial mobile muestra sesiones libres FUERZA (SessionLog) con sets=0 y volumen=0', done: true, priority: 'P3', note: 'Fix: filter formattedFree por s.durationMin !== null || s.rpe !== null || s.notes !== null antes del merge — solo muestra libres con algún dato útil. api/mobile/gym/history/route.ts.' },
        ],
      },

      // ── PERSISTENCIA & TRANSACCIONES — Auditoría 2026-07-03 ──────────────────
      {
        id: 'bugs-persistencia',
        label: 'Persistencia & Transacciones',
        period: 'Urgente — Auditoría 2026-07-03',
        items: [
          { title: 'PERSIST-01 — FoodLog @@unique([userId,foodId,date,mealType]) bloquea registrar el mismo alimento 2× en la misma comida', done: true, priority: 'P0', note: 'Caso de uso real: comer arroz al almuerzo, luego agregar más arroz. El segundo POST devuelve P2002 silencioso → el registro se pierde sin feedback al usuario. Archivos: api/nutrition/log/route.ts + api/mobile/nutrition/log/route.ts. Fix: usar upsert sumando gramos, o quitar foodId del constraint y manejar varias filas por (userId, date, mealType), o al menos capturar P2002 y devolver mensaje descriptivo.' },
          { title: 'PERSIST-02 — auth/register: user.create fuera de $transaction — usuario huérfano si la tx de userSubscription/coachProfile falla', done: true, priority: 'P0', note: 'Fix: user.create movido dentro del $transaction en api/auth/register/route.ts. Ahora user+userSubscription+coachProfile se crean atómicamente. Branch: bugfix/mvp-persistence.' },
          { title: 'PERSIST-03 — nutrition/generate-meals: 3 writes independientes sin $transaction (foodProfile + nutritionPlan + mealPlan)', done: true, priority: 'P1', note: 'Archivos: api/nutrition/generate-meals/route.ts + api/mobile/nutrition/generate-meals/route.ts. Promise.all([foodProfile.upsert, nutritionPlan.upsert]) + mealPlan.upsert separado. Si falla mealPlan, el atleta queda con nutritionPlan actualizado pero sin mealPlan generado. Fix: envolver los 3 writes en $transaction.' },
          { title: 'PERSIST-04 — nutrition/generate: nutritionPlan.upsert + enableFeatures sin $transaction — features desincronizadas si falla', done: true, priority: 'P1', note: 'Fix: ambas operaciones envueltas en $transaction. Branch: bugfix/mvp-persistence.' },
          { title: 'PERSIST-05 — gym/assign + coach/gym/assign: updateMany(isActive:false) + create sin $transaction → rutinas activas duplicadas', done: true, priority: 'P1', note: 'Fix: ambos endpoints (gym/assign + coach/gym/routines/[id]/assign) envueltos en $transaction. Branch: bugfix/mvp-persistence.' },
          { title: 'PERSIST-06 — log/session: race condition en check de idempotencia (findUnique + create) → P2002 propagado como 500', done: true, priority: 'P1', note: 'Fix: catch específico de P2002 en sessionLog.create → devuelve 200 alreadyLogged. Branch: bugfix/mvp-persistence.' },
          { title: 'PERSIST-07 — gym/session/complete: sin check de idempotencia → GymSession @@unique puede fallar en doble submit', done: true, priority: 'P1', note: 'Fix: findFirst previo en ambos paths (plannedSession + assignedWorkout) → 200 alreadyCompleted. Branch: bugfix/mvp-persistence.' },
          { title: 'PERSIST-08 — coach/clients/link: check+create sin $transaction → dos coaches pueden vincular al mismo atleta simultáneamente', done: true, priority: 'P1', note: 'Fix: catch P2002 en coachAthlete.create → 409. Branch: bugfix/mvp-persistence.' },
          { title: 'PERSIST-09 — GET /api/mobile/nutrition hace write (lazy-init de NutritionPlan) → viola REST, race condition con unique constraint', done: true, priority: 'P1', note: 'Fix: eliminado lazy-init del GET. El GET solo lee; si no hay NutritionPlan retorna defaults sin escribir. Branch: bugfix/mvp-persistence.' },
          { title: 'PERSIST-10 — metrics/log POST: upsert sobreescribe con null campos no enviados — pérdida de métricas diarias', done: true, priority: 'P1', note: 'Fix: update object construido con spread condicional (...(field !== undefined && { field })). Branch: bugfix/mvp-persistence.' },
          { title: 'PERSIST-11 — painDescription no se guarda desde web: schema de validación del check-in web omite el campo', done: true, priority: 'P1', note: 'Fix: painDescription z.string().max(500).optional() añadido al schema Zod en api/checkin/route.ts + actualizado checkin-mapper. Branch: bugfix/mvp-persistence.' },
          { title: 'PERSIST-12 — plan/new: enableFeatures fuera de $transaction de generatePlan → features desincronizadas si falla', done: false, priority: 'P2', note: 'Archivo: api/plan/new/route.ts línea 45. enableFeatures se llama después de generatePlan(). Si falla, el plan existe pero featurePlan/featureCheckin/featureLog no se activan. Fix: incluir dentro del Phase 3 del use case, o capturar y reintentar con idempotencia.' },
          { title: 'PERSIST-13 — mobile/dashboard: fire-and-forget plan completion con .catch(()=>{}) → plan expirado nunca marcado COMPLETED', done: false, priority: 'P2', note: 'Archivo: api/mobile/dashboard/route.ts líneas 88-89. Si falla, el plan nunca se marca y el dashboard sigue mostrando datos del plan vencido indefinidamente. Fix: mover lógica a un cron job o manejar el error con log observable.' },
          { title: 'PERSIST-14 — mobile/profile PATCH: healthProfile.update() falla con P2025 si HealthProfile no existe', done: true, priority: 'P2', note: 'Fix: healthProfile.update() → upsert(update: data, create: { userId, age:0, heightCm:0, weightKg:0, ...data }). Defaults 0 para campos requeridos en el create path — onboarding los sobrescribe inmediatamente. api/mobile/profile/route.ts.' },
          { title: 'PERSIST-15 — user/profile PATCH web: sin validación Zod — acepta weightKg:-999, heightCm:"abc" (mobile sí valida con profilePatchSchema)', done: false, priority: 'P2', note: 'Archivo: api/user/profile/route.ts. No usa schema de validación. Fix: agregar profilePatchSchema con z.number().min/max equivalente al de mobile.' },
          { title: 'PERSIST-16 — autoCompleteStrengthSession: fire-and-forget sin manejo de P2002 → SessionLog duplicado silenciado', done: false, priority: 'P2', note: 'Archivo: infrastructure/db/auto-complete-strength.ts líneas 20-43. Se ejecuta con .catch(()=>{}). Si el SessionLog ya existe (unique constraint), el error se silencia completamente. Fix: catch específico de P2002 para distinguirlo de errores reales.' },
          { title: 'NEW-P2-01 — gym/session/complete: idempotency check + create sin P2002 catch → doble submit concurrente devuelve 500', done: true, priority: 'P2', note: 'Fix: ambos paths (plannedSession + assignedWorkout) ahora capturan P2002 en el gymSession.create y devuelven { alreadyCompleted: true, 200 } con el id existente. DB ya tenía los constraints únicos (plannedSessionId @unique y @@unique([athleteId,date,assignedWorkoutId])) — faltaba el catch. api/gym/session/complete/route.ts.' },
          { title: 'NEW-P2-02 — coach/profile: slug race condition sin P2002 catch → upsert concurrente con mismo slug → 500', done: true, priority: 'P2', note: 'Fix: prisma.coachProfile.upsert ahora captura P2002 y retorna 409 con "Ese slug ya está en uso." — mismo mensaje que el check manual previo. El pre-check de findUnique sigue para feedback inmediato; el catch P2002 cierra la ventana de concurrencia. api/coach/profile/route.ts.' },
          { title: 'NEW-P2-03 — dashboard/page.tsx: await en writes fire-and-forget bloquea el render en cada visita al dashboard', done: true, priority: 'P2', note: 'Fix: removido await de los dos writes de plan-completion en dashboard/page.tsx — (1) deduplicación de planes ACTIVE duplicados (line ~184) y (2) auto-complete de plan expirado (line ~199). Ambos usan .catch(()=>{}) y son fire-and-forget por diseño. El await hacía que el render esperara el write innecesariamente.' },
          { title: 'NEW-P3-04 — athlete/sport PATCH: healthProfile.update() falla con P2025 si profile no existe', done: true, priority: 'P3', note: 'Fix: update() → upsert(update, create: { userId, age:0, heightCm:0, weightKg:0, sportGoal, raceDate }). Rarísimo en producción (onboarding crea el profile antes de que /new-goal sea accesible) pero el middleware no lo garantiza en 100% de edge cases. api/athlete/sport/route.ts. QA 2026-07-04: test route.test.ts corregido — mock update→upsert y assertions actualizadas para verificar { where, update, create }.' },
        ],
      },

      // ── PERFORMANCE & FAT ROUTES — Auditoría 2026-07-03 ─────────────────────
      {
        id: 'bugs-performance',
        label: 'Performance & Fat Routes',
        period: 'Próximo sprint — Auditoría 2026-07-03',
        items: [
          { title: 'PERF-01 — Dashboard web+mobile: carga plan COMPLETO con todas las semanas/sesiones/logs cuando solo necesita 1 semana', done: true, priority: 'P1', note: 'Archivos: app/(athlete)/dashboard/page.tsx líneas 142-150 + api/mobile/dashboard/route.ts líneas 24-33. include: { weeks: { include: { sessions: { include: { log } } } } } sin filtro. Plan de 12 semanas = ~84 sesiones + logs cargados en cada visita. Fix: añadir where: { weekNumber: currentWeekNum } al include de weeks.' },
          { title: 'PERF-02 — week-sessions mobile: carga plan COMPLETO otra vez para extraer 1 semana — redundante con dashboard', done: true, priority: 'P1', note: 'DONE: Separado en 2 queries: (1) trainingPlan metadata (id, startDate, totalWeeks), (2) prisma.planWeek.findFirst({ where: { planId, weekNumber } }). Solo se carga 1 PlanWeek en vez de todo el plan. api/mobile/dashboard/week-sessions/route.ts.' },
          { title: 'PERF-03 — N+1 gym/routines POST+PATCH: loop de creates serializados (6 días × 8 ejercicios = 54 queries) dentro de $transaction', done: true, priority: 'P1', note: 'DONE: Loop interno de tx.workoutExercise.create() reemplazado con tx.workoutExercise.createMany(). 1 query por día en vez de N. api/athlete/gym/routines/route.ts.' },
          { title: 'PERF-04 — gym/session/complete: 322 LOC de lógica inline — PR detection, progression, 3 paths, setLogs × 3 bloques duplicados', done: true, priority: 'P1', note: 'DONE: Funciones puras extraídas a domain/gym/complete-gym-session.use-case.ts — isPRSet, isPRByName, computeProgressionUpdates, collectPRsByWeId, collectPRsByName. 16 tests en .use-case.test.ts.' },
          { title: 'PERF-05 — Dashboard web 873 LOC: lógica de getDashboardSummary duplicada inline — mobile ya usa el use case del dominio', done: true, priority: 'P1', note: 'DONE: getDashboardSummary() llamado desde page.tsx con input construido desde queries Prisma. Elimina computo duplicado de streakDays, raceDays, isRecomp, formStatus/formMessage, weeklyWeightChange, weightProgressPct, checkinPending. Web mantiene lógica propia para: todaySession (BUG-056), completedCount/totalTraining (BUG-057+filtro DESCANSO), weekOffset navigation, coachRelation, weekActivities FREE mode, last4WeeksAdherencePct.' },
          { title: 'PERF-06 — DashboardCalendarStrip: fetch HTTP desde cliente duplica data que el server component ya tiene en activePlan.weeks', done: false, priority: 'P2', note: 'Archivo: app/(athlete)/dashboard/page.tsx línea 799. DashboardCalendarStrip hace fetch a /api/athlete/calendar en cada render. El server component ya tiene activePlan.weeks.sessions. Fix: pasar la data como prop y eliminar el fetch independiente.' },
          { title: 'PERF-07 — NutritionPlan lazy-init duplicada en 3 archivos con lógica idéntica (TDEE + macros + upsert)', done: false, priority: 'P2', note: 'Archivos: app/(athlete)/nutrition/page.tsx líneas 102-128 + api/mobile/nutrition/route.ts líneas 68-93 + api/nutrition/generate/route.ts líneas 30-58. Los 3 hacen calculateTDEE() + calculateMacros() + nutritionPlan.upsert() iguales. Fix: extraer a domain/nutrition/ensure-nutrition-plan.use-case.ts.' },
          { title: 'PERF-08 — coach/dashboard/athletes: plan completo por cada atleta — no escala con número de atletas', done: false, priority: 'P2', note: 'Archivo: api/coach/dashboard/athletes/route.ts líneas 17-60. Coach con 20 atletas = 20 planes completos cargados. Fix: filtrar weeks por currentWeek en la query de cada atleta.' },
          { title: 'PERF-09 — Nutrition page web: 10 queries en 3 rondas secuenciales — consolidar en 1 Promise.all + paginar allFoods', done: false, priority: 'P2', note: 'Archivo: app/(athlete)/nutrition/page.tsx. Ronda 1 (2 queries) → Ronda 2 (pendingAdjustment) → Ronda 3 (7 queries). Las 3 rondas son independientes. Además allFoods carga sin limit. Fix: un solo Promise.all de 10 queries + take:100 en allFoods.' },
          { title: 'PERF-10 — checkin-status mobile: endpoint redundante con GET /api/mobile/checkin que ya devuelve submitted:true/false', done: false, priority: 'P3', note: 'Archivo: api/mobile/checkin-status/route.ts (28 líneas). Si la app llama ambos al montar, duplica queries. Fix: eliminar checkin-status y usar GET /checkin que ya tiene la misma info + más datos.' },
          { title: 'PERF-11 — calcAdherencePct definida localmente en 3+ archivos — extraer a lib/core/adherence.ts', done: false, priority: 'P3', note: 'Archivos: app/(athlete)/progress/page.tsx líneas 15-21 + api/mobile/progress/route.ts líneas 7-10 + inline en dashboard. Fix: src/lib/core/adherence.ts con calcAdherencePct(completed, total) exportado + tests.' },
          { title: 'PERF-12 — getDailyNutritionTargets en athlete-formulas.ts: posible dead code vs getDailyNutritionTarget de daily-target.ts', done: false, priority: 'P3', note: 'Archivo: lib/core/athlete-formulas.ts líneas 41-71 vs lib/nutrition/daily-target.ts. Dos funciones para calcular lo mismo con interfaces distintas. Fix: verificar callers de getDailyNutritionTargets — si no se usa en ninguna route activa, eliminar.' },
          { title: 'NEW-P2-05 — mobile/progress: incluye plan completo con todos los weeks/sessions/logs (mismo antipatrón PERF-01)', done: true, priority: 'P2', note: 'Fix: include {} → select { weeks: { select: { weekNumber, phase, sessions: { where: date<=now, select: { log: { id, distanceKm } } } } } }. Solo carga semanas pasadas y los campos necesarios para adherencia (log id) y volumen (distanceKm). api/mobile/progress/route.ts.' },
        ],
      },

    ],
  },

  // ── ARQUITECTURA DE PLANES — PIVOT PRODUCTO ────────────────────────────────
  {
    id: 'arch-planes',
    label: 'Arquitectura de Planes — Pivot',
    color: '#b45309',
    bgColor: '#fffbeb',
    borderColor: '#fcd34d',
    phases: [
      {
        id: 'arch-planes-pivot',
        label: 'Pivot: planes del coach, no del sistema',
        period: 'P1 — Próxima iteración',
        items: [
          {
            title: 'ARCH-01 — Deprecar /new-goal y generación automática de planes desde templates',
            done: true,
            priority: 'P1',
            note: 'DONE (bugfix/athlete-e2e): onboarding/page.tsx ya no redirige a /new-goal para RUNNING/BOTH — va directo a /dashboard. UX-04 ya hizo que /new-goal solo guarda meta sin generar plan. /new-goal sigue existiendo pero sin acceso desde flujo normal. Sidebar no lo linkea. B2B: coach genera plan. B2C Free: tracking libre. B2C Pro futuro: AI.',
          },
          {
            title: 'ARCH-02 — CoachSpecialty: enum + columna DB + adaptación del panel del coach',
            done: true,
            priority: 'P1',
            note: 'enum CoachSpecialty { RUNNING | GYM | NUTRITION | ALL } + CoachProfile.primarySpecialty @default(ALL) + migration SQL 20260703200000. CoachSidebarClient filtra /coach/gym y /coach/nutrition según especialidad. PATCH /api/coach/profile guarda primarySpecialty. ProfileForm tiene selector de especialidad. Layout fetches desde DB (sin JWT change).',
          },
          {
            title: 'ARCH-03 — Vista calendario del atleta (estilo TrainingPeaks) como navegación principal del plan',
            done: true,
            priority: 'P1',
            note: 'PlanCalendarView.tsx: navega semanas via /api/athlete/calendar, badges de color por tipo (sport/gym/freeRun), CheckCircle para días completados, panel de detalle al hacer click. Coexiste con PlanClient como vista principal en /plan. Mobile: pendiente sprint siguiente.',
          },
          {
            title: 'ARCH-04 — Sesión libre con tipado completo por disciplina para atleta sin plan',
            done: false,
            priority: 'P2',
            note: 'Running libre: tipos RODAJE_Z2/FARTLEK/TEMPO/INTERVALOS/TIRADA_LARGA/OTRO con distancia, duración, FC media/máxima, pace, RPE. Gym libre: FUERZA con ejercicios/series/cargas + PR detection activa. Sesiones libres visibles en calendario del atleta y en panel del coach (sección "Sesiones libres"). El registro libre ya existe parcialmente — mejorar tipado y variaciones disponibles en web y mobile.',
          },
          {
            title: 'ARCH-05 — Eliminar RACE_HALF_MARATHON y RACE_MARATHON de todos los selectores UI',
            done: true,
            priority: 'P1',
            note: 'Eliminados de NewGoalClient.tsx, coach/clients/new/page.tsx y AthleteDetailClient.tsx. Schema DB intacto. Planes existentes intactos.',
          },
        ],
      },
    ],
  },
]
