# Medaliq — Architecture

> **Para quién es este documento**: ingenieros nuevos que necesitan entender el sistema antes de tocar código.
> No duplica reglas de negocio (→ `domains/`), schema DB (→ `CLAUDE-SCHEMA.md`), ni flujos de actor (→ `domains/flujos-por-actor.md`).
> Responde tres preguntas: **cómo está organizado**, **cómo fluye un request**, y **dónde toco qué**.
>
> También sirve como checklist de referencia en auditorías de código — cada sección tiene una tabla de gaps conocidos y criterios de evaluación.

---

## 1. Qué es el sistema

SaaS de coaching deportivo con dos canales de entrega sobre la misma API y la misma DB:

```
medaliq.com (Next.js web)
    └── Panel atleta  → /dashboard /plan /checkin /nutrition /gym /progress /log
    └── Panel coach   → /coach/*
    └── Panel admin   → /admin/*
    └── Público       → / /p/[slug] /coaches /join/[code]

App mobile (React Native + Expo)   [repo separado: MEDALIQ-MOBILE]
    └── Consume /api/mobile/* exclusivamente
```

Tres actores: **Atleta** (usa la app móvil a diario), **Coach** (gestiona desde la web), **Admin** (opera la plataforma).

Dos modos de atleta que conviven:
- **B2C** — se registra solo, paga si quiere inteligencia adaptativa (Pro $9.99/mes)
- **B2B** — el coach lo invita, acceso completo incluido en el tier del coach ($0 para el atleta)

---

## 2. Estructura de carpetas

```
src/
├── app/                        ← Capa de entrega (Next.js App Router)
│   ├── (athlete)/              ← Grupo de rutas del atleta (layout propio)
│   ├── coach/                  ← Panel del coach
│   ├── admin/                  ← Panel de admin
│   ├── api/                    ← API REST (web + mobile)
│   │   ├── mobile/             ← Endpoints exclusivos de la app mobile
│   │   ├── coach/              ← Endpoints del panel coach
│   │   ├── admin/              ← Endpoints de admin
│   │   ├── cron/               ← Jobs programados (Vercel Crons)
│   │   └── webhooks/           ← Strava, pagos
│   └── _components/            ← Componentes compartidos entre portales
│
├── domain/                     ← Lógica de negocio pura (sin Prisma, sin Next.js)
│   ├── check-in/               ← Reglas del check-in semanal y ajustes
│   ├── plan/                   ← Generación y construcción de planes
│   ├── gym/                    ← Sesiones de gym, sets, PRs
│   ├── nutrition/              ← Cálculo de macros, ajuste por intensidad
│   ├── dashboard/              ← Resumen diario del atleta
│   ├── billing/                ← Checkout, downgrade, tiers
│   ├── admin/                  ← WAU, retención, finanzas, alertas (funciones puras)
│   ├── subscription/           ← Feature flags por tier
│   ├── onboarding/             ← Completar onboarding, defaults
│   ├── exercise/               ← Sync con WorkoutX
│   ├── wearables/              ← Crear sesión desde Strava
│   └── ports/                  ← Interfaces (contratos) que el dominio define
│
├── infrastructure/             ← Implementaciones de los ports (adapters)
│   ├── db/                     ← Repositorios Prisma (uno por entidad)
│   ├── billing/                ← Gateway de pago (stub hoy, Wompi/Stripe futuro)
│   ├── email/                  ← Resend (emails transaccionales)
│   ├── exercise-sync/          ← Cliente WorkoutX
│   ├── food/                   ← Cliente Open Food Facts
│   └── wearable/               ← Cliente y mapper de Strava
│
├── lib/                        ← Utilidades compartidas (sin lógica de negocio)
│   ├── db/prisma.ts            ← Singleton del cliente Prisma (PrismaPg + Neon)
│   ├── mobile-auth.ts          ← JWT mobile (jose) — firmar y verificar
│   ├── rate-limit.ts           ← Rate limiter (Upstash Redis en prod, in-memory en dev)
│   ├── guards/feature-gate.ts  ← requireFeature() → 402 si feature inactiva
│   ├── api/responses.ts        ← Helpers: ok(), unauthorized(), badRequest(), serverError()
│   ├── config/user-config.ts   ← Tipo UserConfig, getUserPlan(), parseUserConfig()
│   ├── core/                   ← Fórmulas puras (Karvonen, Mifflin-St Jeor, semanas ISO)
│   ├── plan/                   ← Templates de plan, formulas HR, generador de sesiones
│   ├── nutrition/              ← Target diario, tipo de día, intensidad
│   ├── labels/                 ← Labels UI de enums DB
│   └── i18n/                   ← Traducciones (es/en/pt)
│
├── components/                 ← Componentes UI reutilizables (shadcn/ui base)
├── auth.ts                     ← Auth.js v5 — providers, JWT callbacks, session
├── auth.config.ts              ← Configuración base de Auth.js
├── middleware.ts               ← Guards de ruta: roles, onboarding, B2B pending
└── types/next-auth.d.ts        ← Extensión de tipos del JWT de Auth.js
```

