# Medaliq — Web + Backend

> Contexto del producto, modelo de negocio y arquitectura general: ver `../CLAUDE.md`
> **Bugs y tareas:** fuente canónica en `src/app/admin/roadmap/roadmap-data.ts` — al terminar un bug/feature: marcar `done: true` y actualizar la `note`
> Schema completo, enums, mapeo dominio↔DB, rutas API: ver `CLAUDE-SCHEMA.md`

## Stack
- Next.js 16 App Router + TypeScript
- PostgreSQL + **Prisma 7** (adapter pg, output `src/generated/prisma`)
- Tailwind CSS v4 + shadcn/ui
- Auth.js v5 (next-auth@beta) — estrategia JWT
- Neon (PostgreSQL serverless) — pooler runtime, direct URL migraciones
- pnpm · bcryptjs · Resend · jose

> **Sin AI activa** — `@anthropic-ai/sdk` no está instalado. Producto 100% determinista. No agregar llamadas AI sin decisión explícita.

---

## Comandos de desarrollo

```bash
pnpm dev                                        # servidor local http://localhost:3000
pnpm tsc --noEmit                               # verificar tipos sin compilar
pnpm prisma migrate dev --name nombre           # nueva migración (dev)
pnpm prisma migrate deploy                      # aplicar migraciones en producción (usa DIRECT_URL)
pnpm prisma db seed                             # poblar DB con usuarios de prueba
pnpm prisma generate                            # regenerar cliente (auto en migrate dev)
pnpm prisma studio                              # UI para inspeccionar DB
```

> Migraciones en producción (Neon): requieren `DIRECT_URL` — el pooler no soporta DDL.

---

## Arquitectura Hexagonal

```
src/
  domain/                        ← lógica de negocio PURA (nunca importa infra, Prisma, Next.js)
    check-in/                    evaluate-rules.ts · process-check-in.use-case.ts · check-in.types.ts
    plan/                        generate-plan.use-case.ts · session-builder.ts · plan.types.ts
    onboarding/                  complete-onboarding.use-case.ts · onboarding.utils.ts
    ports/                       plan.repository.ts · checkin.repository.ts · health-profile.repository.ts
                                 user.repository.ts

  infrastructure/                ← implementaciones de los ports
    db/                          plan · check-in · health-profile · user repositories (Prisma)
    email/                       resend.ts
    ← infrastructure/ai/ pendiente — AI en desarrollo, aún no integrada

  lib/                           ← utilidades puras existentes — NO TOCAR sin razón
    plan/formulas.ts             Karvonen HR zones, Mifflin-St Jeor TDEE ← FUENTE CANÓNICA cálculos físicos
    plan/templates.ts            4 templates base
    plan/generator.ts            legado — migrar gradualmente a domain/plan/
    nutrition/daily-target.ts    getDailyNutritionTarget(intensity, plan) ← FUENTE CANÓNICA nutrición
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

## Auth.js v5 + Edge Runtime

- `src/auth.config.ts` — config SIN Prisma, usada en middleware (Edge-safe)
- `src/auth.ts` — config completa con PrismaAdapter, para server components y API routes
- Middleware importa de `auth.config.ts`, nunca de `auth.ts`
- JWT contiene: `id, role, onboardingCompleted, activated, isB2B, userPlan, features, needsRoleSelection`
- `activated` = `features.plan` (false solo para atletas B2B sin activar)
- NO hay check de trial expirado en middleware — la lógica de upgrade está inline en páginas

## Google OAuth web

> **[STANDBY]** — No está activa en producción. Pendiente: activar Client ID + Secret en Google Cloud Console y configurar `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` en Vercel. El código está implementado — solo falta la configuración.

- Nuevo usuario Google → `needsRoleSelection = true` en columna DB → JWT
- Middleware redirige a `/select-role` antes de cualquier otro check
- `POST /api/auth/set-role` setea columnas individuales por rol (COACH/ATHLETE)
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

## Prisma 7 — diferencias críticas

```ts
import type { PrismaClient } from '../../generated/prisma/client'  // NUNCA @prisma/client
```
- Generator: `prisma-client` con `output = "../src/generated/prisma"`
- `url` va en `prisma.config.ts`, `directUrl` va en `schema.prisma`
- Requiere adapter: `new PrismaPg({ connectionString })` de `@prisma/adapter-pg`
- Seed en `prisma.config.ts → migrations.seed` (no en `package.json`)

---

## Helpers centralizados — NO recrear

```
src/lib/api/responses.ts          ok() · created() · badRequest() · unauthorized()
                                  forbidden() · notFound() · conflict() · serverError()

