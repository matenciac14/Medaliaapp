# Medaliq — Flujos del Sistema

> Revisado contra código real el 2026-06-23.
> Toda función y ruta aquí mencionada fue verificada en el código fuente.
> NO es una descripción de intención — es lo que el código hace hoy.

---

## 1. REGISTRO

```
POST /api/auth/register
  rateLimitAsync(`register:${ip}`, { limit: 5, windowMs: 60s })
  validate(name, email, password)
  prisma.user.findUnique({ where: { email } })    ← check duplicado
  bcrypt.hash(password, 12)
  prisma.user.create({
    role: 'ATHLETE',                 ← público siempre es ATHLETE
    config: DEFAULT_USER_CONFIG      ← onboarding.completed: false
  })                                    features.aiPlan/aiCoach: false
                                        ai.monthlyLimit: 0
```

COACH y ADMIN se crean solo desde admin panel o manualmente en DB.

---

## 2. LOGIN + JWT

```
Auth.js v5 (next-auth@beta) — estrategia JWT

src/auth.config.ts   ← Edge-safe (NO Prisma) — usado en middleware
src/auth.ts          ← Full (PrismaAdapter) — usado en API routes y Server Components

JWT payload:
  id, email, name, role, image
  onboardingCompleted  ← User.config.onboarding.completed
  activated            ← User.config.features.plan (false solo B2B sin activar)
  userPlan             ← getUserPlan(features): 'PRO' si aiPlan||aiCoach, 'FREE' sino
```

No existe campo `trial` ni `trialEndsAt` en el JWT ni en UserConfig.
El tier se deriva de `features.aiPlan` y `features.aiCoach`.

---

## 3. MIDDLEWARE (protección de rutas)

```
middleware.ts — Edge Runtime
Matcher: toda ruta excepto _next/static, imágenes

Decisiones en orden:
1. !isLoggedIn + !isPublicRoute            → /login
2. isLoggedIn + !onboardingCompleted       → /onboarding
3. ATHLETE + onboardingCompleted + !activated → /pending   (B2B esperando coach)
4. /coach/* + role !== COACH              → /dashboard
5. /admin/* + role !== ADMIN              → /dashboard
6. ADMIN + !(admin|public|api)            → /admin
7. COACH + /dashboard                     → /coach/dashboard
8. COACH + /onboarding                    → /coach/dashboard

Public routes: /, /login, /register, /api/*, /join/*, /coaches, /p/*
```

NOTA: No hay check de trial expirado en middleware.
La lógica de upgrade está inline en cada página individual.

---

## 4. ONBOARDING

### 4a. Wizard
```
/onboarding/page.tsx (Client Component self-contained)
getSteps(data: WizardData) → pasos dinámicos

Flujos de pasos:
  FREE:          health-goal → physical → generating
  Con deporte:   health-goal → has-sport → sport-select → sport-details
                 → physical → hr-fitness → schedule → health → plan-method → generating
  MUSCLE_GAIN:   health-goal → has-sport → physical → plan-method → generating
  Otro sin dep:  health-goal → has-sport → physical → hr-fitness
                 → schedule → health → plan-method → generating

handleGenerate() deriva mainGoal antes de enviar:
  healthGoal='FREE'   → mainGoal='FREE'
  hasSport=true       → mainGoal='SPORT'
  MUSCLE_GAIN         → mainGoal='GYM'
  otros sin deporte   → mainGoal='BODY'

→ POST /api/onboarding/generate
→ if isB2B  → router.push('/pending')
→ if !isB2B → router.push('/dashboard')
```

### 4b. API
```
POST /api/onboarding/generate
  rateLimitAsync(`onboarding:${ip}`, { limit: 3, windowMs: 60s })
  validate(age, weightKg, heightCm)
  auth() → session.user.id
  completeOnboardingUseCase(data, userId, deps)
  → { success: true, isB2B, planId }
```

### 4c. completeOnboardingUseCase — 4 rutas
```
src/domain/onboarding/complete-onboarding.use-case.ts

RUTA FREE (healthGoal === 'FREE'):
  checkIsB2B(db, userId)
  calculateTDEE + calculateMacros
  Promise.all([upsertNutrition, upsertProfile])
  userRepo.updateConfig(features: all-on, onboarding: completed)
  return { isB2B, planId: null }

RUTA GYM (mainGoal === 'GYM'):
  [igual que FREE]
  sport: { type: 'STRENGTH', goal: 'BODY_RECOMPOSITION' }
  return { isB2B, planId: null }

RUTA B2B (CoachAthlete existe para ese userId):
  healthProfileRepo.upsertProfile(fullProfile)
  userRepo.updateConfig({ onboarding: { completed: true } })
  // NO activa features — el coach lo hace manualmente
  return { isB2B: true, planId: null }

RUTA SPORT/BODY (B2C):
  healthProfileRepo.upsertProfile(fullProfile)
  checkIsB2B → false
  → generatePlanUseCase(input, deps)
  return { isB2B: false, planId }
```