### Regla de capas — no negociable

```
domain/     NO importa nada de infrastructure/, app/, ni librerías externas (Prisma, Next.js)
            Solo TypeScript puro + tipos del proyecto

infrastructure/  NO contiene lógica de negocio
                 Solo traduce entre el dominio y el mundo exterior (DB, APIs, email)

app/api/    Máx ~25–40 líneas por handler
            Flujo: auth → rate limit → validate → call use case → respond
            NO escribe lógica de negocio

lib/        Utilidades compartidas sin lógica de negocio
            Las fórmulas puras (Karvonen, etc.) SÍ pueden estar aquí si no dependen de DB
```

---

## 3. Flujo de un request — ejemplo real

### POST `/api/mobile/checkin` — el atleta envía su check-in semanal

```
App mobile
  │
  │  Authorization: Bearer <jwt_jose>
  ▼
src/app/api/mobile/checkin/route.ts          (app layer — capa de entrega)
  │  1. getMobileUser(req)                    → verifica JWT con jose
  │  2. rateLimitAsync(userId, { limit:100 }) → Upstash Redis
  │  3. mobileCheckInSchema.safeParse(body)   → Zod validation
  │  4. processCheckIn(input, { deps })       → llama al use case
  ▼
src/domain/check-in/process-check-in.use-case.ts   (domain layer)
  │  5. evaluateRules(checkInData, profile)   → reglas puras (RPE, peso, HR)
  │  6. Escribe check-in + ajustes en DB      → via repos inyectados
  │  7. generateSuggestions(triggers)         → sugerencias post check-in
  ▼
src/infrastructure/db/check-in.repository.ts        (infrastructure layer)
  │  8. prisma.$transaction([...writes])      → 3 fases: reads → I/O externo → writes
  ▼
Neon PostgreSQL
  │
  ▼
src/app/api/mobile/checkin/route.ts
  9.  sendPlanUpdatedEmail(...)               → fire-and-forget (no bloquea response)
  10. return ok({ adjustment, suggestions })  → NextResponse.json 200
```

### POST `/api/checkin` — mismo flujo desde la web

Idéntico excepto que el paso 1 usa `auth()` de Auth.js en lugar de `getMobileUser()`.

---

## 4. Sistema de autenticación — dos mecanismos independientes

El sistema tiene **dos sistemas de auth que NO son intercambiables**:

### Web — Auth.js v5 (JWT strategy)

```
Login (email+password o Google OAuth)
  │
  ▼
auth.ts → NextAuth JWT callback
  │  Lee User de DB + CoachAthlete para isB2B
  │  Firma JWT con AUTH_SECRET
  │  Payload: { id, role, status, onboardingCompleted, activated, isB2B,
  │             userPlan, features, needsRoleSelection, profileComplete }
  ▼
Cookie next-auth.session-token (httpOnly)
  │
  ▼
API routes web: const session = await auth()
                const userId = session.user.id  ← siempre de la sesión, nunca del body
```

### Mobile — JWT propio con jose

