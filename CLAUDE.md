# Medaliq

## Nomenclatura de branches — OBLIGATORIO

Toda branch debe seguir este patrón exacto o el push será bloqueado:

```
feature/[n]-descripcion-kebab-case    # nueva funcionalidad
bugfix/[n]-descripcion-kebab-case     # corrección de bug
chore/descripcion-kebab-case          # docs, config, dependencias, refactor
hotfix/[n]-descripcion-kebab-case     # fix urgente directo a producción
```

**Ejemplos válidos:**
```
feature/1-registro-coach
feature/2-emails-bienvenida
bugfix/1-timezone-nutricion
chore/branch-naming-convention
hotfix/1-fix-login-crash
```

**Regla para agentes:** antes de crear cualquier branch, verificar que el nombre cumple el patrón. Nunca usar nombres genéricos como `fix`, `update`, `test`, `atleta-dashboard`.

---

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

## Filosofía de producto

### Quién usa el producto y quién paga
- **Coach**: cliente pagador. Gestiona atletas, crea planes, cobra honorarios. Su experiencia tiene prioridad en features de gestión.
- **Atleta**: usuario final. Llega por invitación del coach (B2B) o por registro directo (B2C). Ejecuta el plan en mobile.
- **El coach es el canal de distribución**: sin coaches no hay atletas. Features que facilitan al coach incorporar y retener atletas son P0.

### Principios de diseño del producto
- **Mobile-first para atletas**: los atletas viven en la app mobile. Cualquier feature de atleta requiere versión mobile antes de considerarse completa.
- **Simplicidad sobre features**: un flow de 2 pasos es mejor que uno de 4 con más opciones. Ante la duda, hacer menos pero mejor.
- **Planes vivos, no PDFs**: el plan se ajusta automáticamente según check-ins reales. Nunca es un documento estático descargable.
- **AI como asistente, no como protagonista**: la AI apoya al coach y al atleta, no los reemplaza. El coach siempre puede sobreescribir cualquier decisión de la AI.

### Idioma y mercado
- **UI siempre en español**: toda copia de interfaz, mensajes de error, labels y notificaciones van en español. Nunca inglés en texto visible al usuario.
- **LatAm**: contexto cultural colombiano/latinoamericano. Monedas: COP, USD, MXN, ARS. Timezone: América/Bogotá como referencia.

### Guardrails de AI
- La AI **NO puede medicar ni diagnosticar**. Solo coaching deportivo y nutricional general.
- Ante banderas rojas médicas (dolor agudo, síntomas de lesión grave) → escalar al coach o médico, nunca continuar el flujo AI.
- El coach siempre revisa y aprueba los planes generados por AI antes de que el atleta los ejecute (flujo B2B).

## Stack
- Next.js 16 App Router + TypeScript + PostgreSQL + **Prisma 7**
- Tailwind CSS v4 + shadcn/ui
- Auth.js v5 (next-auth@beta) — estrategia JWT
- Claude API (Anthropic) — Haiku para plan, Sonnet para coach chat
- pnpm · bcryptjs
- Neon (PostgreSQL serverless) — pooler para runtime, direct URL para migraciones

## Stack Mobile
React Native + Expo managed workflow — ver `MEDALIQ-MOBILE/CLAUDE.md` para detalle.

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

Ver `FLOWS.md` para todos los flujos del sistema con detalle de implementación.

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
    finanzas/page.tsx       ← KPIs + form + filtros + lista de pagos (PENDING/PAID/OVERDUE)
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
    coach/payments/                     ← GET (auto-OVERDUE) + POST: pagos coach
    coach/payments/[paymentId]/         ← PATCH (marcar PAID) + DELETE
    gym/session/today/
    gym/session/complete/               ← devuelve newPRs[] con isPR detection
    gym/session/[id]/
```

## Base de datos — Neon (producción)
- `DATABASE_URL` — pooler URL para runtime/queries
- `DIRECT_URL` — direct URL para migraciones
- Migraciones aplicadas: `init`, `add_user_config`, `gym_feature`, `marketplace`, `add_coach_note_to_planned_session`, `add_system_config`, `add_sport_fields_to_health_profile`
- Modelos añadidos vía `db push`: `Payment` (PaymentStatus enum), `SetLog.isPR`, `CoachAthlete onDelete:Cascade`
- Seed: `pnpm prisma db seed` → 39 ejercicios globales + usuarios de prueba
- Usuarios seed:
  - `admin@medaliq.com` / `admin123!` — ADMIN
  - `coach@medaliq.com` / `coach123` — COACH
  - `miguel@medaliq.com` / `atleta123` — ATHLETE con plan + coach
  - `ana@medaliq.com` / `atleta123` — ATHLETE B2C sin coach

Ver `BACKLOG.md` para estado actual, bugs, prioridades y modelo de negocio.

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
