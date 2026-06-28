# Medaliq — Web + Backend

> Contexto del producto, modelo de negocio y arquitectura general: ver `../CLAUDE.md`
> Backlog y prioridades: ver `BACKLOG.md`

## Stack
- Next.js 16 App Router + TypeScript
- PostgreSQL + **Prisma 7** (adapter pg, output `src/generated/prisma`)
- Tailwind CSS v4 + shadcn/ui
- Auth.js v5 (next-auth@beta) — estrategia JWT
- Claude API — Haiku para check-in adjustments, Sonnet para coach chat
- Neon (PostgreSQL serverless) — pooler runtime, direct URL migraciones
- pnpm · bcryptjs · Resend · jose

---

## Convención de branches — OBLIGATORIO

```
feature/[n]-descripcion-kebab-case
bugfix/[n]-descripcion-kebab-case
chore/descripcion-kebab-case
hotfix/[n]-descripcion-kebab-case
```
Push bloqueado si no cumple (`.githooks/pre-push` + GitHub ruleset).

---

## Regla crítica para agentes

**NUNCA romper código existente.** Antes de modificar cualquier archivo:
1. Leerlo completo para entender el contexto
2. Solo tocar las líneas estrictamente necesarias
3. No refactorizar ni renombrar lo que ya funciona
4. Si el cambio afecta una función compartida, verificar todos sus callers

**NO pushear a producción sin autorización explícita de Miguel.**

---

## Slugs canónicos en rutas dinámicas

| Entidad | Slug |
|---------|------|
| TrainingPlan | `[planId]` |
| PlannedSession / CoachSession | `[sessionId]` |
| Atleta / Usuario genérico | `[id]` |
| Ejercicio / Rutina gym | `[id]` |
| Semana del plan | `[weekId]` |

Antes de crear una ruta bajo un path dinámico existente, revisar siblings con Glob.

---

## Prisma 7 — diferencias críticas

```ts
import type { PrismaClient } from '../../generated/prisma/client'  // NUNCA @prisma/client
```
- Generator: `prisma-client` con `output = "../src/generated/prisma"`
- `url` va en `prisma.config.ts`, `directUrl` va en `schema.prisma`
- Requiere adapter: `new PrismaPg({ connectionString })` de `@prisma/adapter-pg`
- Seed en `prisma.config.ts → migrations.seed` (no en `package.json`)

---

## Auth.js v5 + Edge Runtime

- `src/auth.config.ts` — config SIN Prisma, usada en middleware (Edge-safe)
- `src/auth.ts` — config completa con PrismaAdapter, para server components y API routes
- Middleware importa de `auth.config.ts`, nunca de `auth.ts`
- JWT contiene: `id, role, onboardingCompleted, activated, isB2B, userPlan, features, needsRoleSelection`
- `activated` = `features.plan` (false solo para atletas B2B sin activar)
- NO hay check de trial expirado en middleware — la lógica de upgrade está inline en páginas

## Google OAuth web

- Nuevo usuario Google → `config === null` → `needsRoleSelection = true` en JWT
- Middleware redirige a `/select-role` antes de cualquier otro check
- `POST /api/auth/set-role` aplica `COACH_CONFIG` o `DEFAULT_USER_CONFIG`
- `session.update()` limpia `needsRoleSelection` y recarga el JWT desde DB

---

## Middleware — protección de rutas (`src/middleware.ts`)

Decisiones en orden (primero que aplica gana):
```
1. !isLoggedIn + !isPublicRoute          → /login
2. needsRoleSelection                    → /select-role
3. !onboardingCompleted                  → /onboarding
4. ATHLETE + B2B + !activated            → /pending
5. /coach/* + role !== COACH             → /dashboard
6. /admin/* + role !== ADMIN             → /dashboard
7. ADMIN + !(admin|public|api)           → /admin
8. COACH + /dashboard                    → /coach/dashboard
9. COACH + /onboarding                   → /coach/dashboard

Rutas públicas: /, /login, /register, /api/*, /join/*, /coaches, /p/*
```

---

## Arquitectura Hexagonal

