# MEDALIQ-PROJECT — Scaffolding

> Documento de referencia de la arquitectura de carpetas.
> Fuente canónica para entender qué va dónde y por qué.
> Actualizar cuando se muevan archivos o se creen nuevas carpetas.

---

## Por qué `(athlete)` tiene paréntesis

**Respuesta corta**: los paréntesis son una convención de Next.js llamada **Route Groups**.

```
app/(athlete)/dashboard/page.tsx  →  URL: /dashboard   ✅
app/athlete/dashboard/page.tsx    →  URL: /athlete/dashboard  ❌
```

El nombre entre paréntesis **no aparece en la URL**. Solo sirve para:
1. Agrupar páginas que comparten el mismo `layout.tsx` (sidebar, navbar, auth guard)
2. Mantener el filesystem organizado sin contaminar las rutas

### Grupos actuales del proyecto

| Carpeta | URL resultante | Para qué |
|---------|---------------|----------|
| `(athlete)/` | `/dashboard`, `/plan`, `/checkin`... | Todas las páginas del atleta web — comparten sidebar + auth guard ATHLETE |
| Sin grupo | `/admin/*`, `/coach/*`, `/coaches`, `/login`... | Rutas propias con su propio layout o sin layout |

### Gap identificado
`/admin` y `/coach` NO usan route groups — cada uno tiene su propio `layout.tsx` dentro de su carpeta. Es correcto pero inconsistente: si crecieran más actores, idealmente serían `(admin)/` y `(coach)/`. **No es urgente cambiar** — solo documenta la inconsistencia.

---

## Mapa completo de `src/`

