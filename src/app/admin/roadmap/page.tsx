// No DB queries — estado del producto hardcoded y actualizable manualmente

const PHASES = [
  {
    id: 'foundation',
    label: 'Fase 1 — Fundación',
    period: 'Completado',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    items: [
      { title: 'Auth completa (login, registro, JWT)', done: true, note: 'Email + Google OAuth placeholder' },
      { title: 'Onboarding wizard guiado — rediseñado salud + deporte opcional', done: true, note: 'Flujo nuevo: objetivo salud → ¿deporte? → físico → condición → disponibilidad → salud → generando. Sin day-schedule forzado. 5 pasos sin deporte, 7 con deporte.' },
      { title: 'Generador de plan AI (Haiku + templates)', done: true, note: '4 templates: media maratón, 10k, 5k, recomposición' },
      { title: 'Dashboard atleta con datos reales de DB', done: true, note: 'Fallback a mock si DB vacía' },
      { title: 'Calendario de plan (18 semanas, fases)', done: true, note: 'BASE → DESARROLLO → ESPECÍFICO → AFINAMIENTO' },
      { title: 'Registro de sesión (log de entreno)', done: true, note: 'Guarda en DB con RPE, FC, distancia' },
      { title: 'Check-in semanal + motor de alertas', done: true, note: 'Reglas deterministas + Claude Haiku para recomendación' },
      { title: 'Plan nutricional con AI', done: true, note: 'TDEE + macros + Haiku personaliza notas' },
      { title: 'Gráficas de progreso', done: true, note: 'Peso, FC reposo, km semana, adherencia, benchmarks' },
      { title: 'UserConfig JSON por usuario', done: true, note: 'Sidebar dinámico según features activas' },
    ],
  },
  {
    id: 'coach',
    label: 'Fase 2 — Coach B2B',
    period: 'En construcción',
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    items: [
      { title: 'Dashboard coach — vista de atletas', done: true, note: 'Adherencia, alertas, resumen por atleta' },
      { title: 'Panel coach — detalle de atleta (5 tabs)', done: true, note: 'Resumen, plan, progreso, nutrición, gym' },
      { title: 'Tab Gym en panel atleta del coach', done: true, note: 'Gráfica de progresión por ejercicio + detalle última sesión' },
      { title: 'Coach: revisar y aprobar plan generado por AI', done: false, note: 'UI lista — API no persiste aprobación en DB (stub)' },
      { title: 'Tabs Resumen/Plan/Progreso/Nutrición → datos reales de DB', done: true, note: 'Promise.all: HealthProfile, TrainingPlan+weeks+sessions, WeeklyCheckIn x8, NutritionPlan. Verificación coach-atleta.' },
      { title: 'Vinculación coach-atleta por código invitación', done: true, note: 'InviteCode model en DB. /api/coach/invite persiste código 7d. /api/invite/[code] valida y redime. /join/[code] UI completa.' },
      { title: 'Coach puede editar features del atleta', done: true, note: 'Toggles en panel de atleta' },
      { title: 'Feed de alertas del coach en dashboard', done: true, note: 'Detecta: sin check-in >7d, RPE ≥8, pérdida de peso >750g/semana, plan auto-ajustado. Lista con link directo al atleta.' },
      { title: 'Editor de sesión individual inline (Tab Plan)', done: true, note: 'Botón Editar por sesión. Form inline: tipo, duración, zona objetivo, descripción. API PATCH /api/coach/sessions/[id].' },
      { title: 'Log de ajustes automáticos en Tab Resumen del atleta', done: true, note: 'Columna RPE y Ajustes en tabla check-ins. Sección "Log de ajustes" con semana, fecha y triggers aplicados.' },
      { title: 'Coach activa atleta siempre desde Tab Resumen (features.plan=false al crear)', done: true, note: 'Bug fix: planTier=pro ya no bypasea /pending. Atleta siempre espera activación explícita del coach.' },
    ],
  },
  {
    id: 'gym',
    label: 'Fase 3 — Gym Coach',
    period: 'Completado',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    items: [
      { title: 'Schema DB: Exercise, WorkoutTemplate, AssignedWorkout, GymSession, SetLog', done: true, note: 'Migración aplicada' },
      { title: '39 ejercicios globales en seed', done: true, note: 'Todos los grupos musculares' },
      { title: 'Biblioteca de ejercicios (coach)', done: true, note: 'Global + personalizados, filtros por músculo/equipo' },
      { title: 'Constructor de rutinas wizard (4 pasos)', done: true, note: 'Info → días → ejercicios → revisar' },
      { title: 'Asignación de rutina a atleta', done: true, note: 'Con fecha inicio, duración y notas' },
      { title: 'Dashboard gym atleta (rutina activa + adherencia)', done: true, note: 'Grid semanal de completitud' },
      { title: 'Tracker de sesión en tiempo real', done: true, note: 'Sets/pesos, timer descanso, referencia sesión anterior' },
      { title: 'Historial de sesiones gym', done: true, note: 'Expandible con pesos por serie' },
      { title: 'Progresión de cargas sugerida por AI', done: true, note: 'Si completó todos los reps objetivo → badge +2.5kg en sesión' },
      { title: 'Coach ve logs y progresión del atleta en gym', done: true, note: 'Tab Gym en panel atleta: gráfica de peso por ejercicio + detalle última sesión' },
    ],
  },
  {
    id: 'marketplace',
    label: 'Fase 4 — Marketplace de Coaches',
    period: 'Completado',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    items: [
      { title: 'Schema DB: CoachProfile, CoachProgram, CoachPost', done: true, note: 'Migración marketplace aplicada' },
      { title: 'Directorio público de coaches (/coaches)', done: true, note: 'Grid con filtros por deporte + AI Coach card destacada' },
      { title: 'Perfil público del coach (/p/[slug])', done: true, note: 'Bio, programas, posts, CTA unirse' },
      { title: 'Perfil AI Coach (/p/ai-coach)', done: true, note: 'Coach inteligente como opción del marketplace' },
      { title: 'Coach edita su perfil público', done: true, note: 'Slug, bio, especialidades, programas, publicaciones' },
      { title: 'Coach publica contenido (tips, rutinas, logros)', done: true, note: 'Feed visible en perfil público' },
      { title: 'Coach crea asesorado directamente', done: true, note: 'Sin código invitación — genera credenciales temporales' },
      { title: 'Atleta se une a coach desde marketplace', done: true, note: 'POST /api/coach/join desde /p/[slug]' },
      { title: 'Reviews y ratings de coaches', done: false, note: 'Futuro — post-lanzamiento' },
      { title: 'Stripe split Medaliq/coach', done: false, note: 'Futuro — cuando haya volumen' },
    ],
  },
  {
    id: 'admin',
    label: 'Fase 5 — Admin & Operaciones',
    period: 'Completado',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    items: [
      { title: 'Panel admin: Overview con KPIs de negocio', done: true, note: 'Usuarios, coaches, onboardings, nuevos esta semana' },
      { title: 'Panel admin: Gestión de usuarios (roles)', done: true, note: 'Cambio de rol en tiempo real' },
      { title: 'Panel admin: Gestión de coaches y atletas', done: true, note: 'Vista de relaciones coach ↔ atleta' },
      { title: 'Panel admin: Suscripciones (tiers por config)', done: true, note: 'Free / Pro / Coach inferido del config' },
      { title: 'Panel admin: Configuración de plataforma', done: true, note: 'Stack técnico e integraciones pendientes' },
      { title: 'Panel admin: Roadmap del producto', done: true, note: 'Esta página' },
      { title: 'Middleware: protección completa de rutas', done: true, note: 'Admin→/admin, Coach→/coach, sin auth→/login' },
      { title: 'Landing page con hero, pricing, cómo funciona', done: true, note: 'Sin sección de comparación' },
      { title: 'UI mobile armonizada (admin + coach + atleta)', done: true, note: 'Fixed header, bottom nav con lucide icons, colores consistentes #1e3a5f' },
      { title: 'Navegación bottom nav: lucide icons en todos los paneles', done: true, note: 'Admin: 5 items, Coach: center FAB, Atleta: gym priorizado' },
    ],
  },
  {
    id: 'deploy',
    label: 'Fase 6 — Deploy & Infraestructura',
    period: 'Completado',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    items: [
      { title: 'Variables de entorno en producción', done: true, note: 'NEXTAUTH_SECRET, DATABASE_URL, ANTHROPIC_API_KEY, NEXTAUTH_URL configuradas' },
      { title: 'PostgreSQL en Neon (serverless)', done: true, note: '4 migraciones aplicadas + seed con 39 ejercicios' },
      { title: 'Deploy en Vercel', done: true, note: 'Integrado con GitHub main branch — auto-deploy en cada push' },
      { title: 'Dominio medaliq.com → Vercel', done: true, note: 'DNS en Route 53: A record 76.76.21.21 + CNAME cname.vercel-dns.com — INSYNC' },
      { title: 'Prisma connection pooling (PgBouncer/Neon)', done: false, note: 'Requiere ?pgbouncer=true en DATABASE_URL' },
      { title: 'Rate limiting en APIs críticas', done: false, note: '/api/auth/register, /api/onboarding/generate, /api/ai/chat' },
      { title: 'Error pages personalizadas (404, 500)', done: false, note: 'src/app/not-found.tsx + error.tsx' },
      { title: 'Google OAuth con dominio real', done: false, note: 'Google Cloud Console → credenciales con medaliq.com' },
      { title: 'Agregar /coaches a sitemap y SEO meta tags', done: false, note: 'Páginas públicas del marketplace deben ser indexables' },
    ],
  },
  {
    id: 'monetization',
    label: 'Fase 7 — Monetización',
    period: 'Post-lanzamiento',
    color: '#0891b2',
    bgColor: '#f0f9ff',
    borderColor: '#7dd3fc',
    items: [
      { title: 'Integración Stripe (pagos)', done: false, note: 'Free / Pro $15 / Coach $49 — suscripciones mensuales' },
      { title: 'Modelo Subscription en DB', done: false, note: 'Stripe webhook → actualiza User.config.features' },
      { title: 'Email transaccional AWS SES', done: false, note: 'Bienvenida, invitación coach, recuperación de contraseña' },
      { title: 'Página de upgrade (Free → Pro)', done: false, note: 'Mostrar cuando atleta intenta acceder a feature Pro' },
      { title: 'Trial de 30 días gratis', done: true, note: 'Al completar onboarding B2C → trial.plan=TRIAL, trial.endsAt=+30d, monthlyLimit=999999. Middleware redirige a /upgrade al expirar.' },
    ],
  },
  {
    id: 'integrations',
    label: 'Fase 8 — Integraciones fitness',
    period: 'Futuro',
    color: '#6b7280',
    bgColor: '#f9fafb',
    borderColor: '#d1d5db',
    items: [
      { title: 'Strava OAuth + webhook de actividades', done: false, note: 'Auto-completa SessionLog cuando termina actividad' },
      { title: 'Garmin Connect API', done: false, note: 'Datos ricos: HRV, sueño, zonas FC reales, training load' },
      { title: 'Polar Flow API', done: false, note: 'Popular en LatAm, FC y recovery score' },
      { title: 'Google Health Connect (Android)', done: false, note: 'Pasos, FC, sueño desde cualquier wearable Android' },
      { title: 'Apple HealthKit (iOS nativa)', done: false, note: 'Requiere app en App Store — fase muy futura' },
      { title: 'Whoop / Oura Ring', done: false, note: 'APIs privadas, requiere partnership — largo plazo' },
    ],
  },
  {
    id: 'athlete-ux',
    label: 'Fase 9 — UX Atleta v2',
    period: 'En construcción',
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    items: [
      { title: 'Dashboard: 7 días siempre visibles (Lun-Dom), hoy resaltado', done: true, note: 'Sin importar qué días tenga sesiones el plan' },
      { title: 'Métricas reales en dashboard (DailyLog > CheckIn > HealthProfile)', done: true, note: 'Empty state honesto con CTA a /profile' },
      { title: 'Card coach real con nombre y headline', done: true, note: 'Link a perfil público /p/[slug] — sin fake "último mensaje"' },
      { title: 'Check-in badge "Pendiente" solo si no se ha hecho esta semana', done: true, note: 'Verifica weekNumber actual en DB' },
      { title: 'AI Coach gateado por perfil completo', done: true, note: 'Si no hay HealthProfile → banner con CTA a /profile' },
      { title: 'AI system prompt con restricciones dinámicas por lesión/condición', done: true, note: 'Rodilla, espalda, cardíaco, diabetes, asma → instrucciones específicas' },
      { title: 'Schema DailyLog — métricas diarias (peso, FC, sueño, energía)', done: true, note: 'Migración aplicada. Upsert por userId+date' },
      { title: 'Página /profile atleta: ver y editar datos de salud', done: true, note: 'Edad, peso, talla, FC, lesiones, condiciones' },
      { title: 'Fecha de nacimiento → calcula edad + FC máx estimada (Tanaka)', done: true, note: 'IMC calculado automáticamente de peso + talla' },
      { title: 'Formulario de métricas diarias en /profile', done: true, note: 'Peso, FC reposo, horas sueño, energía 1-5, notas — historial 14 días' },
      { title: 'Páginas de ayuda por perfil (atleta, coach, admin)', done: true, note: '/help, /coach/help, /admin/help — FAQ por sección, flujos de uso' },
      { title: 'Landing page con animaciones y más interacción', done: true, note: 'RevealOnScroll, fadeUp hero, float mockup, pulse CTA, hover lift cards' },
      { title: 'Internacionalización ES / EN / PT con selector de banderas', done: true, note: 'Cookie-based, server + client, LanguageSwitcher 🇪🇸🇺🇸🇧🇷 en navbar y sidebars' },
      { title: 'Sidebar con link Ayuda (HelpCircle) en todos los paneles', done: true, note: 'Atleta, coach y admin' },
    ],
  },
  {
    id: 'pre-launch',
    label: 'Fase 10 — Pre-lanzamiento',
    period: 'En construcción',
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    items: [
      { title: 'Tabs coach Resumen/Plan/Progreso/Nutrición → DB real', done: true, note: 'Promise.all con HealthProfile, TrainingPlan+weeks+sessions, WeeklyCheckIn x8, NutritionPlan. Verificación coach-atleta.' },
      { title: 'Notas del coach por sesión del plan (persistidas en DB)', done: true, note: 'coachNote en PlannedSession. API PATCH /api/coach/sessions/[id]/note con auth.' },
      { title: 'Rate limiting en APIs críticas', done: true, note: 'register 5/min, onboarding 3/min, ai/chat 20/min por usuario' },
      { title: 'Páginas de error custom (404, 500)', done: true, note: 'not-found.tsx + error.tsx con diseño Medaliq y botones de recuperación' },
      { title: 'Control de alta manual desde admin + desactivación', done: true, note: '/admin/activaciones — secciones Pendientes y Activos. Activar Pro/Coach, Desactivar. API PATCH /api/admin/users/[id]/plan' },
      { title: 'Beta cerrada — acceso bloqueado hasta activación manual', done: true, note: 'Onboarding no habilita features. JWT campo activated. Middleware redirige a /pending. Polling automático cada 10s.' },
      { title: 'Google OAuth con dominio real', done: false, note: 'Google Cloud Console → Client ID + Secret → GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en Vercel. Código ya implementado.' },
      { title: 'Botón "Continuar con Google" en /login', done: false, note: 'UI pendiente. La lógica en auth.ts ya está lista.' },
      { title: 'SEO: meta tags + sitemap para páginas públicas', done: false, note: '/coaches, /p/[slug], /p/ai-coach deben ser indexables con og:image, description' },
      { title: 'Hardening: validación de inputs en todas las APIs (Zod)', done: false, note: 'Zod schemas en rutas POST/PATCH — actualmente confía demasiado en el cliente' },
      { title: 'Sentry para monitoreo de errores en producción', done: false, note: 'Alertas automáticas cuando algo falla. Gratis hasta 5k errores/mes.' },
      { title: 'Uptime Robot para alertas de disponibilidad', done: false, note: 'Ping cada 5 min — email/SMS si la app cae.' },
    ],
  },
  {
    id: 'qa-registro-onboarding',
    label: 'Fase QA — Registro & Onboarding',
    period: 'Urgente — ahora',
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fca5a5',
    items: [
      { title: 'Verificar StepSportDetails para path BODY (sin deporte seleccionado)', done: true, note: 'Confirmado: sport=null en BODY → cae al bloque mainGoal===BODY → muestra peso objetivo + fecha meta.' },
      { title: 'StepHRFitness no muestra FC para BODY ni STRENGTH', done: true, note: 'Confirmado: showHR = mainGoal===SPORT && sport!==STRENGTH → BODY y STRENGTH solo muestran experienceLevel.' },
      { title: 'B2B post-onboarding: redirect directo a /pending', done: true, note: 'API ahora devuelve isB2B en la respuesta. handleGenerate pushea a /pending si isB2B, /dashboard si B2C.' },
      { title: 'Google OAuth: definir comportamiento para registro de COACH', done: false, note: 'Hoy Google OAuth siempre registra como ATHLETE. Decidir si se permite coach vía Google o se bloquea con mensaje.' },
      { title: 'Test E2E: registro ATHLETE B2C → onboarding RUNNING → plan → dashboard', done: true, note: 'Probado manualmente. Flujo completo funcional: plan generado, trial activo, JWT actualizado, dashboard carga.' },
      { title: 'Test E2E: registro COACH → dashboard coach directo (sin onboarding)', done: true, note: 'Probado manualmente. callbackUrl + middleware guard funcionan correctamente.' },
      { title: 'Gating completo de features por tier (FREE vs TRIAL/PRO)', done: true, note: 'Paywalls en /checkin, /progress, /gym, /gym/history, /gym/session. AICoachChat bloqueado si monthlyLimit=0. Downgrade route actualizado.' },
      { title: 'Test E2E: onboarding todos los deportes (6 + BODY)', done: false, note: 'RUNNING probado. Pendiente: CYCLING, SWIMMING, TRIATHLON, FOOTBALL, STRENGTH, BODY.' },
      { title: 'Test E2E: flujo B2B completo (coach crea atleta → onboarding → /pending → activación → plan)', done: false, note: 'Verificar CoachAthlete detectado, generatedBy=COACH, features.plan=false, /pending state, activación desde panel coach.' },
      { title: 'Verificar plan no queda vacío post-generación (semanas y sesiones creadas)', done: false, note: 'Query en DB: TrainingPlan con PlanWeeks.length > 0 y PlannedSessions.length > 0.' },
    ],
  },
  {
    id: 'ai-protection',
    label: 'Fase 11 — Protección AI & Trial',
    period: 'En construcción',
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    items: [
      { title: 'Trial de 30 días con fecha de expiración', done: true, note: 'trialEndsAt en UserConfig. Al completar onboarding B2C → trial.plan=TRIAL, trial.endsAt=+30d.' },
      { title: 'Middleware detecta trial expirado → /upgrade', done: true, note: 'Cuando trialEndsAt < now + role=ATHLETE + plan=TRIAL → /upgrade.' },
      { title: 'Página /upgrade con opciones de plan', done: true, note: 'Pro $15/mes vs Free (limitado). Diseño Medaliq con comparativa de features.' },
      { title: 'Feature gating inline para Free post-trial', done: true, note: 'Paywalls en /checkin, /progress, /gym, /gym/history, /gym/session. AI chat bloqueado si monthlyLimit=0.' },
      { title: 'Cambiar AI chat de Sonnet → Haiku', done: false, note: '10x más barato. Sonnet solo para análisis complejos de coach. Protege el margen.' },
      { title: 'Límite de 100 mensajes AI/mes por usuario Pro', done: false, note: 'monthlyLimit en UserConfig. Trial=999999 (ilimitado), Pro=100, Free=0.' },
      { title: 'Contador de mensajes en UI del chat', done: false, note: '"47 / 100 mensajes usados este mes". Al límite: mensaje claro con fecha de renovación.' },
      { title: 'Email: trial expira en 3 días (Resend.com)', done: false, note: 'Primer email transaccional. Resend gratis hasta 3k emails/mes.' },
    ],
  },
  {
    id: 'pwa',
    label: 'Fase 12 — PWA & Mobile Web',
    period: 'Próximo',
    color: '#0891b2',
    bgColor: '#f0f9ff',
    borderColor: '#7dd3fc',
    items: [
      { title: 'manifest.json con iconos y theme_color (#1e3a5f)', done: true, note: 'public/manifest.json. Icons via /api/icons/[size]. Shortcuts a /plan, /checkin, /gym.' },
      { title: 'Service worker — caché básico de assets', done: true, note: 'public/sw.js. Cache-first para assets estáticos, network-first para páginas, offline fallback. ServiceWorkerRegistration.tsx lo registra. En dev: se des-registra automáticamente.' },
      { title: 'Meta tags apple-mobile-web-app para iOS', done: true, note: 'layout.tsx: appleWebApp meta, formatDetection. apple-icon.tsx (180x180). InstallPWABanner para Android (BeforeInstallPrompt) e iOS (instrucciones Share→Agregar).' },
      { title: 'Offline support para gym session tracker', done: false, note: 'Guardar sets localmente (IndexedDB) y sincronizar al reconectar. Feature más crítica para mobile.' },
      { title: 'Responsive audit completo en móvil real', done: false, note: 'Probar cada pantalla en iPhone SE, iPhone 14, Samsung Galaxy. Fix de padding/overflow.' },
      { title: 'Banner de instalación PWA en dashboard', done: false, note: '"Instala Medaliq en tu celular" — aparece si no está instalada y el browser lo soporta.' },
    ],
  },
  {
    id: 'payments',
    label: 'Fase 13 — Pasarela de Pagos',
    period: 'Post-lanzamiento',
    color: '#0891b2',
    bgColor: '#f0f9ff',
    borderColor: '#7dd3fc',
    items: [
      { title: 'Modelo Subscription en DB', done: false, note: 'status, plan, wompiId/stripeId, currentPeriodStart, currentPeriodEnd, canceledAt.' },
      { title: 'Integrar Wompi (Colombia) para suscripción atleta', done: false, note: '$15/mes. Wompi primero por ser mercado principal. Stripe después para internacional.' },
      { title: 'Webhook Wompi: pago exitoso → activa Pro, fallo → Free', done: false, note: 'Mismo mecanismo que activación manual de admin — solo cambia el trigger.' },
      { title: 'Página de gestión de suscripción del atleta', done: false, note: 'Ver plan actual, próximo cobro, cancelar, cambiar método de pago.' },
      { title: 'Campo source en CoachAthlete (MARKETPLACE | DIRECT)', done: false, note: 'Determina qué atletas del coach generan fee a Medaliq.' },
      { title: 'Facturación mensual al coach por asesorados directos', done: false, note: '1-50: $6/atleta, 51-100: $5/atleta, +100: $3/atleta. Calculado automáticamente.' },
      { title: 'Email transaccional completo (Resend)', done: false, note: 'Bienvenida, plan generado, activación, cobro exitoso, fallo de pago, trial expirando.' },
      { title: 'Stripe para usuarios internacionales', done: false, note: 'Después de validar el mercado colombiano con Wompi.' },
    ],
  },
  {
    id: 'admin-metrics',
    label: 'Fase 14 — Admin Métricas de Negocio',
    period: 'Post-lanzamiento',
    color: '#0891b2',
    bgColor: '#f0f9ff',
    borderColor: '#7dd3fc',
    items: [
      { title: 'MRR (Monthly Recurring Revenue) en tiempo real', done: false, note: 'Suma de suscripciones activas + fees de coaches. Gráfica histórica.' },
      { title: 'Churn mensual (quién canceló y cuándo)', done: false, note: 'Lista de bajas con tier y duración de la suscripción.' },
      { title: 'Distribución por países', done: false, note: 'Campo country en registro o IP geolocation. Heatmap de usuarios activos.' },
      { title: 'Usuarios en trial vs Free vs Pro (funnel de conversión)', done: false, note: 'Cuántos entran al trial, cuántos convierten a Pro, cuántos quedan en Free.' },
      { title: 'Coaches activos + asesorados directos + fee generado', done: false, note: 'Ranking de coaches por ingresos generados a la plataforma.' },
      { title: 'LTV promedio por tier', done: false, note: 'Lifetime Value: ingreso total promedio antes de churnar.' },
      { title: 'Alertas de negocio (churn alto, trial sin convertir)', done: false, note: 'Notificación al admin si >20% de trials expiran sin convertir.' },
    ],
  },
  {
    id: 'coach-ai',
    label: 'Fase 15 — Coach AI Assistant',
    period: 'Futuro',
    color: '#6b7280',
    bgColor: '#f9fafb',
    borderColor: '#d1d5db',
    items: [
      { title: 'Chat AI en panel coach con contexto del asesorado', done: false, note: 'Coach pregunta sobre un atleta específico. AI tiene acceso a HealthProfile, plan, check-ins, logs.' },
      { title: 'Sugerencia de rutina gym según perfil del atleta', done: false, note: '"¿Qué rutina le recomiendas?" → AI analiza lesiones, objetivos, nivel + WorkoutTemplates del coach.' },
      { title: 'Análisis de progreso del asesorado con IA', done: false, note: '"¿Cómo va Juan este mes?" → AI resume tendencias de peso, FC, adherencia, RPE.' },
      { title: 'Ajuste de plan sugerido por AI al coach', done: false, note: 'Si check-in muestra señales de sobreentrenamiento → AI sugiere modificar semana siguiente.' },
      { title: 'Disponible gratis para coaches con 50+ asesorados directos', done: false, note: 'Incentivo de volumen. Coaches más pequeños lo pagan como add-on.' },
    ],
  },
  {
    id: 'mobile-setup',
    label: 'Fase 16A — Setup Mobile Local',
    period: 'Futuro',
    color: '#6b7280',
    bgColor: '#f9fafb',
    borderColor: '#d1d5db',
    items: [
      { title: 'Instalar Xcode (Mac App Store)', done: false, note: 'Xcode 15+ (~10GB). Requerido para builds iOS locales, debug BLE en iPhone real, HealthKit, y cualquier módulo nativo iOS. EAS complementa pero no reemplaza Xcode para desarrollo con dispositivos.' },
      { title: 'Instalar Android Studio', done: false, note: 'SDK Platform 34+. Requerido para debug BLE en Android, Health Connect, módulos nativos Kotlin, y emulador local. Crear AVD con API 34+.' },
      { title: 'Instalar Expo CLI y EAS CLI globalmente', done: false, note: 'pnpm add -g expo-cli eas-cli. EAS = build en la nube sin Xcode local para CI.' },
      { title: 'Crear cuenta Expo (expo.dev)', done: false, note: 'Gratuita. Necesaria para EAS builds, OTA updates y proyecto en la nube.' },
      { title: 'Convertir repo a monorepo pnpm', done: false, note: 'Crear pnpm-workspace.yaml. Mover web a apps/web/, crear apps/mobile/. Ajustar paths en tsconfig y package.json.' },
      { title: 'Scaffold apps/mobile con Expo managed workflow', done: false, note: 'npx create-expo-app apps/mobile --template blank-typescript. Verificar que corre en simulador iOS y Android.' },
      { title: 'Crear packages/shared-types con tipos del backend', done: false, note: 'Mover WizardData, UserConfig, Plan types a un paquete compartido. Importar desde web y mobile.' },
      { title: 'Crear packages/api-client con fetch client tipado', done: false, note: 'Mismo cliente REST para web y mobile. Base URL configurable por env (localhost dev, medaliq.com prod).' },
      { title: 'Configurar NativeWind (Tailwind para React Native)', done: false, note: 'pnpm add nativewind tailwindcss. Permite reusar clases Tailwind en componentes RN.' },
      { title: 'Variables de entorno mobile (EXPO_PUBLIC_API_URL)', done: false, note: 'EXPO_PUBLIC_API_URL=http://localhost:3000 para dev. Production: https://api.medaliq.com (o medaliq.com).' },
    ],
  },
  {
    id: 'mobile-core',
    label: 'Fase 16B — Core Features Mobile',
    period: 'Futuro',
    color: '#6b7280',
    bgColor: '#f9fafb',
    borderColor: '#d1d5db',
    items: [
      { title: 'Auth nativa: login email/password con JWT en SecureStore', done: false, note: 'expo-secure-store (no AsyncStorage) para guardar tokens. Refresh token flow. NO cookies.' },
      { title: 'Bottom tab navigator con 5 tabs (Dashboard, Plan, Gym, Nutrición, Perfil)', done: false, note: 'React Navigation v7 + @react-navigation/bottom-tabs. Iconos Lucide RN.' },
      { title: 'Dashboard mobile: sesión de hoy + métricas principales', done: false, note: 'Adaptar dashboard web a UX nativo. Cards gestuales, pull-to-refresh.' },
      { title: 'Plan semanal: scroll horizontal por semanas + sesión detail', done: false, note: 'FlatList horizontal para semanas. Sheet modal para detalle de sesión.' },
      { title: 'Gym session tracker offline-first', done: false, note: 'FEATURE CRÍTICA. Sets/reps/peso guardados en AsyncStorage primero. Sync al reconectar. Timer de descanso nativo.' },
      { title: 'Check-in semanal en mobile', done: false, note: 'Formulario adaptado. Sliders nativos para energía/RPE. Envía al mismo endpoint /api/checkin.' },
      { title: 'AI Coach chat en mobile (streaming)', done: false, note: 'TextInput + FlatList invertida. Streaming SSE o polling. Sin cambios en backend.' },
      { title: 'Push notifications: recordatorio sesión del día', done: false, note: 'expo-notifications + FCM. Programar notificación local para hora de entrenamiento.' },
      { title: 'Onboarding mobile: wizard adaptado', done: false, note: 'Mismo flujo que web pero con gestos nativos (swipe). Reusar shared-types para WizardData.' },
      { title: 'Perfil y métricas diarias (peso, FC, sueño)', done: false, note: 'Formulario diario. Keyboard-aware scroll. Historial en mini chart.' },
    ],
  },
  {
    id: 'mobile-devices',
    label: 'Fase 16C — Conectividad con Dispositivos',
    period: 'Futuro',
    color: '#6b7280',
    bgColor: '#f9fafb',
    borderColor: '#d1d5db',
    items: [
      { title: 'BLE scanning: detectar monitores de FC (Polar, Wahoo, Garmin)', done: false, note: 'react-native-ble-plx. Scan por UUID de servicio Heart Rate (0x180D). Requiere expo bare workflow o config plugin.' },
      { title: 'Conectar HRM por BLE y leer FC en tiempo real', done: false, note: 'Parse BLE characteristic 0x2A37 (Heart Rate Measurement). Mostrar FC en vivo durante sesión gym y cardio.' },
      { title: 'Apple HealthKit — leer y escribir actividades (iOS)', done: false, note: '@react-native-health/health. Permisos: HKWorkoutType, HKQuantityTypeIdentifierHeartRate, steps, sleep. Requiere dispositivo real.' },
      { title: 'Google Health Connect — leer actividades (Android)', done: false, note: 'react-native-health-connect. Sync de pasos, FC, sueño desde cualquier wearable Android.' },
      { title: 'Strava OAuth: importar actividades completadas automáticamente', done: false, note: 'OAuth flow in-app con expo-web-browser. Backend recibe token y hace polling de actividades. Auto-completa SessionLog.' },
      { title: 'Garmin Connect API: HRV, Training Status, sueño', done: false, note: 'Datos ricos que mejoran check-in y recomendaciones AI. OAuth similar a Strava. Muy popular en LatAm gyms.' },
      { title: 'Polar Flow API: FC y recovery score', done: false, note: 'Alta prevalencia en usuarios de running LatAm. OAuth + webhook de actividades.' },
      { title: 'Báscula BLE: auto-registra peso en métricas diarias', done: false, note: 'Servicio BLE Weight Scale (0x181D). Elimina entrada manual de peso diario.' },
    ],
  },
  {
    id: 'training-nutrition',
    label: 'Fase 17 — Entrenamiento + Nutrición Integrados',
    period: 'En construcción',
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    items: [
      { title: 'Migración DB: PlannedSession.intensity enum (HIGH|MODERATE|LOW|REST)', done: true, note: 'Migración aplicada. SessionIntensity enum en schema. DEFAULT MODERATE.' },
      { title: 'Migración DB: PlannedSession.sportLabel String?', done: false, note: 'Etiqueta libre por deporte. "Sweet Spot 2×20min", "CSS 400m × 8". Sin romper el SessionType enum.' },
      { title: 'generator.ts: auto-asigna intensity según SessionType al crear plan', done: true, note: 'getSessionIntensity(type) mapea determinista SessionType→intensity en todas las sesiones generadas.' },
      { title: 'src/lib/nutrition/daily-target.ts: getDailyNutritionTarget(intensity, plan)', done: true, note: 'HIGH→targetKcalHard, MODERATE→targetKcalEasy, LOW→easy×0.88, REST→targetKcalRest.' },
      { title: 'Dashboard atleta: card "Hoy" con sesión + kcal objetivo + macros + label', done: true, note: '"Día duro — 2.850 kcal — Carbos: 340g". Banner trial expiry 5d. Card plan completado.' },
      { title: 'FC baseline dinámica en check-in (vs FC previa del atleta)', done: true, note: 'adjustments.ts: fcBaseline = hrRestingBaseline ?? 62. Compara contra FC propia, no contra 62 hardcodeado.' },
      { title: 'applyPlanAdjustments() modifica sesiones en DB por triggers del check-in', done: true, note: 'Fatiga → -20% durationMin. RPE → baja zoneTarget. Dolor → agrega nota [OPCIONAL]. Fire-and-forget en /api/checkin.' },
      { title: '[HECHO] Panel coach Tab Plan: carga semanal total (suma intensity scores)', done: true, note: 'HIGH=3, MODERATE=2, LOW=1, REST=0. Badge "Carga: X pts" en cada semana. Alerta roja automática si incremento >20% vs semana anterior.' },
      { title: 'Panel coach Tab Nutrición: editor de targets por fase del plan', done: false, note: 'BASE: déficit -200, DESARROLLO: mantenimiento, ESPECIFICO: +100, AFINAMIENTO: -100.' },
    ],
  },
  {
    id: 'plan-builder',
    label: 'Fase 18 — Constructor Visual de Planes',
    period: 'En construcción',
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    items: [
      { title: 'API: POST /api/coach/athlete/[id]/plan/custom', done: false, note: 'Crea TrainingPlan+PlanWeeks+PlannedSessions en una transacción desde el builder.' },
      { title: 'API: PATCH + DELETE /api/coach/sessions/[id]', done: true, note: 'Edita o elimina sesión. Verifica pertenencia al coach. Campos: durationMin, type, zoneTarget, detailText, coachNote.' },
      { title: 'API: POST /api/coach/plan/[planId]/sessions', done: false, note: 'Agregar sesión a una semana de plan existente.' },
      { title: 'API: PATCH /api/coach/plan/[planId]/week/[weekId]', done: false, note: 'Editar metadata de semana: phase, volumeKm, focusDescription, isRecoveryWeek.' },
      { title: 'Página /coach/athlete/[id]/plan/build (full-screen separada)', done: false, note: 'Página dedicada para el constructor — sin wrapper del perfil del atleta.' },
      { title: 'Componente WeekGrid: 7 columnas (Lun-Dom) con cards de sesión', done: false, note: 'Cada celda: SessionCard o botón "+" para agregar. Muestra type, intensity, duración.' },
      { title: 'Componente SessionCard: type badge, intensity, duration, sportLabel', done: false, note: 'Acciones inline: edit (✏) y delete (🗑). Color badge según intensity.' },
      { title: 'Componente SessionModal: form completo add/edit sesión', done: false, note: 'type, sportLabel, durationMin, intensity, zoneTarget, structure, coachNote.' },
      { title: 'Componente WeekNav: mini-overview todas las semanas + indicador completitud', done: false, note: 'Puntos ●/○ por semana. Navegar con flechas ← →. Fase y recovery visible.' },
      { title: '"Generar desde template → abrir en constructor" integrado', done: false, note: 'El template precarga todas las sesiones en el builder para que el coach las edite.' },
      { title: '"Copiar semana anterior" para acelerar construcción', done: false, note: 'Duplica todas las sesiones de la semana anterior en la semana actual.' },
      { title: 'Tab Plan del atleta: opciones "Template" vs "Constructor visual"', done: false, note: 'Dos cards de entrada. Template = rápido. Constructor = control total (recomendado).' },
    ],
  },
  {
    id: 'benchmarks',
    label: 'Fase 19 — PerformanceBenchmarks & Coach Protocol',
    period: 'Próximo',
    color: '#7c3aed',
    bgColor: '#faf5ff',
    borderColor: '#d8b4fe',
    items: [
      { title: 'Migración DB: PerformanceBenchmark model', done: false, note: 'sport, metric (5K_TIME|FTP_WATTS|1RM_SQUAT|CSS), value, unit, testedAt, coachId.' },
      { title: 'Migración DB: CoachAthlete.coachGoal + privateNotes + status', done: false, note: 'coachGoal visible al atleta, privateNotes solo coach, status ACTIVE|PAUSED|COMPLETED.' },
      { title: 'API CRUD: /api/coach/athlete/[id]/benchmarks', done: false, note: 'GET historial + POST nuevo benchmark. Solo el coach asignado puede crear.' },
      { title: 'UI coach: registrar test desde panel atleta', done: false, note: 'Botón en Tab Resumen. Modal con sport, metric, value, fecha. Historial de tests anterior.' },
      { title: 'UI atleta: ver historial de benchmarks y progresión', done: false, note: 'Gráfica de evolución por métrica. "Tu 5K bajó de 28:30 a 25:10 en 12 semanas."' },
      { title: 'generator.ts: usar benchmark reciente para calibrar zonas del plan', done: false, note: 'Si hay 5K_TIME reciente → predice tiempo objetivo con Riegel → ajusta intensidades del plan.' },
      { title: 'CoachAthlete.status en dashboard coach: filtrar por ACTIVE/PAUSED', done: false, note: 'Coach puede archivar atletas sin eliminar la relación ni el historial.' },
      { title: 'Notificación al coach cuando atleta queda en /pending', done: false, note: 'In-app notification. Coach ve badge en dashboard. CTA directa al panel del atleta.' },
    ],
  },
  {
    id: 'store-publishing',
    label: 'Fase 16D — Publicación en Stores',
    period: 'Futuro',
    color: '#6b7280',
    bgColor: '#f9fafb',
    borderColor: '#d1d5db',
    items: [
      { title: '[PREREQ] Crear Apple Developer Account ($99/año)', done: false, note: 'developer.apple.com/account. Requiere tarjeta de crédito y verificación de identidad (1-2 días).' },
      { title: '[PREREQ] Crear Google Play Developer Account ($25 único)', done: false, note: 'play.google.com/console. Pago único. Verificación de identidad con ID oficial.' },
      { title: '[PREREQ] Redactar Privacy Policy y Terms of Service', done: false, note: 'Obligatorio para ambas stores. Mencionar datos de salud (HealthKit requiere descripción específica de uso). Hospedar en medaliq.com/privacy.' },
      { title: '[PREREQ] Preparar assets de store: icono 1024x1024, screenshots', done: false, note: 'iOS: screenshots de iPhone 6.7" y 5.5". Android: screenshots de teléfono y tablet. Icono sin fondo transparente.' },
      { title: 'Configurar app.json: bundleId, version, permisos', done: false, note: 'bundleIdentifier: com.medaliq.app (iOS), package: com.medaliq.app (Android). Permisos: BLE, HealthKit, notificaciones, cámara.' },
      { title: 'Configurar EAS Build: eas.json con profiles dev/preview/production', done: false, note: 'eas build:configure. Profiles: development (simulator), preview (TestFlight/internal), production (store).' },
      { title: 'Build iOS producción: eas build --platform ios --profile production', done: false, note: 'EAS maneja certificados y provisioning profiles automáticamente. Build ~15-20 min en la nube.' },
      { title: 'Build Android producción: eas build --platform android --profile production', done: false, note: 'Genera .aab (Android App Bundle). EAS firma el APK automáticamente con keystore gestionada.' },
      { title: 'Crear app en App Store Connect y completar metadata', done: false, note: 'appstoreconnect.apple.com. Categoría: Health & Fitness. Descripción ES. Keywords. Rating questionnaire.' },
      { title: 'Crear app en Google Play Console y completar ficha', done: false, note: 'Categoría: Health & Fitness. Descripción ES/EN. Content rating (Everyone). Data safety form (obligatorio).' },
      { title: 'TestFlight: invitar beta testers antes de review oficial', done: false, note: 'eas submit --platform ios → sube a TestFlight. Invitar hasta 10k testers externos. Detectar bugs antes de review.' },
      { title: 'Google Play Internal/Closed Testing: probar APK en Android real', done: false, note: 'Subir .aab en Play Console → Internal testing track. Probar en dispositivos reales antes de producción.' },
      { title: 'Submitir a App Store Review: eas submit --platform ios', done: false, note: 'Primera revisión: 1-5 días. Si usa HealthKit: revisor verifica que los datos se usan correctamente. Tener notas de revisión listas.' },
      { title: 'Publicar en Google Play: promover de testing a producción', done: false, note: 'Play Console → Release → Promote to Production. Review: 3-7 días primera vez.' },
      { title: 'OTA Updates con EAS Update para hotfixes post-publicación', done: false, note: 'eas update --branch production. Los cambios de JS/UI llegan a usuarios en segundos sin re-review de store.' },
    ],
  },
  {
    id: 'tech-debt',
    label: 'Deuda Técnica — Bugs Pre-lanzamiento',
    period: 'Urgente',
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    items: [
      { title: '[HECHO] Mock data bug: checkin/page.tsx comparaba contra peso 100kg hardcodeado', done: true, note: 'Todos los usuarios con peso < 98.8kg recibían alerta falsa. Fix: fetch real a GET /api/checkin para obtener métricas anteriores.' },
      { title: '[HECHO] Mock data bug: plan/page.tsx mostraba plan falso a usuarios sin plan activo', done: true, note: 'Usuarios sin plan veían "Media Maratón 1:45" como si fuera suyo. Fix: empty state honesto con CTA a /dashboard.' },
      { title: '[HECHO] Mock data bug: generator.ts silenciaba errores de DB con plan falso', done: true, note: 'buildMockResult() swallowaba errores de DB y devolvía plan simulado. Fix: eliminada la función, catch hace throw.' },
      { title: '[HECHO] Seed expandido: 15 atletas + 2 coaches con planes y check-ins reales', done: true, note: '2 coaches (Carlos running, María body/strength), 15 atletas: running, ciclismo, triatlón, recomposición, fuerza. B2C y B2B. Planes con semanas + sesiones + check-ins históricos.' },
      { title: '[HECHO] Fix: checkin/route.ts usaba activePlan.weeks[0] — ahora usa la semana actual', done: true, note: 'planContext ahora busca la semana con weekNumber === currentWeek. Fallback a la última semana si aún no está creada. Se eliminó el take:1 de la query para cargar todas las semanas.' },
      { title: '[HECHO] Fix: invite code generado pero nunca persistido en DB', done: true, note: 'InviteCode model. /api/coach/invite ahora guarda código con expiración 7d. /api/invite/[code] valida y redime. /join/[code] reescrito como client component con validación real.' },
      { title: '[HECHO] Fix: planTier=pro al crear atleta bypaseaba /pending directo a /dashboard', done: true, note: '/api/coach/clients/create: features.plan siempre false al crear. Coach activa explícitamente desde Tab Resumen. Antes: athlete con pro podía entrar al dashboard sin plan activo.' },
      { title: '[HECHO] Fix: gender hardcodeado como male en 4 routes de API', done: true, note: 'coach/athlete/[id]/plan, nutrition/generate, nutrition/generate-meals, checkin → ahora leen profile.gender ?? male. Afecta TDEE Mifflin-St Jeor (~166 kcal diferencia).' },
      { title: 'Fix: Google OAuth siempre registra como ATHLETE ignorando selector de rol', done: false, note: 'register/page.tsx no pasa el rol al callback OAuth. Coaches que usan Google quedan como atletas. Opción recomendada: bloquear Google para coaches (son high-value, controlar manualmente).' },
      { title: '[HECHO] Fix: botón "Activar Pro" en /upgrade — cambiado a mailto:hola@medaliq.com interim', done: true, note: 'Botón disabled eliminado. Ahora es un <a> con mailto que abre email pre-llenado con el email del usuario y asunto "Quiero Pro". Fix real: Stripe pendiente.' },
      { title: '[HECHO] Fix: sidebar coach href="/dashboard" → "/coach/dashboard"', done: true, note: 'CoachSidebarClient.tsx línea 72. Eliminada la redirección innecesaria que pasaba por middleware.' },
      { title: '[HECHO] Fix: tab "Gym" en panel atleta del coach → renombrado a "Sesiones"', done: true, note: 'AthleteDetailClient.tsx — TABS, useEffect y render renombrados de "Gym" a "Sesiones" en los 3 lugares.' },
      { title: '[HECHO] Fix: enlace "Log" agregado en sidebar del atleta', done: true, note: 'SidebarClient.tsx — ClipboardList icon importado, link /log agregado entre Progreso y Gym con show: true. i18n types.ts + 3 archivos de traducción actualizados.' },
      { title: '[HECHO] Fix: botón "Registrar" en /plan era un <button> muerto sin onClick', done: true, note: 'PlanClientWeekSession extendido con id, durationMin, zoneTarget, detailText. plan/page.tsx pasa los 4 campos nuevos. <button> convertido a <Link href="/log?sessionId=..."> con todos los params.' },
      { title: '[HECHO] Fix: React hooks order violation en log/page.tsx', done: true, note: 'useState calls (distanceKm, hrAvg, notes, notCompleted_reason, saving, saved) aparecían después del return condicional en línea 74. Movidos al inicio del componente antes del early return.' },
      { title: '[HECHO] Fix: React hooks order violation en checkin/page.tsx', done: true, note: 'Todo el state (prevMetrics, weightKg, hrResting, etc.) aparecía después del paywall return en línea 126. Movidos todos los hooks antes del return condicional de FREE.' },
      { title: '[HECHO] Fix: Benchmarks de progreso siempre mostraban "Mejorando" hardcodeado', done: true, note: 'ProgressClient.tsx — las 3 filas de benchmarks (5k estimado, pace Z2, FC reposo) mostraban badge estático verde. Ahora es dinámico: hrEnd < hrStart → Mejorando, igual → Sin cambio, mayor → Empeorando.' },
      { title: '[HECHO] Fix: /pending prometía notificación por email inexistente', done: true, note: 'Text "Te avisaremos por email cuando tu cuenta esté activa" cambiado a "Tu coach te notificará directamente". No hay sistema de email implementado aún.' },
      { title: 'Email transaccional mínimo (Resend): welcome + activación B2B + trial expirando', done: false, note: 'Sin emails el producto no puede operar. Prioridad: (1) welcome al registrarse, (2) "tu coach activó tu cuenta" para B2B, (3) "tu trial expira en 3 días" para B2C. Resend gratis hasta 3k/mes.' },
      { title: 'Stripe: suscripción Pro $15/mes + webhook activa tier en UserConfig', done: false, note: '/upgrade tiene botón deshabilitado. Requiere Stripe Checkout + webhook payment_intent.succeeded → user.config.trial.plan = "PRO" + portal de cancelación.' },
    ],
  },
  {
    id: 'qa-local',
    label: 'Fase QA Local — Testing E2E',
    period: 'Urgente — ahora',
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fca5a5',
    items: [
      { title: 'Test E2E: onboarding RUNNING → plan → dashboard', done: true, note: 'Probado manualmente. Plan generado, trial activo, JWT actualizado.' },
      { title: 'Test E2E: onboarding CYCLING → plan generado con semanas', done: false, note: 'Verificar PlanWeeks + PlannedSessions en DB. Zonas FC calculadas con FTP si disponible.' },
      { title: 'Test E2E: onboarding SWIMMING', done: false, note: 'Verificar template BODY_RECOMPOSITION como fallback. sportDetails con swimStroke guardado.' },
      { title: 'Test E2E: onboarding TRIATHLON', done: false, note: 'Verifica triathlonDistance + weakestSegment en sportDetails. Template fallback HALF_MARATHON_18W.' },
      { title: 'Test E2E: onboarding FOOTBALL', done: false, note: 'footballPosition + competitionLevel en sportDetails. Template BODY_RECOMPOSITION.' },
      { title: 'Test E2E: onboarding STRENGTH', done: false, note: 'Sin FC (solo experienceLevel). strengthStyle en sportDetails.' },
      { title: 'Test E2E: onboarding BODY (recomposición corporal)', done: false, note: 'weightGoalKg + targetDate. Sin sport seleccionado. Template BODY_RECOMPOSITION_16W.' },
      { title: 'Test E2E: flujo B2B completo', done: false, note: 'Coach crea atleta → atleta hace onboarding → /pending → coach activa → coach crea plan → atleta accede a dashboard.' },
      { title: 'Verificar plan no queda vacío (PlanWeeks y PlannedSessions en DB)', done: false, note: 'Query: TrainingPlan → weeks.length > 0 → sessions.length > 0 por semana. Revisar timeout en createMany.' },
      { title: 'Test: invite code flow completo', done: false, note: 'Coach genera código → atleta visita /join/[code] → se registra → se vincula → hace onboarding → va a /pending.' },
      { title: 'Test: check-in → ajuste de plan → log de ajustes en panel coach', done: false, note: 'Atleta hace check-in con RPE alto → applyPlanAdjustments modifica sesiones → coach ve log en Tab Resumen.' },
      { title: 'Test: plan de comidas (AI meals) — verificar fallback si AI falla', done: false, note: 'Actualmente bloqueante si Anthropic cae. Pendiente implementar fallback con plantillas estáticas.' },
    ],
  },
  {
    id: 'commercial-backlog',
    label: 'Backlog Comercial — Retención y Revenue',
    period: 'Próximo',
    color: '#7c3aed',
    bgColor: '#faf5ff',
    borderColor: '#d8b4fe',
    items: [
      { title: 'Notificaciones email: recordatorio check-in semanal', done: false, note: 'CRÍTICO para retención. Sin esto el atleta olvida hacer check-in y el plan se estanca. Resend.com gratuito hasta 3k/mes.' },
      { title: 'Notificaciones email: "tu plan fue actualizado" post check-in', done: false, note: 'Cierra el loop: atleta hace check-in → recibe email con resumen de ajustes. Hace el producto sentirse vivo.' },
      { title: 'Notificaciones email: trial expira en 3 días', done: false, note: 'Trigger de conversión más importante. Email automático cuando trialEndsAt - 3d < now.' },
      { title: 'Quick-log de sesión desde el dashboard (1 click)', done: false, note: '"¿Completaste tu sesión de hoy?" [Sí / No / Parcial] directo en la card del dashboard. Reduce abandono del hábito.' },
      { title: 'Gráficas de progreso visuales (no tablas)', done: false, note: 'Curva de peso, curva de FC reposo, barra de adherencia en el tiempo. El atleta necesita VER que el producto funciona.' },
      { title: 'Mensajería coach → atleta (notas simples, no chat)', done: false, note: 'Coach envía nota corta desde su panel. Atleta la ve en dashboard. Si coach sigue usando WhatsApp, no retorna a Medaliq.' },
      { title: 'Fallback plan de comidas sin AI (plantillas estáticas)', done: false, note: 'Si Anthropic cae, el plan de comidas falla con error. Fallback: combinar alimentos de la librería Food según macros target.' },
      { title: 'Stripe + Wompi: suscripción Pro $15/mes', done: false, note: 'Sin pasarela de pago no hay revenue. Wompi para Colombia, Stripe para internacional.' },
      { title: '[HECHO] Simplificar onboarding: objetivo de salud primero, deporte opcional', done: true, note: 'Rediseño completo: healthGoal (Perder grasa/Ganar músculo/Condición/Recomposición) → hasSport (sí/no) → deporte opcional. Sin day-schedule. Flujo sin deporte: 5 pasos. Con deporte: 7 pasos. Peso objetivo condicionado por healthGoal, no mainGoal.' },
      { title: 'AI Chat con prompts sugeridos', done: false, note: 'El chat está vacío y el atleta no sabe qué preguntar. Agregar 4-5 prompts sugeridos según el deporte y fase del plan.' },
      { title: 'Ocultar Marketplace de coaches hasta 20+ coaches activos', done: false, note: 'Directorio vacío genera fricción. Mantener la infraestructura pero no promocionar hasta tener contenido.' },
    ],
  },
  {
    id: 'mobile-qa',
    label: 'Fase Mobile — QA & Fixes (Recorrido 2026-06-10)',
    period: 'Urgente — ahora',
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fca5a5',
    items: [
      { title: '[HECHO] Fix: React Rules of Hooks violation en 6 pantallas mobile', done: true, note: 'gym.tsx, checkin.tsx, plan.tsx, ai-coach.tsx, nutrition.tsx, progress.tsx — movidos todos los hooks (useRouter, useSafeAreaInsets, useQuery, useState, useEffect) antes del return condicional de UpgradeWall.' },
      { title: '[HECHO] Fix: AI Coach Teaser en dashboard navega a checkin en lugar de ai-coach', done: true, note: 'dashboard.tsx — onPress cambiado de router.push("/(app)/(tabs)/checkin") a router.push("/(app)/ai-coach").' },
      { title: '[HECHO] Fix: UpgradeWall sin onPress — botón "Ver planes" no hace nada', done: true, note: 'src/components/UpgradeWall.tsx — agregado onPress con Linking.openURL("https://medaliq.com/upgrade"). También agregados safe area insets y reemplazado Platform.OS padding fijo.' },
      { title: '[HECHO] Fix: Dashboard crash si data es undefined (estado de error)', done: true, note: 'dashboard.tsx — agregado if (!data) con estado de error y botón "Reintentar" que llama refetch(). Eliminada la aserción data!.' },
      { title: '[HECHO] Fix: Profile muestra plan "FREE" (modelo viejo) en lugar de "INACTIVE"', done: true, note: 'profile.tsx — fallback cambiado a "INACTIVE", planLabel actualizado (FREE → INACTIVE: "Inactivo"), badge text actualizado.' },
      { title: '[HECHO] Fix: Onboarding B2B redirige a login sin explicación', done: true, note: 'onboarding.tsx — Alert.alert con mensaje "Tu coach revisará tu perfil y activará tu cuenta" antes de hacer replace a login.' },
      { title: '[HECHO] Fix: Boot (index.tsx) no maneja trial expirado → INACTIVE', done: true, note: 'index.tsx — agregado check userPlan === "INACTIVE" después de onboardingCompleted. Redirige a /(app)/upgrade en lugar de ir al dashboard.' },
      { title: '[HECHO] Fix: Links "Ayuda y FAQ" y "Contactar soporte" en Perfil son botones muertos', done: true, note: 'profile.tsx — Linking.openURL("https://medaliq.com/help") y Linking.openURL("mailto:hola@medaliq.com") respectivamente.' },
      { title: '[HECHO] Agregar pantalla /(app)/upgrade para usuarios INACTIVE en mobile', done: true, note: 'app/(app)/upgrade.tsx creado — muestra plan expirado, lista de features Pro, precio $15/mes, CTA que abre medaliq.com/upgrade, botón cerrar sesión.' },
      { title: '[HECHO] Onboarding mobile: sincronizar con flujo web (paso HR + campos por deporte)', done: true, note: 'onboarding.tsx reescrito. Flujo dinámico con stepHistory stack (sin bugs de índice). Nuevos steps: sport-details (CYCLING: modalidad+FTP, SWIMMING: estilo, TRIATHLON: distancia+segmento débil, FOOTBALL: posición+nivel), hr-fitness (FC conocida vs estimada, con fórmula 211-0.64×edad). Payload enriquecido: hrMax, hrSource, cyclingModality, ftpWatts, swimStroke, triathlonDistance, weakestSegment, footballPosition, competitionLevel. Safe area insets en bottom bar. Ruta corta para GYM/BODY/STRENGTH (sin sport-details ni hr-fitness).' },
      { title: '[HECHO] Agregar /(app)/_layout.tsx con protección de rutas autenticadas', done: true, note: 'app/(app)/_layout.tsx creado — Stack con guard: si !isLoading && !user → router.replace("/(auth)/login").' },
      { title: '[HECHO] UX: agregar AI Coach como tab en la barra inferior', done: true, note: '(tabs)/ai-coach.tsx creado (versión sin back button, con safe area insets). Añadido a _layout.tsx como 4to tab (entre Gym y Check-in). Dashboard Teaser actualizado a ruta /(app)/(tabs)/ai-coach.' },
      { title: '[HECHO] UX: homogeneizar headers en todas las pantallas mobile', done: true, note: 'nutrition.tsx, progress.tsx, gym-history.tsx — agregado LinearGradient header (#1e3a5f→#2d5a8e) con Ionicons chevron-back, igual al patrón de log.tsx. ai-coach.tsx standalone — paddingTop migrado a useSafeAreaInsets() + insets.bottom en input bar. Fondo estándar #f1f5f9 en todas las pantallas de contenido.' },
      { title: '[HECHO] UX: agregar safe area insets en UpgradeWall', done: true, note: 'UpgradeWall.tsx — reemplazado Platform.OS padding fijo por useSafeAreaInsets(). paddingBottom = insets.bottom + 32.' },
      { title: '[HECHO] UX: agregar "Olvidé mi contraseña" en pantalla de login mobile', done: true, note: 'login.tsx — agregado link "¿Olvidaste tu contraseña? Contáctanos" con Linking.openURL a mailto:hola@medaliq.com con asunto pre-llenado.' },
    ],
  },
]