```
src/
  domain/                        ← lógica de negocio PURA (nunca importa infra, Prisma, Next.js)
    check-in/                    evaluate-rules.ts · process-check-in.use-case.ts · check-in.types.ts
    plan/                        generate-plan.use-case.ts · session-builder.ts · plan.types.ts
    onboarding/                  complete-onboarding.use-case.ts · onboarding.utils.ts
    ports/                       plan.repository.ts · checkin.repository.ts · health-profile.repository.ts
                                 user.repository.ts · ai.service.ts

  infrastructure/                ← implementaciones de los ports
    db/                          plan · check-in · health-profile · user repositories (Prisma)
    ai/                          anthropic.service.ts (falla silenciosamente)
    email/                       resend.ts

  lib/                           ← utilidades puras existentes — NO TOCAR sin razón
    plan/formulas.ts             Karvonen HR zones, Mifflin-St Jeor TDEE, Riegel race time
    plan/templates.ts            4 templates base
    plan/generator.ts            legado — migrar gradualmente a domain/plan/
    ai/profile.ts                AIProfile type, buildPlanSystemPrompt, buildChatSystemPrompt
    config/user-config.ts        UserConfig type, parseUserConfig, COACH_CONFIG, DEFAULT_USER_CONFIG
    nutrition/daily-target.ts    getDailyNutritionTarget(intensity, plan)
    mobile-auth.ts               signMobileToken · getMobileUser

  app/                           ← capa de entrega Next.js — rutas DELGADAS
    api/                         máx ~25 líneas: auth → validate → call use case → respond
```

**Reglas de capas:**
- `domain/` nunca importa de `infrastructure/`, `app/`, Prisma ni Next.js
- `app/api/` nunca escribe lógica de negocio — solo llama use cases
- Si una API route supera 40 líneas, la lógica pertenece al dominio

---

## Patrón $transaction — 3 fases obligatorias

```
Phase 1: reads paralelos (Promise.all) FUERA del tx
Phase 2: I/O externo (AI, emails) FUERA del tx — dentro = timeout + rollback
Phase 3: TODOS los writes en db.$transaction({ timeout: 30_000 })
```

## Rate limiting mobile

```ts
const { allowed } = await rateLimitAsync(`mobile-${mobile.id}:endpoint-name`, { limit: 300, windowMs: 60_000 })
if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes.' }, { status: 429 })
// GET: 300 | POST: 100
```

---

## DB — Schema

### Modelos y relaciones

```
User (coach)
  └── CoachAthlete → User (atleta)
        ├── TrainingPlan → PlanWeek → PlannedSession → SessionLog
        ├── WeeklyCheckIn
        ├── NutritionPlan + FoodProfile → MealPlan | FoodLog → Food
        ├── WorkoutTemplate → WorkoutDay → WorkoutExercise
        ├── AssignedWorkout → GymSession → SetLog (isPR)
        └── PerformanceBenchmark

User (coach)
  ├── CoachProfile → CoachProgram | CoachPost
  ├── InviteCode (7 días, redimible una vez)
  └── Payment (PENDING | PAID | OVERDUE)

Message (coach ↔ atleta)
SystemConfig (singleton id="singleton" — almacena AIProfile)
```

### Enums — valores exactos

```
PlanSource:        AI | COACH | AI_COACH_APPROVED   ← 'TEMPLATE' NO existe
SessionType:       RODAJE_Z2 | FARTLEK | TEMPO | INTERVALOS | TIRADA_LARGA |
                   FUERZA | CICLA | NATACION | DESCANSO | TEST | SIMULACRO | OTRO
SessionIntensity:  HIGH | MODERATE | LOW | REST
PaymentStatus:     PENDING | PAID   ← OVERDUE es estado derivado (dueDate < now && PENDING), NO en DB
AthleteStatus:     ACTIVE | PAUSED
```

### Mapeo dominio ↔ DB

| Campo dominio | Columna DB |
|---------------|-----------|
| `description` | `PlannedSession.detailText` |
| `zone` | `PlannedSession.zoneTarget` |
| `coachNotes` | `PlannedSession.coachNote` |
| `heartRate` (check-in) | `WeeklyCheckIn.hrResting` |

`WeeklyCheckIn.recordedAt` (no `createdAt`) — importante para queries de check-in de la semana.

### Campos especiales