### 4d. generatePlanUseCase — 4 fases
```
src/domain/plan/generate-plan.use-case.ts

FASE 1 — Computación pura (sin I/O):
  getTemplate(goalType)           ← plantilla por deporte/objetivo
  estimateHRMax(age)              ← 211 - 0.64×age (si user no proporcionó hrMax)
  calculateHRZones(hrMax, hrResting)
    → Karvonen si hrResting > 0
    → % simple de hrMax si hrResting === 0
  calculateTDEE(weight, height, age, gender, daysPerWeek)  ← Mifflin-St Jeor
  calculateMacros(tdee, weight, hasWeightGoal)
    → proteína: 2g/kg siempre
    → carbos: 50% kcal (duro), 35% (fácil), 25% (descanso)
    → déficit: -500 kcal si hasWeightGoal

FASE 2 — AI (FUERA del transaction):
  AI_ONBOARDING_ENABLED = false   ← DESHABILITADO — recommendations = []
  // Cuando se active: getCachedSystemConfig → buildPlanSystemPrompt
  //                  → aiService.generateRecommendation → JSON {recommendations}

FASE 3 — $transaction({ timeout: 30s }):
  repo.deactivateUserPlans(userId)          ← ACTIVE → COMPLETED
  repo.createPlan({ name: 'Plan GOALTYPE — fecha', generatedBy })
  repo.createWeeks(weekData[])
  repo.createSessions(allSessions[])
    session.date = sessionDate(planStart, weekIdx, dayOfWeek)
    session.intensity = getSessionIntensity(session.type)
  repo.upsertNutrition(userId, targets)

FASE 4 — Config update (fuera del tx):
  parseUserConfig(existingUser.config)
  resolveSportConfig(goalType) → { sportType, sportGoal }
  updateConfig({
    features: { plan, checkin, nutrition, progress, log, gym: true }  // solo B2C
    onboarding: { completed: true }
    plan: { activePlanId, currentWeek: 1, totalWeeks, phase: 'BASE' }
    sport: { type: sportType, goal: sportGoal }
  })
```

### Templates disponibles
```
GoalType               Template              Semanas
RACE_5K               → FIVE_K_8W               8
RACE_10K              → TEN_K_12W              12
RACE_HALF_MARATHON    → HALF_MARATHON_18W      18
RACE_MARATHON         → HALF_MARATHON_18W      18
BODY_RECOMPOSITION    → BODY_RECOMPOSITION_16W 16
STRENGTH_TRAINING     → BODY_RECOMPOSITION_16W 16

Scope actual: solo RUNNING + STRENGTH. CYCLING, SWIMMING, TRIATHLON, FOOTBALL
eliminados de UI. Enums y datos historicos siguen en DB.
```

---

## 5. DASHBOARD ATLETA

```
/dashboard/page.tsx (Server Component — SSR completo)

auth() → userId
searchParams.weekOffset (default 0)

PARALLEL READS (6 queries simultáneas):
  user + profile + checkIns(last 10) + dailyLogs(last 1)
  trainingPlans(ACTIVE) con weeks+sessions+logs
  coachAthlete con coach.coachProfile
  assignedWorkout(isActive) con template.days.exercises
  nutritionPlan
  sessionLog(last 60)   ← para calcular streaks

POST-FETCH LÓGICA:

1. Duplicate plan resolution:
   Si >1 plan ACTIVE → queda el que tiene más SessionLogs
   Los otros → status = COMPLETED (fire-and-forget)

2. Plan lifecycle:
   rawWeek > totalWeeks AND now > endDate
   → trainingPlan.status = COMPLETED
   dashboardMode: 'TRAINING' | 'RECOVERY' (≤14d post-plan) | 'FREE'

3. Calendar strip:
   buildCalendarWeek(userId, weekOffset)
   → getWeekMonday(weekOffset)
   → diffDays = (monday - planStart) / 86400000
   → targetWeekNumber = floor(diffDays/7) + 1
   → PARALLEL:
       plannedSessions WHERE week.planId=X AND week.weekNumber=N  ← por weekNumber (NO por fecha)
       assignedWorkout con WorkoutDays
       gymSessions WHERE date BETWEEN lunes AND domingo           ← por fecha real
   → 7 CalendarDay objects: merge sport + gym por dayOfWeek (1=Lun…7=Dom)

4. Today nutrition target:
   getDailyNutritionTarget(todaySession.intensity, nutritionPlan)
   HIGH     → { kcal: targetKcalHard, carbs: carbsHardG }
   MODERATE → { kcal: targetKcalEasy, carbs: carbsEasyG }
   LOW      → { kcal: targetKcalEasy*0.88, carbs: carbsEasyG*0.75 }
   REST     → { kcal: targetKcalRest, carbs: carbsEasyG*0.6 }
```