```
POST /api/mobile/auth/login
  │  Valida email+password contra DB
  │  Firma JWT con SignJWT (jose) usando el mismo AUTH_SECRET
  │  Payload: { id, email, name, role, status, features, ... }
  ▼
App guarda el token en SecureStore
  │
  ▼
Cada request: Authorization: Bearer <token>
  │
  ▼
API routes mobile: const mobile = await getMobileUser(req)
                   const userId = mobile.id  ← siempre del JWT, nunca del body
```

**Por qué dos sistemas:** Auth.js no soporta el patrón Bearer token que necesita React Native de forma nativa. Los tokens comparten el mismo `AUTH_SECRET` pero el proceso de verificación es distinto.

**Regla crítica:** nunca mezclar. Un endpoint `/api/mobile/*` que llame a `auth()` de Auth.js siempre devuelve null. Un endpoint web que espere `Authorization: Bearer` nunca lo recibirá.

### Middleware de rutas (web)

`src/middleware.ts` protege todas las rutas web con esta lógica en orden:

```
1. ¿Ruta pública?           → dejar pasar  (/, /login, /register, /p/*, /coaches, /api/*)
2. ¿Sin sesión?             → /login
3. ¿Status SUSPENDED/BLOCKED? → /login con mensaje
4. ¿needsRoleSelection?     → /select-role
5. ¿onboarding incompleto?  → /onboarding
6. ¿B2B sin activar?        → /pending
7. ¿Coach en ruta /coach?   → dejar pasar
8. ¿No-coach en ruta /coach? → /dashboard
9. ¿No-admin en /admin?     → /dashboard
10. ¿Admin en ruta no-admin? → /admin
```

---

## 5. Sistema de feature flags

Las features no son un JSON en DB — son **columnas Boolean en la tabla `User`**:

```
featurePlan | featureCheckin | featureNutrition | featureProgress | featureLog | featureCoach | featureGym
```

**Quién las lee:** se incluyen en el JWT al hacer login (web y mobile). El middleware y los componentes las leen del JWT — sin queries extra.

**Quién las activa:**
- Por defecto: todas `true` para ATHLETE, solo `featureCoach=true` para COACH
- Coach activa features de su atleta B2B: `PATCH /api/coach/athlete/[id]/config` → `mergeFeatures(patch)` en `IUserRepository`
- Admin activa manualmente: `PATCH /api/admin/users/[id]`

**Cómo se aplican:**
```ts
// En API routes mobile
const guard = requireFeature(mobile.features, 'checkin')
if (guard) return guard  // → 402 Payment Required

// En páginas web server components
if (!session.user.features.plan) redirect('/upgrade')

// En layouts (sidebar items)
features.gym === false → ocultar ítem Gym del menú
```

**Estado beta:** `getUserPlan()` en `user-config.ts` hardcodea `'PRO'` para todos hasta activar billing con Wompi. Las columnas existen y se respetan, pero la conversión Free→Pro no está conectada al pago real aún.

---

## 6. Patrón de API route — la plantilla

Todo nuevo endpoint debe seguir esta estructura:

```ts
// src/app/api/[resource]/route.ts
import { auth } from '@/auth'                       // o getMobileUser para mobile
import { rateLimitAsync } from '@/lib/rate-limit'
import { ok, unauthorized, badRequest, serverError } from '@/lib/api/responses'
import { z } from 'zod'

const schema = z.object({ ... })

export async function POST(req: NextRequest) {
  // 1. Auth
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const userId = session.user.id                     // NUNCA del body

  // 2. Rate limit (solo endpoints costosos o mobile)
  const { allowed } = await rateLimitAsync(`${userId}:resource`, { limit: 100, windowMs: 60_000 })
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  // 3. Feature gate (si aplica)
  const guard = requireFeature(session.user.features, 'checkin')
  if (guard) return guard

  // 4. Validación
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message)

  // 5. Use case
  try {
    const result = await myUseCase(userId, parsed.data, { db: prisma, ... })
    return ok(result)
  } catch (err) {
    console.error('[resource] error:', err)
    return serverError()
  }
}
```