src/lib/validation/index.ts       emailSchema · passwordSchema · nameSchema · roleSchema
                                  parseBody(req, schema) → { data } | NextResponse 400

src/lib/guards/feature-gate.ts    requireFeature(features, featureKey) → NextResponse 402 | null

src/lib/core/week-number.ts       getISOWeekNumber(date) · getPlanWeekNumber(startDate, totalWeeks)
                                  getCurrentISOWeek()

src/lib/plan/intensity.ts         getSessionIntensity(sessionType) → SessionIntensity

src/infrastructure/email/resend.ts  sendCoachWelcomeEmail · sendAthleteWelcomeEmail
                                    sendAthleteCoachAssignedEmail · sendPasswordResetEmail
                                    sendPlanUpdatedEmail
```

---

## DB — Referencia rápida

> Detalle completo (modelos, enums, mapeo, deuda, IUserRepository, rutas API): ver `CLAUDE-SCHEMA.md`

**Enums críticos (no adivinar):**
- `PlanSource`: `AI | COACH | AI_COACH_APPROVED` — 'TEMPLATE' NO existe
- `PaymentStatus`: `PENDING | PAID` — OVERDUE es derivado en app, NO enum DB
- `SessionIntensity`: `HIGH | MODERATE | LOW | REST`
- `GoalType`: `RACE_5K | RACE_10K | RACE_HALF_MARATHON | RACE_MARATHON | BODY_RECOMPOSITION | STRENGTH_TRAINING`
- `CoachSubscriptionTier`: `STARTER | GROWTH | PRO | SCALE` — en `UserSubscription.coachTier`

**Tipos DB críticos:**
- `Payment.amount` → `Decimal @db.Decimal(12,2)` — usar `Number(p.amount)` para aritmética JS
- `TrainingPlan.goalType` → `GoalType?` enum (no String?) — cast al escribir: `data.goalType as GoalType`
- `SessionLog.freeSessionType` → `SessionType?` enum (no String?)

**Mapeo dominio↔DB:**
- `PlannedSession.detailText` = `description` · `zoneTarget` = `zone` · `coachNote` = `coachNotes`
- `WeeklyCheckIn.hrResting` = `heartRate` · usar `recordedAt` (no `createdAt`)
- `WeeklyCheckIn` tiene campos de medidas: `waistCm, armsCm, hipsCm, thighsCm Float?`

---

## Feature flags — fuente canónica (columnas DB, NO JSON)

```ts
// Columnas Boolean en User:
featurePlan | featureCheckin | featureNutrition | featureProgress | featureLog | featureCoach | featureGym

// Defaults: ATHLETE todas true (excepto featureCoach=false) | COACH solo featureCoach=true
// getUserPlan() hardcodea 'PRO' — pendiente Stripe/Wompi
```

| Feature | B2B sin activar | Normal |
|---------|-----------------|--------|
| Dashboard / Log manual | ✅ | ✅ |
| Plan / Check-in / Nutrición / Gym / AI | ❌ | ✅ |

> Approach mejorado documentado en `../CLAUDE.md` — Bloque 3:
> atletas B2C derivan features de `computeAthleteFeatures(tier)`,
> entrenadores tienen límites de asesorados via `getCoachLimits(tier)`.

---

## Onboarding — flujo multi-deporte

Archivo: `src/app/onboarding/page.tsx` → `POST /api/onboarding/generate` → `completeOnboardingUseCase`

El onboarding completa el perfil del atleta y activa sus features.
**NO genera un TrainingPlan** — los planes se crean en `/new-goal` (B2C) o los asigna el entrenador (B2B).

```
RUNNING / GYM / BOTH → perfil + TDEE + nutrición + WeeklyRoutine → features activas → /dashboard
B2B                  → perfil + TDEE + nutrición → sin features → /pending (entrenador activa después)
```

**Regla crítica `isLastDataStep`:**
```js
const isLastDataStep = steps[stepIndex + 1] === 'generating'
// NO usar: stepIndex === steps.length - 2  ← BUG — el array crece dinámicamente
```

### completeOnboardingUseCase — 2 rutas reales
- **B2C** (RUNNING / GYM / BOTH): TDEE + macros → upsertNutrition → upsertProfile → completeOnboarding (features todas activas) → WeeklyRoutine → `planId: null`
- **B2B**: TDEE + macros → upsertNutrition → upsertProfile → completeOnboarding (sin features) → notifica entrenador → `planId: null`

---

## Generación de planes — templates y fases

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

FASE 2 — $transaction:
  deactivateUserPlans → createPlan → createWeeks → createSessions → upsertNutrition

FASE 3 — Post-tx (fuera del tx):
  completeOnboarding → onboardingCompleted=true + sportGoal en HealthProfile
```
← Plan 100% determinista via templates. `generatedBy: 'COACH' | 'AI'` — ambos usan el mismo template.