```
src/
│
├── app/                          ← Next.js App Router — solo delivery, cero lógica de negocio
│   │
│   ├── (athlete)/                ← ROUTE GROUP: portal del atleta web
│   │   │                           Todas las rutas comparten app/(athlete)/layout.tsx
│   │   │                           Auth guard: session.user.role === 'ATHLETE'
│   │   │
│   │   ├── _components/          ← componentes SOLO del layout atleta (sidebar, cards)
│   │   │   ├── ui/               ← sub-componentes de UI (MacroPills, NutritionSnapshot)
│   │   │   └── *.tsx
│   │   │
│   │   ├── checkin/              → URL /checkin
│   │   ├── dashboard/            → URL /dashboard
│   │   │   ├── _components/      ← componentes propios de esta página
│   │   │   └── _lib/             ← helpers y queries SOLO de esta página
│   │   │
│   │   ├── find-coach/           → URL /find-coach
│   │   ├── gym/                  → URL /gym
│   │   │   ├── builder/          → URL /gym/builder
│   │   │   ├── exercises/        → URL /gym/exercises
│   │   │   ├── history/          → URL /gym/history
│   │   │   └── session/          → URL /gym/session
│   │   │
│   │   ├── log/                  → URL /log
│   │   │   ├── history/
│   │   │   └── run/
│   │   │
│   │   ├── messages/             → URL /messages
│   │   ├── notifications/        → URL /notifications
│   │   │
│   │   ├── nutrition/            → URL /nutrition
│   │   │   ├── _components/      ← componentes de la página principal de nutrición
│   │   │   ├── builder/          → URL /nutrition/builder (atleta crea sus propios templates)
│   │   │   │   └── [id]/         → URL /nutrition/builder/:id
│   │   │   └── planner/          → URL /nutrition/planner
│   │   │
│   │   ├── plan/                 → URL /plan
│   │   ├── profile/              → URL /profile
│   │   ├── progress/             → URL /progress
│   │   ├── routine/edit/         → URL /routine/edit
│   │   └── settings/
│   │       ├── integrations/     → URL /settings/integrations (Strava, HealthKit)
│   │       └── plan/             → URL /settings/plan (cambiar tier B2C)
│   │
│   ├── admin/                    ← Panel admin — layout.tsx propio, auth: ADMIN
│   │   ├── _components/          ← sidebar admin, search palette
│   │   ├── activaciones/         → URL /admin/activaciones
│   │   ├── ai/                   → URL /admin/ai
│   │   ├── alerts/               → URL /admin/alerts
│   │   ├── audit/                → URL /admin/audit
│   │   ├── coaches/              → URL /admin/coaches
│   │   ├── crons/                → URL /admin/crons (dashboard de cron jobs)
│   │   ├── exercises/            → URL /admin/exercises
│   │   ├── features/             → URL /admin/features (feature flags)
│   │   ├── finanzas/             → URL /admin/finanzas
│   │   ├── invite-codes/         → URL /admin/invite-codes
│   │   ├── metrics/              → URL /admin/metrics
│   │   ├── nutrition/proposals/  → URL /admin/nutrition/proposals
│   │   ├── plans/                → URL /admin/plans
│   │   ├── roadmap/              → URL /admin/roadmap
│   │   │   └── roadmap-data.ts   ← FUENTE CANÓNICA del roadmap — actualizar al terminar features
│   │   ├── settings/             → URL /admin/settings
│   │   ├── subscriptions/        → URL /admin/subscriptions
│   │   └── users/[id]/           → URL /admin/users/:id
│   │
│   ├── coach/                    ← Panel coach — layout.tsx propio, auth: COACH
│   │   ├── athletes/[id]/        → URL /coach/athletes/:id (detalle del atleta)
│   │   │   └── plan/build/       → URL /coach/athletes/:id/plan/build (plan builder)
│   │   ├── gym/routines/         → URL /coach/gym/routines
│   │   ├── nutrition/templates/  → URL /coach/nutrition/templates
│   │   ├── plan/[id]/review/     → URL /coach/plan/:id/review
│   │   ├── profile/              → URL /coach/profile (perfil público editable)
│   │   ├── settings/             → URL /coach/settings
│   │   └── invite/               → URL /coach/invite
│   │
│   ├── api/                      ← REST API — máx ~25 líneas por route: auth→validate→use-case→respond
│   │   │
│   │   ├── admin/                ← solo rol ADMIN
│   │   │   ├── coach/[id]/tier/
│   │   │   ├── crons/trigger/
│   │   │   ├── exercises/        (+ [id]/ + sync/)
│   │   │   ├── features/
│   │   │   ├── integrations/strava/subscribe/
│   │   │   ├── invite-codes/     (+ [id]/)
│   │   │   ├── nutrition/proposals/ (+ [id]/)
│   │   │   ├── search/
│   │   │   └── users/[id]/       (+ plan/ + role/)
│   │   │
│   │   ├── athlete/              ← atleta web (Auth.js session)
│   │   │   ├── calendar/
│   │   │   ├── gym/routines/     (+ [id]/)
│   │   │   ├── nutrition/        (adherence, food-profile, planned-meals, planned-summary,
│   │   │   │                      proposals, targets, templates)
│   │   │   ├── planned-meals/    ← [GAP] duplicado con athlete/nutrition/planned-meals/ ?
│   │   │   ├── sessions/[sessionId]/
│   │   │   └── sport/
│   │   │
│   │   ├── auth/                 ← autenticación web
│   │   │   ├── [...nextauth]/    ← handler Auth.js
│   │   │   ├── forgot-password/
│   │   │   ├── register/
│   │   │   ├── set-password/
│   │   │   ├── set-role/
│   │   │   └── verify-email/
│   │   │
│   │   ├── billing/              ← pagos
│   │   │   ├── athlete/checkout/
│   │   │   ├── coach/checkout/
│   │   │   ├── status/
│   │   │   └── stub/simulate/    ← solo dev/QA
│   │   │
│   │   ├── checkin/              ← check-in web (atleta)
│   │   │   ├── route.ts          ← submit check-in
│   │   │   └── suggestions/[id]/ (accept/ + reject/)
│   │   │
│   │   ├── coach/                ← coach (Auth.js session)
│   │   │   ├── athletes/[id]/    (benchmarks, celebrate-pr, config, dailylogs,
│   │   │   │                      invite-link, nutrition/*, plan/*, reset-password,
│   │   │   │                      running-adherence, running-logs, sessions, status)
│   │   │   ├── clients/          (check/, create/, link/)
│   │   │   ├── dashboard/athletes/
│   │   │   ├── gym/              (athlete/[id]/*, exercises, routines)
│   │   │   ├── invite/ · join/
│   │   │   ├── nutrition/templates/
│   │   │   ├── payments/         (+ [paymentId]/)
│   │   │   ├── plan/[planId]/    (sessions/, week/[weekId]/)
│   │   │   ├── plans/
│   │   │   ├── posts/ · profile/ · programs/
│   │   │   └── sessions/[sessionId]/ (copy-to/, edit/, note/)
│   │   │
│   │   ├── cron/                 ← jobs programados (Vercel Cron, CRON_SECRET)
│   │   │   ├── billing-check/
│   │   │   ├── billing-renewal-reminder/
│   │   │   ├── checkin-reminder/
│   │   │   ├── expire-suggestions/
│   │   │   ├── inactive-athlete-reminder/
│   │   │   ├── nutrition-alert/
│   │   │   ├── payment-overdue/
│   │   │   ├── pending-athlete-reminder/
│   │   │   ├── session-reminder/
│   │   │   └── streak-risk/
│   │   │
│   │   ├── exercises/            ← catálogo público de ejercicios
│   │   │   ├── route.ts
│   │   │   └── [id]/             (+ similar/)
│   │   │
│   │   ├── gym/                  ← sesión de gym del atleta web
│   │   │   ├── assign/
│   │   │   ├── exercises/        ([id]/ + search/)
│   │   │   ├── gif/[id]/
│   │   │   └── session/          (complete/, today/, [id]/)
│   │   │
│   │   ├── integrations/strava/  ← OAuth Strava (connect, callback)
│   │   ├── invite/[code]/        ← join con código de invitación
│   │   ├── log/                  ← log de sesiones running web
│   │   │   ├── last-session/
│   │   │   ├── run/
│   │   │   └── session/          ([logId]/)
│   │   │
│   │   ├── me/                   ← GET datos del usuario autenticado
│   │   ├── messages/             (me/, read/, route.ts, unread-count/)
│   │   ├── metrics/log/          ← telemetría interna
│   │   ├── notifications/        (read-all/, route.ts)
│   │   ├── nutrition/            ← nutrición web atleta
│   │   │   ├── adjustment/[id]/  (accept/, reject/)
│   │   │   ├── foods/            (my-proposals/, propose/)
│   │   │   ├── generate/
│   │   │   ├── init/
│   │   │   ├── log/              ([id]/)
│   │   │   ├── meal-templates/   ([id]/)
│   │   │   └── water/
│   │   │
│   │   ├── onboarding/           (generate/, prefilled/)
│   │   ├── plan/week-print/
│   │   ├── progress/benchmarks/
│   │   ├── routine/
│   │   ├── upgrade/downgrade/
│   │   ├── user/profile/
│   │   │
│   │   ├── mobile/               ← /api/mobile/* — ESPEJO del API web para la app
│   │   │   │                       Auth: getMobileUser() con JWT jose (NO Auth.js)
│   │   │   │                       Regla: misma lógica de negocio, diferente autenticación
│   │   │   │
│   │   │   ├── auth/             (google/, login/, me/, refresh/, set-role/)
│   │   │   ├── billing/prices/
│   │   │   ├── calendar/
│   │   │   ├── checkin/          (route.ts + suggestions/[id]/accept|reject)
│   │   │   ├── checkin-status/
│   │   │   ├── coach/athletes/
│   │   │   ├── dashboard/        (route.ts + week-sessions/)
│   │   │   ├── exercises/        ([id]/ + [id]/alternatives/ + route.ts)
│   │   │   ├── gym/              (history/, prs/, templates/, week/)
│   │   │   ├── log/              (history/, last-session/, session/[logId]/, session/)
│   │   │   ├── messages/         (me/, read/, route.ts, unread-count/)
│   │   │   ├── metrics/log/
│   │   │   ├── notifications/    (read-all/, route.ts)
│   │   │   ├── nutrition/        (adjustment/, assigned-plan/, food-profile/, foods/,
│   │   │   │                      log/, meal-templates/, plan/, planned-meals/,
│   │   │   │                      proposals/, route.ts, templates/, today/, water/)
│   │   │   ├── onboarding/generate/
│   │   │   ├── plan/
│   │   │   ├── profile/
│   │   │   ├── progress/         (benchmarks/, muscles/, route.ts)
│   │   │   ├── push-token/
│   │   │   ├── routine/
│   │   │   └── sessions/[sessionId]/
│   │   │
│   │   └── webhooks/             ← webhooks externos
│   │       ├── mercadopago/
│   │       ├── payment/          ← gateway genérico
│   │       ├── strava/           ← push updates de actividades
│   │       └── wompi/
│   │
│   ├── _components/              ← componentes globales (no pertenecen a un actor)
│   │   ├── Providers.tsx         ← SessionProvider + ThemeProvider
│   │   ├── CookieConsent.tsx
│   │   ├── InstallPWABanner.tsx
│   │   ├── PaywallCard.tsx
│   │   ├── ROICalculator.tsx     ← componente de la landing
│   │   └── ...
│   │
│   ├── coaches/                  → URL /coaches (directorio público — condición: 20+ coaches)
│   ├── join/[code]/              → URL /join/:code (atleta acepta invitación B2B)
│   ├── p/[slug]/                 → URL /p/:slug (perfil público del coach)
│   ├── p/ai-coach/               → URL /p/ai-coach (landing AI coach B2C)
│   │
│   ├── login/ · register/        → URLs públicas de auth
│   ├── onboarding/               → URL /onboarding (multi-step, atleta + coach)
│   ├── pending/                  → URL /pending (atleta B2B esperando activación)
│   ├── select-role/              → URL /select-role
│   ├── forgot-password/ · set-password/
│   ├── upgrade/                  → URL /upgrade (B2C Free → Pro)
│   ├── privacidad/ · terminos/
│   │
│   ├── page.tsx                  → URL / (landing pública)
│   ├── layout.tsx                ← root layout — fuente del <html>
│   ├── globals.css
│   ├── error.tsx · not-found.tsx · loading.tsx
│   ├── robots.ts · sitemap.ts
│   └── icon.tsx · opengraph-image.tsx · favicon.ico
│
│
├── domain/                       ← lógica de negocio PURA — CERO imports de Prisma/Next.js
│   │                               Solo TypeScript. Tests sin mocks de infra.
│   │
│   ├── admin/                    ← reglas del panel admin (KPIs, alertas, retención)
│   │   └── *.ts + *.test.ts
│   │
│   ├── billing/                  ← casos de uso de pagos (checkout, downgrade)
│   │   ├── billing.types.ts
│   │   ├── checkout.use-case.ts
│   │   └── downgrade.use-case.ts
│   │
│   ├── calendar/                 ← tipos del calendario
│   │
│   ├── checkin/                  ← check-in semanal — lógica más compleja del producto
│   │   ├── check-in.types.ts
│   │   ├── evaluate-rules.ts     ← evalúa triggers (fatiga, peso, energía)
│   │   ├── generate-suggestions.ts ← genera sugerencias sin escribir a DB
│   │   ├── process-check-in.use-case.ts ← orquesta todo el flujo
│   │   ├── session-adjustments.ts ← ajusta sesiones según triggers
│   │   └── sync-weight.ts
│   │
│   ├── dashboard/                ← resumen semanal del atleta
│   │
│   ├── exercise/                 ← sincronización de ejercicios desde API externa
│   │   ├── exercise-sync.use-case.ts
│   │   ├── exercise.types.ts
│   │   └── ports/                ← interfaces que la infra implementa
│   │       ├── exercise-source.client.ts
│   │       └── exercise.repository.ts
│   │
│   ├── gym/                      ← sesión de fuerza
│   │   ├── build-gym-week.ts     ← construye la semana de gym del atleta
│   │   └── complete-gym-session.use-case.ts
│   │
│   ├── nutrition/                ← cálculos nutricionales
│   │   ├── calculate-food-log.ts
│   │   ├── calculate-nutrition-adjustment.ts
│   │   ├── compute-plan.ts       ← Mifflin-St Jeor + macros
│   │   ├── daily-target.ts       ← target kcal/macros por tipo de día
│   │   ├── day-type.ts           ← clasifica el día (HARD, EASY, REST)
│   │   ├── generate-meal-plan.ts
│   │   ├── respond-coach-proposal.use-case.ts
│   │   └── session-intensity.ts
│   │
│   ├── onboarding/               ← flujo de onboarding
│   │
│   ├── plan/                     ← plan de entrenamiento running
│   │   ├── active-plan.ts        ← helpers para plan activo
│   │   ├── custom-plan.ts        ← plan personalizado coach
│   │   ├── formulas.ts           ← Karvonen, estimateHRMax, TDEE
│   │   ├── generate-plan.use-case.ts ← genera plan de N semanas
│   │   ├── intensity.ts          ← clasificación de intensidad por sesión
│   │   ├── plan.types.ts
│   │   ├── session-builder.ts    ← construye sesiones individuales
│   │   ├── templates.ts          ← plantillas por goalType (RACE_5K, WEIGHT_LOSS...)
│   │   └── zone-utils.ts         ← zonas de FC (Z1-Z5)
│   │
│   ├── ports/                    ← interfaces (el dominio las define, la infra las implementa)
│   │   ├── billing.repository.port.ts
│   │   ├── checkin.repository.ts
│   │   ├── coach-nutrition-proposal.repository.ts
│   │   ├── food-lookup.client.ts
│   │   ├── food-proposal.repository.ts
│   │   ├── health-profile.repository.ts
│   │   ├── payment-gateway.port.ts
│   │   ├── plan.repository.ts
│   │   ├── session-log.repository.ts
│   │   ├── suggestion.repository.ts
│   │   ├── trm.provider.ts
│   │   ├── user.repository.ts
│   │   └── wearable.repository.ts
│   │
│   ├── subscription/             ← reglas de tier (Free/Pro/B2B) y features
│   │
│   └── wearables/                ← integración wearables (Strava, HealthKit)
│       └── create-wearable-session.use-case.ts
│
│
├── infrastructure/               ← adaptadores — implementan los ports del dominio
│   │                               Importan Prisma, APIs externas, email. CERO lógica de negocio.
│   │
│   ├── billing/                  ← pasarelas de pago
│   │   ├── banco-republica-trm.adapter.ts ← TRM COP/USD desde API Banco República
│   │   ├── billing.repository.ts
│   │   ├── payment-gateway.factory.ts ← elige Wompi o Stub según ENV
│   │   ├── stub-payment-gateway.ts   ← dev/QA
│   │   ├── trm.ts
│   │   └── wompi-payment-gateway.ts
│   │
│   ├── db/                       ← repositorios Prisma (uno por entidad/agregado)
│   │   ├── auto-complete-strength.ts
│   │   ├── calendar.ts
│   │   ├── checkin.repository.ts
│   │   ├── coach-athlete.mapper.ts
│   │   ├── coach-nutrition-proposal.repository.ts
│   │   ├── exercise.repository.ts
│   │   ├── food-proposal.repository.ts
│   │   ├── health-profile.repository.ts
│   │   ├── notification.ts        ← createNotification() (PLT-11)
│   │   ├── plan.repository.ts
│   │   ├── session-log.repository.ts
│   │   ├── suggestion.repository.ts
│   │   ├── tier-feature-config.repository.ts
│   │   ├── user.repository.ts
│   │   └── wearable.repository.ts
│   │
│   ├── email/                    ← adaptador Resend
│   │   └── resend.ts
│   │
│   ├── exercise-sync/            ← client WorkoutX API (implementa exercise-source.client port)
│   │   └── workoutx.client.ts
│   │
│   ├── food/                     ← client Open Food Facts
│   │   └── open-food-facts.client.ts
│   │
│   └── wearable/                 ← Strava adapter
│       ├── strava.mapper.ts
│       └── strava.service.ts
│
│
├── lib/                          ← utilidades transversales — lo que NO encaja en domain/infra
│   │
│   ├── core/                     ← funciones matemáticas/fecha PURAS (sin framework)
│   │   ├── adherence.ts          ← % adherencia al plan
│   │   ├── athlete-formulas.ts   ← fórmulas físicas genéricas
│   │   ├── date-utils.ts         ← parsing/formatting de fechas
│   │   ├── week-number.ts        ← número de semana del año
│   │   └── synthetic-week.ts     ← semana sintética para tests
│   │
│   ├── db/                       ← singleton Prisma + config de DB
│   │   ├── prisma.ts             ← export { prisma } — singleton global
│   │   ├── prisma-client.ts      ← type PrismaDbClient (sin instanciar)
│   │   └── system-config.ts      ← SystemConfig tabla (feature flags)
│   │
│   ├── mobile-auth.ts            ← getMobileUser(req) — auth JWT jose para /api/mobile/*
│   ├── rate-limit.ts             ← rate limiting por IP
│   ├── push.ts                   ← push notifications (Expo)
│   ├── guards/feature-gate.ts    ← getUserPlan() — Free/Pro/B2B
│   │
│   ├── api/                      ← helpers de respuesta HTTP
│   │   ├── responses.ts          ← ok(), error(), notFound()
│   │   └── checkin-mapper.ts     ← transforma check-in DB → DTO
│   │
│   ├── admin/log-action.ts       ← escribe AdminAuditLog
│   ├── coach/payment-status.ts   ← estado de pago del coach
│   ├── config/user-config.ts     ← configuración por usuario
│   ├── constants/sessions.ts     ← constantes de tipos de sesión
│   ├── labels/enum-labels.ts     ← labels en español de enums DB
│   ├── gym/gif-url.ts            ← URL del GIF de ejercicio
│   ├── gym-labels.ts             ← [GAP] debería estar en lib/gym/
│   │
│   ├── i18n/                     ← internacionalización (es/en/pt)
│   │   ├── index.ts
│   │   ├── server.ts
│   │   ├── types.ts
│   │   └── translations/
│   │
│   ├── validation/index.ts       ← schemas Zod compartidos
│   │
│   ├── utils.ts                  ← [GAP] archivo plano — debería estar en utils/
│   ├── utils/
│   │   ├── calc-age.ts
│   │   ├── errors.ts
│   │   └── format-currency.ts
│   │
│   ├── plan/                     ← SHIMS — re-exportan desde @/domain/plan/*
│   │   │                           Existen para no romper imports viejos.
│   │   │                           TODO: migrar todos los importers a @/domain/plan/ y eliminar
│   │   ├── active-plan.ts        → export * from '@/domain/plan/active-plan'
│   │   ├── formulas.ts           → export * from '@/domain/plan/formulas'
│   │   ├── intensity.ts          → export * from '@/domain/plan/intensity'
│   │   ├── templates.ts          → export * from '@/domain/plan/templates'
│   │   └── zone-utils.ts         → export * from '@/domain/plan/zone-utils'
│   │
│   └── nutrition/                ← SHIMS — re-exportan desde @/domain/nutrition/*
│       │                           TODO: migrar importers y eliminar
│       ├── daily-target.ts       → export * from '@/domain/nutrition/daily-target'
│       ├── day-type.ts           → export * from '@/domain/nutrition/day-type'
│       └── get-intensity-for-date.ts ← [EXCEPCIÓN] tiene lógica propia con query DB
│
│
├── components/                   ← UI compartida entre actores — NO feature-específica
│   ├── LazyGif.tsx
│   ├── MuscleMapWeb.tsx
│   ├── seo/json-ld.tsx
│   └── ui/whatsapp-button.tsx
│
├── generated/prisma/             ← auto-generado por Prisma — NUNCA editar manualmente
│
├── types/next-auth.d.ts          ← extiende tipos de la sesión (role, id, plan)
├── auth.ts                       ← configuración Auth.js v5 (providers, callbacks, jwt)
├── auth.config.ts                ← config sin Prisma (para middleware Edge)
└── middleware.ts                 ← protección de rutas por rol (corre en Edge Runtime)
```

