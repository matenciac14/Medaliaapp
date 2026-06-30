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
User  ← role: ATHLETE | COACH | ADMIN
  ├── UserSubscription (TRIAL | FREE | PRO)   ← todos los roles
  ├── WeeklyRoutine                            ← self-directed, sin plan activo
  │
  ├── (como ATLETA)
  │     ├── TrainingPlan (goalType) → PlanWeek → PlannedSession → SessionLog
  │     ├── WeeklyCheckIn
  │     ├── NutritionPlan
  │     ├── FoodProfile → MealPlan (version)
  │     ├── FoodLog → Food
  │     ├── AssignedWorkout → GymSession → SetLog (isPR)
  │     ├── PerformanceBenchmark
  │     └── DailyLog
  │
  └── (como COACH)
        ├── CoachAthlete [coachGoal?, privateNotes?] → User (atleta)
        ├── WorkoutTemplate → WorkoutDay → WorkoutExercise
        ├── CoachProfile → CoachProgram | CoachPost
        ├── InviteCode (7 días, redimible una vez)
        └── Payment (PENDING | PAID) → PaymentAuditLog (CREATED|MARKED_PAID|REMINDED)

HealthProfile  ← uno por User, sportGoal String?
SystemConfig   ← singleton id="singleton", aiProfile Json (placeholder — AI pendiente)
Message        ← coach ↔ atleta (fromId / toId)
AdminAuditLog  ← trail de acciones admin (CHANGE_ROLE | CHANGE_PLAN | UPDATE_AI_PROFILE)
```

---

## Enums — valores exactos

```
UserRole:           ATHLETE | COACH | ADMIN

PlanSource:         AI | COACH | AI_COACH_APPROVED   ← 'TEMPLATE' NO existe
PlanStatus:         ACTIVE | COMPLETED | PAUSED | ABANDONED
Phase:              BASE | DESARROLLO | ESPECIFICO | AFINAMIENTO   ← usado en PlanWeek y evaluate-rules

SessionType:        RODAJE_Z2 | FARTLEK | TEMPO | INTERVALOS | TIRADA_LARGA |
                    FUERZA | CICLA | NATACION | DESCANSO | TEST | SIMULACRO | OTRO
SessionIntensity:   HIGH | MODERATE | LOW | REST

GoalType:           RACE_5K | RACE_10K | RACE_HALF_MARATHON | RACE_MARATHON |
                    RACE_TRIATHLON | RACE_CYCLING | RACE_SWIMMING | FOOTBALL_GPP |
                    STRENGTH_TRAINING | BODY_RECOMPOSITION | WEIGHT_LOSS | GENERAL_FITNESS
GoalStatus:         ACTIVE | COMPLETED | ABANDONED

PaymentStatus:      PENDING | PAID   ← OVERDUE derivado en app (dueDate < now && PENDING), NO en DB
AthleteStatus:      ACTIVE | PAUSED
SubscriptionTier:   TRIAL | FREE | PRO

SetType:            NORMAL | SUPERSET | BISERIE | DROPSET | CIRCUIT
EquipmentType:      BARBELL | DUMBBELL | MACHINE | CABLE | SMITH | BODYWEIGHT | KETTLEBELL | BAND | OTHER
ExerciseCategory:   COMPOUND | ISOLATION | CARDIO | STRETCH | FUNCTIONAL
PostType:           TIP | ROUTINE_SHOWCASE | ACHIEVEMENT | ANNOUNCEMENT
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
  - `timezone String?` — IANA tz (null = America/Bogota)
  - `locale String?` — BCP 47 (null = es-CO)
  - `pushToken String?` — Expo Push Token para notificaciones mobile
- `CoachAthlete`:
  - `coachGoal String?` — meta visible para el atleta ("Bajar 5kg en 16 semanas")
  - `privateNotes String?` — notas privadas del entrenador, el atleta nunca las ve
  - `onDelete: Cascade` en ambas relaciones (coach y atleta)