---

## Flujos clave (verificados contra código)

### Check-in semanal

```
POST /api/checkin → processCheckIn(input, deps)

Fase 1 (fuera tx): findLatest + findActivePlan + getAdherence
Fase 2 (fuera tx): evaluateCheckInRules → triggers + adjustments
  Triggers: fc_alta | sueno_bajo | rpe_excesivo | dolor_activo | estres_alto
            motivacion_baja | nutricion_baja | perdida_peso_rapida | energia_baja
  ← sin AI — recomendación construida desde adjustments.join('. ')
Fase 3 ($transaction):
  1. upsert WeeklyCheckIn por (userId, weekNumber)
       ← incluye waistCm, armsCm, hipsCm, thighsCm si el atleta las envió (puramente observacionales)
  2. applySessionAdjustments si triggers.length > 0 (dolor→Z2, volumen*0.8/0.85, zona bajada)
       coachNotes += '[AUTO] ...' — no toca sesiones con notas manuales del entrenador
  3. syncWeight: |Δkg| >= 0.5 → updateWeight + recalcular TDEE + macros (si hay plan nutricional)
  3b. syncHrResting: siempre actualiza HealthProfile.hrResting si heartRate > 0
  4. Primer check-in (count === 1) → enableFeature(userId, 'progress')

Medidas corporales (waistCm, armsCm, hipsCm, thighsCm):
  - Campos opcionales en CheckInInput — no disparan ningún trigger ni regla de ajuste
  - Se persisten en WeeklyCheckIn para visualización histórica en /progress
  - Web: sección colapsable en CheckInClient; Mobile: mismos campos en mobileCheckInSchema
```

### AI Coach chat

> **NO IMPLEMENTADO** — el endpoint `/api/ai/chat` no existe. `features.aiCoach` era un campo stale eliminado. No hay UI de chat implementada. Implementación pendiente en roadmap.

### Flujo B2B

```
1. POST /api/coach/clients/create → user + coachAthlete
2. Atleta onboarding → completeOnboardingUseCase detecta B2B → /pending
3. PATCH /api/coach/athlete/[id]/config → mergeFeatures(patch) — activa features selectivamente
     body: { features: { plan: true, checkin: true, nutrition: true, progress: true, log: true, gym: true } }
4. POST /api/coach/athlete/[id]/plan → generatePlanUseCase (isB2C=false)
```

---

## Cron jobs (`/api/cron/*`)

| Endpoint | Trigger | Qué hace |
|----------|---------|----------|
| `/api/cron/checkin-reminder` | Dom 23:00 UTC | Email recordatorio check-in semanal |
| `/api/cron/session-reminder` | Lun 12:00 UTC | Email sesión del día |
| `/api/cron/payment-overdue` | Diario 14:00 UTC | Email pagos vencidos al entrenador |

Test local:
```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/checkin-reminder
```

---

## Producción — notas críticas

`vercel.json` tiene `maxDuration: 60` en rutas de generación de plan:
- `/api/onboarding/generate`
- `/api/plan/new`
- `/api/coach/athlete/[id]/plan`

Sin esto Vercel corta el request a los 10s y el plan falla silenciosamente.

## DB — Neon (producción)

- `DATABASE_URL` — pooler URL para runtime · `DIRECT_URL` — migraciones
- Seed: `pnpm prisma db seed` → `admin@medaliq.com/admin123!` · `coach@medaliq.com/coach123` · `miguel@medaliq.com/atleta123` · `ana@medaliq.com/atleta123`

> **Solo correr en desarrollo** — nunca en producción. Ver reglas completas en `../CLAUDE.md`.

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

## Skills — decisión autónoma del agente

| Tarea toca... | Acción |
|---------------|--------|
| Prisma schema / migrations / queries | skill `prisma-development` + leer `CLAUDE-SCHEMA.md` |
| Áreas con bugs conocidos (gym/session, onboarding, plan) | leer `src/app/admin/roadmap/roadmap-data.ts` primero |
| Nueva feature compleja multi-capa | skill `feature-dev` |
| UI web nueva o rediseño | skill `frontend-design` |
| React Native / Expo | skill `react-native-architecture` |
