# Medaliq — Feature Map

Índice canónico de todas las features implementadas.
Para cada feature: ruta de acceso, endpoints clave y archivos principales.

---

## AUTH & ONBOARDING

| Feature | Web path | Endpoint / Archivo |
|---------|----------|--------------------|
| Login email | `/login` | `app/api/auth/[...nextauth]` · Auth.js |
| Registro | `/register` | `app/api/auth/register/route.ts` |
| Google OAuth | `/login` (botón oculto) | Auth.js google provider |
| Verificación email | link en email | `app/api/auth/verify-email/route.ts` |
| Forgot password | `/forgot-password` | `app/api/auth/forgot-password/route.ts` |
| Set password | `/set-password?token=` | `app/api/auth/set-password/route.ts` |
| Onboarding wizard | `/onboarding` | `app/(athlete)/onboarding/` · `domain/onboarding/complete-onboarding.use-case.ts` |
| Select role (OAuth) | `/select-role` | `app/api/auth/set-role/route.ts` |
| Pending B2B | `/pending` | middleware · polling GET `/api/me` |
| Mobile login | app `(auth)/login.tsx` | `api/mobile/auth/login/route.ts` |
| Mobile register | app `(auth)/register.tsx` | `api/mobile/auth/register/route.ts` |
| Mobile Google OAuth | app select-role | `api/mobile/auth/google/route.ts` |
| Mobile token refresh | — | `api/mobile/auth/refresh/route.ts` |

---

## ATLETA — DASHBOARD & PLAN

| Feature | Web path | Mobile screen | Endpoint / Archivo |
|---------|----------|---------------|--------------------|
| Dashboard | `/dashboard` | `(tabs)/index.tsx` | `api/mobile/dashboard/route.ts` |
| Plan semanal | `/plan` | `(tabs)/plan.tsx` | `api/mobile/plan/route.ts` |
| Quick log sesión | `/dashboard` (botón) | dashboard | `api/log/session/route.ts` |
| Export PDF plan | `/plan/week-print?week=N` | — | `api/plan/week-print/route.ts` |
| Sugerencias pendientes check-in (badge) | `/dashboard` | — | `api/checkin/suggestions` |
| Notificaciones | `/notifications` | `(app)/notifications.tsx` | `api/notifications/route.ts` · `api/mobile/notifications/route.ts` |

---

## ATLETA — CHECK-IN

| Feature | Web path | Mobile screen | Endpoint / Archivo |
|---------|----------|---------------|--------------------|
| Formulario check-in | `/checkin` | `(tabs)/checkin.tsx` | `api/checkin/route.ts` · `api/mobile/checkin/route.ts` |
| Resultado + ajustes aplicados | `/checkin` (inline) | `checkin.tsx` | `domain/check-in/process-check-in.use-case.ts` |
| Sugerencias interactivas | `/checkin` (inline) | `checkin.tsx` | `api/checkin/suggestions/[id]/accept` · `/reject` |
| Sugerencias mobile | — | `checkin.tsx` | `api/mobile/checkin/suggestions/[id]/accept` · `/reject` |
| Expirar sugerencias (cron) | — | — | `api/cron/expire-suggestions/route.ts` |

---

## ATLETA — NUTRICIÓN

