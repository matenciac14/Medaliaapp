# Medaliq — Flujos del Producto

> Documento vivo. Actualizar cuando cambie la lógica de negocio o de producto.
> Última actualización: 2026-05-29

---

## Flujo 1 — Atleta B2C (sin coach)

```
REGISTRO
  │
  ├─ Email + password → POST /api/auth/register
  │   role: ATHLETE, config: defaults (features all false)
  │
  ▼
ONBOARDING (8 pasos — src/app/onboarding/page.tsx)
  │
  ├─ Paso 1: main-goal → SPORT o BODY
  │
  ├─ SPORT path:
  │   main-goal → sport-select → sport-details → physical
  │             → hr-fitness → schedule → health → generating
  │
  ├─ BODY path:
  │   main-goal → body-goal → sport-details → physical
  │             → hr-fitness → schedule → health → generating
  │
  ├─ "generating": POST /api/onboarding/generate
  │   1. Upsert HealthProfile (sport, experienceLevel, sportDetails, dataSources)
  │   2. Selecciona template por goalType
  │   3. Calcula hrMax (Tanaka), zonas FC (Karvonen)
  │   4. Calcula TDEE (Mifflin-St Jeor) + macros hard/easy/rest
  │   5. Llama Claude Haiku → 3 recomendaciones personalizadas
  │   6. Crea en DB: TrainingPlan → PlanWeeks → PlannedSessions
  │      (PlannedSession.intensity auto-asignado por SessionType)
  │   7. Crea NutritionPlan
  │   8. Activa: trial.plan='TRIAL', trial.endsAt=+30d, features all true
  │   9. Refresca JWT (role, onboardingCompleted, trialEndsAt, userPlan)
  │
  ▼
DASHBOARD ATLETA (/dashboard)
  │
  ├─ Card "Hoy": sesión del plan + kcal objetivo según intensity
  │   HIGH   → targetKcalHard + "Día de ALTA carga"
  │   MODERATE → targetKcalEasy + "Día de carga media"
  │   LOW    → targetKcalEasy - 200 + "Día suave"
  │   REST   → targetKcalRest + "Día de descanso"
  │
  ├─ Métricas: peso, FC reposo, adherencia, semana del plan
  │
  ▼
CICLO SEMANAL
  │
  ├─ [Diario] Atleta entrena → log sesión (/log)
  │   RPE, FC media, FC max, distancia, duración, notas
  │   plannedSessionId linkea sesión real con la planificada
  │
  ├─ [Semanal] Check-in (/checkin)
  │   peso, FC reposo, sueño, energía, adherencia dieta, dolor
  │   → Motor de alertas: RPE>8, adherencia<60%, peso↓mucho
  │   → Claude Haiku analiza → recomendación de ajuste de plan
  │
  ├─ [Diario] Métricas diarias (/profile)
  │   DailyLog: peso, FC reposo, horas sueño, energía 1-5
  │
  ├─ [Anytime] AI Coach chat (/dashboard → chat)
  │   Context: HealthProfile + plan activo + último check-in + restricciones médicas
  │   Trial: ilimitado (monthlyLimit=999999)
  │   Pro: 100 msgs/mes
  │   Free: bloqueado (monthlyLimit=0)
  │
  ▼
TRIAL EXPIRA (30 días)
  │
  ├─ Middleware detecta: trialEndsAt < now + role=ATHLETE + plan=TRIAL
  │   → redirige a /upgrade
  │
  ├─ /upgrade: opciones
  │   [Pro $15/mes] → Wompi → webhook → features re-activadas, plan=PRO
  │   [Seguir gratis] → downgrade → features plan/checkin/nutrition/progress=false
  │
  └─ FREE post-trial:
      dashboard básico + log manual + perfil
      AI chat: bloqueado
      Plan/checkin/nutrición/progreso: paywalls inline
```

---

## Flujo 2 — Coach B2B (coach con asesorados)