**Reglas duras:**
- `userId` siempre de `session.user.id` o `mobile.id` — nunca de `req.json()`
- Errores de Prisma nunca llegan crudos al response — capturar en try/catch
- `console.error` solo en catch — nunca `console.log` en producción
- Si el handler supera 40 líneas, la lógica pertenece a un use case en `domain/`

---

## 7. Patrón de transacción DB — 3 fases

Para operaciones que escriben múltiples tablas (check-in, completar sesión, etc.):

```ts
// Phase 1: reads en paralelo FUERA del tx
const [plan, profile, existing] = await Promise.all([
  prisma.trainingPlan.findFirst(...),
  prisma.healthProfile.findUnique(...),
  prisma.weeklyCheckIn.findFirst(...),
])

// Phase 2: I/O externo FUERA del tx (AI, emails, APIs)
// Dentro de tx → timeout + rollback
const suggestion = await externalService.call(data)

// Phase 3: TODOS los writes juntos
await prisma.$transaction([
  prisma.weeklyCheckIn.create({ data: checkIn }),
  prisma.plannedSession.updateMany({ data: adjustments }),
  prisma.notification.create({ data: notif }),
], { timeout: 30_000 })
```

---

## 8. ¿Dónde agrego X? — guía de decisión

| Qué quiero agregar | Dónde va | Ejemplo |
|---|---|---|
| Nuevo endpoint web | `src/app/api/[recurso]/route.ts` | `/api/nutrition/water/route.ts` |
| Nuevo endpoint mobile | `src/app/api/mobile/[recurso]/route.ts` | `/api/mobile/checkin/suggestions/route.ts` |
| Regla de negocio nueva | `src/domain/[módulo]/[use-case].use-case.ts` | `domain/check-in/evaluate-rules.ts` |
| Nuevo tipo de dominio | `src/domain/[módulo]/[módulo].types.ts` | `domain/nutrition/coach-nutrition-proposal.types.ts` |
| Interface de repositorio | `src/domain/ports/[entidad].repository.ts` | `domain/ports/checkin.repository.ts` |
| Implementación de repositorio | `src/infrastructure/db/[entidad].repository.ts` | `infrastructure/db/check-in.repository.ts` |
| Nueva query DB sin use case | `src/infrastructure/db/[entidad].repository.ts` | — |
| Cálculo puro (fórmula, transformación) | `src/lib/core/` o `src/lib/[módulo]/` | `lib/core/week-number.ts` |
| Label UI de enum | `src/lib/labels/enum-labels.ts` | — |
| Componente de atleta | `src/app/(athlete)/[módulo]/_components/` | — |
| Componente de coach | `src/app/coach/[módulo]/_components/` | — |
| Componente compartido entre portales | `src/app/_components/` | `_components/PaywallCard.tsx` |
| Job programado | `src/app/api/cron/[nombre]/route.ts` + entrada en `vercel.json` | — |
| Template de plan de entrenamiento | `src/lib/plan/templates.ts` | — |
| Nueva variable de entorno | `.env.example` (documentar) + uso en código | — |
| Test de lógica de dominio | `src/domain/[módulo]/[archivo].test.ts` | `domain/check-in/evaluate-rules.test.ts` |

---

## 9. Deploy y entornos

```
Repositorio: git@github.com:matenciac14/Medaliq.git
Branches:    main → auto-deploy Vercel (medaliq.com)
             develop → staging
             feature/* | bugfix/* | hotfix/* → PRs a develop

DB:          Neon PostgreSQL serverless
             DATABASE_URL  → pooler Neon (transacciones)
             DIRECT_URL    → conexión directa (migraciones con prisma migrate)

Auth:        AUTH_SECRET / NEXTAUTH_SECRET — mismo valor, ambos nombres soportados
             AUTH_MIN_ISSUED_AT — invalidación masiva de JWTs sin rotar el secret

Rate limit:  UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (producción)
             Sin estas vars → fallback in-memory (no funciona en serverless real)

Email:       RESEND_API_KEY
Ejercicios:  WORKOUTX_API_KEY (WorkoutX — 10 ejercicios free, 1,300+ pagados)
Strava:      STRAVA_CLIENT_ID + STRAVA_CLIENT_SECRET + STRAVA_VERIFY_TOKEN
Billing:     PAYMENT_GATEWAY=stub (hoy) | wompi | stripe (futuro)
             BILLING_ENABLED=false (hoy) — todos son PRO en beta
```

