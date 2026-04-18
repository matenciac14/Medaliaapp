# Medaliq

## Qué es
SaaS de coaching deportivo con AI para LatAm. Cubre recomposición corporal, metas de carrera (cualquier deporte) y entrenadores con atletas. El "cerebro" es un AI coach que hace intake personalizado, genera planes periodizados y los ajusta según datos reales.

## Stack
- Next.js 15 App Router + TypeScript + PostgreSQL + **Prisma 7**
- Tailwind CSS v4 + shadcn/ui
- Auth.js v5 (next-auth@beta) — estrategia JWT
- Claude API (Anthropic) — Haiku para plan, Sonnet para coach chat
- pnpm · bcryptjs

## Prisma 7 — diferencias críticas
- Generator: `prisma-client` (no `prisma-client-js`) con `output = "../src/generated/prisma"`
- Import: `from '../../generated/prisma/client'` (NO `@prisma/client`)
- `url` va en `prisma.config.ts`, NO en `schema.prisma`
- Requiere adapter: `new PrismaPg({ connectionString })` de `@prisma/adapter-pg`
- Seed se configura en `prisma.config.ts → migrations.seed`, no en `package.json`

## Auth.js v5 + Edge Runtime
- `src/auth.config.ts` — config SIN Prisma, usada en middleware (Edge-safe)
- `src/auth.ts` — config completa con PrismaAdapter, usada en server components y API routes
- Middleware importa de `auth.config.ts`, nunca de `auth.ts`
- JWT contiene: `id`, `role`, `onboardingCompleted`

## UserConfig — patrón central
Cada `User` tiene un campo `config Json` en DB que controla toda su experiencia.
Tipo en `src/lib/config/user-config.ts`:
```ts
type UserConfig = {
  features: { plan, checkin, nutrition, progress, log, coach }  // booleanos
  sport: { type, goal }
  plan: { activePlanId, currentWeek, totalWeeks, phase }
  onboarding: { completed, completedAt }
  preferences: { language, units, notifications }
}
```
- `DEFAULT_USER_CONFIG` — usuario nuevo, todo en false
- `FULL_ATHLETE_CONFIG` — atleta con plan activo
- `COACH_CONFIG` — solo features.coach = true
- `parseUserConfig(raw)` — helper con merge de defaults

El sidebar se construye filtrando `config.features`. Al completar onboarding se actualiza config via `PATCH /api/user/config`.

## Estructura de rutas
```
src/app/
  (athlete)/              ← route group — comparte sidebar layout
    layout.tsx            ← Server Component: auth() + prisma + SidebarClient
    _components/
      SidebarClient.tsx   ← Client Component: usePathname + signOut
    dashboard/page.tsx
    plan/page.tsx
    checkin/page.tsx
    nutrition/page.tsx
    progress/page.tsx
    log/page.tsx
  coach/
    layout.tsx            ← Client Component con sidebar coach
    dashboard/page.tsx
    athlete/[id]/page.tsx
    plan/[id]/review/page.tsx
    invite/page.tsx
    settings/page.tsx
  api/
    auth/[...nextauth]/   ← Auth.js handlers
    auth/register/        ← POST: crea usuario + DEFAULT_USER_CONFIG
    checkin/              ← POST stub → TODO: Prisma WeeklyCheckIn
    log/session/          ← POST stub → TODO: Prisma SessionLog
    onboarding/generate/  ← POST: genera plan con AI
    coach/invite/         ← POST stub
    coach/join/           ← POST stub
    coach/plan/[id]/approve/ ← POST stub
  onboarding/page.tsx     ← wizard 9 pasos (Client Component)
  login/page.tsx
  register/page.tsx
  join/[code]/page.tsx    ← atleta acepta invitación de coach
  page.tsx                ← landing
```

## Mock data (temporal hasta conectar DB)
- `src/lib/mock/dashboard-data.ts` — mockUser, mockPlan, mockTodaySession, mockWeeks
- `src/lib/mock/coach-data.ts` — mockCoach, mockAthletes, mockAthleteCheckIns
- `src/lib/mock/nutrition-data.ts` — mockNutritionPlan, mockMeals, mockSupplements

## Lógica de negocio
- `src/lib/plan/formulas.ts` — Karvonen HR zones, Mifflin-St Jeor TDEE, Riegel race time
- `src/lib/plan/templates.ts` — HALF_MARATHON_18W, TEN_K_12W, FIVE_K_8W, BODY_RECOMPOSITION_16W
- `src/lib/plan/generator.ts` — selecciona template, llama Haiku, guarda en DB

## Base de datos
- Local PostgreSQL: `postgresql://postgres:postgres@localhost:5432/medaliq`
- Migraciones: `pnpm prisma migrate dev --name <nombre>`
- Seed: `pnpm prisma db seed`
- Usuarios seed:
  - `coach@medaliq.com` / `coach123` — role COACH
  - `miguel@medaliq.com` / `atleta123` — ATHLETE con plan + coach asignado
  - `ana@medaliq.com` / `atleta123` — ATHLETE B2C sin coach

## Estado actual de features
- [x] F0 Auth: login, registro (email + Google placeholder)
- [x] F1 Onboarding wizard (9 pasos guiados, sin chat)
- [x] F2 Generador de plan (templates hardcoded + AI personaliza)
- [x] F3 Dashboard atleta (mock data)
- [x] F4 Calendario plan (18 semanas, fases)
- [x] F5 Registro sesión (UI lista, API stub)
- [x] F6 Check-in semanal (UI lista, motor de alertas, API stub)
- [x] F7 Dashboard coach (tabs atletas, alertas, adherencia)
- [x] F8 Panel coach atleta (4 tabs: resumen, plan, progreso, nutrición)
- [x] F9 Coach: revisar y aprobar plan
- [x] F10 Vinculación coach-atleta (código invitación)
- [x] F11 Nutrición (detección tipo de día, macros, comidas, suplementos)
- [x] F12 Progreso (gráficas CSS: peso, FC, km, adherencia, benchmarks)
- [x] UserConfig JSON por usuario en DB
- [x] Auth real conectada (layout lee config fresca de DB)
- [x] Redirect onboarding si no completó intake

## Pendiente (próximas tareas)
- [ ] Onboarding → guardar plan en DB + actualizar User.config
- [ ] Dashboard atleta con datos reales de DB
- [ ] APIs log/session y checkin guardando en Prisma
- [ ] Coach puede editar config.features del atleta
- [ ] AI genera plan real (Claude Haiku, una llamada)
- [ ] Plan nutricional con AI
- [ ] Google OAuth (credenciales reales en .env)
- [ ] Deploy Vercel + variables de entorno prod
- [ ] Email AWS SES con @medaliq.com

## Reglas del producto
- AI NO puede medicar ni diagnosticar — solo coaching deportivo
- Banderas rojas médicas → escalar, no continuar el flujo
- Multi-tenant: atletas B2C + coaches con atletas B2B
- Planes son vivos (se ajustan por check-in), no PDFs estáticos
- Multi-tenant: siempre `where: { userId }` en queries

## Ver reglas globales
~/.claude/CLAUDE.md
