# Medaliq

## Regla crítica para agentes
**NUNCA romper código existente.** Antes de modificar cualquier archivo:
1. Leerlo completo para entender el contexto
2. Solo tocar las líneas estrictamente necesarias
3. No refactorizar, no renombrar, no reorganizar lo que ya funciona
4. Si el cambio afecta una función compartida, verificar todos sus callers antes de modificar su firma

**NO pushear a producción sin autorización explícita de Miguel.**

## Convención de slugs en rutas dinámicas — OBLIGATORIO

Next.js exige que todos los segmentos dinámicos dentro de una misma ruta padre usen **el mismo nombre de slug**. Mezclar `[id]` y `[planId]` bajo `api/coach/plan/` rompe el build.

**Slugs canónicos por entidad — usar siempre estos nombres:**

| Entidad | Slug |
|---------|------|
| TrainingPlan | `[planId]` |
| PlannedSession / CoachSession | `[sessionId]` |
| Atleta / Usuario genérico | `[id]` (solo en `athlete/[id]/` o `users/[id]/`) |
| Ejercicio de gym | `[id]` (solo en `exercises/[id]/`) |
| Rutina de gym | `[id]` (solo en `routines/[id]/`) |
| Semana del plan | `[weekId]` |

**Regla de oro:** antes de crear una nueva ruta bajo un path dinámico existente, revisar con `Glob` los siblings para verificar que el slug coincide. Si hay conflicto, renombrar el nuevo para que iguale al existente.

## Skills — decisión autónoma del agente

El agente evalúa cada tarea y decide qué skills cargar. No espera instrucción explícita.

**Skills disponibles y cuándo son relevantes:**

- `react-native-architecture` — cualquier tarea que toque MEDALIQ-MOBILE, Expo, React Native, NativeWind, SecureStore, EAS
- `prisma-development` — schema, migrations, queries, transacciones, relaciones en DB
- `feature-dev` — features nuevas con impacto en múltiples capas (web + mobile + API)
- `frontend-design` — pantallas nuevas, rediseños, componentes UI
- `code-review` — antes de mergear cambios, validación de implementación
- `simplify` — deuda técnica, campos muertos, código duplicado

**Regla de oro**: si la tarea afecta mobile → `react-native-architecture`. Si toca la DB → `prisma-development`. Ambos pueden activarse juntos si la tarea toca las dos capas.

## Qué es
SaaS de coaching deportivo con AI para LatAm. Cubre recomposición corporal, metas de carrera (cualquier deporte) y entrenadores con atletas. El "cerebro" es un AI coach que hace intake personalizado por deporte, genera planes periodizados y los ajusta según datos reales.

## Stack
- Next.js 16 App Router + TypeScript + PostgreSQL + **Prisma 7**
- Tailwind CSS v4 + shadcn/ui
- Auth.js v5 (next-auth@beta) — estrategia JWT
- Claude API (Anthropic) — Haiku para plan, Sonnet para coach chat
- pnpm · bcryptjs
- Neon (PostgreSQL serverless) — pooler para runtime, direct URL para migraciones

## Stack Mobile (futuro — Fase 16)
- **React Native + Expo (managed workflow)** — iOS + Android desde un solo codebase TypeScript
- **EAS Build + EAS Submit** — builds en la nube, publicación automatizada a App Store y Google Play
- **EAS Update** — OTA updates sin pasar por review de store (cambios JS/UI)
- **Monorepo pnpm**: `apps/web` (Next.js actual) + `apps/mobile` (Expo) + `packages/shared-types` + `packages/api-client`
- Dispositivos: `react-native-ble-plx` (HRM Bluetooth), `@react-native-health/health` (HealthKit + Health Connect)
- Integraciones fitness: Strava OAuth, Garmin Connect API, Polar Flow API
- Offline-first: `expo-secure-store` para tokens, `AsyncStorage` para sessions de gym pendientes de sync
- NativeWind (Tailwind en RN) para consistencia visual con web

## Repositorio
- GitHub: `git@github.com:matenciac14/Medaliq.git`
- Branch principal: `main`