```
REGISTRO COACH
  │
  ├─ Email + password → POST /api/auth/register (role=COACH)
  │   Sin onboarding — middleware redirige directo a /coach/dashboard
  │
  ▼
SETUP COACH
  │
  ├─ Perfil público (/coach/profile)
  │   slug, bio, especialidades, ciudad, WhatsApp, Instagram
  │   → CoachProfile en DB → visible en /coaches y /p/[slug]
  │
  ├─ Librería de ejercicios (/coach/gym/exercises)
  │   39 globales de seed + personalizados por coach
  │
  ▼
CREAR ASESORADO
  │
  ├─ Opción A: Coach crea directamente (/coach/clients/new)
  │   Genera credenciales temporales para el atleta
  │
  ├─ Opción B: Atleta se une por código (/join/[code])
  │   Coach genera código en /coach/invite
  │
  ├─ Opción C: Atleta se une desde marketplace (/p/[slug])
  │   POST /api/coach/join
  │
  ▼
ATLETA HACE ONBOARDING
  │
  ├─ Igual que B2C pero:
  │   generator.ts detecta relación CoachAthlete → generatedBy='COACH'
  │   NO llama a Haiku, NO activa trial, NO activa features
  │   API devuelve isB2B=true
  │   handleGenerate → router.push('/pending')
  │
  ├─ Atleta queda en /pending (polling 10s hasta activación)
  │
  ▼
COACH CONSTRUYE EL PLAN (constructor visual)
  │
  ├─ Panel atleta → Tab Plan → "Constructor visual"
  │   → /coach/athlete/[id]/plan/build
  │
  ├─ Elige punto de partida:
  │   [Desde template] → genera PlanWeeks+Sessions precargadas → abre en builder
  │   [Plan en blanco]  → N semanas vacías → coach construye desde cero
  │
  ├─ Constructor (página separada, full-screen):
  │   WeekNav: semana actual + mini-overview todas las semanas
  │   WeekGrid: 7 columnas (L-D), cards de sesión
  │   SessionCard: type badge, duration, intensity, sportLabel, edit/delete
  │   SessionModal: type, durationMin, intensity, sportLabel, zoneTarget, structure, coachNote
  │   WeekMetaBar: phase, volumeKm, isRecoveryWeek toggle
  │   Acciones: "Copiar semana anterior", "Limpiar semana"
  │
  ├─ Coach guarda → POST /api/coach/athlete/[id]/plan/custom
  │   Transacción: TrainingPlan + PlanWeeks + PlannedSessions
  │
  ▼
COACH ACTIVA AL ATLETA
  │
  ├─ Tab Resumen → "Activar cuenta"
  │   PATCH /api/coach/athlete/[id]/activate
  │   → features.plan=true, onboardingCompleted=true
  │   → JWT refreshed → atleta sale de /pending → /dashboard
  │
  ▼
CICLO DE COACHING SEMANAL
  │
  ├─ Coach ve dashboard: lista de asesorados con adherencia y alertas
  │
  ├─ Atleta entrena, logea, hace check-in (igual que B2C)
  │
  ├─ Coach revisa en panel del atleta:
  │   Tab Resumen: alertas, check-ins, zonas FC
  │   Tab Plan:    semanas con sesiones + notas del coach por sesión
  │   Tab Progreso: gráficas peso/FC/km/adherencia
  │   Tab Nutrición: TDEE, macros, editor de targets
  │   Tab Gym:     progresión de cargas, última sesión
  │
  ├─ Coach ajusta plan:
  │   Builder → editar sesiones → guardar cambios
  │   PlannedSession PATCH/DELETE en tiempo real
  │
  ├─ Coach registra benchmarks de rendimiento:
  │   PerformanceBenchmark: 5K time, FTP, 1RM, CSS
  │   → se usa para re-calibrar zonas del plan
  │
  ▼
FACTURACIÓN (post Fase 13)
  │
  ├─ Medaliq cobra al coach: $6/asesorado activo/mes (1-50 atletas)
  └─ Atleta Pro paga a Medaliq: $15/mes (si se originó del marketplace)
```

---

## Flujo 3 — Integración Entrenamiento-Nutrición