function progress(items: { done: boolean }[]) {
  const done = items.filter((i) => i.done).length
  return { done, total: items.length, pct: Math.round((done / items.length) * 100) }
}

const STATUS_COLOR: Record<string, string> = {
  'Completado':       'bg-green-100 text-green-700',
  'En construcción':  'bg-orange-100 text-orange-700',
  'Urgente':          'bg-red-100 text-red-700',
  'Próximo':          'bg-purple-100 text-purple-700',
  'Post-lanzamiento': 'bg-cyan-100 text-cyan-700',
  'Futuro':           'bg-gray-100 text-gray-500',
  'Urgente — ahora':  'bg-red-100 text-red-700',
}

export default function AdminRoadmapPage() {
  const totalItems = PHASES.flatMap((p) => p.items)
  const totalDone = totalItems.filter((i) => i.done).length
  const totalPct = Math.round((totalDone / totalItems.length) * 100)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Roadmap del producto</h1>
        <p className="text-sm text-gray-500 mt-1">Estado de desarrollo de Medaliq — actualiza este archivo cuando completes una tarea</p>
      </div>

      {/* Progreso general */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-gray-600">Progreso total del producto</p>
            <p className="text-3xl font-extrabold text-gray-900 mt-1">
              {totalDone} <span className="text-lg font-medium text-gray-400">/ {totalItems.length} tareas</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-5xl font-extrabold" style={{ color: '#1e3a5f' }}>{totalPct}%</p>
            <p className="text-xs text-gray-400 mt-1">completado</p>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all"
            style={{ width: `${totalPct}%`, backgroundColor: '#f97316' }}
          />
        </div>

        {/* Mini resumen por fase */}
        <div className="grid grid-cols-3 md:grid-cols-7 gap-3 mt-6">
          {PHASES.map((phase) => {
            const { done, total, pct } = progress(phase.items)
            return (
              <div key={phase.id} className="text-center">
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                  <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: phase.color }} />
                </div>
                <p className="text-[10px] text-gray-500 leading-tight">{phase.label.split('—')[1]?.trim()}</p>
                <p className="text-xs font-bold text-gray-700">{done}/{total}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Fases */}
      <div className="space-y-6">
        {PHASES.map((phase) => {
          const { done, total, pct } = progress(phase.items)
          return (
            <div
              key={phase.id}
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: phase.borderColor, backgroundColor: phase.bgColor }}
            >
              {/* Phase header */}
              <div className="px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: phase.borderColor }}>
                <div className="flex items-center gap-3">
                  <h2 className="font-bold text-gray-900">{phase.label}</h2>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[phase.period]}`}>
                    {phase.period}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 bg-white/60 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: phase.color }} />
                  </div>
                  <span className="text-sm font-bold" style={{ color: phase.color }}>{done}/{total}</span>
                </div>
              </div>

              {/* Items */}
              <div className="divide-y" style={{ borderColor: phase.borderColor }}>
                {phase.items.map((item, idx) => (
                  <div key={idx} className="px-6 py-3 flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {item.done ? (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#16a34a' }}>
                          ✓
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 bg-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${item.done ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                        {item.title}
                      </p>
                      {item.note && (
                        <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-gray-400 mt-8 text-center">
        Medaliq Roadmap · Actualizar en <code className="bg-gray-100 px-1 rounded">src/app/admin/roadmap/page.tsx</code>
      </p>
    </div>
  )
}