## Schema — migraciones aplicadas y planificadas

### ✅ APLICADA: `add_session_intensity` (20260604)
```prisma
// PlannedSession — campo aplicado en DB
intensity  SessionIntensity @default(MODERATE)

enum SessionIntensity { HIGH | MODERATE | LOW | REST }
```
- generator.ts auto-asigna intensity según SessionType ✅
- daily-target.ts mapea intensity → kcal+macros del día ✅

### ✅ APLICADA: `add_invite_codes` (20260607)
```prisma
model InviteCode {
  id, code (unique), coachId, usedBy?, usedAt?, expiresAt, createdAt
}
```
- /api/coach/invite persiste código 7 días en DB ✅
- /api/invite/[code] valida y redime ✅
- /join/[code] UI client component completo ✅

### Pendiente: `sport_label`
```prisma
// PlannedSession — etiqueta libre por deporte
sportLabel String?   // "Sweet Spot 2×20min", "CSS 400m × 8"
```

### Migración: `performance_benchmarks`
```prisma
model PerformanceBenchmark {
  id        String   @id @default(cuid())
  userId    String
  coachId   String?
  sport     String   // RUNNING | STRENGTH
  metric    String   // 5K_TIME | 1RM_SQUAT | etc.
  value     Float
  unit      String   // seconds | watts | kg
  testedAt  DateTime
  notes     String?
  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Migración: `coach_athlete_protocol`
```prisma
// CoachAthlete — agrega campos para relación profesional
coachGoal    String?
privateNotes String?
status       AthleteStatus @default(ACTIVE)

enum AthleteStatus { ACTIVE  PAUSED  COMPLETED }
```

## Training-Nutrition Sync — arquitectura

La nutrición es un espejo del entrenamiento. Fuente canónica: `src/lib/nutrition/daily-target.ts`
```
PlannedSession.intensity → target nutricional del día

getDailyNutritionTarget(intensity, plan):
  HIGH     → targetKcalHard   + carbsHardG
  MODERATE → targetKcalEasy   + carbsEasyG
  LOW      → targetKcalEasy*0.88 + carbsEasyG*0.75
  REST     → targetKcalRest   + carbsEasyG*0.6    ← NOTA: nutrition/page usa *0.7
  (sin sesión) → REST target