```
FUNDAMENTO: Cada PlannedSession tiene intensity (HIGH|MODERATE|LOW|REST)
La nutrición del día se DERIVA de la sesión planificada para ese día.

GENERACIÓN DEL PLAN
  │
  ├─ generator.ts auto-asigna intensity por SessionType:
  │   HIGH:     INTERVALOS, TIRADA_LARGA, SIMULACRO, TEST
  │   MODERATE: TEMPO, FARTLEK, CICLA, NATACION, FUERZA (pesado)
  │   LOW:      RODAJE_Z2, FUERZA (técnico/ligero)
  │   REST:     DESCANSO
  │
  ▼
DASHBOARD ATLETA — CARD "HOY"
  │
  ├─ Busca PlannedSession de hoy (date = today)
  │
  ├─ Mapea intensity → target nutricional:
  │   HIGH     → NutritionPlan.targetKcalHard  + NutritionPlan.carbsHardG
  │   MODERATE → NutritionPlan.targetKcalEasy  + NutritionPlan.carbsEasyG
  │   LOW      → targetKcalEasy - 200          + carbsEasyG - 30
  │   REST     → NutritionPlan.targetKcalRest  + NutritionPlan.carbsEasyG (bajo)
  │   (sin sesión) → targetKcalRest
  │
  ├─ UI muestra:
  │   [INTERVALOS 800m — 60 min — Z4]          [DIA DE ALTA CARGA]
  │   Kcal objetivo hoy:    2.850               Carbos pre-entreno: 340g
  │   Proteína:             160g                [Ver plan de comidas →]
  │
  ▼
SEMANA VISTA — COACH
  │
  ├─ Panel atleta Tab Plan → vista semanal:
  │   Semana 7 — DESARROLLO
  │   LUN  MARTES  MIE  JUE  VIE  SAB  DOM
  │   Z2   INTV    -    Z2   -    LARG REST
  │   HIGH  HIGH  LOW  MOD  LOW  HIGH  REST
  │
  ├─ Carga semanal total = suma de intensity scores:
  │   HIGH=3, MODERATE=2, LOW=1, REST=0
  │   Semana 7: 3+3+1+2+1+3+0 = 13 puntos
  │   Semana anterior: 11 → incremento 18% (OK, regla del 10%)
  │
  ├─ Alerta automática si incremento semanal > 20%
  │
  ▼
NUTRICIÓN POR FASE (coach configura)
  │
  ├─ Tab Nutrición del panel atleta:
  │   Coach puede ajustar targets por fase del plan:
  │   BASE:       TDEE - 200 (déficit suave)
  │   DESARROLLO: TDEE (mantenimiento)
  │   ESPECIFICO: TDEE + 100 (rendimiento máximo)
  │   AFINAMIENTO: TDEE - 100 (control peso pre-carrera)
  │
  └─ Macros calculados automáticamente al cambiar los targets
```

---

## Flujo 4 — Constructor Visual de Planes (detalle UX)