| Feature | Web path | Mobile screen | Endpoint / Archivo |
|---------|----------|---------------|--------------------|
| Pantalla principal | `/nutrition` | `(tabs)/nutrition.tsx` | `api/mobile/nutrition/route.ts` |
| Endpoint unificado mobile | — | nutrition.tsx | `api/mobile/nutrition/today/route.ts` |
| Log alimento | `/nutrition` (modal) | LogFoodModal | `api/nutrition/log/route.ts` · `api/mobile/nutrition/log/route.ts` |
| Eliminar log | — | LogFoodModal | `api/nutrition/log/[id]/route.ts` · `api/mobile/nutrition/log/[id]/route.ts` |
| Buscar alimentos | LogFoodModal search | LogFoodModal | `api/nutrition/foods/route.ts` · `api/mobile/nutrition/foods/route.ts` |
| **Escáner código barras** | — | BarcodeScannerModal | `api/mobile/nutrition/foods/barcode/route.ts` · OpenFoodFactsClient |
| Proponer alimento nuevo | LogFoodModal | ProposeFoodModal | `api/nutrition/foods/propose/route.ts` · `api/mobile/nutrition/foods/propose/route.ts` |
| Mis propuestas | `/nutrition` | nutrition.tsx | `api/nutrition/foods/my-proposals/route.ts` |
| Perfil de alimentos | — | — | `api/athlete/nutrition/food-profile/route.ts` · `api/mobile/nutrition/food-profile/route.ts` |
| Plantilla nutricional (constructor A) | `/nutrition/builder` | nutrition-builder.tsx | `api/athlete/nutrition/templates/route.ts` |
| Planificador semanal (constructor B) | `/nutrition/planner` | nutrition-apply-template.tsx | `api/athlete/nutrition/planned-meals/route.ts` |
| Log masivo del día | `/nutrition` (botón) | nutrition.tsx | `api/athlete/nutrition/planned-meals/log-today/route.ts` · `api/mobile/nutrition/planned-meals/log-today/route.ts` |
| Aplicar plantilla a semana | `/nutrition/planner` | nutrition-apply-template.tsx | `api/athlete/nutrition/templates/[id]/apply/route.ts` · `api/mobile/nutrition/templates/[id]/apply/route.ts` |
| **Lista del mercado** | — | — (UI pendiente) | `api/athlete/nutrition/grocery-list/route.ts` · `api/mobile/nutrition/grocery-list/route.ts` |
| Resumen semanal | `/nutrition` | nutrition.tsx | `api/mobile/nutrition/log/summary/route.ts` |
| Tracking agua | `/nutrition` | HydrationSection | `api/nutrition/water/route.ts` · `api/mobile/nutrition/water/route.ts` |
| Propuesta coach | `/nutrition` | CoachNutritionProposalCard | `api/athlete/nutrition/proposals/[id]/route.ts` · `api/mobile/nutrition/proposals` |
| Plan asignado mobile | — | PlannedMealsSection | `api/mobile/nutrition/assigned-plan/route.ts` · `api/mobile/nutrition/plan/route.ts` |
| Swap alimento (atleta B2B) | — | SwapPicker | `api/mobile/nutrition/plan/[id]/swap/route.ts` |

---

## ATLETA — EJERCICIOS

| Feature | Web path | Mobile screen | Endpoint / Archivo |
|---------|----------|---------------|--------------------|
| Panel gym | `/gym` | `(tabs)/gym.tsx` | `api/gym/session/today/route.ts` |
| Sesión gym | `/gym/session` | `(app)/gym-session.tsx` | `api/gym/session/complete/route.ts` |
| Historial gym | `/gym/history` | `(app)/gym-history.tsx` · `log-history.tsx` | `api/gym/history/route.ts` · `api/mobile/gym/week/route.ts` |
| Constructor rutinas (B2C) | — | `(app)/gym-builder.tsx` | `api/athlete/gym/routines/route.ts` |
| Asignar rutina propia | — | gym.tsx | `api/gym/assign/route.ts` |
| Biblioteca ejercicios atleta | `/gym/exercises` | — | `api/(athlete)/gym/exercises/page.tsx` |
| PRs gym | `/progress` | progress.tsx | `api/mobile/gym/prs/route.ts` |
| Muscle map | `/gym` (MuscleMapWeb) | progress.tsx (MuscleMap) | `api/mobile/progress/muscles/route.ts` |
| Proyección carga 4 semanas | `/gym` | gym.tsx | calculado client-side |

---

## ATLETA — PROGRESO & LOG