- `SetLog.workoutExerciseId` nullable + `exerciseName String?` — preserva historial aunque el coach elimine ejercicios
- `SetLog.isPR Boolean @default(false)` — detectado en `gym/session/complete/route.ts`
- `CoachAthlete`: `onDelete: Cascade` en ambas relaciones
- `Payment` model vía `db push` (sin migration file propio)
- Partial index único no expresable en Prisma schema:
  ```sql
  CREATE UNIQUE INDEX "TrainingPlan_userId_active_unique"
    ON "TrainingPlan" ("userId") WHERE "status" = 'ACTIVE';
  ```

### DB — Deuda conocida

| Severidad | Problema |
|-----------|---------|
| 🔴 CRÍTICO | `User.config` JSON blob — Migrar a `UserSubscription` model antes del primer cobro (Phase 2 — pendiente Stripe/Wompi). |
| ✅ RESUELTO | `WeeklyCheckIn` — `planId` agregado + partial indexes. |
| ✅ RESUELTO | `PaymentStatus.OVERDUE` — eliminado del enum. Derivado en app layer. |
| ✅ RESUELTO | `FoodProfile` — lookup por `id: { in: availableFoodIds }`. Fuzzy matching eliminado. |
| ✅ RESUELTO | `User.config` race conditions — todos los writes a `features`, `plan`, `onboarding`, `sport` son ahora atómicos vía `IUserRepository`. `updateConfig` (full replace) sin callers activos. |

### IUserRepository — métodos atómicos

```ts
enableFeature(userId, feature)           // single flag → true
enableFeatures(userId, features[])       // array → todos true
mergeFeatures(userId, patch)             // Record<key, bool> — soporta false
updatePlanState(userId, plan)            // reemplaza config.plan.*
completeOnboarding(userId, opts)         // onboarding + sport + optional plan + optional features
updateConfig(userId, config)             // full replace — sin callers activos, disponible para emergencias
```

---

## UserConfig — implementación

```ts
// src/lib/config/user-config.ts
COACH_CONFIG:         onboarding.completed=true, solo features.coach=true
DEFAULT_USER_CONFIG:  todas las features en true excepto coach

getUserPlan(features) → 'PRO' si aiPlan||aiCoach, 'FREE' sino
parseUserConfig(raw)  → merge con DEFAULT_USER_CONFIG
```

### Feature gating

| Feature | FREE | Trial/B2C | PRO |
|---------|------|-----------|-----|
| Dashboard / Log manual | ✅ | ✅ | ✅ |
| Plan / Check-in / Nutrición / Gym | ✅ default | ✅ | ✅ |
| AI Plan generation | ❌ | ✅ aiPlan=true | ✅ |
| AI Coach chat | ❌ limit=0 | ✅ limit=999999 | ✅ limit=100 |

---

## Onboarding — flujo multi-deporte

Archivo: `src/app/onboarding/page.tsx` (self-contained)

```
RUNNING:   health-goal → has-sport → sport-select → sport-details → physical → hr-fitness → schedule → health → plan-method → generating
STRENGTH:  health-goal → has-sport → sport-select → sport-details → physical → generating
GYM B2C:   health-goal → has-sport → physical → plan-method → generating
FREE:      health-goal → physical → generating
```

**Regla crítica `isLastDataStep`:**
```js
const isLastDataStep = steps[stepIndex + 1] === 'generating'
// NO usar: stepIndex === steps.length - 2  ← BUG — el array crece dinámicamente
```

### completeOnboardingUseCase — 4 rutas
- **FREE/GYM**: calculateTDEE + macros → upsertNutrition → activar features → `planId: null`
- **B2B**: upsertProfile + `onboarding: completed` → NO activa features → `/pending`
- **SPORT/BODY B2C**: upsertProfile → generatePlanUseCase → devuelve `planId`

---

## Cerebro AI — generación de planes

### Templates

| GoalType | Template | Semanas |
|----------|----------|---------|
| RACE_5K | FIVE_K_8W | 8 |
| RACE_10K | TEN_K_12W | 12 |
| RACE_HALF_MARATHON, RACE_MARATHON | HALF_MARATHON_18W | 18 |
| BODY_RECOMPOSITION, STRENGTH_TRAINING | BODY_RECOMPOSITION_16W | 16 |

### generatePlanUseCase — fases

