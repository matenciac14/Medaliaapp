# Medaliq — Backlog

*Ultima actualizacion: 2026-06-28*

---

## Modelo de negocio

### Atletas
| Tier | Precio | Que incluye |
|------|--------|-------------|
| Trial | $0 — 30 dias | Todo completo (plan, check-in, nutricion, AI chat, gym) |
| Free | $0 post-trial | Dashboard basico, log manual, sin AI, sin plan adaptativo |
| Pro | $15/mes | Plan adaptativo + check-in + nutricion + AI chat (100 msgs/mes) + gym |

**Como se deriva el tier en codigo:**
- No existe campo `trial` en UserConfig
- `getUserPlan(features)`: 'PRO' si `aiPlan || aiCoach`, 'FREE' sino
- Trial activo = `features.aiPlan = true` + `monthlyLimit = 999999`

### Coaches
| Asesorados activos | Fee a Medaliq |
|--------------------|---------------|
| 1 a 50 | $6/asesorado/mes |
| 51 a 100 | $5/asesorado/mes + AI assistant gratis |
| +100 | $3/asesorado/mes + AI assistant gratis |

**Estado:** modelo definido, sin implementacion de pagos. Primera venta = acuerdo manual.

---

## P0 — Bloquea revenue o es riesgo legal

- [x] `tempPassword` en JSON plaintext — ya devuelve `resetLink` (token JWT firmado, 7d)
- [x] Feature gating en 4 endpoints mobile — todos tienen `requireFeature()` aplicado
- [x] `features.*` en `MobileTokenPayload` — login mobile ya los incluye en el token
- [ ] Stripe/Wompi: suscripcion Pro $15/mes + webhook activa tier en UserConfig

---

## P1 — Bugs confirmados que rompen flujos

- [x] AI Haiku dentro de `$transaction` — no hay llamada AI en ninguna transaccion (codigo limpio)
- [x] `applyPlanAdjustments` race condition — protegido con `!coachNotes.includes('[AUTO]')` check
- [x] Onboarding B2B sin transaccion — ya en `$transaction` (complete-onboarding.use-case.ts)
- [x] Off-by-one fecha sesion coach — ya corregido: `+ dayOfWeek - 1` (coach/plan/[planId]/sessions)
- [x] Z1 ignorado en zoneMap — `Z1: 'Z1'` es el comportamiento correcto (zona minima, no convierte a DESCANSO)
- [x] Mobile B2B + GYM salta deteccion — `completeOnboardingUseCase` chequea B2B en el GYM path

---

## Paridad Pulsefit — features que retienen usuarios

- [x] **Mensajeria coach-atleta**
  - Modelo `Message` en DB · 4 endpoints web + 4 endpoints mobile
  - UI web: tab coach + pagina atleta + badge en sidebar (polling 30s)
  - UI mobile: pantalla `/messages` accesible desde perfil

- [x] **Badge mora en panel atletas** — badge `💰 Mora` en tabla y cards cuando hay `Payment.status=OVERDUE`

- [ ] **GIFs de ejercicio**
  - ExerciseDB (RapidAPI): 1,300+ GIFs con modelo 3D
  - Estrategia: agregar `gifUrl String?` a `Exercise` + script batch import (cachear en DB, no llamar en runtime)
  - UI: modal al tocar nombre del ejercicio en gym/session y coach routines

- [x] **Modulo finanzas coach** (registro manual, NO pasarela de pagos)
  - Modelo `Payment` en DB · enum `PaymentStatus { PAID | PENDING | OVERDUE }`
  - API: GET (auto-marca OVERDUE) · POST · PATCH · DELETE
  - UI: `/coach/finanzas` — KPIs + form + filtros + lista

- [x] **Infraestructura email (Resend)**
  - Dominio verificado, DNS en Route53, RESEND_API_KEY en Vercel
  - Templates enviados: welcome coach, welcome atleta B2B, asignacion coach, forgot password
  - Pendiente: cron templates (check-in dom, sesion lun, pago vencido)