---

## 6. CHECK-IN SEMANAL

```
POST /api/checkin          (web)
POST /api/mobile/checkin   (mobile — normaliza 1-5 → 1-10 vía scale5to10)

→ processCheckIn(input, deps)
  src/domain/check-in/process-check-in.use-case.ts

FASE 1 — Reads paralelos (FUERA del tx):
  checkInRepo.findLatest(userId)       ← HR y peso de semana anterior
  planRepo.findActive(userId)          ← plan + semana actual
  planRepo.getTrainingAdherence(...)   ← % sesiones completadas

FASE 2 — Evaluación + AI (FUERA del tx):
  evaluateCheckInRules(data, context) → { triggers, adjustments, severity }

  Triggers y condiciones:
  fc_alta           → heartRate > hrBaseline * 1.1
  sueno_bajo        → sleepHours < 6.5
  rpe_excesivo      → rpe >= 8 AND fase === 'BASE'
  dolor_activo      → painLevel >= 5        → severity: critical
  estres_alto       → stressLevel >= 8
  motivacion_baja   → motivation <= 3       (alerta solo, no modifica plan)
  nutricion_baja    → nutritionAdherence < 4/10
  perdida_peso_rap  → weightDrop > 1kg vs semana anterior
  energia_baja      → energyLevel <= 3

  buildSessionAdjustments(triggers):
  hasPain         = triggers.includes('dolor_activo')
  hasVolumeTrig   = energia_baja | sueno_bajo | fc_alta | estres_alto
  hasRpe          = triggers.includes('rpe_excesivo')
  volumeReduction = 0.85 (estres) | 0.80 (otros)

  Si triggers → aiService.generateRecommendation(prompt)  ← Haiku, falla silenciosa

FASE 3 — $transaction({ timeout: 30s }):
  txCheckIn.save(userId, { ...data, trainingAdherence, triggers, weekNumber })
    ← WeeklyCheckIn upsert por userId+weekNumber
    ← painDescription guardado (fix reciente)
    ← dietAdherencePct eliminado (bug fix: era trainingAdherence en columna equivocada)

  applySessionAdjustments(planId, nextWeek, triggers):
    hasPain + HIGH_INTENSITY → tipo RODAJE_Z2, intensity LOW, durationMin ≤ 40
    hasVolumeTrig            → durationMin *= volumeReduction
    hasRpe + zone            → bajar zona (Z4→Z3, Z3→Z2, Z2→Z1)
    [cualquier cambio]       → coachNote += '[AUTO] ...'

  syncWeight() si data.weight:
    healthProfileRepo.updateWeight(userId, newWeight)
    |newWeight - prev| >= 0.5kg → recalcular TDEE + macros → updateNutritionTargets

  Si primer check-in:
    userRepo.enableFeature(userId, 'progress')

RETURN: { weekNumber, triggers, adjustments, recommendation, severity, sessionsAdjusted }
```

---

## 7. AI COACH CHAT

```
POST /api/ai/chat  (streaming SSE)

auth()
rateLimitAsync(`ai-chat:${userId}`, { limit: 20, windowMs: 60s })

parseUserConfig(userRecord.config)
→ features.aiCoach === false → 402 (upgrade requerido)

checkMonthlyLimit(config):
  config.ai.messagesThisMonth >= config.ai.monthlyLimit → 429
  (FREE: limit=0, PRO: limit=100, trial activado: limit=999999)

PARALLEL:
  prisma.user.findUnique({ include: profile, goals(ACTIVE), plans(ACTIVE)+weeks, checkIns(last 1) })
  getCachedSystemConfig()   ← SystemConfig.aiProfile (cache en memoria)

systemPrompt = buildChatSystemPrompt(parseAIProfile(sysConfig))
             + buildAthleteContext(user)
messages = sanitizeMessages(rawMessages)

anthropic.messages.stream({
  model: getAIConfig().chatModel,     ← claude-sonnet por defecto
  max_tokens: aiConfig.maxTokensChat,
  system: systemPrompt,
  messages
})

ReadableStream chunks → cliente
On stream complete:
  prisma.user.update({ config.ai.messagesThisMonth++ })  ← fire-and-forget

Response headers: X-AI-Remaining, X-AI-Limit
```