```
ENTRADA
  │
  ├─ Tab Plan del atleta → "Crear plan" →
  │   ┌────────────────────┐  ┌────────────────────────┐
  │   │  Generar desde     │  │  Constructor visual    │
  │   │  template          │  │  (recomendado)         │
  │   │  Rápido, 30 seg    │  │  Control total         │
  │   └────────────────────┘  └────────────────────────┘
  │             │                         │
  │    genera plan con                  abre builder
  │    template existente               con plan vacío
  │    → abre en builder                (N semanas)
  │    precargado
  │
  ▼
PÁGINA BUILDER (/coach/athlete/[id]/plan/build)
  │
  ├─ HEADER:
  │   "Plan de [Nombre atleta]"
  │   Nombre del plan: [input]
  │   Fecha inicio: [datepicker]
  │   Duración: [selector semanas: 8/12/16/18/24]
  │   [Guardar plan ▶]
  │
  ├─ WEEK NAV (sidebar o top bar):
  │   S1  S2  S3  S4  S5  S6  ...  S18
  │   ●   ●   ●   ○   ○   ○        ○
  │   (● = semana con sesiones configuradas)
  │   Fase actual: [BASE ▼]  Semana de recuperación: [toggle]
  │
  ├─ WEEK GRID (area principal):
  │   LUN    MAR    MIE    JUE    VIE    SAB    DOM
  │  ┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐┌─────┐
  │  │FUER ││ Z2  ││     ││TEMP ││     ││LARG ││REST │
  │  │60m  ││50m  ││  +  ││50m  ││  +  ││90m  ││     │
  │  │MOD  ││LOW  ││     ││HIGH ││     ││HIGH ││     │
  │  │✏ 🗑 ││✏ 🗑 ││     ││✏ 🗑 ││     ││✏ 🗑 ││     │
  │  └─────┘└─────┘└─────┘└─────┘└─────┘└─────┘└─────┘
  │   Carga semana: 11 pts  Volumen est.: 38 km
  │
  ├─ SESSION MODAL (click en + o ✏):
  │   Tipo de sesión:    [TEMPO ▼]
  │   Etiqueta sport:    [Sweet Spot 2×20min]  (libre, opcional)
  │   Duración:          [50] min
  │   Intensidad:        [●HIGH  ●MODERATE  ○LOW  ○REST]
  │   Zona objetivo:     [Z3-Z4]
  │   Estructura:        [textarea — descripción detallada]
  │   Nota del coach:    [textarea — visible al atleta]
  │   [Cancelar]  [Guardar sesión]
  │
  ├─ ACCIONES POR SEMANA:
  │   [Copiar semana anterior]  — duplica todas las sesiones
  │   [Aplicar template]        — precarga sesiones del template para esa semana
  │   [Limpiar semana]          — elimina todas las sesiones
  │
  ▼
GUARDAR PLAN
  │
  ├─ POST /api/coach/athlete/[id]/plan/custom
  │   Body: { name, startDate, totalWeeks, goalType, weeks: [...] }
  │   Transacción DB:
  │   1. TrainingPlan.create
  │   2. PlanWeek.createMany
  │   3. PlannedSession.createMany (con intensity y sportLabel)
  │
  ├─ Redirect → /coach/athlete/[id] (Tab Plan)
  └─ Plan visible inmediatamente, coach puede seguir editando
```

---

## Flujo 5 — Monetización

```
ATLETA
  │
  ├─ Trial 30d (al completar onboarding B2C)
  │   features: todas activas
  │   AI chat: ilimitado (monthlyLimit=999999)
  │   trialEndsAt = now + 30d
  │
  ├─ Trial expira → /upgrade
  │   ┌──────────────────────┐   ┌────────────────────────┐
  │   │      PRO             │   │        FREE            │
  │   │   $15 USD/mes        │   │    $0 para siempre     │
  │   │   Todo activo        │   │    Solo dashboard      │
  │   │   AI 100 msgs/mes    │   │    Log manual          │
  │   │   [Suscribirme]      │   │    Sin AI, sin plan    │
  │   └──────────────────────┘   └────────────────────────┘
  │
  ├─ PRO: Wompi (Colombia) → webhook → plan='PRO', features=true
  ├─ FREE: downgrade → plan='FREE', features.plan/checkin/nutrition/progress=false
  │
COACH
  │
  ├─ Registro gratuito
  ├─ Facturación mensual por asesorados directos ACTIVOS:
  │   1-50 atletas:    $6 USD/atleta/mes
  │   51-100 atletas:  $5 USD/atleta/mes + AI assistant gratis
  │   +100 atletas:    $3 USD/atleta/mes + AI assistant gratis
  │
  ├─ Atletas del marketplace (CoachAthlete.source='MARKETPLACE'):
  │   Medaliq cobra $15/mes al atleta → split con coach
  │
  └─ Atletas directos (CoachAthlete.source='DIRECT'):
      Medaliq cobra fee mensual al coach
```

---

## Flujo 6 — Mobile (React Native + Expo)