- [x] **`/join/[code]` con branding del coach**
  - Muestra avatar · headline · bio · especialidades del coach

---

---

## FASE UX-LatAm — Reduccion de friccion por perfil de usuario

> Hallazgos de auditoria con 3 perfiles objetivo: Valentina (corredora amateur), Felipe (coach 22 atletas), Mateo (gym B2C).
> Ordenados por impacto en retencion. Desarrollar uno a uno, empezando por los de mayor friccion.

### Valentina — corredora amateur, Bogota

- [x] **Onboarding FC maxima: default "Que la estime el sistema"**
  - `INITIAL_DATA.hrSource: null` → `'estimated'`
  - El usuario llega al step y YA ve el calculo con su edad. Cero choice paralysis.

- [x] **Check-in: seccion "Bienestar" colapsable (opcional)**
  - Check-in completable en 2 campos: energia + RPE. Resto bajo "opcional".
  - Reduce carga cognitiva semanal. Objetivo: <60 segundos para el caso comun.

- [ ] **Check-in: modo rapido "Todo bien"**
  - Boton unico si la semana fue normal: "Semana normal — sin ajustes"
  - Pre-rellena energia=7, RPE=6, sin dolor. Envia en 1 tap.
  - Ideal para semanas sin incidencias (la mayoria).

- [ ] **Onboarding: explicar FC y zonas en lenguaje comun**
  - Reemplazar "FC maxima (bpm)" por "¿Cuanto sube tu corazon al maximo esfuerzo?"
  - Agregar tooltip contextual: "Lo usamos para calcular tus zonas de entrenamiento y que no te pases ni te quedes corto."
  - Eliminar la palabra "Karvonen" de la UI (puede quedar en comentarios del codigo).

- [ ] **Dashboard: mostrar km/semana acumulados**
  - Dato visible en hero card del plan: "Esta semana: X km de Y km planificados"
  - Fuente: suma de `durationMin * pace_estimado` por tipo de sesion (RODAJE_Z2, TIRADA_LARGA, etc.)
  - Alternativa simple: mostrar `volumeKm` del `PlanWeek` que ya existe en DB.

- [ ] **Integracion Strava — importar actividades automaticamente**
  - OAuth Strava → guardar `stravaAccessToken` en User
  - Webhook Strava: al completar actividad → crear/actualizar `SessionLog` automaticamente
  - Sin esto el log manual muere en semana 3. Es la causa #1 de churn en atletas con GPS watch.
  - Requiere: `StravaIntegration` model, webhook endpoint, token refresh.

- [ ] **Integracion Garmin Connect**
  - Misma logica que Strava pero via Garmin Health API.
  - Prioridad menor que Strava (Strava cubre el 80% del mercado runner LatAm).

### Felipe — coach con 22 atletas, Medellin

- [ ] **Alertas WhatsApp al coach cuando atleta hace check-in**
  - Twilio Business API o WATI (~$50/mes base)
  - Mensaje: "Miguel acabo de hacer su check-in. RPE: 9, energia: 3 — requiere atencion."
  - Link directo al panel del atleta.
  - Sin esto el coach no abre el dashboard. Es el canal donde vive.

- [ ] **Finanzas: exportar historial a CSV**
  - Boton "Exportar CSV" en `/coach/finanzas`
  - Columnas: atleta, monto, moneda, estado, fecha vencimiento, fecha pago
  - Sin dependencias externas (solo formateo de string).

- [ ] **Finanzas: generar recibo PDF por pago**
  - Libreria: `@react-pdf/renderer` o `jspdf`
  - Template: logo Medaliq, datos coach, datos atleta, descripcion, monto, fecha.
  - Descarga directa desde el panel de pagos.