---

## 8. NUTRICIÓN

```
/nutrition/page.tsx (Server Component)

PARALLEL:
  nutritionPlan = prisma.nutritionPlan.findUnique({ where: { userId } })
  todaySession  = prisma.plannedSession.findFirst({
    where: { date = today, week: { plan: { userId, status: ACTIVE } } }
    select: { intensity: true }   ← usa intensity, NO type
  })
  todayLogs = prisma.nutritionLog.findMany({ where: { userId, date: today } })

intensityToDayType(todaySession.intensity):
  HIGH  → 'hard'
  REST  → 'rest'
  otros → 'easy'

todayKcal:   hard→targetKcalHard | easy→targetKcalEasy | rest→targetKcalRest
todayCarbs:  hard→carbsHardG | easy→carbsEasyG | rest→Math.round(carbsEasyG * 0.7)

NOTA: daily-target.ts usa 0.6 para REST day carbs.
      nutrition/page.tsx usa 0.7. Inconsistencia conocida pendiente.
```

---

## 9. COACH DASHBOARD

```
/coach/dashboard/page.tsx (Server Component)

auth() → role === 'COACH' check

PARALLEL (7 queries):
  coachAthlete.findMany({ include: athlete+profile+plans(ACTIVE)+checkIns(last 2)+goals })
  coachAthlete.count({ ACTIVE })
  coachAthlete.count({ ACTIVE, checkIn.recordedAt >= hace 7d })
  coachAthlete.count({ createdAt >= mes actual })
  coachAthlete.count({ createdAt MES PASADO })
  weeklyCheckIn.findMany({ user.coachedBy=[coachId], take: 8 })   ← feed actividad
  healthProfile.findMany({ user.coachedBy=[coachId] })             ← distribución deporte

athletes = coachRelations.map(rel => mapRelation(rel, now)):
  alertFlags.noCheckin    → último checkIn.recordedAt > 7d
  alertFlags.highRpe      → checkIns[0].hardestSessionRpe >= 8
  alertFlags.weightDrop   → checkIns[0].weightKg - checkIns[1].weightKg < -1kg
  adherencePct            → sessionsWithLog / totalSessions * 100

KPIs (computados en memoria):
  ingresosMes   = totalCount * 6    ← $6 USD/atleta activo
  avgAdherence  = promedio(athletes.adherencePct)
  checkInsPct   = checkInsWeekCount / totalCount * 100
```

---

## 10. PANEL ATLETA (VISTA COACH)

```
/coach/athlete/[id]/page.tsx (Server Component)

auth() → coachId
params.id → athleteId

PARALLEL (6 queries):
  user (id, name, email, config)
  healthProfile
  trainingPlan (ACTIVE, include weeks+sessions)
  weeklyCheckIn (last 8, orderBy weekNumber desc)
  nutritionPlan
  coachAthlete.findFirst({ coachId, athleteId })  ← SECURITY CHECK

Si !coachAthlete → 403 (no autorizado)

→ AthleteDetailClient (Client Component, 5 tabs):
  Resumen  | Plan | Progreso | Nutrición | Gym
```

---

## 11. FLUJO B2B

```
1. COACH CREA ATLETA:
   /coach/clients/new
   → POST /api/coach/clients/create
   → prisma.user.create({ role: ATHLETE, config: B2B_config })
   → prisma.coachAthlete.create({ coachId, athleteId })
   // [pendiente] email con credenciales al atleta

2. ATLETA HACE ONBOARDING:
   → completeOnboardingUseCase detecta B2B via:
       prisma.coachAthlete.findFirst({ where: { athleteId: userId } })
   → upsertProfile (solo perfil)
   → updateConfig({ onboarding: { completed: true } })
   → NO activa features, NO genera plan
   → API devuelve { isB2B: true, planId: null }
   → handleGenerate() → router.push('/pending')
   → middleware: !activated → /pending

3. COACH ACTIVA ATLETA:
   PATCH /api/coach/athlete/[id]/activate
   → userRepo.enableFeature(userId, 'plan', 'checkin', 'nutrition', 'log', 'gym', 'progress')
   → JWT refreshed en siguiente login

4. COACH GENERA PLAN:
   POST /api/coach/athlete/[id]/plan
   → generatePlanUseCase({ generatedBy: 'COACH' })
   → isB2C = false → NO activa features, NO genera AI recs
   → $transaction: deactivate → createPlan → createWeeks → createSessions → upsertNutrition
   → updateConfig(plan.activePlanId = newId)
```

---

