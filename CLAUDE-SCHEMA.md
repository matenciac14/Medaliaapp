# Medaliq — DB Schema (referencia completa)

> Este archivo complementa `CLAUDE.md`. Cargarlo cuando la tarea toca migraciones, nuevas columnas o queries complejos.

## Archivos de configuración DB

```
prisma/schema.prisma              ← definición de modelos y enums
prisma.config.ts                  ← url (pooler) + directUrl + seed
src/generated/prisma/             ← cliente generado — NUNCA editar manualmente
src/lib/db/prisma.ts              ← instancia singleton del cliente
```

---

## Modelos y relaciones

```
User (coach)
  └── CoachAthlete → User (atleta)
        ├── TrainingPlan (goalType) → PlanWeek → PlannedSession → SessionLog
        ├── WeeklyCheckIn
        ├── NutritionPlan + FoodProfile → MealPlan (version) | FoodLog → Food
        ├── WorkoutTemplate → WorkoutDay → WorkoutExercise
        ├── AssignedWorkout → GymSession → SetLog (isPR)
        └── PerformanceBenchmark

User (coach)
  ├── CoachProfile → CoachProgram | CoachPost
  ├── InviteCode (7 días, redimible una vez)
  ├── Payment (PENDING | PAID) → PaymentAuditLog (CREATED|MARKED_PAID|REMINDED)
  └── UserSubscription (TRIAL | FREE | PRO)

HealthProfile
  └── sportGoal String? — meta del deporte (RACE | BODY_RECOMPOSITION | GENERAL_FITNESS)

Message (coach ↔ atleta)
SystemConfig (singleton id="singleton" — almacena AIProfile como JSON)
  └── Acceso: getCachedSystemConfig() con unstable_cache TTL 1h — 0 queries en runtime salvo revalidación

DailyLog — métricas diarias del atleta
  id, userId, date (@@unique), weightKg?, hrResting?, sleepHours?, energyLevel?, notes?
  ← upsert por userId+date — fuente de datos para gráficas de progreso

SessionLog — registro de una sesión completada por el atleta
  id, userId, plannedSessionId? (null = log libre), completedAt
  rpe?, hrAvg?, hrMax?, distanceKm?, durationMin?, notes?
  garminActivityId?, freeSessionType? (RODAJE_Z2|FUERZA|OTRO — solo si plannedSessionId=null)
```

---

## Enums — valores exactos

```
PlanSource:         AI | COACH | AI_COACH_APPROVED   ← 'TEMPLATE' NO existe
SessionType:        RODAJE_Z2 | FARTLEK | TEMPO | INTERVALOS | TIRADA_LARGA |
                    FUERZA | CICLA | NATACION | DESCANSO | TEST | SIMULACRO | OTRO
SessionIntensity:   HIGH | MODERATE | LOW | REST
PaymentStatus:      PENDING | PAID   ← OVERDUE derivado en app (dueDate < now && PENDING), NO en DB
AthleteStatus:      ACTIVE | PAUSED
SubscriptionTier:   TRIAL | FREE | PRO
```

---

## Mapeo dominio ↔ DB

| Campo dominio | Columna DB |
|---------------|-----------|
| `description` | `PlannedSession.detailText` |
| `zone` | `PlannedSession.zoneTarget` |
| `coachNotes` | `PlannedSession.coachNote` |
| `heartRate` (check-in) | `WeeklyCheckIn.hrResting` |

`WeeklyCheckIn.recordedAt` (no `createdAt`) — importante para queries de check-in de la semana.

---

## Campos especiales

- `User`: feature flags como columnas Boolean tipadas — NO JSON blob
  - `featurePlan | featureCheckin | featureNutrition | featureProgress | featureLog | featureCoach | featureGym`
  - `onboardingCompleted | onboardingCompletedAt | needsRoleSelection`
- `HealthProfile.sportGoal` — meta del deporte (fuente canónica, no config.sport.goal)
- `TrainingPlan.goalType` — tipo de objetivo del plan (RACE_5K, BODY_RECOMPOSITION, etc.)
- `MealPlan.version Int @default(1)` — trazabilidad de versiones del plan nutricional
- `SetLog.workoutExerciseId` nullable + `exerciseName String?` — preserva historial aunque el coach elimine ejercicios
- `SetLog.isPR Boolean @default(false)` — detectado en `gym/session/complete/route.ts`
- `CoachAthlete`: `onDelete: Cascade` en ambas relaciones
- Partial index único no expresable en Prisma schema:
  ```sql
  CREATE UNIQUE INDEX "TrainingPlan_userId_active_unique"
    ON "TrainingPlan" ("userId") WHERE "status" = 'ACTIVE';
  ```