---

## Reglas de la arquitectura en una línea

```
app/  →llama→  domain/  ←implementa←  infrastructure/
                  ↑
             lib/core/ (utilidades puras — permitido)
             lib/db/   (singleton Prisma — permitido desde infra y app)
```

**Prohibido:**
- `domain/` importa de `infrastructure/` o `app/`
- `domain/` importa `prisma` directamente
- `app/api/` contiene lógica de negocio (>40 líneas = señal de alarma)
- `infrastructure/` contiene `if/else` de negocio

---

## Gaps identificados (deuda técnica real)

| # | Gap | Ubicación | Impacto | Acción |
|---|-----|-----------|---------|--------|
| GAP-01 | `lib/plan/*.ts` son shims con 12+ importers activos | `src/lib/plan/` | Bajo — funciona | Migrar importers a `@/domain/plan/` y borrar shims |
| GAP-02 | `lib/nutrition/*.ts` son shims con 11+ importers activos | `src/lib/nutrition/` | Bajo — funciona | Migrar importers a `@/domain/nutrition/` y borrar shims |
| GAP-03 | `lib/gym-labels.ts` está suelto fuera de `lib/gym/` | `src/lib/gym-labels.ts` | Cosmético | Mover a `src/lib/gym/labels.ts` |
| GAP-04 | `lib/utils.ts` suelto — debería estar en `lib/utils/` | `src/lib/utils.ts` | Cosmético | Mover a `src/lib/utils/index.ts` o mergear |
| GAP-05 | `api/athlete/planned-meals/` duplica `api/athlete/nutrition/planned-meals/` | `src/app/api/athlete/` | Medio — puede generar inconsistencias | Verificar si son el mismo endpoint y eliminar el duplicado |
| GAP-06 | `/admin` y `/coach` no son route groups `(admin)/` `(coach)/` | `src/app/` | Cosmético | No urgente — solo inconsistente con `(athlete)/` |
| GAP-07 | `app/_components/ROICalculator.tsx` es de la landing, no es global | `src/app/_components/` | Cosmético | Mover a `src/app/_components/landing/` o a la página directamente |