| Feature | Web path | Mobile screen | Endpoint / Archivo |
|---------|----------|---------------|--------------------|
| Progreso | `/progress` | `(tabs)/progress.tsx` | `api/mobile/progress/route.ts` |
| Historial unificado | `/log/history` | `(app)/log-history.tsx` | `api/mobile/log/history/route.ts` |
| Log sesión running | `/log/run` | `(app)/log-run.tsx` | `api/log/session/route.ts` · `api/mobile/log/session/route.ts` |
| Editar log | historial (inline) | — | `api/log/session/[logId]/route.ts` |
| DailyLog (peso/energía/sueño/FC) | `/profile` | dashboard TodayLogCard | `api/mobile/metrics/log/route.ts` |
| Comparativa vs sesión anterior | `/log/run` | log-run.tsx | `api/mobile/log/last-session/route.ts` |
| Benchmarks rendimiento | `/progress` | progress.tsx | `api/progress/benchmarks/route.ts` · `api/mobile/progress/benchmarks` |
| Circunferencias | `/progress` | progress.tsx | campo en check-in · `api/mobile/progress/route.ts` |
| Adherencia nutricional 30d | — | progress.tsx | incluido en `/api/mobile/progress` |
| Heatmap actividad 52 semanas | — | progress.tsx | incluido en `api/mobile/progress/route.ts` |
| Daily weight chart 90 días | `/progress` | — | query DailyLog en `progress/page.tsx` |

---

## ATLETA — PERFIL

| Feature | Web path | Mobile screen | Endpoint / Archivo |
|---------|----------|---------------|--------------------|
| Perfil salud | `/profile` | `(tabs)/profile.tsx` | `api/mobile/profile/route.ts` |
| Editar datos físicos | `/profile` | edit-health-profile.tsx | `api/mobile/profile/route.ts` PATCH |
| Integraciones (Strava / HealthKit) | `/settings/integrations` | integrations.tsx | `api/integrations/*` |

---

## COACH — CORE

| Feature | Web path | Endpoint / Archivo |
|---------|----------|--------------------|
| Dashboard coach | `/coach/dashboard` | `app/coach/dashboard/page.tsx` |
| Lista de atletas | `/coach/athletes` | `app/coach/athletes/page.tsx` |
| Ficha de atleta (9 tabs) | `/coach/athletes/[id]` | `AthleteDetailClient.tsx` |
| Crear atleta | `/coach/clients/new` | `api/coach/clients/create/route.ts` |
| Vincular atleta existente | — | `api/coach/clients/link/route.ts` |
| Config features atleta | ficha → tab | `api/coach/athletes/[id]/config/route.ts` |
| Mensajería | `/coach/messages` | `api/messages/route.ts` |
| Finanzas | `/coach/finanzas` | `app/coach/finanzas/page.tsx` |
| Invitación atleta | `/coach/invite` | `api/invite/[code]/route.ts` |
| Reset password atleta | ficha → acciones | `api/auth/forgot-password/route.ts` |
| Panel plan (constructor visual) | `/coach/athletes/[id]/plan/build` | `PlanBuilderClient.tsx` |
| Crear plan custom | constructor | `api/coach/athletes/[id]/plan/custom/route.ts` |
| Crear plan desde template | constructor | `api/coach/athletes/[id]/plan/from-template/route.ts` |
| Copiar plan entre atletas | constructor | `api/coach/athletes/[id]/plan/copy-from/route.ts` |
| Editar sesión | constructor | `api/coach/sessions/[id]/route.ts` |
| Agregar sesión | constructor | `api/coach/athletes/[id]/sessions/route.ts` |
| Copiar sesión | constructor | `api/coach/sessions/[sessionId]/copy-to/route.ts` |

---

## COACH — EJERCICIOS & NUTRICIÓN