---

## IUserRepository — métodos atómicos

```ts
enableFeature(userId, feature)           // single flag → true (columna featureX)
enableFeatures(userId, features[])       // array → todos true
mergeFeatures(userId, patch)             // Record<key, bool> — soporta false
completeOnboarding(userId, opts)         // onboardingCompleted + sportGoal en HealthProfile + optional features
```

---

## Estructura de rutas API

```
src/app/
  (athlete)/    dashboard · plan · checkin · nutrition · progress · log
                gym · gym/session · gym/history
  coach/        dashboard · athlete/[id] · athlete/[id]/plan/build
                gym · profile · clients/new · plan/[id]/review · invite · finanzas · settings
  admin/        page · users · activaciones · ai · coaches · subscriptions · roadmap · settings
  select-role/  ← Google OAuth role selection

  api/
    auth/         [...nextauth] · register · set-role · verify-email · forgot-password · set-password
    me/           ← usuario actual (web)
    mobile/auth/  login · me · google · set-role
                  ← forgot-password NO existe en mobile: usa /api/auth/forgot-password
    mobile/       dashboard · dashboard/week-sessions · plan · checkin · checkin-status
                  log/session · log/session/[logId] · progress
                  nutrition · nutrition/log · nutrition/log/summary · nutrition/generate-meals · nutrition/foods
                  gym/week · gym/history · gym/templates
                  messages · messages/read · messages/unread-count
                  sessions/[sessionId] · calendar · routine
                  push-token ← registro de token EAS (backend listo, frontend pendiente)
                  coach/athletes (COACH only)
                  onboarding/generate
    athlete/      gym/routines · gym/routines/[id] · sessions/[sessionId] · calendar · sport
    coach/        invite · join · athlete/[id]/* · plan/[planId]/* · sessions/[id] · sessions/[id]/note
                  gym/* · payments · payments/[paymentId] · profile · programs · posts
                  clients/create · clients/link · clients/check
                  athlete/[id]/config · athlete/[id]/reset-password · athlete/[id]/status
                  dashboard/athletes
    gym/          session/today · session/complete · session/[id] · assign
    log/          session · session/[logId] · run
    checkin/      onboarding/generate/   upgrade/downgrade/
    messages/     (web) me · route · read · unread-count
    metrics/      log
    admin/        ai-profile · users/[id]/plan · users/[id]/role
    cron/         checkin-reminder · session-reminder · payment-overdue
```

---

## Deuda conocida

| Severidad | Problema |
|-----------|---------|
| 🟡 PENDIENTE | `UserSubscription` esqueleto listo — conectar a Stripe/Wompi cuando llegue billing. `getUserPlan()` hardcodea `'PRO'` hasta entonces. |
| ✅ RESUELTO | `User.config` JSON blob — eliminado. Reemplazado por columnas tipadas + `UserSubscription`. |
| ✅ RESUELTO | `WeeklyCheckIn` — `planId` agregado + partial indexes. |
| ✅ RESUELTO | `PaymentStatus.OVERDUE` — eliminado del enum. Derivado en app layer. |
| ✅ RESUELTO | `FoodProfile` — lookup por `id: { in: availableFoodIds }`. Fuzzy matching eliminado. |

---

## Comandos de migración

```bash
pnpm prisma migrate dev --name descripcion    # crea y aplica migración en dev
pnpm prisma migrate deploy                    # aplica migraciones en producción (DIRECT_URL)
pnpm prisma generate                          # regenera cliente tras cambiar schema
pnpm prisma db seed                           # ejecuta el seed
pnpm prisma studio                            # UI visual de la DB
```

> Siempre usar `DIRECT_URL` (sin pooler) para migraciones — Neon pooler no soporta DDL.

---

## Flujo para agregar un campo nuevo

```
1. Editar prisma/schema.prisma — agregar campo al modelo
2. pnpm prisma migrate dev --name add_campo_a_modelo
3. El cliente se regenera automáticamente en src/generated/prisma/
4. Importar tipos desde src/generated/prisma/client (NUNCA @prisma/client)
5. Actualizar este archivo con el nuevo campo en la sección correspondiente
```