---

## Convención de carpetas `_` dentro de páginas

```
page-name/
  _components/   ← componentes SOLO de esta página — no se reutilizan fuera
  _lib/          ← helpers y queries SOLO de esta página
  page.tsx       ← Server Component — hace fetch, pasa data al client
  layout.tsx     ← (si aplica) layout específico de la sección
```

El prefijo `_` significa **privado a esta carpeta** — Next.js los excluye del routing automáticamente.

---

## Patrones críticos

### Route handler (app/api/) — estructura mínima

```ts
// Máx ~25 líneas. Nunca lógica de negocio aquí.
export async function POST(req: NextRequest, { params }) {
  // 1. Auth
  const session = await auth()
  if (!session?.user?.id || session.user.role !== 'COACH') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  // 2. Validate
  const body = Schema.safeParse(await req.json())
  if (!body.success) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  // 3. Call use case
  const result = await myUseCase(body.data, { db: prisma, repo: new MyRepo() })
  // 4. Respond
  return NextResponse.json(result)
}
```

### Mobile vs Web auth

```ts
// Web (Auth.js)
const session = await auth()
const userId = session?.user?.id

// Mobile (JWT jose)
const user = await getMobileUser(req)
const userId = user.id
```

### Shim (lib/plan/*.ts) — solo para backward compat

```ts
// lib/plan/formulas.ts — NO agregar lógica aquí
export * from '@/domain/plan/formulas'
```