**Pre-push gate:** `.githooks/pre-push` corre `pnpm tsc --noEmit` antes de cada push. Si hay errores de TypeScript, el push se bloquea.

---

## 10. Checklist de auditoría por capa

Usar esta sección como punto de partida al hacer una revisión de código o identificar gaps.

### Capa domain/

| Criterio | Cómo verificar | Gap si falla |
|---|---|---|
| No importa Prisma, Next.js ni librerías externas | `grep -rn "from 'prisma'\|from 'next'" src/domain` | Violación de arquitectura |
| Cada use case tiene su propio archivo `.use-case.ts` | `find src/domain -name "*.use-case.ts"` | Lógica mezclada o en `lib/` |
| Cada use case tiene al menos un test | `diff <(find src/domain -name "*.use-case.ts") <(find src/domain -name "*.use-case.test.ts" | sed 's/.test//')` | Riesgo de regresión |
| Los ports (interfaces) están en `domain/ports/` | `find src/domain/ports -name "*.ts"` | Implementación sin contrato |
| Sin `as any` en archivos de dominio | `grep -rn "as any" src/domain` | Type safety comprometida |

### Capa infrastructure/

| Criterio | Cómo verificar | Gap si falla |
|---|---|---|
| No contiene reglas de negocio (solo traducción) | Leer cada repo — sin `if (rpe > 8)` ni cálculos | Lógica en capa incorrecta |
| Cada repositorio implementa su port | Verificar `implements I[Entidad]Repository` | Contrato roto |
| Transacciones siguen el patrón 3 fases | Buscar `prisma.$transaction` — reads antes del tx | Race conditions + timeouts |
| Sin queries N+1 (loops con await adentro) | `grep -B5 "await prisma" src/infrastructure` | Degradación de performance |

### Capa app/api/

| Criterio | Cómo verificar | Gap si falla |
|---|---|---|
| `userId` siempre de sesión/JWT, nunca del body | `grep -n "body.*userId\|userId.*body" src/app/api` | Vulnerability — IDOR |
| Ownership verificado antes de operar sobre un recurso ajeno | Revisar cada endpoint con `[id]` dinámico | Acceso cross-tenant |
| try/catch en todos los handlers | `grep -L "try {" src/app/api/**/*.ts` | 500 sin contexto |
| Uso de helpers de response consistente | `grep -rn "NextResponse.json" src/app/api` vs imports de `responses.ts` | Inconsistencia de contratos |
| Rate limit en endpoints mobile de escritura | `grep -L "rateLimitAsync" src/app/api/mobile/**/*.ts` | Abuso de API |
| Feature gate en endpoints protegidos | `grep -L "requireFeature" src/app/api/mobile/checkin` | Acceso sin pago |

### Capa app/ (páginas y componentes)

| Criterio | Cómo verificar | Gap si falla |
|---|---|---|
| Páginas server no importan desde `infrastructure/` directamente | `grep -rn "from.*@/infrastructure" src/app --include="*.tsx" \| grep -v api/` | Violación de capas |
| Sin componentes de más de 500 líneas | `find src/app -name "*.tsx" \| xargs wc -l \| sort -n \| tail -20` | God component, SRP violado |
| Props tipadas explícitamente | `grep -rn "type Props\b" src/app --include="*.tsx"` | Sin descripción del contrato del componente |
| Sin `style={{ }}` inline masivo (usar Tailwind) | `grep -c "style={{" src/app --include="*.tsx" -r` | Inconsistencia visual |

### Seguridad general

