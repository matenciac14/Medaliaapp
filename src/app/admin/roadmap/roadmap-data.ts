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
      { title: 'DBI-13 — Goal model nunca se popula: TrainingPlan.goalId siempre null', done: true, priority: 'P3', note: 'ELIMINADO. Modelo Goal quitado del schema (migración aplicada en producción). GoalType enum se mantiene como campo directo en TrainingPlan.goalType. seed.ts limpio: sin GoalStatus import, sin goals: blocks. /new-goal eliminado (ARCH-01, chore/cleanup-goal-dead-code).' },
      { title: 'SCHEMA-DOC — Eliminar GoalStatus de CLAUDE-SCHEMA.md (Goal model eliminado en DBI-13)', done: true, priority: 'P3', note: 'GoalStatus enum (ACTIVE | COMPLETED | ABANDONED) eliminado de CLAUDE-SCHEMA.md §Enums. Goal no existe en schema.prisma ni en código. Solo quedaba la entrada stale en la documentación.' },

      // ── HALLAZGOS AGENTES — auditoría completa julio 2026 ────────────────────
      { title: 'DBI-14 — Mobile JWT stale 30d: coach activa features pero atleta necesita re-login', done: true, priority: 'P1', note: 'FIXED: creado POST /api/mobile/auth/refresh. Verifica JWT existente, lee features frescas de DB, emite nuevo token. Mobile debe llamar este endpoint tras notificación de activación de features.' },
      { title: 'DBI-15 — Payment cascade: eliminar atleta borra todos sus registros de pago al coach', done: true, priority: 'P1', note: 'FIXED: Payment.athleteId → String? + athlete User? + onDelete: SetNull. Migración 20260702060000_payment_athlete_setnull. Pagos preservados con athleteId=null cuando atleta es eliminado.' },
      { title: 'DBI-16 — Web API endpoints sin rate limiting: mensajes, nutrition, log vulnerables a DoS', done: true, priority: 'P2', note: 'FIXED: rateLimitAsync añadido a /api/messages (GET 300/min, POST 100/min), /api/nutrition/log (GET 300/min, POST 100/min), /api/log/session (POST 100/min).' },
      { title: 'DBI-17 — PerformanceBenchmark sin @@unique: permite múltiples del mismo (sport, metric)', done: true, priority: 'P2', note: 'BY DESIGN: múltiples benchmarks del mismo (sport, metric) son intencionales — permiten tracking histórico de evolución (5K_TIME de hace 3 meses vs hoy). @@unique no aplica. No requiere fix.' },
      { title: 'DBI-18 — Payment delete: ownership check fuera de $transaction puede crear AuditLog orphan', done: true, priority: 'P2', note: 'FIXED: payments/[paymentId]/route.ts DELETE ahora usa $transaction interactiva — findFirst ownership check dentro del tx antes de auditLog.create + payment.delete.' },
      { title: 'DBI-19 — gym/session/[id]/route.ts mezcla auth web y mobile: getMobileUser ?? auth() en mismo endpoint', done: true, priority: 'P3', note: 'FIXED: mobile no usa este endpoint (usa /api/mobile/gym/*). Eliminado getMobileUser() — route usa solo auth(). src/app/api/gym/session/[id]/route.ts.' },
      { title: 'DBI-20 — Payment.paidAt sin CHECK en DB: status=PAID puede persistir sin paidAt', done: true, priority: 'P3', note: 'FIXED: migración 20260702070000_payment_paidat_check — CHECK constraint payment_paid_status_requires_paid_at: status != PAID OR paidAt IS NOT NULL. La validación en app layer (PATCH route L35) ya asigna paidAt si status=PAID.' },

      // ── STANDBY — activar con primeros usuarios reales ───────────────────────
      { title: 'Google OAuth: activar con dominio real en producción', done: false, note: '[STANDBY] Google Cloud Console → Client ID + Secret → GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET en Vercel. Código implementado.' },
      { title: 'Sentry: monitoreo de errores en producción', done: false, note: '[STANDBY] Pospuesto hasta tener usuarios reales activos. @sentry/nextjs. Gratis hasta 5k errores/mes.' },
      { title: 'Uptime Robot: alertas de disponibilidad (ping cada 5 min)', done: false, note: 'Email/SMS si la app cae. Gratis hasta 50 monitores.' },
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
          { title: 'Recompensas Capa 1 — Racha de entrenamiento en dashboard', done: false, priority: 'P2', note: 'Días consecutivos con actividad registrada (SessionLog o GymSession). Visible siempre en el dashboard del atleta. Se rompe si no hay actividad en 48h. Al romper → push notification "¿Volvemos?" al día siguiente. Query: COUNT días distintos con actividad en ventana consecutiva hacia atrás desde hoy.' },
          { title: 'Recompensas Capa 2 — Hitos de consistencia compartibles', done: false, priority: 'P2', note: 'Milestones: 10 check-ins, 50 sesiones, 3 meses activo, plan completado. Al alcanzar un hito → pantalla de celebración con imagen compartible (WhatsApp/Instagram). Imagen generada server-side con OG image o canvas. DB: tabla Achievement { userId, type, unlockedAt }.' },
          { title: 'Recompensas Capa 3 — PR gym con celebración prominente (web + mobile)', done: false, priority: 'P2', note: 'SetLog.isPR ya se detecta en gym/session/complete. Hoy hay banner básico. Mejorar: animación de celebración en mobile (confetti o similar), datos del PR (ejercicio, peso, reps, fecha anterior), opción de compartir. Mobile es el canal principal — priorizar ahí.' },
        ],
      },
      {
        id: 'atleta-dailylog',
        label: 'DailyLog — Canal de datos diario (peso, sueño, energía)',
        period: 'P1 — Mobile endpoint primero',
        items: [
          {
            title: 'DAILY-01 — Mobile endpoint: POST /api/mobile/metrics/log',
            done: false,
            priority: 'P1',
            note: 'Crear /api/mobile/metrics/log (GET + POST) — espejo de /api/metrics/log pero con getMobileUser() en lugar de auth(). El atleta registra peso/sueño/energía desde la app sin pasar por el perfil web. Mismo upsert por userId_date. Incluir en GET /api/mobile/dashboard la métrica de hoy (peso, energía) si existe DailyLog del día.',
          },
          {
            title: 'DAILY-02 — Dashboard: mostrar peso y energía de hoy desde DailyLog',
            done: false,
            priority: 'P1',
            note: 'En getDashboardSummary (web y mobile): incluir DailyLog del día en la respuesta si existe. El dashboard muestra: peso de hoy (si lo registró) + nivel de energía (1-5 iconos). Si no hay registro del día → CTA "Registra tus métricas de hoy". Esto hace al DailyLog parte del hábito diario del atleta, no un formulario enterrado en el perfil.',
          },
          {
            title: 'DAILY-03 — /progress: usar DailyLog como fuente de curva de peso histórica',
            done: false,
            priority: 'P2',
            note: 'GET /api/progress y GET /api/mobile/progress: incluir DailyLog de los últimos 90 días como serie temporal de peso (fecha, weightKg). Graficable como curva de evolución. Hoy el progress solo tiene datos de SessionLog y WeeklyCheckIn. DailyLog tiene la granularidad diaria necesaria para una curva de peso precisa.',
          },
          {
            title: 'DAILY-04 — Panel coach: mostrar últimos 7 días de DailyLog del atleta',
            done: false,
            priority: 'P2',
            note: 'En GET /api/coach/athlete/[id] (o un endpoint separado /api/coach/athlete/[id]/dailylogs): devolver DailyLog de los últimos 7 días del atleta. El coach ve: peso diario, sueño, energía. Esta info + el check-in semanal le da al coach contexto real de cómo está el atleta entre check-ins.',
          },
        ],
      },
      {
        id: 'checkin-sugerencias',
        label: 'Check-in — Sugerencias Interactivas (no-destructivo)',
        period: 'P1-P2 — Después de CI-DB-01 (CheckInSuggestion model)',
        items: [
          {
            title: 'CI-B-01 — Refactor processCheckIn: genera CheckInSuggestion en lugar de auto-aplicar ajustes',
            done: false,
            priority: 'P1',
            note: 'Arquitectura actual: processCheckIn → evaluateRules() → applySessionAdjustments() (modifica PlannedSession directamente). Nueva arquitectura: processCheckIn → evaluateRules() → createCheckInSuggestions() (crea CheckInSuggestion con status PENDING). El atleta decide. $transaction incluye solo el upsert de WeeklyCheckIn + creación de sugerencias. applySessionAdjustments() se mueve a un handler separado (CI-B-02). Depende de CI-DB-01.',
          },
          {
            title: 'CI-B-02 — POST /api/checkin/suggestions/[id]/accept + /reject',
            done: false,
            priority: 'P1',
            note: 'Accept: aplica el ajuste (misma lógica de applySessionAdjustments() pero solo para esa sugerencia). Actualiza CheckInSuggestion.status → ACCEPTED + respondedAt. Reject: status → REJECTED + respondedAt. Ninguna acción en el plan. Ownership: sugerencia.userId === session.user.id. $transaction en accept. Depende de CI-B-01.',
          },
          {
            title: 'CI-B-03 — Reglas de evaluación para gym en evaluateCheckInRules()',
            done: false,
            priority: 'P1',
            note: 'evaluateRules() en domain/check-in/evaluate-rules.ts solo tiene triggers para running (fc_alta, rpe_excesivo en context.phase=BASE, etc.). Agregar reglas gym: (1) si dolor_activo → sugerencia "Considera sesión de recuperación activa — reduce intensidad en tu próxima sesión de gym". (2) si rpe_excesivo (>= 8) en atleta gym-only → sugerencia de descanso o deload. Trigger: context.hasGymSession (nuevo campo en CheckInContext).',
          },
          {
            title: 'CI-B-04 — Reglas de evaluación para nutrición en evaluateCheckInRules()',
            done: false,
            priority: 'P2',
            note: 'Si nutritionAdherencePct < 60 → sugerencia "Tu adherencia nutricional fue baja esta semana. ¿Quieres revisar tu plan de comidas?" con link a /nutrition/builder. Si nutritionAdherencePct > 110 → sugerencia "Estás consumiendo más de lo planificado — puede impactar tu composición corporal." Requiere que el check-in reciba nutritionAdherencePct calculado (ya existe en web como campo opcional).',
          },
          {
            title: 'CI-B-05 — CheckInContext: extender con contexto multi-deporte',
            done: false,
            priority: 'P2',
            note: 'CheckInContext en check-in.types.ts actualmente tiene: phase, currentWeek, hrRestingBaseline, prevCheckIn. Agregar: hasGymSession: boolean (atleta tiene AssignedWorkout o GymSession esta semana), hasRunningPlan: boolean (tiene TrainingPlan ACTIVE), nutritionAdherencePct?: number. Estos campos permiten a evaluateRules() determinar qué reglas aplicar según el modo del atleta.',
          },
          {
            title: 'CI-B-06 — Cron: expirar CheckInSuggestion PENDING después de 7 días',
            done: false,
            priority: 'P2',
            note: 'POST /api/cron/checkin-suggestions-expire (o agregar al cron existente de check-in-reminder). Query: CheckInSuggestion WHERE status=PENDING AND createdAt < now()-7d → status = EXPIRED. Las sugerencias expiradas se ocultan de la UI sin borrarlas del historial. Frecuencia: diaria. Agregar a vercel.json si es endpoint separado.',
          },
          {
            title: 'CI-B-07 — GET /api/checkin: incluir sugerencias pendientes en la respuesta',
            done: false,
            priority: 'P1',
            note: 'El endpoint de check-in (web y mobile) debe devolver las CheckInSuggestion PENDING del usuario en la semana actual. El atleta puede responderlas desde /checkin o desde el dashboard. Agregar al checkin response: suggestions: CheckInSuggestion[]. Depende de CI-DB-01.',
          },
          {
            title: 'CI-F-01 — UI interactiva: tarjeta por sugerencia con Aceptar/Rechazar en CheckInResultScreen',
            done: false,
            priority: 'P1',
            note: 'CheckInResultScreen.tsx actualmente es informacional — muestra "Lo que detectamos" + "Lo que ajustamos". Rediseño: lista de CheckInSuggestion con una card por sugerencia. Cada card: descripción del ajuste sugerido + botón "Aceptar" + botón "Rechazar". Al aceptar → POST /api/checkin/suggestions/[id]/accept → router.refresh(). Al rechazar → POST /api/checkin/suggestions/[id]/reject → oculta la card. Depende de CI-B-02.',
          },
          {
            title: 'CI-F-02 — Sección de sugerencias pendientes en dashboard (si hay PENDING de la semana)',
            done: false,
            priority: 'P2',
            note: 'Si el atleta hizo check-in pero tiene sugerencias sin responder → banner en dashboard: "Tienes N sugerencias de ajuste pendientes" con link a /checkin. Badge en el nav item de check-in. Query en dashboard/page.tsx: CheckInSuggestion WHERE userId AND status=PENDING AND createdAt > now()-7d.',
          },
          {
            title: 'CI-F-03 — Secciones gym + nutrición en formulario de check-in',
            done: false,
            priority: 'P2',
            note: 'CheckInClient.tsx (web) y checkin.tsx (mobile) actualmente preguntan: energía, sueño, estrés, motivación, RPE, peso, dolor, FC. Agregar secciones condicionales: (1) Si atleta tiene AssignedWorkout → "¿Cómo fue tu semana de gym? (RPE gym, grupos musculares con fatiga)". (2) Si atleta tiene NutritionPlan → "¿Cómo fue tu nutrición? (adherencia %, comidas que te costaron más)". Condicional según features del atleta.',
          },
          {
            title: 'CI-F-04 — Mobile: UI interactiva de sugerencias en checkin.tsx',
            done: false,
            priority: 'P2',
            note: 'Después del submit del check-in en mobile: si hay sugerencias → pantalla de resultados con FlatList de cards por sugerencia. Cada card: descripción + botones Aceptar/Rechazar. Misma lógica que CI-F-01 pero usando los endpoints mobile. Depende de CI-B-01 y CI-B-07.',
          },
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
      {
        id: 'coach-identidad',
        label: 'Identidad & Verificación Anti-fraude',
        period: 'Pre-lanzamiento',
        items: [
          {
            title: 'DB migration: User.identification + User.phoneWa únicos para coaches',
            done: true,
            priority: 'P0',
            note: 'Migración 20260708000001_identity_notification_food aplicada en Neon prod. identification String? @unique, phoneWa String? @unique, showPhoneWa Boolean @default(false) en User. Indexes únicos creados en DB.',
          },
          {
            title: 'Onboarding coach: recopilar identification + phoneWa antes de invitar atletas',
            done: true,
            priority: 'P0',
            note: 'PATCH /api/coach/profile acepta identification (5-30 chars) + phoneWa (E.164). Validación + persistencia en User. Banner ⚠️ en coach dashboard si profileComplete=false. JWT incluye profileComplete para no requerir query extra por request.',
          },
          {
            title: 'Validación unicidad: identification y phoneWa al completar perfil coach',
            done: true,
            priority: 'P0',
            note: 'Checks en paralelo: slug + identification + phoneWa. findFirst({ role: COACH, NOT: { id: coachId } }) → 409 con mensaje específico por campo. Aplicado en PATCH /api/coach/profile.',
          },
          {
            title: 'Bloqueo POST /api/coach/clients/create si perfil coach incompleto',
            done: true,
            priority: 'P1',
            note: '403 PROFILE_INCOMPLETE si !identification || !phoneWa. Doble check: JWT profileComplete (rápido) + query DB (si token stale). Mensaje: "Completa tu cédula y número de WhatsApp en tu perfil antes de invitar asesorados."',
          },
          {
            title: 'Definición canónica de atleta activo para billing',
            done: false,
            priority: 'P1',
            note: 'Atleta cuenta como activo si: (1) CoachAthlete.status = ACTIVE + (2) onboardingCompleted = true + (3) al menos 1 SessionLog registrado. Atletas sin sesión no cuentan → previene cuentas fantasma para inflar/desinflar conteo. Usar esta definición en el endpoint de billing snapshot y en el panel admin.',
          },
          {
            title: 'Admin: ver identification y phoneWa del coach — panel de verificación',
            done: true,
            priority: 'P1',
            note: 'En /admin/coaches: identification y phoneWa visibles bajo el email de cada coach. Badge rojo "Sin cédula" / "Sin WhatsApp" si faltan. Solo visible para admin — nunca expuesto en APIs públicas.',
          },
          {
            title: 'PhoneWa en perfil público del coach (/p/[slug]) — opt-in',
            done: false,
            priority: 'P2',
            note: 'El coach puede autorizar que su número WhatsApp aparezca en su perfil público como link wa.me/. Campo booleano showPhoneWa en CoachProfile o User. Por defecto: false. Si true → link de contacto directo en /p/[slug] y en /coaches marketplace.',
          },
        ],
      },
    ],
  },

  // ─── PLATAFORMA ───────────────────────────────────────────────────────────────

  {
    id: 'plataforma',
    label: 'Plataforma — Admin, Marketplace & Notificaciones',
    color: '#ea580c',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    phases: [
      {
        id: 'plataforma-core',
        label: 'Core — Infraestructura base completada',
        period: 'Completado',
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
      {
        id: 'plataforma-bi',
        label: 'Admin — Business Intelligence',
        period: 'Próximo',
        items: [
          { title: 'MRR estimado: coaches activos × fee por tier (tabla + total mensual en /admin)', done: true, priority: 'P0', note: 'Implementado en /admin/finanzas. Domain: src/domain/admin/finanzas.ts (coachFeeRate, mrrAthletes, mrrCoaches). Cards: MRR atletas Pro + fee coaches + total. Tabla breakdown por coach con tramo y fee.' },
          { title: 'WAU (Weekly Active Users) con tendencia 8 semanas — gráfica en /admin/metrics', done: true, priority: 'P1', note: 'Implementado en /admin/metrics. Domain: src/domain/admin/wau.ts (isoWeekKey, computeWAU, lastNWeekKeys). Bar chart nativo sin deps. "Activo" = SessionLog o WeeklyCheckIn en esa semana. 11 tests.' },
          { title: 'Retención 14 días: % atletas con al menos 1 check-in o log en los últimos 14 días', done: true, priority: 'P1', note: 'Implementado en /admin/metrics junto al WAU (grid 2/3 + 1/3). Domain: retention.ts (activeUserIdsInWindow, computeRetention, retentionColor). Base = featurePlan:true. Reutiliza eventos ya cargados para WAU. 13 tests.' },
          { title: 'Coaches activos esta semana (al menos 1 acción en los últimos 7 días)', done: true, priority: 'P1', note: 'Implementado via coach-activity.ts: detecta actividad de coaches en los últimos 7 días combinando mensajes enviados (Message.fromId) y pagos creados/actualizados (Payment). Visible en /admin/coaches.' },
          { title: 'Conversión de invite codes: códigos generados vs usados (tasa y tiempo promedio)', done: true, priority: 'P2', note: 'InviteCode ya tiene usedAt. Query: count(usedAt IS NOT NULL) / count(*) por coach. Tiempo promedio: avg(usedAt - createdAt). Visible en /admin/invite-codes o en ficha de coach.' },
          { title: 'Admin MRR real, churn mensual y ranking coaches por revenue', done: false, priority: 'P2', note: 'Reemplazar proyecciones estimadas por datos reales de UserSubscription. MRR = suma de suscripciones activas (coaches + atletas Pro). Churn = cancelaciones del mes / total activos. Gráfica histórica mensual.' },
          { title: 'PLT-02 — Distribución geográfica de usuarios en /admin/metrics', done: false, priority: 'P2', note: 'User.timezone ya existe (ej. "America/Bogota"). Derivar país/ciudad desde timezone. Mostrar mapa de calor o tabla: país → coaches activos / atletas.' },
          { title: 'PLT-03 — Atletas sin coach (B2C tracker puro) como segmento visible en /admin/metrics', done: false, priority: 'P2', note: 'Agregar: atletas con coach activo vs atletas B2C sin coach. Query: User[ATHLETE] WHERE NOT EXISTS CoachAthlete[ACTIVE].' },
          { title: 'Uso del AI chat: mensajes enviados esta semana y % de cuota mensual utilizada', done: false, priority: 'P3', note: 'STANDBY — AI deshabilitado intencionalmente (AI_ONBOARDING_ENABLED = false). Activar solo cuando AI esté habilitado en producción.' },
          { title: 'PLT-04 — Configuración de AI en /admin: modelo, guardrails, kill switch', done: false, priority: 'P3', note: 'Cuando AI-Coach se integre: selección de modelo Anthropic, edición de system prompt, toggle por tier, métricas de uso y kill switch. Requiere SystemConfig en DB.' },
        ],
      },
      {
        id: 'plataforma-marketplace',
        label: 'Marketplace — Directorio de coaches',
        period: 'P2 — cuando 20+ coaches activos',
        items: [
          { title: 'PLT-05 — Abrir /coaches con filtros: especialidad, ciudad, nivel, precio referencial', done: false, priority: 'P2', note: 'Hoy /coaches existe en código pero está oculto de la navegación. Condición de apertura: 20+ coaches activos con perfil completo. Filtros: CoachSpecialty (RUNNING/GYM/NUTRITION/ALL), ciudad derivada de timezone, precio referencial (rango). Ordenamiento: atletas activos DESC. Requiere CoachSpecialty en DB (ARCH-02).' },
          { title: 'PLT-06 — Botón "Contactar coach" en /p/[slug] con WhatsApp como canal primario', done: false, priority: 'P2', note: 'Flujo marketplace: atleta descubre coach → click "Contactar" → abre WhatsApp del coach con mensaje pre-redactado. Coach activa atleta desde su panel. Medaliq NO intermedia el pago — 0% fee es permanente.' },
        ],
      },
      {
        id: 'plataforma-notificaciones',
        label: 'Notificaciones — Centro in-app y crons',
        period: 'P1-P2',
        items: [
          { title: 'PLT-07 — Centro de notificaciones in-app (campana + feed de eventos)', done: false, priority: 'P1', note: 'Schema aplicado (migración 20260708000001): modelo Notification { userId, type, title, body, read, createdAt, metadata } en Neon prod. Pendiente: UI campana + feed, API GET/POST /api/notifications, badge de no leídas. Tipos: SESION_HOY, CHECKIN_DISPONIBLE, PLAN_ACTUALIZADO, MENSAJE_COACH, AJUSTE_NUTRICIONAL, LOGRO, PROPUESTA_COACH.' },
          { title: 'PLT-08 — Cron: atleta sin actividad 3+ días → push + email re-engagement', done: false, priority: 'P2', note: 'Query: User[ATHLETE] WHERE max(SessionLog.completedAt) < now()-3d AND onboardingCompleted=true. Push: "Te extrañamos — tu plan te espera". Frecuencia máxima: 1/semana por usuario.' },
          { title: 'PLT-09 — Cron: racha en riesgo → push al atleta (1 día sin actividad)', done: false, priority: 'P2', note: 'Atleta que registró actividad ayer pero no hoy → push "¿Hoy no entrenas? Tu racha de N días sigue activa." Solo si el atleta tiene racha activa ≥ 3 días. Hora: 20:00 timezone del atleta.' },
          { title: 'PLT-10 — Cron: atleta en /pending 48h → push + email al coach', done: false, priority: 'P1', note: 'Query: CoachAthlete[ACTIVE] WHERE User.onboardingCompleted=true AND User.featurePlan=false AND coachAthlete.createdAt < now()-48h. Notificación al coach para activar al atleta.' },
        ],
      },
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
          { title: 'FEAT-MOBILE-01 — week-sessions: mostrar SessionLogs libres cuando no hay plan activo o semana sin PlanWeek', done: false, priority: 'P2', note: 'QA-2026-07-08: GET /api/mobile/dashboard/week-sessions retorna 7 días vacíos cuando: (1) planMeta existe pero PlanWeek del currentWeek no existe (plan incompleto), o (2) planMeta null y sin assignedWorkout (atleta runner B2C sin plan). Los SessionLog libres (plannedSessionId=null) de la semana actual nunca se incluyen. Fix: tercer path en la ruta — cuando !selectedWeek O cuando !planMeta+!assignedWorkout → query SessionLog WHERE userId + completedAt en [lunes-domingo semana actual] + plannedSessionId=null → agrupar por dayOfWeek → construir weekSessions con tipo real (freeSessionType) + done:true + durationMin real. Hace el sistema sentirse vivo: el atleta B2C sin plan ve su actividad real de la semana. Archivo: src/app/api/mobile/dashboard/week-sessions/route.ts.' },
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
          { title: 'INT-05 — Schema DB: campos nuevos para datos de wearables en SessionLog y HealthProfile', done: true, priority: 'P1', note: 'Migración 20260708000002_gym_wearables aplicada en Neon prod. SessionLog: caloriesBurned Int?, avgPaceSecPerKm Int?, dataSource String?, externalId String? (hrAvg/hrMax ya existían de DBA-P1). HealthProfile: vo2maxEstimate Float?. WeeklyCheckIn: hrvMs Float?. SetLog: setLogType SetLogType @default(WORK) (enum WORK/WARMUP/DROPSET).' },
        ],
      },
    ],
  },

  // ─── PRE-LANZAMIENTO ─────────────────────────────────────────────────────────

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
        done: true,
        priority: 'P0',
        note: 'Fix: POST /api/coach/clients/create — eliminado el bloque que creaba UserSubscription con tier:TRIAL. Atletas B2B no tienen suscripción propia; su acceso viene del coach vía mergeFeatures(). Comentario explicativo añadido. TRIAL también eliminado del tipo AthleteSubscriptionTier en tier-features.ts. Branch: feature/landing-conversion.',
      },
      {
        title: 'TIER-MODEL — Actualizar computeAthleteFeatures() al modelo definitivo',
        done: true,
        priority: 'P0',
        note: 'DONE (re-fix 2026-07-06): FREE={ plan:false, checkin:false, nutrition:true, progress:false, log:true, gym:true } — capa de tracking. PRO={ todo true excepto coach }. TRIAL eliminado del tipo — no existe en el modelo de negocio. Gate de pago B2C: plan + checkin + progress. Branch: feature/landing-conversion.',
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
        done: true,
        priority: 'P0',
        note: 'Fix: getUserPlan() en user-config.ts ahora acepta isB2B?: boolean. Si isB2B=true → siempre retorna PRO independiente del tier en DB. Billing habilitado: B2B bypasea la consulta de subscription. TRIAL eliminado del flujo de getUserPlan(). Branch: feature/landing-conversion.',
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
          { title: 'Proponer alimento a la librería global — ver NUT-03 a NUT-08 en modulo-nutricion', done: false, priority: 'P1', note: 'La librería es global y compartida — todos los atletas ven todos los alimentos. Cuando un atleta no encuentra un alimento puede proponerlo: se crea con isVerified:false (badge "En revisión"), visible para todos inmediatamente. Admin aprueba → queda verificado. Admin rechaza → isActive:false. No hay alimentos privados por atleta. Implementación completa en implementacion/nutricion.md.' },
          { title: 'Escaneo de código de barras — ver NUT-10/11/12 en modulo-nutricion', done: false, priority: 'P2', note: 'Implementación detallada en implementacion/nutricion.md §Arquitectura barcode. Arquitectura: DB lookup first → Open Food Facts fallback → confirmación atleta → Food creado con source:"openfoodfacts". NUT-10 (client/port), NUT-11 (endpoints), NUT-12 (mobile UI scanner).' },
          { title: 'Recetas compuestas: grupo de alimentos guardados como una unidad (ej. "Mi desayuno habitual")', done: false, priority: 'P2', note: 'Modelo Recipe { userId, name } → RecipeIngredient[] { foodId, grams }. Kcal y macros calculados en tiempo real. Aparece en búsqueda de alimentos como item compuesto. Simplifica el log diario para comidas repetidas.' },
          { title: 'Historial de adherencia nutricional diario en /progress (gráfica 30 días)', done: false, priority: 'P2', note: 'FoodLog agrupado por fecha → % vs target del día usando getDailyNutritionTarget(). Gráfica de barras similar a adherencia de entrenamiento. Complementa la vista semanal ya existente en /api/mobile/nutrition/log/summary.' },
          { title: 'Contexto de fase en nutrición: texto explicativo según semana del plan (carga vs descarga)', done: false, priority: 'P2', note: 'PlanWeek.isRecoveryWeek y PlannedSession.intensity ya existen. Texto en NutritionContent: "Semana de carga — prioriza carbos" o "Semana de descarga — baja 10% calorías". Sin cambiar targets automáticamente.' },
          { title: 'Metas de hidratación diaria: log rápido de agua y barra de progreso en dashboard', done: false, priority: 'P3', note: 'WaterLog { userId, date, ml } modelo nuevo. Quick-tap desde dashboard: +250ml. NutritionPlan.waterMlTarget Int? (default 2000ml). Barra de progreso en tarjeta de nutrición del dashboard.' },
        ],
      },
      {
        id: 'nutricion-atleta-autonomo',
        label: 'Atleta Autónomo — Constructor de Nutrición B2C',
        period: 'P1-P2 — Después de DB-06 (NutritionTemplate.coachId nullable)',
        items: [
          {
            title: 'NUT-B-01 — GET /api/athlete/planned-meals + POST /api/athlete/planned-meals',
            done: false,
            priority: 'P1',
            note: 'GET: listar PlannedMeal del atleta para una semana (?weekStart=YYYY-MM-DD). Agrupa por fecha y mealType. POST: crear PlannedMeal { date, mealType, foodId, grams }. Validar ownership (userId = session.user.id). DB-12 ya tiene el modelo PlannedMeal. Depende de DB-12 (ya en DB) y de DB-06 (coachId nullable) para templates de atleta.',
          },
          {
            title: 'NUT-B-02 — POST /api/athlete/nutrition/templates — crear NutritionTemplate con source ATHLETE',
            done: false,
            priority: 'P1',
            note: 'Después de DB-06: crear NutritionTemplate con coachId: null, athleteId: userId, NutritionSource.ATHLETE. Estructura idéntica al template del coach: 3 NutritionTemplateDay (HARD/EASY/REST) auto-creados. Endpoint propio para atleta, no reutilizar el del coach (ownership diferente). Validar: atleta no tiene CoachAthlete ACTIVE o tiene permiso explícito.',
          },
          {
            title: 'NUT-B-03 — POST /api/athlete/nutrition/templates/[id]/apply — aplicar template a semana → PlannedMeal records',
            done: false,
            priority: 'P1',
            note: 'Body: { weekStart: string, intensityMap: { [dayOfWeek]: HARD|EASY|REST } }. Lógica: para cada día de la semana → seleccionar NutritionTemplateDay según intensity → crear PlannedMeal por cada NutritionTemplateFoodItem del día. Upsert (no duplicar si ya hay PlannedMeal para ese día). $transaction. Depende de NUT-B-01 y NUT-B-02.',
          },
          {
            title: 'NUT-B-04 — GET /api/athlete/nutrition/adherence — adherencia calórica diaria vs PlannedMeal',
            done: false,
            priority: 'P1',
            note: '?from=YYYY-MM-DD&to=YYYY-MM-DD. Para cada día: (1) totalPlanned = sum(PlannedMeal.grams × food.kcalPer100g / 100), (2) totalLogged = sum(FoodLog.kcalLogged usando snapshot). adherencePct = totalLogged / totalPlanned × 100. Retorna array [{ date, plannedKcal, loggedKcal, adherencePct }]. Cero joins extras — usa campos snapshot de FoodLog (NUT-B-05 previo).',
          },
          {
            title: 'NUT-B-06 — GET /api/athlete/nutrition/planned-summary — resumen del día planificado vs realizado',
            done: false,
            priority: 'P2',
            note: '?date=YYYY-MM-DD. Retorna: { plannedMeals: PlannedMeal[], loggedFoods: FoodLog[], totals: { plannedKcal, loggedKcal, plannedProtein, loggedProtein, ... } }. Para mostrar la comparativa en /nutrition del día. Sin lógica de negocio — solo agrupación de datos del día.',
          },
          {
            title: 'NUT-F-01 — Builder UI: crear y editar plantilla de nutrición propia (día/semana)',
            done: false,
            priority: 'P1',
            note: 'Ruta: /nutrition/builder. Solo visible si !coachRelation (atleta sin coach). 3 tabs: Día duro / Día fácil / Descanso. Por tab: lista de comidas (Desayuno/Almuerzo/Cena/Snack) con items de alimento. Misma UX que NutritionBuilderClient del coach. FoodSearchModal reutilizable. POST /api/athlete/nutrition/templates. Depende de NUT-B-02.',
          },
          {
            title: 'NUT-F-02 — Vista semanal de comidas planificadas en /nutrition',
            done: false,
            priority: 'P1',
            note: 'Sección en /nutrition: "Menú de esta semana" — 7 días con mealType y alimentos planificados por día. Badge de intensidad (Duro/Fácil/Descanso) según el plan. CTA "Aplicar mi menú" → POST /api/athlete/nutrition/templates/[id]/apply. Depende de NUT-B-03. Reemplaza el estado vacío actual de PlannedMeal en /nutrition.',
          },
          {
            title: 'NUT-F-03 — Gráfica adherencia calórica diaria en /nutrition (barras 7 días)',
            done: false,
            priority: 'P2',
            note: 'Sección en /nutrition: "Adherencia de la semana" — mini bar chart con 7 barras (Lun-Dom): altura = % de meta calórica cubierta. Color: verde >90%, naranja 70-90%, rojo <70%. Si no hay PlannedMeal para ese día → barra gris "Sin plan". Sin dependencias externas — reutilizar el patrón de SVG/div nativo del resto de gráficas.',
          },
          {
            title: 'NUT-F-04 — Desglose macros por comida en vista del día planificado',
            done: false,
            priority: 'P2',
            note: 'En /nutrition/day o en modal: lista de comidas del día (Desayuno/Almuerzo/Cena/Snack) con alimentos planificados + macros calculados. Total de la comida con barra de progreso inline. Permite al atleta preparar cada comida del día con datos precisos. Usa NUT-B-06.',
          },
          {
            title: 'NUT-F-05 — Comparativa PlannedMeal vs FoodLog real al final del día',
            done: false,
            priority: 'P2',
            note: 'En /nutrition al final del día (18:00+) o en /nutrition/summary: tabla comparativa — comida planificada vs comida registrada. Delta kcal/proteína/carbs/grasa. Badge "Completado" si adherencia >=80%, "Déficit" o "Exceso" según el caso. Motivación por completar el plan nutricional propio. Depende de NUT-B-06.',
          },
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
          { title: 'PAN-B-07 — NutritionContent: normalizar renderizado para formato del constructor del coach', done: false, priority: 'P2', note: 'NutritionContent.tsx recibe MealPlanData ({ hard, easy, rest }) del plan del sistema. El constructor del coach genera NutritionTemplateDay → NutritionTemplateMeal → NutritionTemplateFoodItem. Hoy normalizeDay() maneja ambos formatos parcialmente. Fix: unificar completamente la función de normalización para que NutritionContent renderice correctamente tanto planes del sistema como plantillas del constructor del coach, sin código especial por formato. Aplicar en web y mobile.' },
        ],
      },
      {
        id: 'nutricion-sistema',
        label: 'Sistema — Base de Datos, Propuestas & Barcode',
        period: 'Próximo',
        items: [
          { title: 'NUT-01 — Migración schema Food: campos source, barcode, country + indexes', done: true, priority: 'P1', note: 'Migración 20260708000001_identity_notification_food aplicada en Neon prod. Food: source String @default("system"), barcode String? @unique, country String?. Indexes: Food_barcode_idx, Food_country_idx. Único en barcode garantizado a nivel DB.' },
          { title: 'NUT-02 — Seed Colombia + Mexico: ~250 alimentos nuevos con macros verificados', done: false, priority: 'P1', note: 'CO: panadería (pandebono, almojabana, buñuelo), platos (bandeja paisa, ajiaco, sancocho, tamal), frutas exóticas (lulo, curuba, uchuva, feijoa). MX: base (tortilla, masa), platos (quesadilla, pozole, enchiladas), frutas (mamey, zapote). source:"system", country:"CO"/"MX". Lista completa en implementacion/nutricion.md.' },
          { title: 'NUT-03 — Modelo FoodProposal + enum FoodProposalStatus + migración', done: true, priority: 'P1', note: 'Migración 20260708000001_identity_notification_food aplicada en Neon prod. enum FoodProposalStatus { PENDING | APPROVED | REJECTED }. Tabla FoodProposal con FK a User (submittedBy/reviewedBy) y Food. Indexes: status, submittedById. Relations en User y Food actualizadas en schema.prisma.' },
          { title: 'NUT-04 — ProposeFoodUseCase + IFoodProposalRepository + PrismaFoodProposalRepository', done: false, priority: 'P1', note: 'Librería global: $transaction: (1) Food.create { source:"community", isVerified:false, createdBy:userId } (2) FoodProposal.create { status:PENDING, foodId }. El alimento queda visible para TODOS los atletas con badge "En revisión" — no es privado. Approve → Food.update { isVerified:true }. Reject → Food.update { isActive:false }. domain/nutrition/food-proposal/ + infrastructure/db/food-proposal.repository.ts.' },
          { title: 'NUT-05 — POST /api/nutrition/foods/propose + /api/mobile/nutrition/foods/propose', done: false, priority: 'P1', note: 'Validación Zod: nombre requerido, kcal/macros > 0, category válida, country ISO opcional. Rate limit 10 propuestas/hora por usuario. Retorna { proposalId, foodId }. El alimento ya aparece en la búsqueda global con badge "En revisión" inmediatamente tras la propuesta.' },
          { title: 'NUT-06 — GET /api/nutrition/foods/my-proposals + mobile — atleta ve sus propuestas y estado', done: false, priority: 'P1', note: 'Retorna lista de FoodProposal del userId ordenadas por createdAt desc. Incluye food { name, kcalPer100g } + status + reviewNote si REJECTED. Mobile: badge "N en revisión" en pantalla de nutrición. Al tocar → pantalla de propuestas con estado visual (PENDING/amber · APPROVED/green · REJECTED/red).' },
          { title: 'NUT-07 — Admin: GET /api/admin/nutrition/proposals + panel /admin/nutrition/proposals', done: false, priority: 'P1', note: 'Query: FoodProposal con status=PENDING (default) + submittedBy { name } + food { name, kcalPer100g, macros, country }. UI: tabla con columnas nombre / macros / país / propuesto por / hace cuánto / notas. Filtro por status. Badge en sidebar admin con count PENDING.' },
          { title: 'NUT-08 — POST .../approve + .../reject — ReviewFoodUseCase', done: false, priority: 'P1', note: 'Approve: Food.update { isVerified:true, source:"community", createdBy:null } + FoodProposal.update { status:APPROVED, reviewedById }. Reject: Food.update { isActive:false } + FoodProposal.update { status:REJECTED, reviewNote, reviewedById }. Ambos usan $transaction. Admin debe estar autenticado con role=ADMIN.' },
          { title: 'NUT-09 — Seed Argentina/Peru/Chile/Venezuela (~150 alimentos)', done: false, priority: 'P2', note: 'AR: milanesa, choripán, empanada, dulce de leche, mate. PE: ceviche (componentes), lomo saltado, aji amarillo, maca. VE: arepa venezolana (harina PAN), pabellón criollo, cachapa. CL: pastel de choclo, sopaipilla. Lista completa en implementacion/nutricion.md.' },
          { title: 'NUT-10 — IFoodLookupClient port + OpenFoodFactsClient (barcode scanning)', done: false, priority: 'P2', note: 'Port: IFoodLookupClient.lookupByBarcode(code) → FoodLookupResult | null. Implementación: fetch world.openfoodfacts.org/api/v2/product/{code}. Flujo: DB lookup first → si no existe → OFF → response con needsConfirmation:true → atleta confirma → POST crea Food { source:"openfoodfacts", isVerified:false, barcode:code }. Ver implementacion/nutricion.md para código completo.' },
          { title: 'NUT-11 — GET /api/nutrition/foods/barcode + /api/mobile/nutrition/foods/barcode', done: false, priority: 'P2', note: 'GET ?code={EAN13}. Phase 1: DB.findFirst({ where: { barcode: code } }) → hit directo. Phase 2: OpenFoodFactsClient.lookupByBarcode(code) → 404 si no existe. Rate limit: 300/min (GET). El código EAN escaneado en mobile se envía a este endpoint.' },
          { title: 'NUT-12 — Mobile: UI scanner código de barras + flujo de confirmación', done: false, priority: 'P3', note: 'expo-barcode-scanner (o expo-camera con barcode detection). Flujo: botón "Escanear" en LogFoodModal → cámara → código detectado → GET /api/mobile/nutrition/foods/barcode?code=XXX → si hit: abre LogFoodModal con alimento pre-cargado. Si miss: pantalla "No encontramos este producto" + CTA "Proponer alimento" pre-llenado con barcode.' },
          { title: 'NUT-13 — Categorías de alimentos como filtro en búsqueda (chips web + mobile)', done: false, priority: 'P2', note: 'Food.category ya existe. Chips/filtros en SearchStep del LogFoodModal: PROTEIN / CARB / FAT / VEGETABLE / FRUIT / DAIRY / LEGUME / PREPARED / OTHER. Filtro client-side sobre resultados ya cargados — sin query adicional.' },
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
    label: 'Módulo Fuerza & Ejercicios',
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
          { title: 'Curva de fuerza por ejercicio: gráfica de 1RM estimado histórico', done: true, priority: 'P1', note: 'DONE (FASE 1): Brzycki client-side en Tab Sesiones de AthleteDetailClient.tsx. Coach ve gráfica de 1RM estimado por ejercicio, últimas 12 semanas. Pendiente: gráfica en /progress del atleta (mobile).' },
          { title: 'Sesión auto-dirigida con búsqueda en librería de ejercicios (sin template requerido)', done: false, priority: 'P1', note: 'Gym libre ya funciona. Mejorar: input de búsqueda en la DB de ejercicios (39 globales + custom del coach) en lugar de solo nombre libre. Filtro por grupo muscular. Nombre libre como fallback.' },
          { title: 'Visualización de sesión anterior mejorada: Δ peso/reps por set (verde si mejora, rojo si baja)', done: false, priority: 'P1', note: 'Ya hay referencia de sesión anterior parcialmente. Mejorar UX: mostrar el delta visual en cada set row (ej. "+2.5kg vs sem anterior"). Atleta ve de inmediato si está progresando.' },
          { title: 'Drop sets y sets de calentamiento: marcar tipo de set (trabajo / calentamiento / drop)', done: true, priority: 'P2', note: 'DONE (GYM-15): LocalSet.setLogType en gym-session.tsx. Tap en número de set cicla WORK → WARMUP (badge W, fondo naranja) → DROPSET (badge ↓, fondo rojo). SET_TYPE_CONFIG con estilos por tipo. cycleSetType() guarda en draft. setLogType en payload y persistido en SetLog. 3 paths de route.ts actualizados. Backward compat: drafts viejos → default WORK.' },
          { title: 'RPE por ejercicio individual al terminar todos sus sets (no solo RPE de sesión completa)', done: false, priority: 'P2', note: 'SetLog.rpe Int? o por WorkoutExercise al completar todos sus sets. Promedio pesa en GymSession.rpe. Coach ve distribución de esfuerzo por ejercicio para ajustar volumen individualmente.' },
        ],
      },
      {
        id: 'fuerza-coach',
        label: 'Coach — Supervisión y Progresión',
        period: 'Próximo',
        items: [
          { title: 'Coach ve historial completo de gym del atleta: tabla de sesiones, ejercicios, volumen, RPE', done: true, priority: 'P1', note: 'DONE (FASE 1): logs/route.ts expandido con isPR + setLogType por set. Tab Sesiones en AthleteDetailClient con sesiones, ejercicios y curva de fuerza. GET /api/coach/gym/athlete/[id]/logs. Pendiente: paginación 20/página y export CSV.' },
          { title: 'PRs consolidados en panel del coach: todos los récords del atleta agrupados por ejercicio', done: true, priority: 'P1', note: 'DONE (FASE 1): GET /api/coach/gym/athlete/[id]/prs — setLog.findMany({ isPR: true, setLogType: WORK }). Sección PRs en Tab Sesiones de AthleteDetailClient con ejercicio, peso, reps y fecha. Branch: feature/gym-module-complete.' },
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
          { title: 'Offline support para gym session tracker (AsyncStorage con sync al reconectar)', done: true, priority: 'P1', note: 'DONE: gymSessionDraft.ts — saveDraft/loadDraft (sets en AsyncStorage durante sesión) + savePendingSync/loadPendingSync (cola de retry al reconectar). gym-session.tsx carga draft al abrir, guarda en cada cambio y reintenta sync pendiente al montar. Branch: feature/16-self-directed-tracking.' },
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
          { title: 'EJ-03 — Selector de disciplina en sesión libre: Gym / Running / Fortalecimiento / Descanso', done: true, priority: 'P1', note: 'DONE (FASE 2 mobile): log.tsx — FREE_ACTIVITY_TYPES incluye Gym y Descanso con formulario por tipo. Branch: feature/16-self-directed-tracking (mobile). Pendiente: web (log libre en /log web).' },
          { title: 'EJ-04 — Día off/descanso como sesión registrada que cuenta para métricas', done: true, priority: 'P2', note: 'DONE (FASE 2 mobile): log.tsx — SessionType.DESCANSO disponible como opción en selector. Cuenta como actividad en historial sin contar como sesión de entrenamiento. Branch: feature/16-self-directed-tracking (mobile).' },
          { title: 'EJ-05 — Métricas multi-período en /progress: mensual, trimestral, semestral, anual', done: false, priority: 'P2', note: 'Hoy solo existe vista semanal en dashboard y /progress. Agregar: (1) mensual: volumen total, sesiones, PRs del mes. (2) trimestral: curva de fuerza y tendencia de adherencia en 12 semanas. (3) semestral: progresión de composición corporal (peso + medidas del check-in). (4) anual: hitos y logros del año. Aplica web y mobile /progress.' },
          { title: 'EJ-06 — Benchmarks UI para el atleta: registrar y ver sus propios tests de rendimiento', done: false, priority: 'P3', note: 'PerformanceBenchmark ya existe en DB (1RM_SQUAT, 1RM_BENCH, 5K_TIME, etc.) con CHECK constraints en DB + validación VALID_SPORTS/VALID_METRICS. Pendiente: (1) endpoints /api/mobile/progress/benchmarks (GET+POST) — NO existen todavía, (2) endpoints web /api/progress/benchmarks, (3) UI atleta en web (/progress o /gym), (4) Tab Rendimiento en perfil atleta del coach.' },
          { title: 'EJ-07 — Panel de adherencia del plan por atleta en coach dashboard', done: true, priority: 'P1', note: 'DONE (FASE 1): GET /api/coach/gym/athlete/[id]/adherence — assigned workout daysPerWeek vs FUERZA completadas. Tab Adherencia en AthleteDetailClient: últimas 4 semanas, badge semafórico verde >80% / amarillo 60-80% / rojo <60%, barra acumulada. Branch: feature/gym-module-complete.' },
        ],
      },
      {
        id: 'ejercicios-seed',
        label: 'Biblioteca — Fase 0: Ingesta del dataset WorkoutX',
        period: 'P1 — Base del módulo',
        items: [
          {
            title: 'EX-01 — Modelo Prisma Exercise: id, name, bodyPart, target, equipment, difficulty, mechanic, force, caloriesPerMinute, met, popularityRank, isUnilateral, recommendedSets, recommendedReps, description, secondaryMuscles[], instructions[], gifUrl, gifStoredUrl?, source, syncedAt + índices bodyPart/target/equipment',
            done: true,
            priority: 'P0',
            note: 'DONE (feature/exercise-rewrite): schema.prisma reescrito — enums EquipmentType/ExerciseCategory eliminados, muscleGroups[] → bodyPart+target strings, isGlobal → coachId: null. Migración 20260710000001_exercise_rewrite aplicada en Neon prod. @@index([bodyPart/target/equipment]) creados.',
          },
          {
            title: 'EX-02 — WorkoutXClient: adapter HTTP que consume WorkoutX API — solo usado en sync, nunca en producción runtime',
            done: true,
            priority: 'P0',
            note: 'DONE (feature/exercise-rewrite): src/infrastructure/exercise-sync/workoutx.client.ts — fetchAll() pagina 100/request, mapea WorkoutX JSON → Exercise domain. IExerciseSourceClient port en src/domain/exercise/ports/exercise-source.client.ts.',
          },
          {
            title: 'EX-03 — ExerciseSyncUseCase: orquesta fetch → map → upsertMany. Endpoint admin POST /api/admin/exercises/sync',
            done: true,
            priority: 'P0',
            note: 'DONE (feature/exercise-rewrite): src/infrastructure/exercise-sync/exercise-sync.use-case.ts + POST /api/admin/exercises/sync. Pendiente: configurar WORKOUTX_API_KEY en Vercel y ejecutar el endpoint para seed inicial de 1,400+ ejercicios.',
          },
          {
            title: 'EX-04 — IExerciseRepository port + PrismaExerciseRepository: toda la app consume ejercicios desde nuestro DB, nunca desde WorkoutX',
            done: true,
            priority: 'P0',
            note: 'DONE (feature/exercise-rewrite): src/domain/exercise/ports/exercise.repository.ts (IExerciseRepository) + src/infrastructure/db/exercise.repository.ts (PrismaExerciseRepository). findAll(filters), findById, findSimilar, upsertMany.',
          },
          {
            title: 'EX-05 — Seed inicial: correr ExerciseSyncUseCase una vez — carga 1,400+ ejercicios con metadata completa en DB local',
            done: false,
            priority: 'P0',
            note: 'Pendiente: (1) configurar WORKOUTX_API_KEY en Vercel env vars, (2) llamar POST /api/admin/exercises/sync desde el panel admin. El código está listo. Sin este seed la biblioteca de ejercicios tiene solo los 39 ejercicios custom del seed manual. EJECUTAR DESPUÉS de EX-05b (migración nameEs/instructionsEs).',
          },
          {
            title: 'EX-05b — Migración Prisma: agregar nameEs String? + instructionsEs String[] al modelo Exercise + actualizar WorkoutXClient con lang=es',
            done: false,
            priority: 'P0',
            note: 'Dos pasos: (1) Migración: pnpm prisma migrate dev --name exercise-add-spanish-fields — agrega nameEs String? e instructionsEs String[] al modelo Exercise. (2) WorkoutXClient: al hacer fetch de cada página pasar ?lang=es → mapear name→nameEs, instructions→instructionsEs. Mantener name e instructions en inglés como fallback. UI usa: nameEs ?? name e instructionsEs.length ? instructionsEs : instructions. Ejecutar ANTES de EX-05 para que el seed cargue español desde el primer sync. Cero costo adicional — mismo plan FREE, mismos 14 requests.',
          },
        ],
      },
      {
        id: 'ejercicios-hardening',
        label: 'Biblioteca — Fase 0b: Hardening pre-seed',
        period: 'P0/P1 — Hacer antes de EX-05 y antes de construir UI',
        items: [
          {
            title: 'EX-19 — upsertMany: reemplazar 1,400 queries secuenciales por $transaction por batches de 100',
            done: false,
            priority: 'P0',
            note: 'exercise.repository.ts:69 — el loop actual hace 1 query por ejercicio = ~28s con latencia Neon. Fix: dividir en chunks de 100 y envolver cada chunk en prisma.$transaction(batch.map(ex => prisma.exercise.upsert({...}))). 14 transacciones de 100 en lugar de 1,400 queries sueltas. Cada batch es atómico. BLOQUEANTE para EX-05 — si se corre el seed con la implementación actual, Vercel corta la request por timeout.',
          },
          {
            title: 'EX-20 — Mover ExerciseSyncUseCase de infrastructure/ a domain/exercise/',
            done: false,
            priority: 'P1',
            note: 'src/infrastructure/exercise-sync/exercise-sync.use-case.ts → mover a src/domain/exercise/exercise-sync.use-case.ts. Violación de capa: un use case pertenece al dominio, no a la infraestructura. La infra implementa ports, no orquesta casos de uso. Actualizar import en sync/route.ts.',
          },
          {
            title: 'EX-21 — /api/coach/gym/exercises GET: reemplazar prisma directo por PrismaExerciseRepository + agregar paginación',
            done: false,
            priority: 'P1',
            note: 'coach/gym/exercises/route.ts:14 — hace prisma.exercise.findMany() sin limit ni skip → con 1,400 ejercicios carga todo en memoria. Además bypassea el repository: no resuelve gif: gifStoredUrl ?? gifUrl → en Fase 4 (S3) este endpoint servirá URLs de WorkoutX CDN aunque todos los demás ya no. Fix: usar repo.findAll({ coachId, ...filters }) con paginación. Depende de EX-25 (coachId en ExerciseFilters).',
          },
          {
            title: 'EX-22 — requireAdmin en sync/route.ts: leer role del JWT en lugar de hacer query extra a DB',
            done: false,
            priority: 'P1',
            note: 'sync/route.ts:8 — llama auth() + prisma.user.findUnique para verificar rol. El role ya está en session.user.role (JWT). Fix: return session?.user?.role === "ADMIN" ? session : null. Elimina 1 query a Neon en cada llamada al sync.',
          },
          {
            title: 'EX-23 — Unificar UpsertExerciseData con Exercise eliminando duplicación de campos',
            done: false,
            priority: 'P2',
            note: 'exercise.types.ts:39 — UpsertExerciseData duplica casi todos los campos de Exercise. Si se agrega nameEs/instructionsEs (EX-05b) hay que actualizarlo en dos interfaces y en el mapper. Fix: type UpsertExerciseData = Omit<Exercise, "gif" | "syncedAt"> & { gifUrl: string; syncedAt: Date }. Reduce superficie de mantenimiento.',
          },
          {
            title: 'EX-24 — Usar validateExercise() del dominio en /api/coach/gym/exercises POST en lugar de validación inline duplicada',
            done: false,
            priority: 'P2',
            note: 'coach/gym/exercises/route.ts:36 — valida campos con if-checks manuales. domain/admin/exercise.ts ya tiene validateExercise() con las mismas reglas + límite de 120 chars en nombre (que el endpoint inline no tiene). Fix: importar validateExercise, ejecutar, si errors.length > 0 → return 400 con errors array.',
          },
          {
            title: 'EX-25 — Agregar coachId como filtro opcional en ExerciseFilters e IExerciseRepository',
            done: false,
            priority: 'P2',
            note: 'ExerciseFilters no tiene coachId. El endpoint del coach filtra con OR:[{coachId},{coachId:null}] en raw, bypasseando el repo. Fix: agregar coachId?: string | null a ExerciseFilters. En PrismaExerciseRepository.findAll: if coachId → where.OR = [{coachId},{coachId:null}], else → solo ejercicios globales. Permite que EX-21 use repo.findAll() correctamente.',
          },
          {
            title: 'EX-26 — NaN guard en query params page y limit en /api/exercises y /api/mobile/exercises',
            done: false,
            priority: 'P3',
            note: 'exercises/route.ts:17 — Number(searchParams.get("page")) produce NaN si el valor no es numérico → skip = NaN → Prisma lanza 500. Fix: usar parseInt(val ?? "1", 10) || 1 y parseInt(val ?? "20", 10) || 20. Aplicar igual en mobile/exercises/route.ts.',
          },
        ],
      },
      {
        id: 'ejercicios-api',
        label: 'Biblioteca — Fase 1: API propia',
        period: 'P1 — Sin dependencia runtime',
        items: [
          {
            title: 'EX-06 — GET /api/exercises: filtros bodyPart, target, equipment, q= con paginado. GET /api/exercises/:id: detalle completo',
            done: true,
            priority: 'P0',
            note: 'DONE (feature/exercise-rewrite): /api/exercises/route.ts + /api/exercises/[id]/route.ts + /api/mobile/exercises/route.ts + /api/mobile/exercises/[id]/route.ts. gifUrl: gifStoredUrl ?? gifUrl. Filtros: bodyPart, target, equipment, source, q con contains insensitive.',
          },
          {
            title: 'EX-07 — GET /api/exercises/:id/similar: ejercicios similares calculados desde DB (mismo bodyPart + target)',
            done: true,
            priority: 'P1',
            note: 'DONE (feature/exercise-rewrite): /api/exercises/[id]/similar/route.ts — WHERE bodyPart = X AND target = Y AND id != currentId LIMIT 6. Sin dependencia de WorkoutX en runtime.',
          },
        ],
      },
      {
        id: 'ejercicios-ui',
        label: 'Biblioteca — Fase 2: UI visual rediseñada',
        period: 'P1 — Cerrar brecha visual vs Pulse',
        items: [
          {
            title: 'EX-08 — Rediseño /coach/gym/exercises: tabla de texto → hero con contadores + selector visual de bodyPart + chips de equipment + search bar + grid 3 col de cards con GIF',
            done: false,
            priority: 'P1',
            note: 'Referencia: workoutxapp.com/exercises.html. (1) Hero: N ejercicios · 19 músculos · 9 body parts. (2) Selector bodyPart: imágenes anatómicas como chips visuales (no dropdown). (3) Filtros equipment como pills clickeables (Body Weight / Barbell / Dumbbell / Cable / Machine…). (4) Search bar global con filtros de dificultad + categoría + sort. (5) Grid 3 col: card con gifUrl <img lazy /> + nombre + bodyPart chip + target chip + difficulty badge + kcal/min. Lazy load con IntersectionObserver. Depende de EX-05 (seed 1,400+ ejercicios).',
          },
          {
            title: 'EX-09 — Modal detalle de ejercicio: GIF grande + músculos primarios y secundarios + instrucciones paso a paso + badges completos',
            done: false,
            priority: 'P1',
            note: 'Click en card → modal/sheet. GIF full width. Sección músculos: primary (target) + secondary (secondaryMuscles[]). Instrucciones numeradas. Badges: difficulty, mechanic, force, equipment. Botón "Agregar a rutina" si está en el constructor. Depende de EX-08.',
          },
          {
            title: 'EX-10 — Ejercicios con GIF inline en el constructor de rutinas del coach al asignar ejercicio',
            done: false,
            priority: 'P2',
            note: 'En WorkoutTemplate builder: al buscar/seleccionar un ejercicio, mostrar el GIF en miniatura como preview. Reduce errores de asignación (el coach ve qué está poniendo). Depende de EX-08.',
          },
          {
            title: 'EX-15 — Biblioteca de ejercicios para atleta en web: /exercises con filtros bodyPart + equipment + search + grid de cards con GIF',
            done: false,
            priority: 'P2',
            note: 'Ruta /exercises (atleta B2C Free/Pro) o /gym/exercises. Misma librería de ejercicios globales que ve el coach pero sin herramientas de edición. Filtros: bodyPart (chips visuales), equipment (pills), search. Grid 3 col con cards GIF + nombre + target. Útil para atletas que entrenan solos y buscan referencia visual de un movimiento. Depende de EX-05 (1,400+ ejercicios en DB) y EX-08 (componentes UI reutilizables).',
          },
          {
            title: 'EX-16 — Modal detalle de ejercicio para atleta: GIF + músculos + instrucciones + botón "Agregar a rutina libre"',
            done: false,
            priority: 'P2',
            note: 'Click en card desde EX-15 → modal. GIF full width. Músculos primarios (target) + secundarios (secondaryMuscles[]). Instrucciones numeradas. Badges: difficulty, mechanic, force, equipment. Botón "Agregar a mi rutina" → agrega exercise a la sesión libre activa del atleta (featureGym). Depende de EX-15.',
          },
          {
            title: 'EX-17 — Swap de ejercicio en sesión activa: sugerencia de alternativas calculada desde DB local (mismo bodyPart + equipment compatible)',
            done: false,
            priority: 'P2',
            note: 'En sesión activa (coach plan o rutina libre): botón "Swap" por ejercicio → llama GET /api/exercises/:id/alternatives (implementado 100% desde DB local — sin llamada a WorkoutX en runtime). Query: WHERE bodyPart = $bodyPart AND (equipment = $equipment OR equipment = "body weight") AND id != $exerciseId ORDER BY popularityRank ASC LIMIT 5. Si no hay resultados con mismo equipment → fallback: WHERE bodyPart = $bodyPart AND id != $exerciseId LIMIT 5. Atleta elige el reemplazo → SessionLog registra exerciseId real ejecutado. Util para: no tienes barbell → reemplaza por mancuernas. Cero costo adicional, sin upgrade de tier. Depende de EX-05 (1,400 ejercicios en DB con popularityRank) y EX-08.',
          },
          {
            title: 'EX-18 — Calorías quemadas en sesión gym: caloriesPerMinute × duración → kcalBurned en SessionLog → descuento en balance nutricional del día',
            done: false,
            priority: 'P2',
            note: 'El campo caloriesPerMinute ya está en Exercise (seed WorkoutX). Al guardar sets en SetLog: calcular kcalBurned = SUM(sets × reps × caloriesPerMinute × avgRepDuration). Al cerrar la sesión: persistir en SessionLog.kcalBurned (campo ya existe). En el módulo de nutrición del día: balance = targetKcal - kcalLogged + SessionLog.kcalBurned. Es el eslabón que une el módulo gym con nutrición — actualmente están desconectados. Cero llamadas externas — todo calculado desde datos en DB. Depende de EX-05 (caloriesPerMinute cargado desde WorkoutX seed).',
          },
        ],
      },
      {
        id: 'ejercicios-mobile',
        label: 'Biblioteca — Fase 3: Mobile',
        period: 'P2 — Atleta ve el ejercicio del día',
        items: [
          {
            title: 'EX-11 — Ejercicio del día en mobile: GIF demo al ejecutar la sesión asignada por el coach',
            done: false,
            priority: 'P1',
            note: 'En la pantalla de sesión activa mobile: cada ejercicio asignado muestra su GIF como guía visual antes de registrar sets. Consume /api/mobile/exercises/:id. Sin nueva infraestructura — el gifUrl ya está en DB.',
          },
          {
            title: 'EX-12 — Búsqueda de ejercicios en mobile: atleta puede explorar la biblioteca desde la app',
            done: false,
            priority: 'P2',
            note: 'Lista con filtros básicos (bodyPart, search). Detalle con GIF. Útil para atletas B2C que entrenan solos y quieren referencia visual. Depende de EX-11.',
          },
        ],
      },
      {
        id: 'ejercicios-storage',
        label: 'Biblioteca — Fase 4: Independencia total (GIFs en AWS S3)',
        period: 'P2 — Trigger: 5 coaches pagando activos',
        items: [
          {
            title: 'EX-13 — Script admin: descarga todos los GIFs desde gifUrl → sube a AWS S3 → actualiza gifStoredUrl en DB',
            done: false,
            priority: 'P2',
            note: 'Endpoint POST /api/admin/exercises/upload-gifs — ADMIN only. Itera exercises WHERE gifStoredUrl IS NULL, fetch(gifUrl), upload S3 bucket medaliq-exercises/, update gifStoredUrl. Costo: ~70MB storage ($0.0016/mes) + egress S3 ($0.09/GB). A 500 coaches: ~$1.35/mes. Trigger: cuando haya 5 coaches pagando activos — el riesgo de dependencia WorkoutX CDN justifica el setup.',
          },
          {
            title: 'EX-14 — UI transparente: gifStoredUrl ?? gifUrl en todos los componentes que muestran GIFs de ejercicios',
            done: false,
            priority: 'P2',
            note: 'Cambio de 1 línea en /api/exercises response: gif: exercise.gifStoredUrl ?? exercise.gifUrl. Todos los clientes (web + mobile) lo reciben automáticamente sin cambios adicionales. Depende de EX-13.',
          },
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
          { title: 'BUG-047 — Dashboard Sebastián: hero muestra "Sin plan activo" pero widget semanal muestra plan 5K', done: true, priority: 'P2', note: 'Cerrado: no es bug. Hero filtra status=\'ACTIVE\' → correcto. Widget semanal muestra PlanCompletionCard en modo RECOVERY (plan completado ≤14 días) → comportamiento diseñado según atleta.md:66-83.' },
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
          { title: 'BUG-060 — /nutrition: CTA "¿Quieres un plan de comidas?" aparece aunque el atleta ya tiene NutritionPlan activo', done: true, priority: 'P3', note: 'Cerrado: texto "Configura tu plan nutricional" no existe en código actual. nutrition/page.tsx usa condición !nutritionPlan correctamente. Si el atleta tiene NutritionPlan en DB, no se muestra ningún CTA.' },
          { title: 'BUG-061 — /progress adherencia histórica 0% en todas las semanas (doble causa: seed no guarda el campo + API calcula mal)', done: true, priority: 'P1', note: 'CÓDIGO LOCALIZADO 2026-07-03. CAUSA 1 — Seed no persiste el campo: prisma/seed.ts:258-264 crea WeeklyCheckIn con wkg/hr/sleep/score/rpe/pain/energy/notes pero OMITE `adh` (adherencia). El campo DB se llama `dietAdherencePct` (schema.prisma:449) — el seed nunca lo popula, queda en null. CAUSA 2 — API calcula adherencia solo desde logs: src/app/api/mobile/progress/route.ts:86-91 `adherencePct: adherencePct(w.sessions)` que cuenta `PlannedSession.log !== null`. Nunca consulta WeeklyCheckIn.dietAdherencePct. FIX DOBLE: (1) prisma/seed.ts:259 agregar `dietAdherencePct: ci.adh` al create de WeeklyCheckIn. (2) progress/route.ts:86: en la query incluir WeeklyCheckIn para la semana y usar su dietAdherencePct si existe, sino calcular desde sessions.' },
          { title: 'BUG-062 — /progress: texto "ÚLTIMAS 1 SESIONES" gramaticalmente incorrecto', done: false, priority: 'P3', note: 'QA-2026-07-03: El historial de actividad en /progress muestra "HISTORIAL DE ACTIVIDAD — ÚLTIMAS 1 SESIONES". Cuando hay 1 resultado, el texto debería ser "ÚLTIMA SESIÓN" o "ÚLTIMAS N SESIONES" (pluralización condicional). Fix: condicional en ProgressClient.tsx — if (sessions.length === 1) ? "ÚLTIMA SESIÓN" : `ÚLTIMAS ${sessions.length} SESIONES`.' },
          { title: 'BUG-063 — /gym B2B: atleta sin rutina asignada bloqueado sin acceso a plantillas (early return en gym/page.tsx:95-106)', done: true, priority: 'P2', note: 'Fix: early return eliminado. B2B sin rutina ve banner azul "Tu coach aún no te asignó una rutina" + plantillas públicas debajo. B2C sin coach ve plantillas directamente sin banner. Branch: bugfix/mvp-ux-flows.' },
          { title: 'BUG-064 — /gym: sin opción de registrar sesión libre mientras se espera rutina del coach', done: false, priority: 'P2', note: 'QA-2026-07-03: La pantalla "Tu coach gestionará tu rutina" en /gym no ofrece ninguna acción alternativa. El atleta no puede registrar una sesión de fuerza libre, no tiene acceso a /log/gym (si existe), y no hay enlace a ningún logger. Fix: agregar botón "Registrar sesión libre" o enlace a plantillas. Relacionado con BUG-063.' },
          { title: 'BUG-065 — /log/run: sin redirect ni confirmación visual tras guardar corrida', done: true, priority: 'P2', note: 'DONE: log/run/page.tsx ya hace router.push("/dashboard") tras POST exitoso. Feedback visual implícito vía navegación.' },
          { title: 'BUG-066 — /log/run: slider de duración no se resetea al valor default después de guardar', done: false, priority: 'P3', note: 'QA-2026-07-03: El slider de duración en /log/run queda en el último valor usado (ej. 50 min) en lugar de volver al default (45 min) después de guardar o cancelar. Fix: resetear todos los campos del formulario al estado inicial en el handler onSuccess. Verificar LogRunClient.tsx — el reset() del form state.' },
          { title: 'BUG-067 — /profile: fecha de nacimiento vacía pero edad muestra "30 años" (edad hardcodeada en HealthProfile.age)', done: true, priority: 'P2', note: 'DONE: ProfileClient.tsx muestra `{p.dateOfBirth ? calcAge(p.dateOfBirth) : p.age} años` — calcula dinámicamente desde birthDate si existe. Formulario de edición tiene campo dateOfBirth. calcAge() implementada con lógica correcta de cumpleaños.' },
          { title: 'BUG-068 — /progress: gap S7-S11 en gráfico de peso por check-in guardado en semana incorrecta (encadenado con BUG-050)', done: true, priority: 'P2', note: 'Cerrado: consecuencia de BUG-050 (ya resuelto). getPlanWeekNumber() ahora calcula correctamente. Los datos con weekNumber incorrecto eran de seed, no de usuarios reales.' },
          { title: 'BUG-069 — Onboarding: contador "Paso X de Y" cambia el total dinámicamente al seleccionar opciones', done: true, priority: 'P3', note: 'Fix: onboarding/page.tsx — totalSteps calculado excluyendo el paso "generating" (steps.filter(s => s !== "generating").length). El total ya no incluye la pantalla de carga como paso visible, estabilizando el contador. isLastDataStep sigue usando steps[stepIndex + 1] === "generating" (correcto). Branch: feature/landing-conversion.' },
          { title: 'BUG-070 — /new-goal: pre-selección de meta no corresponde al deporte elegido en onboarding', done: true, priority: 'P2', note: 'Resuelto por eliminación: directorio /new-goal eliminado (ARCH-01). La ruta no es accesible desde ningún flujo activo.' },
          { title: 'BUG-071 — /new-goal: "Error generando plan" (HTTP 500) — WorkoutDay FK no existe en producción', done: true, priority: 'P0', note: 'Fix (UX-04): /new-goal ya no genera plan. NewGoalClient llama PATCH /api/athlete/sport que guarda goalType en HealthProfile y redirige a /dashboard. El plan se genera cuando el coach lo asigne o vía flujo posterior. Branch: bugfix/mvp-ux-flows.' },
          { title: 'BUG-072 — /checkin: botón "Abrir check-in de todas formas" navega a /api/auth/signout — cierra sesión', done: true, priority: 'P0', note: 'Fix: EarlyCheckInScreen.tsx — ambos botones ("Volver al dashboard" y "Abrir check-in de todas formas") no tenían type="button". Sin ese atributo, dentro de un form (layout con SignOut), el tipo default submit activaba el form de nextauth signout. Añadido type="button" a ambos. Branch: feature/landing-conversion.' },
          { title: 'BUG-073 — Sesión Auth.js expira en ~2-3 minutos en producción (comportamiento anómalo)', done: true, priority: 'P0', note: 'Fix: auth.ts y auth.config.ts — session.maxAge no estaba configurado. Añadido maxAge: 30 * 24 * 60 * 60 (30 días) en ambos configs. La ausencia de maxAge explícito causaba expiración con el default del JWT (que puede ser muy corto en algunas versiones del beta). Branch: feature/landing-conversion.' },
          { title: 'BUG-074 — /nutrition: tipear en modal de búsqueda de alimentos navega al home (/)', done: true, priority: 'P1', note: 'Fix: LogFoodModal.tsx — input de búsqueda no tenía type="search" ni handler de Enter. Añadido type="search" y onKeyDown={e => e.key === "Enter" && e.preventDefault()} para bloquear submit de form padre. Branch: feature/landing-conversion.' },
          { title: 'BUG-075 — Sesión expirada redirige a /onboarding en lugar de /login para usuario con onboardingCompleted=true', done: true, priority: 'P1', note: 'Fix resuelto como consecuencia de BUG-073: con maxAge=30 días configurado correctamente las sesiones no expiran prematuramente. La lógica del middleware ya es correcta: !isLoggedIn → /login antes de evaluar onboardingCompleted. El bug era por el maxAge muy corto que generaba JWTs que expiraban y creaban estados inconsistentes. Branch: feature/landing-conversion.' },
          { title: 'BUG-076 — /progress: TypeError crash cuando HealthProfile.hrResting es null (usuario nuevo sin FC en reposo)', done: true, priority: 'P1', note: 'Fix: ProgressClient.tsx — hrStart/hrEnd/weightStart/weightEnd ahora son nullable (null cuando el array está vacío). Secciones "Peso" y "FC Reposo" envueltas con {data.length > 0 && (...)}. Métricas Clave usa condicionales para mostrar rows solo cuando hay datos. Comparaciones nulas eliminadas en tabla desktop y cards mobile. Branch: feature/landing-conversion.' },
          { title: 'BUG-077 — /new-goal: opciones "Ganar músculo" y "Recomposición corporal" visibles para atleta runner', done: true, priority: 'P2', note: 'Resuelto por eliminación: directorio /new-goal eliminado (ARCH-01). La ruta y NewGoalClient.tsx ya no existen.' },
          { title: 'BUG-078 — /onboarding: typo "Medalliq" (doble L) en subtítulo del paso 1', done: true, priority: 'P3', note: 'Duplicado de BUG-NEW-01. Fix ya aplicado en onboarding/page.tsx. Branch: feature/landing-conversion.' },
          { title: 'NEW-P1-01 — PaywallCard muestra precio inconsistente: $15/mes vs $9.99/mes en /upgrade', done: true, priority: 'P1', note: 'Fix: ctaLabel default en PaywallCard.tsx cambiado de "$15/mes" a "$9.99/mes". Precio canónico: $9.99/mes según upgrade/page.tsx y todos los CTAs de pricing.' },
          { title: 'NEW-P1-02 — GENERAL_FITNESS en selector /new-goal no existe en GoalType enum DB', done: true, priority: 'P1', note: 'Fix: GENERAL_FITNESS eliminado del array GOALS en NewGoalClient.tsx. No hay template ni GoalType::GENERAL_FITNESS en el schema — si algún flujo intentara guardarlo en TrainingPlan.goalType daría error 500. HealthProfile.sportGoal (String) lo aceptaba sin error hoy, pero era una bomba de tiempo. GoalTypes válidos: RACE_5K, RACE_10K, STRENGTH_TRAINING, BODY_RECOMPOSITION.' },
          { title: 'NEW-P0-03 — /progress: calcAdherencePct incluye sesiones DESCANSO en denominador → adherencia siempre menor que en dashboard', done: true, priority: 'P0', note: 'Fix: calcAdherencePct ahora filtra s.type !== DESCANSO antes de calcular. Semana con 5 training + 2 DESCANSO, 5 completados: antes 71%, ahora 100%. Consistente con dashboard/page.tsx que ya filtra DESCANSO explícitamente.' },
          { title: 'NEW-P1-04 — Precio inconsistente $15/mes en paywalls de /plan, /progress, /gym/session, /gym/history', done: true, priority: 'P1', note: 'Fix: 4 CTAs "Pro $15/mes" → "Pro $9.99/mes" en plan/page.tsx, progress/page.tsx, gym/session/page.tsx, gym/history/page.tsx. Precio canónico $9.99/mes. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P2-05 — mapWebCheckinBody defaultea rpe=5, sleepHours=7, stressLevel=0 para campos no enviados → datos fake en DB', done: true, priority: 'P2', note: 'Fix completo web + mobile: CheckInInput hace rpe/sleepHours/energyLevel/stressLevel opcionales; evaluate-rules añade !== undefined guards; mapper web elimina defaults; mapper mobile elimina sleepHours??7 y stressLevel??3; repositorio usa ??undefined para omitir del write. Cubierto en detalle por NEW-P2-10. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P2-06 — gym sessions (GymSession, no SessionLog) no cuentan en streakDays — getDashboardSummary calcula streak solo desde SessionLog', done: true, priority: 'P2', note: 'Fix aplicado — ver NEW-P2-11. DashboardInput recibe gymCompletionDates?: Date[]; streak mergea SessionLog y GymSession. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P2-07 — nutrition/generate fetcha user.goals pero la variable goal nunca se usa (dead code)', done: true, priority: 'P2', note: 'Fix: goals eliminado del include en api/nutrition/generate/route.ts, api/nutrition/generate-meals/route.ts y api/mobile/nutrition/generate-meals/route.ts. También limpiados coach/dashboard/athletes, coach/athletes/page.tsx y coach/dashboard/page.tsx que incluían goals innecesariamente. Branch: feature/landing-conversion.' },
          { title: 'NEW-P1-08 — CalendarStrip mostraba semana diferente al dashboard/plan cuando el plan no empezaba en lunes', done: true, priority: 'P1', note: 'buildCalendarWeek() usaba el lunes del calendario como referencia (monday - startDate). getPlanWeekNumber() usa Date.now(). Divergían si el plan empezaba en día no-lunes. Fix: calendar.ts usa currentPlanWeek = getPlanWeekNumber(startDate) + weekOffset — misma fuente de verdad que dashboard, /plan y checkin. weekOffset=0 siempre es la semana actual; -1/+N es navegación relativa coherente. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P1-09 — /gym: banner "Sesión de fuerza programada" nunca aparecía (PlannedSession.date no existe)', done: true, priority: 'P1', note: 'gym/page.tsx buscaba PlannedSession con where: { date: { gte: todayStart } } pero PlannedSession usa dayOfWeek (1-7), no un campo date. La query siempre retornaba null → banner nunca visible. Fix: query usa dayOfWeek: todayDow + week: { planId, weekNumber: currentWeekForBanner } calculado con getPlanWeekNumber. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P2-10 — Check-in mapper persistía valores fake (rpe=5, sleepHours=7, energyLevel=5, stressLevel=0) para campos no enviados por el atleta', done: true, priority: 'P2', note: 'Fix web + mobile: (1) CheckInInput hace rpe/sleepHours/energyLevel/stressLevel opcionales; (2) evaluate-rules añade !== undefined checks antes de disparar trigger; (3) mapper web elimina defaults; (4) mapper mobile elimina sleepHours??7 y stressLevel??3 (opcionales en MobileCheckinBody); (5) repositorio usa ?? undefined para omitir campos del write. muscleSoreness y energyLevel siguen requeridos en mobile. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P2-11 — Streak del dashboard no contaba sesiones de gym (GymSession), solo SessionLog', done: true, priority: 'P2', note: 'getDashboardSummary calculaba streak solo desde recentLogs (SessionLog). Atleta solo-gym con AssignedWorkout tenía streak=0 aunque entrenara todos los días. Fix: DashboardInput recibe gymCompletionDates?: Date[]; el streak ahora merges las dos fuentes. dashboard/page.tsx fetcha GymSession.date (take: 60) y los pasa. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P1-10 — /api/messages/me retornaba coachId incluso cuando la relación CoachAthlete no era ACTIVE', done: true, priority: 'P1', note: 'La query no filtraba status: "ACTIVE". Si el coach había desvinculado al atleta (status INACTIVE/REMOVED), el chat seguía mostrándose y el atleta podía seguir enviando mensajes. Fix: where: { athleteId: userId, status: "ACTIVE" }. Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P1-11 — /api/mobile/dashboard no pasa gymCompletionDates al use case → streak 0 para usuarios gym-only en mobile', done: true, priority: 'P1', note: 'Fix: añadida query gymSessions al Promise.all y gymCompletionDates: recentGymSessions.map(gs=>gs.date) al call de getDashboardSummary. Idéntico al fix de web (NEW-P2-11). Branch: bugfix/athlete-e2e.' },
          { title: 'NEW-P1-12 — nutrition/page.tsx hace upsert (write) durante render de Server Component → GET que escribe a DB', done: true, priority: 'P1', note: 'Fix: lazy-init extraído a POST /api/nutrition/init/route.ts. NutritionInitClient (use client) llama el endpoint via useEffect y hace router.refresh(). nutrition/page.tsx solo lee, nunca escribe. Imports de calculateTDEE/calculateMacros eliminados del Server Component. Sin regresión UX: si falta el plan, se inicializa automáticamente tras la primera carga. Branch: bugfix/athlete-e2e.' },
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
          { title: 'PERSIST-12 — plan/new: enableFeatures fuera de $transaction de generatePlan → features desincronizadas si falla', done: true, priority: 'P2', note: 'Resuelto por eliminación: api/plan/new/route.ts borrado — endpoint sin caller activo desde ARCH-01 (/new-goal eliminado). Branch: chore/remove-plan-new-dead-endpoint.' },
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
          { title: 'CONC-01 — generator.ts llama AI (Haiku) DENTRO de $transaction — bug de concurrencia latente', done: true, priority: 'P1', note: 'Resuelto: src/domain/plan/generator.ts fue reemplazado por generate-plan.use-case.ts que ya implementa correctamente el patrón de 3 fases (Phase 1: reads, Phase 2: $transaction solo con writes, Phase 3: config update). No hay llamada AI dentro del $transaction. Branch: bugfix/mobile-qa-0708.' },
        ],
      },

      // ── E2E QA — Auditoría 2026-07-05 ────────────────────────────────────────
      {
        id: 'bugs-e2e-0705',
        label: 'E2E QA — Auditoría 2026-07-05',
        period: 'Urgente — E2E atleta runner nuevo',
        items: [
          { title: 'BUG-NEW-01 — Typo de marca "Medalliq" (doble L) en subtítulo del onboarding paso 1', done: true, priority: 'P3', note: 'Fix: src/app/onboarding/page.tsx línea 136 — "Medalliq" → "Medaliq". Branch: feature/landing-conversion.' },
          { title: 'BUG-NEW-02 — /new-goal: metas de gym visibles para atleta runner (GOALS no filtra por activityType)', done: true, priority: 'P2', note: 'Resuelto por eliminación: directorio /new-goal eliminado (ARCH-01). Duplicado de BUG-070 y BUG-077.' },
          { title: 'BUG-NEW-03 — Dashboard: capitalización de fecha incorrecta en español ("5 De Julio De 2026")', done: true, priority: 'P3', note: 'Fix parcial: EarlyCheckInScreen.tsx — getNextFriday() ahora capitaliza el primer carácter del string de fecha con .charAt(0).toUpperCase() + .slice(1). El issue del dashboard completo requiere buscar el formateador específico del dashboard — pendiente localizar. Branch: feature/landing-conversion.' },
          { title: 'BUG-NEW-04 — Check-in muestra "ajustar tu plan" a usuario sin plan activo', done: true, priority: 'P2', note: 'DONE: dashboard/page.tsx — banner de check-in ahora condiciona el copy: activePlan ? "Tu plan se ajusta automáticamente según cómo te sientas" : "Registrá cómo te sentís esta semana para ver tu evolución". Sin plan activo el atleta entiende que el check-in sirve para acumular historial, no para ajustar un plan inexistente.' },
          { title: 'BUG-NEW-05 — Nutrición: macros en gramos no suman las calorías totales mostradas (diferencia de 295 kcal)', done: true, priority: 'P1', note: 'Fix: daily-target.ts — getDailyNutritionTarget() ahora calcula kcal como Math.round(proteinG*4 + carbsG*4 + fatG*9) en lugar de leer el valor almacenado (TDEE base). Esto garantiza que calorías mostradas siempre corresponden exactamente a la suma de macros. Los 4 casos (HIGH/MODERATE/LOW/REST) actualizados. Branch: feature/landing-conversion.' },
          { title: 'BUG-NEW-06 — Módulo Ejercicios (/gym) muestra solo rutinas de fuerza a atleta runner sin contenido relevante', done: false, priority: 'P2', note: 'E2E-2026-07-05: Atleta Running ve 5 rutinas de fuerza/hipertrofia (Push Pull Legs, Full Body, Upper/Lower, Fuerza 5×5, PPL 6 días). Ningún contenido de running. El módulo no filtra por activityType ni comunica por qué un corredor ve rutinas de pesas. Fix: leer HealthProfile.sport del atleta y priorizar o filtrar las rutinas según el deporte. O agregar sección de "Fuerza complementaria para runners".' },
          { title: 'BUG-NEW-07 — Naming inconsistency: nav lateral dice "Ejercicios" pero la ruta es /gym y el contenido es de gym', done: false, priority: 'P3', note: 'E2E-2026-07-05: El item del nav lateral se llama "Ejercicios" pero la URL es /gym y el contenido son plantillas de entrenamiento de fuerza en gym. Para un atleta runner, "Ejercicios" sugiere sus rutinas de running. La etiqueta no refleja el contenido del módulo. Fix: renombrar el nav item a "Gym" o "Fuerza", o ampliar el contenido del módulo para incluir también ejercicios de running.' },
          { title: 'BUG-NEW-08 — Registro diario en /profile pre-carga peso y FC reposo con valores que no pertenecen al usuario', done: true, priority: 'P1', note: 'Fix: ProfileClient.tsx — placeholders de los inputs de peso y FC reposo ahora usan p?.weightKg y p?.hrResting del HealthProfile en lugar de valores hardcodeados (75.0 kg, 55 bpm). Branch: bugfix/profile-preload.' },
        ],
      },

      // ── QA API Mobile — Auditoría 2026-07-08 ─────────────────────────────────
      {
        id: 'bugs-e2e-0708',
        label: 'QA API Mobile — Auditoría 2026-07-08',
        period: 'Urgente — QA core loops mobile',
        items: [
          { title: 'BUG-NEW-09 — /api/mobile/nutrition/log: acumulación silenciosa de gramos sin feedback al cliente', done: true, priority: 'P2', note: 'Comportamiento intencional (PERSIST-01) — no es bug. La acumulación de gramos es el diseño correcto para el log de nutrición. Cerrado como no-bug.' },
          { title: 'BUG-NEW-10 — /api/mobile/progress: overallAdherencePct:0 inconsistente con adherencePct por semana', done: true, priority: 'P2', note: 'Código correcto — falso positivo de QA. overallAdherencePct filtra semanas sin sesiones antes de promediar, dietAdherencePct viene de checkIn.dietAdherencePct. Son métricas distintas que miden conceptos distintos. Cerrado como no-bug.' },
          { title: 'BUG-NEW-11 — /api/mobile/gym/week retorna 404 para atletas sin assignedWorkout con sesiones libres de fuerza', done: true, priority: 'P2', note: 'Fix: antes del 404, se consultan SessionLog con freeSessionType=FUERZA y plannedSessionId=null de la semana. Si existen → 200 con { sessions, type:"free" }. Archivo: src/app/api/mobile/gym/week/route.ts. Branch: bugfix/mobile-qa-0708.' },
          { title: 'BUG-NEW-12 — /api/mobile/nutrition GET sin feature gate para atletas B2B inactivos', done: true, priority: 'P3', note: 'Fix: requireFeature(mobile.features, "nutrition") agregado al GET handler después del rate limit. Consistente con POST. Archivo: src/app/api/mobile/nutrition/route.ts. Branch: bugfix/mobile-qa-0708.' },
        ],
      },

      // ── E2E QA Atleta B2C Autónomo — 2026-07-06 ──────────────────────────────
      {
        id: 'bugs-e2e-0706',
        label: 'E2E QA — Atleta B2C Autónomo (2026-07-06)',
        period: 'Urgente — Flujo atleta sin coach',
        items: [
          {
            title: 'E2E-01 — Dashboard: FreeDashboard muestra CTAs vacíos aunque el atleta ya tiene rutina de gym asignada',
            done: true,
            priority: 'P1',
            note: 'DONE: dashboardMode ahora incluye caso "GYM" — si assignedWorkoutRaw != null y no hay TrainingPlan activo → dashboardMode = "GYM". FreeDashboard solo renderiza cuando dashboardMode === "FREE". DashboardCalendarStrip y DailySessionCard ya manejaban hasGymToday/todayGymDay independientemente del modo. DailySessionCard.tsx actualizado: tipo extendido a "GYM", nuevo bloque de descanso y footer de consistencia semanal para modo GYM. Resuelve también E2E-04 (dos rutinas) — el bloque FREE de DailySessionCard (que mostraba WeeklyRoutine) ya no renderiza en modo GYM.',
          },
          {
            title: 'E2E-02 — Dashboard: CalendarStrip vacío cuando hay AssignedWorkout activo (solo muestra sesiones de TrainingPlan)',
            done: true,
            priority: 'P1',
            note: 'DONE: buildCalendarWeek() en infrastructure/db/calendar.ts ya consulta AssignedWorkout (con sus days) en paralelo con PlannedSession. Construye gymDayByDow y lo mapea a CalendarDay.gym. calendarDaysToWeekCells() maneja el caso gym-only: sessionType=FUERZA, done=gymSession?.completed, label=workoutDay.label. El CalendarStrip muestra correctamente los días de gym incluso sin TrainingPlan activo.',
          },
          {
            title: 'E2E-03 — Dashboard: fecha con capitalización incorrecta ("Miércoles, 8 De Julio De 2026")',
            done: true,
            priority: 'P3',
            note: 'DONE: formatDate() en dashboard/page.tsx ahora retorna s.charAt(0).toUpperCase() + s.slice(1). Clase capitalize eliminada del <p> en línea 561. Resultado: "Miércoles, 9 de julio de 2026" (solo primera letra mayúscula).',
          },
          {
            title: 'E2E-04 — Dos sistemas de rutina coexisten con datos contradictorios (WeeklyRoutine + AssignedWorkout)',
            done: true,
            priority: 'P1',
            note: 'DONE: resuelto como consecuencia de E2E-01. El bloque FREE de DailySessionCard (que mostraba "Según tu rutina semanal" de WeeklyRoutine) solo renderiza cuando dashboardMode === "FREE". Con AssignedWorkout activo, dashboardMode = "GYM" → el bloque FREE no renderiza → WeeklyRoutine desaparece del dashboard. AssignedWorkout se muestra vía hasGymToday/todayGymDay (modo-independiente, línea 133 de DailySessionCard).',
          },
          {
            title: 'E2E-05 — /plan muestra "Sin plan activo" para atleta autónomo con gym y nutrición configurados',
            done: true,
            priority: 'P1',
            note: 'DONE fix rápido: plan/page.tsx — en el bloque if(!plan), antes de mostrar "Sin plan activo", query prisma.assignedWorkout. Si existe → redirect("/gym"). Atleta gym-only llega directamente a su módulo de rutina. Rediseño completo de /plan como hub B2C (E2E-09 + pestaña nutrición) queda pendiente en roadmap como feature mayor.',
          },
          {
            title: 'E2E-06 — Nav "Mensajes" visible para atleta sin coach asignado (sin conversación posible)',
            done: true,
            priority: 'P2',
            note: 'DONE: layout.tsx ahora hace query a CoachAthlete({ athleteId, status:"ACTIVE" }) en paralelo con dbUser y pasa hasCoach={!!coachRelation} a SidebarClient. SidebarClient.tsx: Props incluye hasCoach?:boolean, default false. allNavLinks: show:hasCoach para Mensajes. moreLinks (mobile): spread condicional incluye Mensajes solo si hasCoach. Sin coach → item oculto en desktop sidebar y en menú "Más" mobile.',
          },
          {
            title: 'E2E-07 — /progreso: CTA "Ver mi plan" lleva a /plan vacío para atleta sin TrainingPlan activo',
            done: true,
            priority: 'P2',
            note: 'DONE: progress/page.tsx — estado vacío (sin check-ins). CTA secundario cambiado: ahora siempre apunta a /gym con texto condicional: si hasGymSessions → "Ver historial ejercicios", si no → "Ir a ejercicios". Eliminado el CTA "Ver mi plan" que llevaba a /plan vacío. El botón /checkin sigue siendo el principal.',
          },
          {
            title: 'E2E-08 — Check-in: diferenciación conceptual vs registro diario en /profile no está clara para el usuario',
            done: true,
            priority: 'P2',
            note: 'DONE: (1) CheckInClient.tsx — párrafo explicativo bajo el subtitle: "Acá reportás tu carga subjetiva: energía, estrés, dolor, RPE y motivación. Es distinto al registro diario de peso y FC en tu perfil." (2) ProfileClient.tsx — description del "Registro diario" actualizada: "Métricas objetivas del día: peso, FC reposo y sueño. El check-in semanal complementa esto con tu percepción de carga y es lo que ajusta tu plan de entrenamiento."',
          },
          {
            title: 'E2E-09 — Constructor de rutina propio para atleta autónomo (gap de producto)',
            done: true,
            priority: 'P2',
            note: 'DONE: (1) /gym/builder/page.tsx — servidor, verifica auth + bloquea atletas con coach activo + carga ejercicios globales. (2) /gym/builder/_components/GymRoutineBuilder.tsx — wizard 3 pasos: nombre/objetivo/nivel → selección de días (toggles Lun-Dom) → ejercicios por día (search client-side + sets/reps editables). POST a /api/athlete/gym/routines → POST a /api/gym/assign para activar. (3) /api/gym/assign modificado: acepta templates propios del atleta (athleteId: userId) además de los públicos. (4) gym/page.tsx en estado sin-rutina: botón "+ Crear mi rutina" → /gym/builder para atletas sin coach.',
          },
        ],
      },

      // ── Auditoría UI Módulos Atleta B2C — 2026-07 ────────────────────────────
      {
        id: 'bugs-audit-modules-0706',
        label: 'Auditoría UI Módulos — Atleta B2C (2026-07)',
        period: 'Próximo sprint',
        items: [
          {
            title: 'UI-MOD-01 — Mobile nav: tab "Plan" siempre visible, no respeta features.plan=false',
            done: false,
            priority: 'P2',
            note: 'SidebarClient.tsx: desktop sidebar ya respeta features.plan con show: features.plan. Pero mobileNavLinks tiene "Plan" hardcodeado en el tab 2 sin condición. Atleta B2C Free (plan=false) ve el tab "Plan" en mobile aunque no tiene acceso al módulo → lleva a /plan vacío. Fix: condicionarlo igual que el desktop — show: features.plan en mobileNavLinks.',
          },
          {
            title: 'UI-MOD-02 — Mobile nav: "Ejercicios" en menú "Más" en lugar de tab principal para atletas en modo GYM',
            done: false,
            priority: 'P3',
            note: 'Para atletas con AssignedWorkout activo (dashboardMode=GYM), el módulo de gym es su acción principal. Sin embargo, el tab de "Ejercicios" está en el menú "Más" (popup), no en los 4 tabs principales. Fix: en modo GYM, colocar "Ejercicios" en los tabs principales y sacar "Plan" (que no tiene contenido). Requiere leer dashboardMode o features del layout en SidebarClient.',
          },
          {
            title: 'UI-MOD-03 — Check-in: gate "espera al viernes" bloquea a atletas GYM sin sentido',
            done: false,
            priority: 'P3',
            note: 'isEarlyInWeek (Lun-Jue) bloquea el formulario con "el viernes es un buen momento para hacer check-in". Este timing tiene sentido para running (semana de entrenamiento Mon-Dom). Para atletas GYM-only sin plan de running activo, el gate es arbitrario. Fix: omitir el gate si !features.plan — atleta sin plan de running puede hacer check-in cualquier día de la semana.',
          },
          {
            title: 'UI-MOD-04 — /progress: sin gráfica de adherencia para atletas GYM-only',
            done: false,
            priority: 'P3',
            note: 'La adherencia semanal al gym se muestra localmente en /gym (grid Lun-Dom con días completados). Pero /progress no tiene ninguna gráfica de adherencia gym histórica — AdherenceVerticalChart solo calcula adherencia de PlannedSession (running). Atleta GYM sin plan de running ve /progress sin contexto de consistencia de entrenamiento. Fix: calcular adherencia gym desde GymSession.date agrupado por semana y mostrarlo en /progress.',
          },
          {
            title: 'UI-MOD-05 — /nutrition: FoodGuide muestra "0 kcal" cuando no hay NutritionPlan configurado',
            done: false,
            priority: 'P3',
            note: 'FoodGuide recibe targets desde NutritionPlan. Si el atleta no tiene NutritionPlan aún (onboarding incompleto o error de lazy-init), los targets llegan en 0 y la guía muestra "0 kcal", "0g proteína", etc. Fix: mostrar un estado vacío explícito ("Aún no tienes un plan nutricional configurado") en lugar de mostrar ceros que parecen datos reales. Condición: si !nutritionPlan → FoodGuide muestra CTA de configuración en lugar de targets.',
          },
          {
            title: 'FLOW-01 — Atleta B2C Running: sin ruta para crear plan de entrenamiento (pendiente AI)',
            done: false,
            priority: 'P1',
            note: 'Gap de producto identificado en auditoría E2E. Atleta que se registra con sport=RUNNING llega al dashboard en modo FREE — no hay plan activo, ni forma de generar uno. /new-goal fue deprecado (ARCH-01). El coach genera planes B2B. AI no está integrada. Resultado: el módulo /plan está vacío y el valor del tier Pro no existe para runners B2C. Fix a largo plazo: AI genera plan cuando se integre (B2C Pro). Fix intermedio: landing clara en /plan para runners B2C que explique el estado actual y ofrezca (1) buscar coach o (2) entrenar libre con log de sesiones. Bloqueante para propuesta de valor B2C running.',
          },
          {
            title: 'GYM-01 — Check-in no tiene impacto en rutina de gym (solo ajusta PlannedSession)',
            done: false,
            priority: 'P2',
            note: 'applySessionAdjustments() en process-check-in.use-case.ts solo toca PlannedSession (running). WorkoutDay y WorkoutExercise nunca son ajustados por el check-in. Trigger rpe_excesivo solo activa cuando context.phase === "BASE" (running-only). Un atleta GYM que reporta dolor, fatiga alta o RPE excesivo no ve ningún ajuste a su rutina. Fix: agregar lógica de ajuste gym en el check-in — si dolor_activo o rpe_excesivo → añadir nota automática en WorkoutDay del día más próximo ("Check-in sugiere sesión de recuperación activa o descanso"). No requiere cambiar pesos ni sets — solo un aviso en coachNotes del WorkoutDay.',
          },
          {
            title: 'GYM-02 — suggestedNextWeightKg persiste en WorkoutExercise pero NO se pre-rellena en la siguiente sesión',
            done: false,
            priority: 'P2',
            note: 'computeProgressionUpdates() en domain/gym/complete-gym-session.use-case.ts calcula y persiste suggestedNextWeightKg en WorkoutExercise cuando allRepsHit=true. Pero en la siguiente sesión, gym/session/page.tsx muestra los inputs de peso vacíos (weightKg inicial en 0), no con el valor sugerido. El atleta solo ve la pista "+2.5 kg recomendado" como badge, pero no tiene el valor pre-cargado. Fix: en GET /api/gym/session/today, incluir suggestedNextWeightKg en la respuesta de cada ejercicio. gym/session/page.tsx inicializa el estado del input con suggestedNextWeightKg ?? previousWeight ?? 0.',
          },
          {
            title: 'GYM-03 — Adherencia gym solo visible localmente en /gym (no en /progress como historial)',
            done: false,
            priority: 'P3',
            note: 'La adherencia semanal al gym se calcula en gym/page.tsx comparando completedDows.size (GymSession completadas esta semana) vs los días del template (WorkoutDay count). Este dato es local a /gym — no se persiste ni se expone en /progress. Atleta no puede ver su tendencia histórica de adherencia al gym. Fix: calcular adherencia gym semanal desde GymSession agrupadas por semana ISO y exponerlo en GET /api/progress como gymAdherenceByWeek[]. Graficable con el mismo AdherenceVerticalChart ya existente.',
          },
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
      {
        id: 'plan-atleta-autonomo',
        label: 'Plan Builder Autónomo — Atleta B2C sin coach',
        period: 'P1 — Después de PLAN-DB-01 (PlanSource.ATHLETE)',
        items: [
          {
            title: 'PLAN-B-01 — Use case: generatePlanForAthlete() con PlanSource.ATHLETE',
            done: false,
            priority: 'P1',
            note: 'domain/plan/generate-plan-athlete.use-case.ts — reutiliza getTemplate() + createPlan + createWeeks + createSessions del use case existente. Diferencias: source: ATHLETE, generatedBy: ATHLETE. El atleta selecciona goalType → use case elige el template (RACE_5K=8W, RACE_10K=12W, STRENGTH_TRAINING/BODY_RECOMPOSITION=12W). Depende de PLAN-DB-01.',
          },
          {
            title: 'PLAN-B-02 — POST /api/athlete/plan/build — endpoint plan builder B2C',
            done: false,
            priority: 'P1',
            note: 'Body: { goalType: GoalType, startDate: string }. Auth: auth() + solo ATHLETE sin CoachAthlete ACTIVE. Llama generatePlanForAthlete(). Desactiva plan anterior si existe. Retorna planId. Rate limit 5/hora. Requiere PLAN-B-01.',
          },
          {
            title: 'PLAN-B-03 — GET /api/athlete/plan/templates — templates disponibles para B2C',
            done: false,
            priority: 'P1',
            note: 'Retorna array con: goalType, label, totalWeeks, phases[], description, sessionCount estimado. Fuente: lib/plan/templates.ts. Sin query DB — metadata estática de templates. El frontend los muestra como cards de selección en el wizard.',
          },
          {
            title: 'PLAN-B-04 — Cancelar plan propio: DELETE /api/athlete/plan/[planId]',
            done: false,
            priority: 'P2',
            note: 'Solo atleta owner puede cancelar. Verifica: plan.userId === userId + plan.source === ATHLETE (no puede cancelar plan del coach). Soft delete: status → ABANDONED. Conserva weeks/sessions para historial.',
          },
          {
            title: 'PLAN-B-05 — Auto-completar plan self-built al llegar a semana N+1',
            done: false,
            priority: 'P2',
            note: 'Verificar que el fire-and-forget de dashboard/page.tsx funciona para source=ATHLETE. Cuando plan completa → /plan muestra PlanCompletionCard con CTAs B2C: "Crear nuevo plan" (→ /plan/build) o "Buscar entrenador" (→ /coaches).',
          },
          {
            title: 'PLAN-F-01 — Wizard UI 3 pasos: objetivo → fecha inicio → confirmar',
            done: false,
            priority: 'P1',
            note: 'Ruta: /plan/build. Solo visible si !activePlan && !coachRelation. Paso 1: cards de goalType (RACE_5K=8W, RACE_10K=12W, STRENGTH_TRAINING=12W, BODY_RECOMPOSITION=12W). Paso 2: date picker de startDate (min hoy, max hoy+30d). Paso 3: resumen + confirmar → POST /api/athlete/plan/build.',
          },
          {
            title: 'PLAN-F-02 — Preview del template antes de confirmar en wizard',
            done: false,
            priority: 'P2',
            note: 'En paso 3: card expandible "Ver el plan" con semanas y distribución de sesiones por fase. Usa GET /api/athlete/plan/templates — sin crear el plan. El atleta ve a qué se compromete antes de confirmar. Patrón idéntico a TEMPLATE_PREVIEW del constructor de coach.',
          },
          {
            title: 'PLAN-F-03 — /plan: landing B2C con CTA "Crear mi plan" cuando no hay plan activo',
            done: false,
            priority: 'P1',
            note: '/plan/page.tsx: si !plan && !coachRelation → landing con CTA principal "Crear mi plan" (→ /plan/build) + CTA secundario "Buscar entrenador" (→ /coaches). Reemplaza el estado vacío "Sin plan activo" sin acción. Resuelve FLOW-01.',
          },
          {
            title: 'PLAN-F-04 — Badge "Plan propio" y sugerencia de coach en /plan si adherencia baja',
            done: false,
            priority: 'P2',
            note: 'Plan con source=ATHLETE muestra badge "Plan propio" en la vista. Si adherencia < 60% tres semanas seguidas → banner "¿Quieres apoyo de un coach? → /coaches". Diferencia visual del plan del coach en KPI cards.',
          },
        ],
      },
    ],
  },
  {
    id: 'db-schema-v2',
    label: 'DB Schema v2 — Correcciones estructurales',
    color: '#6b7280',
    bgColor: '#f9fafb',
    borderColor: '#d1d5db',
    phases: [
      {
        id: 'db-p0',
        label: 'Fase 1 — Correcciones críticas (P0)',
        period: 'P0 — Hacer antes de conectar Wompi o billing',
        items: [
          {
            title: 'DB-01 — Agregar UserStatus enum + campo status a User',
            done: true,
            priority: 'P0',
            note: 'Migración 20260709000001 aplicada. UserStatus enum: ACTIVE|SUSPENDED|BLOCKED|DELETED. User.status @default(ACTIVE). Ver BACK-01 para el código de middleware correspondiente (también completado en esta sesión).',
          },
          {
            title: 'DB-02 — Agregar identification, phoneWa, showPhoneWa a User (coach identity)',
            done: true,
            priority: 'P0',
            note: 'Migración 20260708000001_identity_notification_food aplicada en Neon prod. identification String? @unique, phoneWa String? @unique, showPhoneWa Boolean @default(false) en User. Indexes únicos en DB. Implementar bloqueo en /api/coach/clients/create y endpoint PATCH /api/coach/profile en worktree feature/coach-identidad.',
          },
          {
            title: 'DB-03 — Agregar campo discipline a SessionLog (unificación de sesiones multi-disciplina)',
            done: true,
            priority: 'P0',
            note: 'Migración 20260709000001 aplicada. SessionDiscipline enum: RUNNING|STRENGTH|CYCLING|SWIMMING|OTHER. SessionLog.discipline nullable. POST /api/log/session y POST /api/mobile/log/session actualizados para recibir y persistir discipline.',
          },
          {
            title: 'DB-04 — Reemplazar modelo Exercise con schema WorkoutX-compatible',
            done: true,
            priority: 'P0',
            note: 'Implementado en worktree medaliq-exercise-rewrite. Schema reescrito: drop muscleGroups/equipment(enum)/category(enum)/isGlobal/imageUrl/tips → add bodyPart/target/equipment(String)/mechanic/gifUrl/gifStoredUrl/source/secondaryMuscles/instructions/etc. Migración SQL combinada (additive+backfill+destructive) en prisma/migrations/20260710000001_exercise_rewrite. Requiere: pnpm prisma migrate deploy → pnpm prisma generate.',
          },
        ],
      },
      {
        id: 'db-p1',
        label: 'Fase 2 — Mejoras de modelo (P1)',
        period: 'P1 — Después de P0 estabilizado',
        items: [
          {
            title: 'DB-05 — Unificar NutritionPlan: agregar campo source (SYSTEM|COACH|ATHLETE)',
            done: true,
            priority: 'P1',
            note: 'Migración 20260709000001 aplicada. NutritionSource enum: SYSTEM|COACH|ATHLETE. NutritionPlan.source @default(SYSTEM). upsertNutrition en plan.repository.ts usa source: SYSTEM en create. Pendiente: cuando coach asigna template → source: COACH (ver /api/coach/athlete/[id]/nutrition cuando exista).',
          },
          {
            title: 'DB-06 — NutritionTemplate: hacer coachId nullable + agregar athleteId FK opcional',
            done: false,
            priority: 'P1',
            note: 'coachId String? (nullable — antes era String obligatorio). athleteId String? FK → User (atleta B2C sin coach puede crear su propia plantilla nutricional). CHECK constraint: coachId IS NOT NULL OR athleteId IS NOT NULL (al menos uno). Espeja el patrón de WorkoutTemplate donde el coach define rutinas — acá tanto coach como atleta pueden definir plantillas. Migración: ALTER COLUMN coachId DROP NOT NULL, ADD COLUMN athleteId FK. Actualizar endpoints de coach y agregar endpoint atleta.',
          },
          {
            title: 'DB-07 — Agregar modelo FoodProposal (alimentos propuestos por la comunidad)',
            done: true,
            priority: 'P1',
            note: 'Schema + migración aplicados en 20260708000001. FoodProposal model con FoodProposalStatus enum (PENDING|APPROVED|REJECTED) ya en DB. Pendiente: endpoints BACK-07 (NUT-05 y NUT-06).',
          },
          {
            title: 'PLAN-DB-01 — PlanSource enum: agregar valor ATHLETE',
            done: false,
            priority: 'P1',
            note: 'PlanSource enum actualmente tiene AI|COACH|AI_COACH_APPROVED. Falta ATHLETE para planes self-built por atletas B2C. Migración: ALTER TYPE "PlanSource" ADD VALUE "ATHLETE". Requerido antes de implementar el plan builder autónomo (PLAN-B-01). El enum DB es la fuente canónica — no hardcodear strings.',
          },
          {
            title: 'CI-DB-01 — Modelo CheckInSuggestion (sugerencias de ajuste del check-in)',
            done: false,
            priority: 'P1',
            note: 'Modelo nuevo para el check-in no-destructivo: CheckInSuggestion { id, userId, weekNumber, type String (trigger key), description String, targetType String (PLANNED_SESSION|WORKOUT_DAY|NUTRITION), targetId String?, status CheckInSuggestionStatus @default(PENDING), respondedAt DateTime?, createdAt }. enum CheckInSuggestionStatus: PENDING|ACCEPTED|REJECTED|EXPIRED. @@index([userId, status]), @@index([userId, weekNumber]). Patrón idéntico a PendingNutritionAdjustment. Requiere migración. Requerido antes de refactorizar processCheckIn (CI-B-01).',
          },
        ],
      },
      {
        id: 'db-p2',
        label: 'Fase 3 — Infraestructura de notificaciones (P2)',
        period: 'P2 — Trigger: 10+ coaches activos',
        items: [
          {
            title: 'DB-08 — Agregar modelo Notification (centro de notificaciones in-app)',
            done: true,
            priority: 'P2',
            note: 'Schema + migración aplicados en 20260708000001. Notification model ya en DB con indexes (userId, read) y (userId, createdAt desc). Pendiente: endpoints BACK-08 (GET /api/notifications, PATCH /api/notifications/[id]/read).',
          },
        ],
      },
      {
        id: 'db-p3',
        label: 'Fase 4 — Retención y wearables (P2-P3)',
        period: 'P2-P3 — después de lanzamiento y primeros clientes activos',
        items: [
          {
            title: 'DB-09 — Modelo ActivityStreak (racha diaria del atleta)',
            done: true,
            priority: 'P2',
            note: 'DONE: ActivityStreak { id, userId @unique, currentStreak Int @default(0), longestStreak Int @default(0), lastActivityAt DateTime?, updatedAt @updatedAt } + onDelete:Cascade. Migración: 20260708180057_db_schema_v3_additions. Branch: chore/db-schema-v3.',
          },
          {
            title: 'DB-10 — Modelo UserAchievement (hitos de consistencia compartibles)',
            done: true,
            priority: 'P2',
            note: 'DONE: UserAchievement { id, userId, type String, unlockedAt DateTime } + @@unique([userId, type]) + @@index([userId]) + onDelete:Cascade. Migración: 20260708180057_db_schema_v3_additions. Branch: chore/db-schema-v3.',
          },
          {
            title: 'DB-11 — Modelo WearableConnection (OAuth tokens Strava/Garmin)',
            done: true,
            priority: 'P3',
            note: 'DONE: WearableConnection { id, userId, provider String, accessToken, refreshToken?, expiresAt?, scopes String[] } + @@unique([userId, provider]) + @@index([userId]) + onDelete:Cascade. Migración: 20260708180057_db_schema_v3_additions. Branch: chore/db-schema-v3.',
          },
          {
            title: 'DB-12 — Modelo PlannedMeal (plan nutricional por fecha y alimento concreto)',
            done: true,
            priority: 'P2',
            note: 'DONE: PlannedMeal { id, userId, date @db.Date, mealType MealType, foodId FK Food, grams Float, createdAt } + @@index([userId, date]) + onDelete:Cascade. Migración: 20260708180057_db_schema_v3_additions. Branch: chore/db-schema-v3.',
          },
        ],
      },
      {
        id: 'back-safe',
        label: 'Backend Fase 1 — Código para migraciones aditivas (DB-01/02/03/05)',
        period: 'Completado',
        items: [
          {
            title: 'BACK-01 — Middleware: bloquear usuarios SUSPENDED y BLOCKED',
            done: true,
            priority: 'P0',
            note: 'User.status incluido en JWT (auth.ts + auth.config.ts). Middleware redirige a /login con mensaje de error si status !== ACTIVE. Mobile login retorna 403 si status !== ACTIVE. MobileTokenPayload incluye status. Todos los signMobileToken actualizados.',
          },
          {
            title: 'BACK-02 — /api/coach/clients/create: bloquear si identification o phoneWa no están completos',
            done: true,
            priority: 'P0',
            note: 'Ya implementado en feature/coach-identidad (PR #67). Verifica session.user.profileComplete y luego doble-check DB. Retorna 403 con código PROFILE_INCOMPLETE si falta identification o phoneWa.',
          },
          {
            title: 'BACK-03 — Rutas de session log: recibir y persistir campo discipline',
            done: true,
            priority: 'P1',
            note: 'POST /api/log/session y POST /api/mobile/log/session actualizados: aceptan discipline (SessionDiscipline enum) y lo persisten en SessionLog.discipline. Pendiente: incluir discipline en GET responses (historial) cuando se implemente ese endpoint.',
          },
          {
            title: 'BACK-05 — Rutas de NutritionPlan: incluir source en creación y respuesta',
            done: true,
            priority: 'P1',
            note: 'plan.repository.ts → upsertNutrition: create incluye source: SYSTEM. NutritionPlan existentes en DB ya tienen DEFAULT SYSTEM por la migración. Pendiente: cuando coach asigna template → source: COACH; incluir source en GET /api/nutrition y GET /api/mobile/nutrition responses.',
          },
        ],
      },
      {
        id: 'back-exercise',
        label: 'Backend Fase 2 — Sprint Ejercicios: reescritura completa (DB-04)',
        period: 'Completado',
        items: [
          {
            title: 'BACK-04a — Admin ejercicios: reescribir /api/admin/exercises con nuevo schema WorkoutX',
            done: true,
            priority: 'P0',
            note: 'Implementado. /api/admin/exercises/route.ts y [id]/route.ts reescritos con bodyPart/target/equipment/mechanic/gifUrl. ExercisesClient.tsx reescrito (tabla + formulario). admin/exercises/page.tsx actualizado. Tests actualizados.',
          },
          {
            title: 'BACK-04b — Coach gym: reescribir rutas de ejercicios y rutinas',
            done: true,
            priority: 'P0',
            note: 'Implementado. /api/coach/gym/exercises/route.ts, routines, assigned, logs actualizados. coach/gym/exercises/page.tsx + ExerciseForm.tsx reescritos. coach/gym/routines/new y [id]/page.tsx actualizados (ExerciseOption type). coach/gym/page.tsx actualizado. isGlobal→coachId: null en todos los where clauses.',
          },
          {
            title: 'BACK-04c — Atleta gym: reescribir rutas de sesiones y historial',
            done: true,
            priority: 'P0',
            note: 'Implementado. /api/gym/session/today, [id], /api/mobile/gym/week, /api/athlete/gym/routines reescritos con bodyPart/target/gifUrl. athlete/gym/routines isGlobal→coachId: null. gym-labels.ts reescrito con BODY_PART_LABELS+TARGET_LABELS+compat translateMuscleGroup. build-gym-week.ts, plan/session-builder.ts y tests actualizados.',
          },
          {
            title: 'BACK-04d — Seed de ejercicios WorkoutX: script de carga inicial',
            done: true,
            priority: 'P0',
            note: 'Implementado. WorkoutXClient + ExerciseSyncUseCase en infrastructure/exercise-sync/. POST /api/admin/exercises/sync para re-seed manual. GET /api/exercises + /api/mobile/exercises (browse). seed.ts + seed.prod.ts actualizados con string fields. Requiere WORKOUTX_API_KEY en env.',
          },
        ],
      },
      {
        id: 'back-nutrition-platform',
        label: 'Backend Fase 3 — Nutrición y plataforma (DB-06/07/08)',
        period: 'Después de DB-06, DB-07, DB-08',
        items: [
          {
            title: 'BACK-06 — NutritionTemplate: fix null checks en coach nutrition routes',
            done: false,
            priority: 'P1',
            note: 'Después de DB-06 (coachId nullable), actualizar: /api/coach/nutrition/templates/route.ts → filtrar WHERE coachId = coachId OR athleteId = athleteId según el actor. /api/coach/nutrition/templates/[templateId]/route.ts → verificar ownership: template.coachId === coachId || template.athleteId === athleteId. NutritionTemplatesClient.tsx y coach/nutrition/page.tsx → manejar coachId null. AssignedNutritionPlan.coachId: considerar si debe ser nullable también.',
          },
          {
            title: 'BACK-07 — FoodProposal: crear endpoints NUT-05 y NUT-06',
            done: false,
            priority: 'P1',
            note: 'POST /api/nutrition/foods/propose (NUT-05): auth atleta → validar body (name, kcal, proteinG, carbsG, fatG obligatorios; brand?, barcode? opcionales) → crear FoodProposal { status: PENDING }. GET /api/nutrition/foods/my-proposals (NUT-06): listar propuestas del atleta con status. Admin: agregar a /admin/foods panel la lista de PENDING proposals con botón aprobar (→ crea Food con isActive=true, isVerified=false) o rechazar (→ status REJECTED + adminNote).',
          },
          {
            title: 'BACK-08 — Notification: crear endpoints GET /api/notifications y PATCH /api/notifications/[id]/read',
            done: false,
            priority: 'P2',
            note: 'GET /api/notifications: listar notificaciones del usuario autenticado (ordenadas por createdAt desc, take 50). PATCH /api/notifications/[id]/read: marcar como leída (readAt = now()). DELETE /api/notifications/[id]: eliminar. GET /api/mobile/notifications + PATCH /api/mobile/notifications/[id]/read: equivalentes mobile. Primer uso: crear Notification al publicar un plan (coach→atleta), al asignar una rutina, al completar check-in. El "punto de creación" de notificaciones se activa módulo por módulo.',
          },
        ],
      },
      {
        id: 'db-fuerza',
        label: 'Fase 5 — Fuerza & Ejercicios (schema)',
        period: 'P0-P3',
        items: [
          {
            title: 'DB-13 — Exercise: agregar nameEs String? + instructionsEs String[] (español del dataset WorkoutX)',
            done: true,
            priority: 'P0',
            note: 'DONE: Exercise.nameEs String? + Exercise.instructionsEs String[] agregados. UI usa nameEs ?? name + instructionsEs.length ? instructionsEs : instructions. Desbloquea EX-05b (seed español). Migración: 20260708180057_db_schema_v3_additions. Branch: chore/db-schema-v3.',
          },
          {
            title: 'DB-14 — WorkoutExercise: agregar restSeconds Int? (tiempo de descanso entre sets)',
            done: true,
            priority: 'P1',
            note: 'DONE: WorkoutExercise.restSeconds Int? ya existía en el schema antes de esta migración. Verificado en línea 577 del schema.prisma.',
          },
          {
            title: 'DB-15 — SetLog: agregar setType SetType enum (WORK|WARMUP|DROPSET) + rpe Int?',
            done: true,
            priority: 'P2',
            note: 'DONE: SetLogType enum (WORK|WARMUP|DROPSET) y SetLog.setLogType ya existían. SetLog.rpe Int? agregado en esta migración. Migración: 20260708180057_db_schema_v3_additions. Branch: chore/db-schema-v3.',
          },
          {
            title: 'DB-16 — Exercise: agregar videoUrl String? (vídeo de referencia técnica)',
            done: true,
            priority: 'P3',
            note: 'DONE: Exercise.videoUrl String? agregado. Coach asigna YouTube URL o Vercel Blob URL por ejercicio. Migración: 20260708180057_db_schema_v3_additions. Branch: chore/db-schema-v3.',
          },
        ],
      },
      {
        id: 'db-nutricion-avanzado',
        label: 'Fase 6 — Nutrición Avanzada (schema)',
        period: 'P2-P3',
        items: [
          {
            title: 'DB-17 — Recipe + RecipeIngredient models (recetas compuestas del atleta)',
            done: true,
            priority: 'P2',
            note: 'DONE: Recipe { id, userId, name, createdAt } + RecipeIngredient { id, recipeId FK Cascade, foodId FK, grams } + índices. Food.recipeIngredients[] y User.recipes[] agregados. Migración: 20260708180057_db_schema_v3_additions. Branch: chore/db-schema-v3.',
          },
          {
            title: 'DB-18 — WaterLog model + NutritionPlan.waterMlTarget Int? (tracking de hidratación)',
            done: true,
            priority: 'P3',
            note: 'DONE: WaterLog { id, userId, date @db.Date, mlLogged Int, createdAt } + @@unique([userId, date]) + @@index([userId]). NutritionPlan.waterMlTarget Int? @default(2000) agregado. Migración: 20260708180057_db_schema_v3_additions. Branch: chore/db-schema-v3.',
          },
          {
            title: 'DB-19 — MealPlanVersion model (historial de cambios del plan nutricional)',
            done: true,
            priority: 'P3',
            note: 'DONE: MealPlanVersion { id, userId, mealPlanId FK Cascade, version Int, planData Json, assignedAt, assignedById? FK SetNull } + @@index([userId, mealPlanId]). MealPlan.versions[] agregado. Migración: 20260708180057_db_schema_v3_additions. Branch: chore/db-schema-v3.',
          },
        ],
      },
      {
        id: 'db-atleta-avanzado',
        label: 'Fase 7 — Atleta Avanzado (schema)',
        period: 'P2',
        items: [
          {
            title: 'DB-20 — ProgressPhoto model (fotos de progreso semanales via Vercel Blob)',
            done: true,
            priority: 'P2',
            note: 'DONE: ProgressPhoto { id, userId, url String (Vercel Blob URL), takenAt DateTime, description String?, createdAt } + @@index([userId, takenAt]) + onDelete:Cascade. Migración: 20260708180057_db_schema_v3_additions. Branch: chore/db-schema-v3.',
          },
        ],
      },
    ],
  },
]
