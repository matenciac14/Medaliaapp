# Medaliq — Backlog

*Ultima actualizacion: 2026-06-25*

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

- [ ] **Mensajeria coach-atleta** (PRIORIDAD 1 post-P0)
  - Modelo `Message(id, fromId, toId, content, readAt, createdAt)`
  - API: `GET /api/messages?with=[userId]` · `POST /api/messages` · `PATCH /api/messages/read` · `GET /api/messages/unread-count`
  - UI web: tab "Mensajes" en `/coach/athlete/[id]` + seccion en dashboard atleta con badge
  - UI mobile: pantalla nueva `/(app)/(tabs)/messages.tsx`
  - Sin WebSockets — polling 30s es suficiente para v1

- [ ] **GIFs de ejercicio**
  - ExerciseDB (RapidAPI): 1,300+ GIFs con modelo 3D
  - Estrategia: agregar `gifUrl String?` a `Exercise` + script batch import (cachear en DB, no llamar en runtime)
  - UI: modal al tocar nombre del ejercicio en gym/session y coach routines

- [ ] **Modulo finanzas coach** (registro manual, NO pasarela de pagos)
  - Modelo `Payment(id, coachAthleteId, amount, currency, dueDate, paidAt, status, notes, createdAt)`
  - `enum PaymentStatus { PAID | PENDING | OVERDUE }`
  - UI: tab "Finanzas" en sidebar coach · tabla estado por atleta · badge mora en panel atletas

- [ ] **Email transaccional (Resend)**
  - Templates: check-in recordatorio (dom 18:00), sesion del dia (lun 7am), pago vencido
  - Implementar con Vercel Cron

- [ ] **`/join/[code]` con branding del coach**
  - Mostrar foto, nombre, bio, especialidades del coach (datos ya existen en CoachProfile)

---

## P2 — Deuda tecnica

- [ ] Tests E2E: flujo B2B completo, invite code, generacion de plan
- [ ] `daily-target.ts:65` REST carbs `*0.6` → unificar a `*0.7` (inconsistencia con nutrition/page.tsx)
- [ ] `CoachAthlete` sin `onDelete: Cascade` → huerfanas si se elimina coach

---

## P3 — Mejoras de producto

- [ ] Medidas corporales en check-in (waist, arms, hips, legs) — migracion DB + UI
- [ ] Fotos de progreso — Vercel Blob + ProgressPhoto model
- [ ] Records personales gym (isPR detection en SetLog)
- [ ] Resumen semana determinista en dashboard (sin AI)
- [ ] Fallback plan de comidas sin AI (plantillas estaticas)
- [ ] `sportLabel String?` en PlannedSession — migracion pendiente
- [ ] Email: welcome, activacion B2B, trial expirando
- [ ] Forgot password (web + mobile)
- [ ] AI Coach contextualizado: inyectar semana del plan + sesion hoy + ultimo check-in + prompts sugeridos

---

## Completado reciente

- [x] Scope reduction: solo Running + Gym · DB intacta · UI limpia (web + mobile)
- [x] FoodLog, GymSession, TrainingPlan → constraints de unicidad (migracion 20260623000002)
- [x] CheckInClient.tsx dividido en componentes
- [x] Paginacion panel atleta (1 semana a la vez con navegacion)
- [x] FoodSetupFlow → alimentos dinamicos desde DB
- [x] 11 endpoints mobile → `rateLimitAsync` en todos
- [x] 135 tests pasando · build limpio · TypeScript limpio