```
FASE 1 — Computación pura:
  estimateHRMax = 211 - 0.64×edad (si user no dio hrMax > 100)
  calculateHRZones: Karvonen si hrResting > 0, % simple si hrResting = 0
  calculateTDEE(Mifflin-St Jeor) + macros periodizados

FASE 2 — AI: AI_ONBOARDING_ENABLED = false → recommendations = []

FASE 3 — $transaction:
  deactivateUserPlans → createPlan → createWeeks → createSessions → upsertNutrition

FASE 4 — Config update (fuera del tx):
  updateConfig({ plan.{currentWeek,totalWeeks,phase}, sport, onboarding.completed })
```

---

## Flujos clave (verificados contra código)

### Check-in semanal

```
POST /api/checkin → processCheckIn(input, deps)

Fase 1 (fuera tx): findLatest + findActivePlan + getAdherence
Fase 2 (fuera tx): evaluateCheckInRules → triggers + adjustments
  Triggers: fc_alta | sueno_bajo | rpe_excesivo | dolor_activo | estres_alto
            motivacion_baja | nutricion_baja | perdida_peso_rap | energia_baja
  Con triggers → aiService.generateRecommendation (falla silenciosa)
Fase 3 ($transaction):
  upsert WeeklyCheckIn por (userId, weekNumber)
  applySessionAdjustments (dolor→Z2, volumen*0.8, zona bajada)
    coachNote += '[AUTO] ...'
  syncWeight: |Δkg| >= 0.5 → recalcular TDEE + macros
```

### AI Coach chat

```
POST /api/ai/chat (SSE streaming)
  rateLimitAsync: 20 msgs/min | features.aiCoach === false → 402
  messagesThisMonth >= monthlyLimit → 429
  systemPrompt = buildChatSystemPrompt(aiProfile) + buildAthleteContext(user)
  On complete: messagesThisMonth++ (fire-and-forget)
```

### Flujo B2B

```
1. POST /api/coach/clients/create → user + coachAthlete
2. Atleta onboarding → completeOnboardingUseCase detecta B2B → /pending
3. PATCH /api/coach/athlete/[id]/activate → enableFeature(all)
4. POST /api/coach/athlete/[id]/plan → generatePlanUseCase (isB2C=false)
```

---

## Estructura de rutas

```
src/app/
  (athlete)/    dashboard · plan · checkin · nutrition · progress · log
                gym · gym/session · gym/history
  coach/        dashboard · athlete/[id] · athlete/[id]/plan/build
                gym · profile · clients/new · plan/[id]/review · invite · finanzas · settings
  admin/        page · users · activaciones · ai · coaches · subscriptions · roadmap · settings
  select-role/  ← Google OAuth role selection

  api/
    auth/         [...nextauth] · register · set-role
    mobile/auth/  login · me · google · set-role
    mobile/       dashboard · dashboard/week-sessions · plan · checkin · checkin-status
                  log/session · progress · nutrition · nutrition/log · nutrition/generate-meals
                  gym/week · messages · messages/read · messages/unread-count
    coach/        invite · join · athlete/[id]/* · plan/[planId]/* · sessions/[id]
                  gym/* · payments · payments/[paymentId] · profile · programs · posts · clients/create
    gym/          session/today · session/complete · session/[id]
    checkin/   log/session/   ai/chat/   onboarding/generate/   upgrade/downgrade/
    messages/  (web) me · list · send · read
    admin/     ai-profile · users/[id]/plan
    cron/      checkin-reminder · session-reminder · payment-overdue
```

---

## DB — Neon (producción)

- `DATABASE_URL` — pooler URL para runtime
- `DIRECT_URL` — direct URL para migraciones
- Seed: `pnpm prisma db seed` → 39 ejercicios + usuarios de prueba
  - `admin@medaliq.com / admin123!` — ADMIN
  - `coach@medaliq.com / coach123` — COACH
  - `miguel@medaliq.com / atleta123` — ATHLETE con plan + coach
  - `ana@medaliq.com / atleta123` — ATHLETE B2C sin coach

---

## Skills — decisión autónoma del agente

| Tarea toca... | Cargar skill |
|---------------|-------------|
| Prisma schema / migrations / queries | `prisma-development` |
| Nueva feature compleja multi-capa | `feature-dev` |
| UI web nueva o rediseño | `frontend-design` |
| Código con bugs/deuda | `code-review` o `simplify` |
| React Native / Expo | `react-native-architecture` (solo si toca mobile) |