| Criterio | Cómo verificar | Gap si falla |
|---|---|---|
| Todos los crons protegidos con secret header | Leer cada `src/app/api/cron/*/route.ts` — verificar `CRON_SECRET` | Cron invocable públicamente |
| Webhooks verifican firma del proveedor | Leer `webhooks/strava/route.ts`, `webhooks/payment/route.ts` | Payload spoofing |
| Sin secrets hardcodeados | `grep -rn "sk_\|api_key\|password" src/ --include="*.ts" \| grep -v "env\.\|process\.\|test"` | Leak de credenciales |
| `.env.example` refleja todas las vars reales | `diff <(grep "process\.env\." src -r --include="*.ts" -h \| grep -o "process\.env\.\w*" \| sort -u) <(grep "^[^#]" .env.example \| cut -d= -f1 \| sed "s/^/process.env./" \| sort)` | Onboarding roto para nuevo dev |

### Tests

| Criterio | Cómo verificar | Gap si falla |
|---|---|---|
| Todos los use cases de dominio tienen test | Ver punto anterior en domain/ | Regresiones sin red |
| Tests del dominio no mockean Prisma (lógica pura) | Leer tests de `domain/` — si hay `vi.mock('prisma')`, es señal de lógica en infra | Tests que no prueban nada real |
| Coverage de branches en evaluate-rules.ts | `pnpm vitest run --coverage` → revisar `domain/check-in/` | Regla de negocio sin cubrir |
| Tests no dependen de orden de ejecución | Correr `pnpm vitest run --pool=forks` | Flakiness en CI |

---

## 11. Decisiones de arquitectura — el porqué

Estas son decisiones tomadas que no deben revertirse sin discusión explícita:

| Decisión | Por qué |
|---|---|
| Auth.js v5 con JWT strategy (no database sessions) | Las sesiones de DB requieren query en cada request. JWT es stateless y funciona en serverless sin latencia extra. |
| JWT separado para mobile (jose) | Auth.js no expone el flujo Bearer token que necesita React Native. Mismo `AUTH_SECRET`, distinto mecanismo de firma/verificación. |
| Feature flags como columnas Boolean en User | Un JSON blob en DB requiere parsing y no es typesafe. Las columnas son indexables, se incluyen en el JWT sin query extra, y el coach puede activarlas con un `update` simple. |
| Pool de DB `max: 10` (PrismaPg + Neon pooler) | Vercel serverless puede abrir múltiples instancias. El pooler de Neon (PgBouncer) multiplexea las conexiones del lado del servidor — el `max: 10` es el límite por instancia de función, no el total. |
| Rate limiting con fallback in-memory | Si Upstash cae, el tráfico legítimo no se bloquea. El fallback in-memory no comparte estado entre instancias serverless — es solo protección local, no global. |
| Sin AI activa hoy | `@anthropic-ai/sdk` no está instalado. El producto es 100% determinista. Toda la lógica de ajuste (check-in, nutrición) es algoritmos fijos — Karvonen, Mifflin-St Jeor. Cuando se active AI, se agrega como adapter en `infrastructure/ai/`. |
| Billing hardcodeado en PRO durante beta | `getUserPlan()` retorna `'PRO'` para todos mientras no hay Wompi integrado. Cambiar esto requiere activar `BILLING_ENABLED=true` + tener el webhook de Wompi funcionando. No cambiar antes. |

---

## 12. Documentos relacionados

| Documento | Ruta | Contenido |
|---|---|---|
| Schema DB completo | `../MEDALIQ-PROJECT/CLAUDE-SCHEMA.md` | Todos los modelos, enums, relaciones, índices |
| Reglas por actor | `../domains/flujos-por-actor.md` | Qué puede hacer cada rol, con qué endpoint, bajo qué restricción |
| Reglas de negocio por módulo | `../domains/[módulo].md` | `atleta.md` · `coach.md` · `nutricion.md` · `fuerza.md` · `plan-running.md` · `pagos.md` · `plataforma.md` · `seguridad.md` |
| Contexto de mercado | `../MERCADO.md` | Competidores, pricing, matriz de features, ventanas de oportunidad |
| Contexto del proyecto | `../CLAUDE.md` | Reglas del proyecto para agentes AI |
| Mobile | `../MEDALIQ-MOBILE/CLAUDE.md` | Stack mobile, patrones, reglas |
| Roadmap | `src/app/admin/roadmap/roadmap-data.ts` | Features pendientes y completadas con notas técnicas |