- [ ] **Importar plan desde plantilla CSV/Excel**
  - Coach puede subir un CSV con columnas: semana, dia, tipo, duracion, zona, descripcion
  - Parser → llama `generatePlanUseCase` con sesiones custom
  - Desbloquea migracion de coaches con planes en Google Sheets.

- [ ] **Notificacion in-app al coach cuando atleta completa sesion**
  - Badge en sidebar coach + feed en dashboard
  - Modelo `Notification { coachId, athleteId, type, ref, readAt? }`
  - Refuerza el loop de engagement coach-atleta dentro de la app.

### Mateo — gym B2C, Cali

- [ ] **Gym session interactiva en mobile**
  - Pantalla `/gym/session` equivalente a la web (sets, reps, peso, timer descanso)
  - Prioridad maxima para el segmento fuerza B2C.
  - Sin esto este segmento va a Strong o Hevy. No hay retencion posible.
  - Stack: React Native + Expo + mismo endpoint `POST /api/gym/session/complete`

- [ ] **Sugerencia de peso para siguiente serie**
  - Si el usuario completo todas las reps del objetivo → mostrar "+2.5 kg la proxima vez"
  - Ya existe logica en web (`suggestion "+2.5kg"`), llevar a mobile.

- [ ] **Historial de ejercicio por movimiento**
  - Al tocar un ejercicio → ver grafico de progreso de ese ejercicio (peso max por fecha)
  - Fuente: `SetLog` filtrado por `exerciseName`
  - Muy valorado por usuarios de fuerza (ver si estan progresando en sentadilla, press, etc.)

---

## P2 — Deuda tecnica

- [ ] Tests E2E: flujo B2B completo, invite code, generacion de plan
- [x] `daily-target.ts:65` REST carbs → ya `*0.7` en ambos archivos (consistente)
- [x] `CoachAthlete` → `onDelete: Cascade` aplicado en coach y atleta

---

## P3 — Mejoras de producto

- [ ] Medidas corporales en check-in (waist, arms, hips, legs) — migracion DB + UI
- [ ] Fotos de progreso — Vercel Blob + ProgressPhoto model
- [ ] Records personales gym (isPR detection en SetLog)
- [x] Resumen semana determinista en dashboard (sin AI) — `buildWeeklySummary()` en dashboard/page.tsx
- [ ] Fallback plan de comidas sin AI (plantillas estaticas)
- [ ] `sportLabel String?` en PlannedSession — migracion pendiente
- [x] Email: welcome coach (registro), welcome atleta B2B (nuevo), asignacion coach (atleta existente) — trial expirando pendiente
- [x] Forgot password web + mobile — flujo completo (JWT 1h + Resend + pantalla mobile)
- [ ] AI Coach contextualizado: inyectar semana del plan + sesion hoy + ultimo check-in + prompts sugeridos

---

## Completado reciente

- [x] **Infraestructura email** — Resend configurado, dominio verificado, DNS en Route53, RESEND_API_KEY en Vercel
- [x] **Registro coach publico** — selector Atleta/Coach en /register, redirect correcto por rol
- [x] **Emails transaccionales** — welcome coach, welcome atleta B2B (nuevo), asignacion coach (atleta existente), forgot password
- [x] **Banner first-time experience coach** — dashboard cuando no tiene atletas con CTA de invitacion
- [x] **Branch naming convention** — CLAUDE.md + `.githooks/pre-push` + GitHub ruleset
- [x] Scope reduction: solo Running + Gym · DB intacta · UI limpia (web + mobile)
- [x] FoodLog, GymSession, TrainingPlan → constraints de unicidad (migracion 20260623000002)
- [x] CheckInClient.tsx dividido en componentes
- [x] Paginacion panel atleta (1 semana a la vez con navegacion)
- [x] FoodSetupFlow → alimentos dinamicos desde DB
- [x] 11 endpoints mobile → `rateLimitAsync` en todos
- [x] 135 tests pasando · build limpio · TypeScript limpio