intensityToDayType(intensity) → 'hard' | 'easy' | 'rest'  [src/lib/nutrition/day-type.ts]
getSessionIntensity(type) → intensity                       [src/lib/plan/intensity.ts]
```
**Inconsistencia conocida:** `daily-target.ts` usa `carbsEasyG * 0.6` para REST;
`nutrition/page.tsx` y `calculate-food-log.ts` usan `* 0.7`. Pendiente unificar a 0.7.

- Dashboard atleta: sesión del día + kcal objetivo + macros + label de carga
- Coach: Tab Plan muestra carga semanal (HIGH=3, MODERATE=2, LOW=1, REST=0)

## Flujos de referencia
Ver `FLOWS.md` para diagramas completos de todos los flujos del producto.

---

## Prisma 7 — diferencias críticas
- Generator: `prisma-client` (no `prisma-client-js`) con `output = "../src/generated/prisma"`
- Import: `from '../../generated/prisma/client'` (NO `@prisma/client`)
- `url` va en `prisma.config.ts`, `directUrl` va en `schema.prisma` (no en prisma.config.ts)
- Requiere adapter: `new PrismaPg({ connectionString })` de `@prisma/adapter-pg`
- Seed se configura en `prisma.config.ts → migrations.seed`, no en `package.json`

## Auth.js v5 + Edge Runtime
- `src/auth.config.ts` — config SIN Prisma, usada en middleware (Edge-safe)
- `src/auth.ts` — config completa con PrismaAdapter, usada en server components y API routes
- Middleware importa de `auth.config.ts`, nunca de `auth.ts`
- JWT contiene: `id`, `role`, `onboardingCompleted`, `activated` (=features.plan), `userPlan`
- `trialEndsAt` NO existe en JWT — no hay check de trial en middleware

## UserConfig — patrón central
Cada `User` tiene un campo `config Json` en DB que controla toda su experiencia.
Tipo en `src/lib/config/user-config.ts`:
```ts
type UserConfig = {
  features: {
    plan, checkin, nutrition, progress, log, coach, gym  // feature flags
    aiPlan: boolean    // acceso a generación AI de plan (PRO)
    aiCoach: boolean   // acceso a AI chat (PRO)
  }
  sport: { type, goal }
  plan: { activePlanId, currentWeek, totalWeeks, phase }
  onboarding: { completed, completedAt }
  // NO existe campo 'trial' — el tier se deriva de features
  ai: { monthlyLimit, messagesThisMonth, messagesResetAt }
  preferences: { language, units, notifications }
}
```
- `getUserPlan(features)` → 'PRO' si `features.aiPlan || features.aiCoach`, 'FREE' sino
- Trial = activar `aiPlan: true`, `aiCoach: true`, `monthlyLimit: 999999`
- Al completar onboarding B2C: features todas activadas incluyendo aiPlan/aiCoach
- Post-downgrade Free: features.plan/checkin/nutrition/progress/aiPlan/aiCoach = false
- `parseUserConfig(raw)` — merge con DEFAULT_USER_CONFIG (features.plan: true por defecto)

## Middleware — protección de rutas
Verificado contra `src/middleware.ts`:
- Sin auth → `/login`
- Onboarding incompleto + NO api → `/onboarding`
- ATHLETE + onboardingCompleted + !activated (features.plan=false) → `/pending` (B2B)
- ADMIN → siempre `/admin`
- COACH + `/dashboard` → `/coach/dashboard`
- `/coaches`, `/p/*`, `/join/*` → públicas
- `/admin/*` → solo ADMIN
- `/coach/*` → solo COACH
- **NO hay check de trial expirado en middleware** — upgrade logic está inline en páginas

## Onboarding — flujo multi-deporte
Archivo principal: `src/app/onboarding/page.tsx` (self-contained, sin imports de _steps/)
Tipos: `src/app/onboarding/_types.ts` — WizardData, INITIAL_DATA, getSteps(), StepId

### Campos de routing (WizardData)
- `healthGoal: HealthGoal` — `'WEIGHT_LOSS' | 'MUSCLE_GAIN' | 'FITNESS' | 'RECOMPOSITION' | 'FREE'`
- `hasSport: boolean` — si practica un deporte actualmente
- `mainGoal: MainGoal` — **derivado** en `handleGenerate()` antes de enviar a la API, no elegido directamente por el usuario

### Flujo de pasos `getSteps(data)` — dinámico según selección:
```
FREE:
  health-goal → physical → generating

Con deporte (hasSport=true):
  health-goal → has-sport → sport-select → sport-details → physical → hr-fitness → schedule → health → plan-method → generating

Sin deporte + MUSCLE_GAIN:
  health-goal → has-sport → physical → plan-method → generating

Sin deporte + (WEIGHT_LOSS | FITNESS | RECOMPOSITION):
  health-goal → has-sport → physical → hr-fitness → schedule → health → plan-method → generating
```

### Derivación de mainGoal en handleGenerate():
```ts
healthGoal='FREE'          → mainGoal='FREE'
hasSport=true              → mainGoal='SPORT'
MUSCLE_GAIN sin deporte    → mainGoal='GYM'
otros sin deporte          → mainGoal='BODY'
```

### Detalles por deporte (sport-details):
| Deporte | Campos requeridos | Campos opcionales |
|---------|-------------------|-------------------|
| RUNNING | raceDistance | raceDate, targetTime, recentBestTime |
| STRENGTH | strengthStyle | — |

**Scope actual: solo RUNNING + STRENGTH.** CYCLING, SWIMMING, TRIATHLON, FOOTBALL eliminados de UI. Schema DB intacto para datos históricos.

### FC (step hr-fitness):
- RUNNING: pide hrSource (known/estimated) + hrMax
- STRENGTH: solo pide experienceLevel, sin FC

### Regla crítica isLastDataStep:
```js
const isLastDataStep = steps[stepIndex + 1] === 'generating'
// NO usar: stepIndex === steps.length - 2 (BUG — steps array crece dinámicamente)
```

## Cerebro AI — cómo genera planes

### Templates disponibles (`src/lib/plan/templates.ts`):
| Template | GoalType | Semanas | Fases |
|----------|----------|---------|-------|
| HALF_MARATHON_18W | RACE_HALF_MARATHON, RACE_MARATHON | 18 | BASE→DESARROLLO→ESPECÍFICO→AFINAMIENTO |
| TEN_K_12W | RACE_10K | 12 | BASE→DESARROLLO→AFINAMIENTO |
| FIVE_K_8W | RACE_5K | 8 | BASE→ESPECÍFICO |
| BODY_RECOMPOSITION_16W | BODY_RECOMPOSITION, STRENGTH_TRAINING | 16 | BASE→DESARROLLO→ESPECÍFICO→AFINAMIENTO |

† Fallback — estos deportes usan HALF_MARATHON_18W hasta tener templates propios.

### Flujo de generación (verificado — `src/domain/plan/generate-plan.use-case.ts`):
1. Selecciona template por goalType
2. Calcula hrMax: usa el dado por el usuario si > 100, sino estima con `211 - 0.64 × edad`
3. Calcula zonas FC: Karvonen si hrResting > 0, porcentaje simple si hrResting = 0
4. Calcula TDEE (Mifflin-St Jeor) + macros periodizados (hard/easy/rest)
5. **AI deshabilitada** (`AI_ONBOARDING_ENABLED = false`) → `recommendations = []` siempre
6. `$transaction(30s)`: deactivateUserPlans → createPlan → createWeeks → createSessions → upsertNutrition
7. Actualiza User.config: features (solo B2C), plan.activePlanId, sport, onboarding.completed

### AIProfile (admin configura en `/admin/ai`):
- Almacenado en `SystemConfig.aiProfile` (singleton en DB)
- Campos: `coachingPhilosophy`, `periodizationPrinciples`, `injuryProtocol`, `nutritionGuidelines`, `goalNotes`
- Usado SOLO en AI Coach chat — NO en generación de planes (AI_ONBOARDING_ENABLED=false)
- Editable por admin sin deploy

### Chat AI (`/api/ai/chat`):
- Rate limit: 20 msgs/min por usuario
- Feature gate: `features.aiCoach` (false → 402)
- Monthly limit: `ai.monthlyLimit` en User.config (0=FREE, 100=PRO, 999999=trial activo)
- System prompt = `buildChatSystemPrompt(aiProfile)` + `buildAthleteContext(user)`
- Streaming SSE, modelo Sonnet por defecto (`getAIConfig().chatModel`)
- Al finalizar stream: actualiza `ai.messagesThisMonth` (fire-and-forget)

## Feature gating por tier (implementación real)

El tier se deriva de `features.aiPlan || features.aiCoach` → no hay campo `trial` explícito.

| Feature | DEFAULT/FREE | B2C onboarding completo | PRO (pago) |
|---------|-------------|------------------------|------------|
| Dashboard | ✅ | ✅ | ✅ |
| Log manual | ✅ | ✅ | ✅ |
| Plan / Check-in / Nutrición / Gym | ✅ (default true) | ✅ | ✅ |
| AI Plan generation | ❌ | ✅ (aiPlan=true) | ✅ |
| AI Coach chat | ❌ (limit=0) | ✅ (limit=999999) | ✅ (limit=100) |

- Paywalls inline en páginas para usuarios que perdieron acceso (post-downgrade)
- Sidebar oculta links según `features.*` del JWT (primera capa de defensa)
- Gating real: API routes verifican `features.aiCoach` / `monthlyLimit` antes de llamar Anthropic

- Paywalls implementados a nivel de página en todas las rutas Pro
- Sidebar oculta links según `features.*` (primera capa de defensa)
- Downgrade route desactiva: plan, checkin, nutrition, progress, gym, coach

## Flujos de usuario — críticos

### Atleta B2C (sin coach) — VERIFICADO
1. Registro → onboarding multi-deporte → completeOnboardingUseCase → generatePlanUseCase → `/dashboard`
2. Onboarding completo activa: features.plan/checkin/nutrition/progress/log/gym/aiPlan/aiCoach = true
   ai.monthlyLimit = 999999 (acceso ilimitado a AI Chat)
3. AI en onboarding está DESHABILITADA (AI_ONBOARDING_ENABLED=false) — recommendations = []
4. Trial/upgrade: no hay lógica en middleware — se maneja inline en páginas

### Atleta B2B (del coach) — VERIFICADO
1. Coach crea atleta desde `/coach/clients/new`
2. Atleta hace onboarding → `completeOnboardingUseCase` detecta B2B vía `CoachAthlete` lookup
   → solo upsertProfile, onboarding.completed=true, SIN features activadas, SIN plan
3. Atleta → `/pending` (middleware: !activated porque features.plan=false)
4. Coach activa desde tab Resumen → `PATCH /api/coach/athlete/[id]/activate`
   → enableFeature(plan, checkin, nutrition, log, gym, progress)
5. Coach crea plan → `POST /api/coach/athlete/[id]/plan`
   → generatePlanUseCase({ generatedBy: 'COACH' }) — sin AI, sin activar features adicionales

### Generador de planes — VERIFICADO
- `generatedBy: 'COACH'` → `isB2C = false` → no activa features, no genera AI recs
- `generatedBy: 'AI'` (default) → `isB2C = true` → activa features, AI recs deshabilitadas hoy
- `src/lib/plan/generator.ts` es thin adapter → delega a `domain/plan/generate-plan.use-case.ts`
- Única enum válida en DB: `PlanSource { AI | COACH | AI_COACH_APPROVED }` — 'TEMPLATE' no existe

### Post-onboarding redirect — VERIFICADO
- API devuelve `{ isB2B }` en respuesta
- `handleGenerate()`: `router.push(isB2B ? '/pending' : '/dashboard')`
- Para B2B: middleware confirma !activated → `/pending`
- Para B2C: features activadas en DB → siguiente request ya tiene acceso

## HealthProfile — campos deportivos
Migración `add_sport_fields_to_health_profile` aplicada:
- `sport String?` — deporte principal (RUNNING | STRENGTH) — otros valores históricos existen en DB pero ya no se crean
- `experienceLevel String?` — BEGINNER | INTERMEDIATE | ADVANCED
- `ftp Int?` — Functional Threshold Power (ciclismo/triatlón)
- `sportDetails Json` — campos específicos del deporte (raceDistance, cyclingModality, swimStroke, etc.)
- `dataSources Json` — origen de cada dato: `{ hrMax: { source: 'manual'|'estimated', updatedAt: '' } }`

## Estructura de rutas
```
src/app/
  (athlete)/
    dashboard/page.tsx
    plan/page.tsx           ← paywall si userPlan === 'FREE'
    checkin/page.tsx
    nutrition/page.tsx      ← paywall si userPlan === 'FREE'
    progress/page.tsx
    log/page.tsx
    gym/page.tsx
    gym/session/page.tsx
    gym/history/page.tsx
  coach/
    dashboard/page.tsx
    athlete/[id]/page.tsx           ← 5 tabs: Resumen, Plan, Progreso, Nutrición, Gym
    athlete/[id]/plan/build/page.tsx ← constructor visual de planes (página separada)
    gym/page.tsx + exercises + routines/new + routines/[id]/assign
    profile/page.tsx
    clients/new/page.tsx
    plan/[id]/review/page.tsx
    invite/page.tsx
    settings/page.tsx
  admin/
    page.tsx (KPIs)
    users/page.tsx
    activaciones/page.tsx
    ai/page.tsx             ← editor AIProfile (filosofía, restricciones)
    coaches/page.tsx
    subscriptions/page.tsx
    roadmap/page.tsx
    settings/page.tsx
  upgrade/page.tsx          ← cuando trial expira
  coaches/page.tsx          ← directorio público
  p/[slug]/page.tsx         ← perfil coach público
  p/ai-coach/page.tsx       ← perfil AI Coach público
  onboarding/page.tsx       ← wizard multi-deporte (self-contained)
  onboarding/_types.ts      ← WizardData, INITIAL_DATA, getSteps()
  api/
    auth/[...nextauth]/
    auth/register/
    onboarding/generate/    ← POST: upsert HealthProfile + generatePlan
    checkin/
    log/session/
    ai/chat/                ← POST stream: AIProfile + AthleteContext
    admin/ai-profile/       ← GET/PATCH: SystemConfig.aiProfile
    admin/users/[id]/plan/  ← PATCH: activación manual
    upgrade/downgrade/      ← GET: downgrade a Free
    coach/invite/
    coach/join/
    coach/plan/[planId]/approve/
    coach/profile/
    coach/programs/
    coach/posts/
    coach/clients/create/
    coach/athlete/[id]/activate/        ← PATCH: activa atleta B2B
    coach/athlete/[id]/plan/            ← POST: genera plan sin AI (B2B) — template
    coach/athlete/[id]/plan/custom/     ← POST: crea plan desde constructor visual
    coach/athlete/[id]/benchmarks/      ← GET/POST: PerformanceBenchmark del atleta
    coach/plan/[planId]/sessions/       ← POST: agrega sesión a plan existente
    coach/plan/[planId]/week/[weekId]/  ← PATCH: edita metadata de semana
    coach/sessions/[id]/                ← PATCH + DELETE: edita/elimina sesión
    coach/gym/exercises/
    coach/gym/routines/
    coach/gym/routines/[id]/assign/
    coach/gym/athlete/[id]/logs/
    gym/session/today/
    gym/session/complete/
    gym/session/[id]/
```

## Base de datos — Neon (producción)
- `DATABASE_URL` — pooler URL para runtime/queries
- `DIRECT_URL` — direct URL para migraciones
- Migraciones aplicadas: `init`, `add_user_config`, `gym_feature`, `marketplace`, `add_coach_note_to_planned_session`, `add_system_config`, `add_sport_fields_to_health_profile`
- Seed: `pnpm prisma db seed` → 39 ejercicios globales + usuarios de prueba
- Usuarios seed:
  - `admin@medaliq.com` / `admin123!` — ADMIN
  - `coach@medaliq.com` / `coach123` — COACH
  - `miguel@medaliq.com` / `atleta123` — ATHLETE con plan + coach
  - `ana@medaliq.com` / `atleta123` — ATHLETE B2C sin coach

## Estado actual (verificado 2026-06-23)

### Completado ✅
- Fases 1-9: Auth, onboarding multi-deporte, plan AI, dashboard atleta, check-in, nutrición, progreso, gym, coach B2B, marketplace, admin, deploy
- Fase 17: SessionIntensity enum + daily-target.ts + training-nutrition sync
- Fase 18 (parcial): APIs constructor visual + editor sesión inline + calendar strip UX
- Fase 19 (parcial): PerformanceBenchmark API + migración aplicada
- Fase 20: Infraestructura — índices DB, rate limiting async, Vercel maxDuration 60s, pool explícito, cache SystemConfig
- Fase 21: Consolidación coach — clients/check, clients/link, /coach/clients/new email-first, /coach/invite conectada
- Fase 22 (parcial): FoodLog API (web + mobile), FoodSetupFlow mobile, food tracking mobile
- Fase 24 (parcial): Quick log, streak, adherencia %, gráficas SVG en /progress
- Mobile QA: 15 bugs críticos corregidos (hooks, UpgradeWall, onboarding, upgrade screen)
- Hexagonal arch: check-in use case + repos completos, plan repository
- SetLog.workoutExerciseId nullable + exerciseName (historial seguro al editar rutinas)
- normalizeMealPlan() — soporta formato AI y formato constructor coach en NutritionContent
- selectActivePlan() — utilidad compartida dashboard/plan page
- intensityToDayType() con 'low' DayType para sesiones LOW
- Timezone bug nutrición corregido (weekNumber+dayOfWeek vs UTC range)
- Adherencia coach dashboard corregida (excluye sesiones futuras)

### P0 — Bloquea revenue o es riesgo legal (HACER PRIMERO)
- [ ] **[SEGURIDAD CRÍTICA]** `tempPassword` en JSON plaintext — `/api/coach/clients/create` y `/reset-password` → usar token de reset firmado, nunca la contraseña
- [ ] Feature gating ausente en 4 endpoints mobile PRO: `/mobile/nutrition/log`, `/mobile/progress`, `/mobile/gym/week`, `/mobile/nutrition/generate-meals`
- [ ] Stripe/Wompi: suscripción Pro $15/mes + webhook activa tier
- [ ] `features.*` ausentes en `MobileTokenPayload` → client mobile ciego a su tier

### P1 — Bugs confirmados que rompen flujos
- [ ] AI Haiku dentro de `$transaction` del generador (generator.ts ~line 485) → mover ANTES de abrir la tx
- [ ] `applyPlanAdjustments` race condition vs edición coach (sin lock) → timestamp de edición
- [ ] Onboarding B2B sin transacción → `healthProfile.upsert` + `user.update` en `$transaction`
- [ ] Off-by-one fecha de sesión coach: `/api/coach/plan/[planId]/sessions` → `dayOfWeek - 1`
- [ ] `applyPlanAdjustments` ignora Z1 → agregar `Z1 → 'DESCANSO'` al zoneMap
- [ ] Onboarding mobile B2B + GYM salta detección B2B → mover `isB2B` check antes de mainGoal

### P2 — Deuda técnica y calidad
- [ ] Tests E2E: flujo B2B completo, invite code, generación de plan
- [ ] `CheckInClient.tsx` 662 líneas → dividir en 3 componentes
- [ ] Paginación panel atleta coach (90 sesiones en 1 query → semana actual ±2)
- [ ] `FoodSetupFlow` — 19 alimentos hardcodeados → fetchear `/api/nutrition/foods`
- [ ] `FoodLog` sin unicidad → `@@unique([userId, foodId, date, mealType])`
- [ ] `TrainingPlan` sin `UNIQUE(userId, status=ACTIVE)` → posibles 2 planes activos
- [ ] `GymSession` sin `UNIQUE([athleteId, date, assignedWorkoutId])`
- [ ] 11 endpoints mobile sin rate limiting por usuario
- [ ] `daily-target.ts:65` REST carbs `*0.6` → unificar a `*0.7`
- [ ] Race condition feature toggles coach → loading state por feature individual

### P3 — Mejoras de producto
- [ ] Medidas corporales en check-in (waist, arms, hips, legs) — migración DB + UI
- [ ] Fotos de progreso — Vercel Blob + ProgressPhoto model
- [ ] Récords personales gym (isPR detection en SetLog)
- [ ] Resumen semana determinista en dashboard (sin AI)
- [ ] Fallback plan de comidas sin AI (plantillas estáticas)
- [ ] `sportLabel String?` en PlannedSession — migración pendiente
- [ ] `AthleteStatus.COMPLETED` — enum incompleto, migración pendiente
- [ ] Email transaccional (Resend): welcome, activación B2B, trial expirando
- [ ] Forgot password (web + mobile)
- [ ] `CoachAthlete` sin `onDelete: Cascade` — huérfanas si se elimina coach

## Modelo de negocio — definitivo

### Atletas
| Tier | Precio | Qué incluye |
|------|--------|-------------|
| Trial | $0 — 30 días | Todo completo (plan AI, check-in, nutrición, AI chat, gym) |
| Free | $0 post-trial | Dashboard básico, log manual, sin AI, sin plan adaptativo |
| Pro | $15/mes | Plan adaptativo + check-in + nutrición + AI chat (100 msgs/mes) + gym |

### Coaches
| Asesorados directos | Fee a Medaliq |
|---------------------|---------------|
| 1 a 50 | $6/asesorado activo/mes |
| 51 a 100 | $5/asesorado activo/mes + AI assistant gratis |
| +100 | $3/asesorado activo/mes + AI assistant gratis |

## Arquitectura — Hexagonal (Ports & Adapters)

Todo código **nuevo** sigue esta estructura. El código existente en `src/lib/` no se toca — solo se migra cuando hay una razón funcional (bug, refactor solicitado).

### Capas y responsabilidades

```
src/
  domain/                        ← lógica de negocio PURA
    plan/
      generate-plan.use-case.ts  ← orquesta generación (nueva lógica va aquí)
      adjust-plan.use-case.ts    ← ajustes por check-in
      plan.types.ts              ← TrainingPlan, PlanWeek, PlannedSession (tipos de dominio)
    checkin/
      process-checkin.use-case.ts
      checkin.types.ts
    nutrition/
      calculate-targets.use-case.ts
    athlete/
      athlete.types.ts
    ports/                       ← interfaces (contratos que la infra debe cumplir)
      plan.repository.ts         ← IPlanRepository { findById, create, update }
      athlete.repository.ts      ← IAthleteRepository
      ai.service.ts              ← IAIService { generateRecommendations, chat }
      notification.service.ts    ← INotificationService { send }

  infrastructure/                ← implementaciones de los ports
    db/
      prisma-plan.repository.ts  ← implements IPlanRepository con Prisma
      prisma-athlete.repository.ts
    ai/
      anthropic.service.ts       ← implements IAIService con Claude API
    email/
      resend.service.ts          ← implements INotificationService (futuro)

  lib/                           ← utilidades puras existentes — NO TOCAR
    plan/formulas.ts             ← ya cumple: funciones puras sin side effects
    plan/templates.ts
    plan/generator.ts            ← legado: migrar gradualmente a domain/plan/
    ai/profile.ts
    config/user-config.ts
    nutrition/daily-target.ts

  app/                           ← capa de entrega (Next.js)
    api/                         ← rutas DELGADAS: auth → validate → use case → respond
                                    Si una ruta supera 40 líneas, la lógica va al dominio
    (athlete)/                   ← UI: Server Components para data, Client para interacción
    coach/
    admin/
```

### Reglas de capas — OBLIGATORIO para código nuevo
1. `domain/` nunca importa de `infrastructure/`, `app/`, Prisma, ni Next.js
2. `app/api/` nunca escribe lógica de negocio — solo llama use cases
3. Use cases reciben ports como parámetros (inyección de dependencias simple)
4. Errores se lanzan desde el dominio, se capturan en la ruta
5. Un use case = un archivo = una responsabilidad

### Ejemplo de ruta correcta (< 25 líneas)
```ts
// app/api/plan/generate/route.ts
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return unauthorized()

  const body = await req.json()
  const validated = GeneratePlanSchema.safeParse(body)
  if (!validated.success) return badRequest(validated.error)

  const result = await generatePlanUseCase({
    input: validated.data,
    athleteId: session.user.id,
    planRepo: new PrismaPlanRepository(),
    aiService: new AnthropicService(),
  })

  return NextResponse.json(result)
}
```

## Lógica de negocio existente (legado — no tocar sin razón)
- `src/lib/plan/formulas.ts` — Karvonen HR zones, Mifflin-St Jeor TDEE, Riegel race time
- `src/lib/plan/templates.ts` — 4 templates base (RUNNING: 5K/10K/HM, STRENGTH: BODY_RECOMPOSITION)
- `src/lib/plan/generator.ts` — selecciona template, llama Haiku (solo B2C), guarda en DB
- `src/lib/ai/profile.ts` — AIProfile type, defaults, buildPlanSystemPrompt, buildChatSystemPrompt
- `src/lib/config/user-config.ts` — UserConfig type, parseUserConfig, helpers por rol

## Reglas del producto
- AI NO puede medicar ni diagnosticar — solo coaching deportivo
- Banderas rojas médicas → escalar, no continuar el flujo
- Multi-tenant: siempre `where: { userId }` o `where: { athleteId }`
- Planes son vivos (se ajustan por check-in), no PDFs estáticos
- `dataSources` JSON en HealthProfile rastrea origen de datos para futuras integraciones (Strava, Garmin)

## Ver reglas globales
~/.claude/CLAUDE.md