| Feature | Web path | Endpoint / Archivo |
|---------|----------|--------------------|
| Biblioteca ejercicios coach | `/coach/gym/exercises` | `app/coach/gym/exercises/page.tsx` |
| Constructor rutinas | `/coach/gym/routines/[id]` | `app/coach/gym/routines/` |
| Asignar rutina a atleta | ficha → tab Gym | `api/coach/gym/routines/[id]/assign/route.ts` |
| Sincronizar ejercicios | — (admin) | `api/admin/exercises/sync/route.ts` · `scripts/sync-exercises.ts` |
| Biblioteca alimentos LatAm | — | `scripts/seed-latam-foods.ts` · `scripts/seed-foods-latam.ts` |
| Constructor nutrición (coach) | `/coach/nutrition/templates/[id]/build` | `NutritionBuilderClient.tsx` |
| Asignar plan nutricional | ficha → tab Nutrición | `api/coach/nutrition/templates/[id]/assign/route.ts` |
| Proponer ajuste nutricional | ficha → tab Nutrición | `api/coach/athletes/[id]/nutrition/propose/route.ts` |
| Aplicar template semana | ficha → tab Nutrición | `api/coach/athletes/[id]/nutrition/apply-template/route.ts` |
| Daily logs del atleta | ficha → tab Resumen | `api/coach/athlete/[id]/dailylogs/route.ts` |
| Benchmarks | ficha → tab Benchmarks | `api/coach/athletes/[id]/benchmarks/route.ts` |

---

## PLATAFORMA — ADMIN

| Feature | Web path | Endpoint / Archivo |
|---------|----------|--------------------|
| Dashboard admin | `/admin` | `app/admin/page.tsx` |
| Usuarios | `/admin/users` | `api/admin/users/route.ts` |
| Coaches | `/admin/coaches` | `api/admin/coaches/route.ts` · `api/admin/coach/[id]/tier/route.ts` |
| Métricas (WAU, retención, geo) | `/admin/metrics` | `app/admin/metrics/page.tsx` |
| Finanzas (MRR, fee) | `/admin/finanzas` | `app/admin/finanzas/page.tsx` |
| Alertas operativas | `/admin/alerts` | `domain/admin/alerts.ts` |
| Audit log | `/admin/audit` | `domain/admin/audit-log.ts` |
| Ejercicios globales | `/admin/exercises` | `api/admin/exercises/route.ts` |
| Invite codes | `/admin/invite-codes` | `api/admin/invite-codes/route.ts` |
| Crons (trigger manual) | `/admin/crons` | `api/admin/crons/trigger/route.ts` |
| Configuración features | `/admin/features` | `api/admin/features/route.ts` |
| Roadmap | `/admin/roadmap` | `app/admin/roadmap/roadmap-data.ts` ← fuente canónica |
| Búsqueda global ⌘K | cualquier página admin | `api/admin/search/route.ts` |

---

## PLATAFORMA — MARKETPLACE & NOTIFICACIONES

| Feature | Web path | Endpoint / Archivo |
|---------|----------|--------------------|
| Directorio coaches | `/coaches` | `app/coaches/page.tsx` |
| Perfil público coach | `/p/[slug]` | `app/p/[slug]/page.tsx` |
| Join (link invitación) | `/join/[code]` | `api/invite/[code]/route.ts` |
| Notificaciones in-app | `/notifications` | `infrastructure/db/notification.ts` (createNotification) |
| Cron check-in reminder | — | `api/cron/checkin-reminder/route.ts` |
| Cron sesión del día | — | `api/cron/session-reminder/route.ts` |
| Cron pago vencido | — | `api/cron/payment-overdue/route.ts` |
| Cron atleta inactivo | — | `api/cron/inactive-athlete-reminder/route.ts` |
| Cron racha en riesgo | — | `api/cron/streak-risk/route.ts` |
| Cron pendiente 48h | — | `api/cron/pending-athlete-reminder/route.ts` |
| Cron expirar sugerencias | — | `api/cron/expire-suggestions/route.ts` |

---

## NEGOCIO — BILLING

| Feature | Web path | Endpoint / Archivo |
|---------|----------|--------------------|
| Checkout coach | — | `api/billing/coach/checkout/route.ts` |
| Checkout atleta Pro | — | `api/billing/athlete/checkout/route.ts` |
| Webhook pago | — | `api/webhooks/payment/route.ts` |
| Tiers coach (admin) | `/admin/coaches` | `api/admin/coach/[id]/tier/route.ts` |