```
FASE 1 — PWA (testing inmediato, Fase 12)
  │
  ├─ manifest.json + service worker + meta tags iOS
  ├─ medaliq.com instalable desde Safari/Chrome
  ├─ Icono en home screen, full-screen
  ├─ Offline básico para gym tracker (IndexedDB)
  └─ Sin App Store, sin review

FASE 2 — Expo Setup (Fase 16A)
  │
  ├─ Monorepo pnpm:
  │   apps/web     → Next.js actual (sin cambios)
  │   apps/mobile  → Expo managed workflow
  │   packages/shared-types → WizardData, UserConfig, Plan types
  │   packages/api-client   → fetch client tipado, base URL configurable
  │
  ├─ NativeWind → clases Tailwind en React Native
  ├─ EXPO_PUBLIC_API_URL → apunta a medaliq.com
  └─ Test en dispositivo: Expo Go (sin publicar en stores)

FASE 3 — Core Mobile (Fase 16B)
  │
  ├─ Auth: email/password → JWT en expo-secure-store (NO cookies)
  ├─ Bottom tabs: Dashboard | Plan | Gym | Nutrición | Perfil
  ├─ Dashboard: sesión de hoy + kcal objetivo + métricas
  ├─ Plan: scroll horizontal semanas + sheet modal por sesión
  ├─ Gym tracker: OFFLINE-FIRST (AsyncStorage → sync al reconectar)
  │   sets/reps/peso locales primero, timer de descanso nativo
  ├─ Check-in: sliders nativos para energía/RPE
  ├─ AI Coach chat: streaming SSE, mismo endpoint /api/ai/chat
  └─ Push notifications: recordatorio sesión del día (expo-notifications)

FASE 4 — Stores (Fase 16D)
  │
  ├─ Apple Developer Account ($99/año)
  ├─ Google Play Developer Account ($25 único)
  ├─ EAS Build → builds en la nube sin Xcode local
  ├─ TestFlight → beta iOS (hasta 10k testers sin review)
  ├─ Google Play Internal Testing → APK en Android real
  └─ App Store / Google Play review y publicación
```

---

## Modelo de Datos — Vista Relacional

```
User (ATHLETE/COACH/ADMIN)
  │
  ├─── HealthProfile (1:1)
  │      sport, experienceLevel, sportDetails JSON
  │      hrMax, hrResting, ftp, injuries, conditions
  │
  ├─── TrainingPlan (1:many)
  │      generatedBy: AI | COACH | AI_COACH_APPROVED
  │      └─ PlanWeek (18)
  │           phase: BASE|DESARROLLO|ESPECIFICO|AFINAMIENTO
  │           volumeKm, isRecoveryWeek
  │           └─ PlannedSession (many)
  │                type: SessionType enum
  │                intensity: HIGH|MODERATE|LOW|REST  ← nuevo
  │                sportLabel: String?                ← nuevo
  │                durationMin, zoneTarget, structure
  │                coachNote
  │                └─ SessionLog (1:1) ← lo que realmente hizo
  │                     rpe, hrAvg, distanceKm
  │
  ├─── NutritionPlan (1:1)
  │      tdee, targetKcalHard, targetKcalEasy, targetKcalRest
  │      proteinG, carbsHardG, carbsEasyG, fatG
  │      [SYNC] intensity del día → target del día
  │
  ├─── FoodProfile + MealPlan (1:1 cada uno)
  │      availableFoods, restrictions, mealsPerDay
  │      MealPlan.data: { hard: DayMeals, easy: DayMeals, rest: DayMeals }
  │
  ├─── WeeklyCheckIn (1:many)
  │      peso, FC, sueño, RPE, adherencia, dolor
  │      [TRIGGER] → motor de alertas → AI recomienda ajuste
  │
  ├─── DailyLog (1:many por fecha)
  │      peso, FC reposo, sueño, energía
  │
  ├─── PerformanceBenchmark (1:many) ← nuevo
  │      sport, metric, value, testedAt
  │      [USO] → calibrar zonas FC/potencia/ritmo del plan
  │
  ├─── CoachAthlete (many:many via pivot)
  │      coachId, athleteId
  │      coachGoal, privateNotes ← nuevo
  │      status: ACTIVE|PAUSED|COMPLETED ← nuevo
  │
  └─── GymSession → SetLog (gym tracker offline-first en mobile)
         sets, reps, weightKg, completed
```