## 12. MOBILE

```
Auth:
  JWT firmado con jose (NO Auth.js)
  Payload: { id, email, name, role, onboardingCompleted, userPlan, features }
  Storage: expo-secure-store
  getMobileUser(req) → req.headers.Authorization: Bearer <token>

Endpoints /api/mobile/*:
  POST  /auth/login              ← email+password → JWT con features
  POST  /onboarding/generate     ← mismo use case que web
  GET   /dashboard               ← resumen home screen
  GET   /plan                    ← plan completo con semanas y sesiones + logs
  POST  /checkin                 ← normaliza 1-5→1-10, luego processCheckIn
  POST  /log/session             ← registrar sesión completada
  GET   /progress                ← historial de métricas
  GET   /nutrition               ← plan + log del día
  GET   /gym/week                ← schedule gym de la semana
  POST  /nutrition/log           ← loguear alimento
  GET   /dashboard/week-sessions ← sesiones de la semana
```

---

## 13. MAPA SessionType → Intensity → Nutrición

```
getSessionIntensity(type) → SessionIntensity:  [src/lib/plan/intensity.ts]
  INTERVALOS, TIRADA_LARGA, SIMULACRO, TEST → HIGH
  TEMPO, FARTLEK, CICLA, NATACION, FUERZA, OTRO → MODERATE
  RODAJE_Z2 → LOW
  DESCANSO → REST

intensityToDayType(intensity) → DayType:  [src/lib/nutrition/day-type.ts]
  HIGH → 'hard'  → targetKcalHard + carbsHardG
  REST → 'rest'  → targetKcalRest + carbsEasyG*0.6 (daily-target) / *0.7 (otros)
  otros→ 'easy'  → targetKcalEasy + carbsEasyG

Mapeo dominio → DB:
  PlannedSession.description ↔ DB.detailText
  PlannedSession.zone        ↔ DB.zoneTarget
  PlannedSession.coachNotes  ↔ DB.coachNote
  dayOfWeek: 1=Lun … 7=Dom  ← consistente en DB, dominio y templates
```

---

## 14. INCONSISTENCIAS CONOCIDAS

| # | Ubicación | Problema | Impacto |
|---|-----------|----------|---------|
| 1 | `daily-target.ts:65` | REST carbs: `carbsEasyG * 0.6` | Número diferente al que muestran nutrition page (`*0.7`) y calculate-food-log (`*0.7`) |
| 2 | `daily-target.ts:50` | LOW kcal: `targetKcalEasy * 0.88` | calculate-food-log usa `targetKcalEasy - 200` — mismo concepto, cálculo diferente |
| 3 | `middleware.ts` | Sin check de trial expirado | El upgrade se controla inline en páginas, no en middleware |
| 4 | `UserConfig` | No existe campo `trial` en el tipo | El tier PRO/FREE se deriva de `features.aiPlan\|\|aiCoach` |
| 5 | `generate-plan.use-case.ts:38` | `AI_ONBOARDING_ENABLED = false` | Sin recomendaciones AI en onboarding — preparado pero no activado |
| 6 | Templates | RACE_SWIMMING, RACE_FOOTBALL, RACE_TRIATHLON_SPRINT sin template propio | Todos reciben HALF_MARATHON_18W (18w running-focused) |
| 7 | `generate-plan.use-case.ts:194` | `resolveSportConfig(goalType, {} as any)` | Segundo argumento ignorado (prefixo `_data`), es safe pero código confuso |

---

## 15. ESTADO REAL POR FLUJO

| Flujo | Web | Mobile | Estado |
|-------|-----|--------|--------|
| Registro | ✅ | ✅ login | Completo |
| Onboarding | ✅ | ✅ | Completo |
| Generación plan | ✅ | via onboarding | Completo (AI recs OFF) |
| Dashboard atleta | ✅ | ✅ | Completo — calendario fixed |
| Plan view | ✅ | ✅ | Completo |
| Check-in | ✅ | ✅ | Completo — bugs fixes aplicados |
| AI Coach chat | ✅ | ✅ | Completo (gateado PRO) |
| Nutrición | ✅ | ✅ | Funcional (inconsistencia carbs REST) |
| Gym tracker | ✅ | parcial | Web completo |
| Coach dashboard | ✅ | N/A | Completo |
| Panel atleta coach | ✅ | N/A | Completo |
| B2B flow | ✅ | parcial | Completo (email pendiente) |
| Trial/Upgrade | ⚠️ inline | ❌ | Pendiente centralizar |
| Email transaccional | ❌ | ❌ | No implementado |
| Pagos (Stripe/Wompi) | ❌ | ❌ | No implementado |