---

## MOBILE — RUTAS API EXCLUSIVAS

| Endpoint | Qué hace |
|----------|----------|
| `GET /api/mobile/dashboard` | Dashboard completo del atleta |
| `GET /api/mobile/plan` | Plan semanal con weeks y sessions |
| `GET/POST /api/mobile/checkin` | Check-in semanal |
| `GET /api/mobile/nutrition/today` | Nutrición del día (unificado) |
| `GET /api/mobile/nutrition/foods/barcode?code=` | Lookup por código de barras → OFF |
| `GET /api/mobile/nutrition/grocery-list` | Lista del mercado semanal ← NUEVO |
| `GET /api/mobile/progress` | Progreso: peso, FC, circunferencias, gym, nutrición |
| `GET /api/mobile/progress/muscles` | Volumen muscular + fatiga últimos 7 días |
| `GET /api/mobile/gym/prs` | PRs gym con 1RM estimado (Epley) |
| `GET /api/mobile/log/history` | Historial unificado running + gym |
| `GET /api/mobile/log/last-session` | Última sesión del mismo tipo (comparativa) |
| `GET/POST /api/mobile/metrics/log` | DailyLog peso/energía/sueño/FC |
| `GET/PATCH /api/mobile/profile` | Perfil de salud del atleta |
| `GET/PATCH /api/mobile/auth/me` | Datos del usuario + locale |
| `POST /api/mobile/auth/refresh` | Refrescar JWT con features frescas |
| `POST /api/mobile/push-token` | Registrar token de push notification |

---

## FUENTES DE EJERCICIOS

| Fuente | Cobertura | Cómo activar | GIF |
|--------|-----------|-------------|-----|
| **AscendAPI** (activa) | 1,354 ejercicios | `EXERCISE_SOURCE=ascendapi` (default) | `gifStoredUrl` — CDN público Cloudflare |
| WorkoutX | 502 ejercicios | `EXERCISE_SOURCE=workoutx` + `WORKOUTX_API_KEY` | `gifUrl` — requiere proxy `/api/gym/gif/[id]` |

Sincronización: `pnpm tsx scripts/sync-exercises.ts` o `POST /api/admin/exercises/sync` (admin).

---

## FUENTES DE ALIMENTOS

| Fuente | Qué cubre | Cómo agregar |
|--------|-----------|-------------|
| Sistema (seed) | Alimentos genéricos globales | `pnpm prisma db seed` |
| **LatAm** (seed) | CO, MX, PE, AR, CL, VE, EC, BO | `pnpm tsx scripts/seed-latam-foods.ts` + `pnpm tsx scripts/seed-foods-latam.ts` |
| Open Food Facts | 3M+ productos con barcode EAN-8/13 | automático al escanear — se cachea en DB |
| Community | Propuestas de usuarios aprobadas | `api/nutrition/foods/propose` → revisión admin |

---

## CÓMO AGREGAR UNA FEATURE NUEVA

```
1. Domain: src/domain/[módulo]/[feature].use-case.ts  ← lógica de negocio pura
2. Port:   src/domain/ports/[entity].repository.ts    ← interface si necesita DB
3. Infra:  src/infrastructure/db/[entity].repository.ts ← implementación Prisma
4. API:    src/app/api/[ruta]/route.ts                ← máx 25 líneas: auth → validate → use case → respond
5. Mobile: src/app/api/mobile/[ruta]/route.ts         ← getMobileUser en vez de auth()
6. Roadmap: src/app/admin/roadmap/roadmap-data.ts     ← agregar ítem done: false
7. Este archivo: FEATURES.md                          ← agregar fila en la sección correcta
```

**Regla tenant**: toda query incluye `where: { userId }` o `where: { athleteId }` — nunca confiar en IDs del body.