- `HealthProfile.sportGoal` — meta del deporte (fuente canónica, no config.sport.goal)
- `TrainingPlan.goalType String?` — RACE_5K | BODY_RECOMPOSITION etc. (ver GoalType enum)
- `MealPlan.version Int @default(1)` — trazabilidad de versiones del plan nutricional
- `SetLog.workoutExerciseId` nullable + `exerciseName String?` — preserva historial aunque el entrenador elimine ejercicios
- `SetLog.isPR Boolean @default(false)` — detectado en `gym/session/complete/route.ts`
- `WeeklyRoutine.days Json` — `[{dow, activity:"GYM"|"RUN"|"REST", split?, runType?}]`
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
  admin/        page · users · coaches · subscriptions · roadmap · settings
  select-role/  ← Google OAuth role selection

  api/
    auth/         [...nextauth] · register · set-role · verify-email · forgot-password · set-password
    me/           ← usuario actual (web)
    user/         profile ← PATCH perfil del atleta
    checkin/      ← POST check-in semanal (web)
    onboarding/   generate ← POST completa onboarding + activa features
    plan/         new · week-print
    upgrade/      downgrade ← cambio de tier
    routine/      ← GET/POST rutina semanal self-directed (web)
    nutrition/    log · log/[id] · generate · generate-meals · foods
    log/          session · session/[logId] · run
    gym/          session/today · session/complete · session/[id] · assign
    invite/       [code] ← redimir código público (diferente de coach/invite)
    messages/     route · me · read · unread-count
    metrics/      log

    mobile/auth/  login · me · google · set-role
                  ← forgot-password NO existe en mobile: usa /api/auth/forgot-password
    mobile/       dashboard · dashboard/week-sessions · plan · checkin · checkin-status
                  log/session · log/session/[logId] · progress
                  nutrition · nutrition/log · nutrition/log/[id] · nutrition/log/summary
                  nutrition/generate-meals · nutrition/foods
                  gym/week · gym/history · gym/templates
                  messages · messages/me · messages/read · messages/unread-count
                  sessions/[sessionId] · calendar · routine
                  push-token ← registro token EAS (backend listo, frontend pendiente)
                  coach/athletes (COACH only)
                  onboarding/generate

    athlete/      gym/routines · gym/routines/[id] · sessions/[sessionId] · calendar · sport

    coach/        invite · join
                  athlete/[id]/config · athlete/[id]/plan · athlete/[id]/plan/custom
                  athlete/[id]/nutrition · athlete/[id]/nutrition/meals
                  athlete/[id]/benchmarks · athlete/[id]/reset-password · athlete/[id]/status
                  plan/[planId]/approve · plan/[planId]/sessions
                  plan/[planId]/week/[weekId] · plan/[planId]/week/[weekId]/copy-prev
                  sessions/[sessionId]/note · sessions/[sessionId]/edit
                  gym/routines · gym/routines/[id] · gym/routines/[id]/assign
                  gym/exercises · gym/athlete/[id]/assigned · gym/athlete/[id]/logs
                  payments · payments/[paymentId]
                  profile · programs · posts
                  clients/create · clients/link · clients/check
                  dashboard/athletes

    gym/          session/today · session/complete · session/[id] · assign

    admin/        ai-profile · users/[id]/plan · user/[id]/role
                  ← nota: "users" plural en plan, "user" singular en role (inconsistencia en codebase)

    cron/         checkin-reminder · session-reminder · payment-overdue
```

---

## Deuda conocida

| Severidad | Problema |
|-----------|---------|
| 🟡 PENDIENTE | `UserSubscription` esqueleto listo — conectar a Stripe/Wompi cuando llegue billing. `getUserPlan()` hardcodea `'PRO'` hasta entonces. |
| 🟡 PENDIENTE | `CoachSubscriptionTier` (STARTER\|GROWTH\|PRO\|SCALE) no existe en DB — tiers de entrenador pendientes. Ver roadmap. |
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
