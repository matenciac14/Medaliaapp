'use client'
import { useState } from 'react'

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
    period: 'Completado',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    items: [
      { title: 'Dashboard coach — vista de atletas', done: true, note: 'Adherencia, alertas, resumen por atleta' },
      { title: 'Panel coach — detalle de atleta (5 tabs)', done: true, note: 'Resumen, plan, progreso, nutrición, gym' },
      { title: 'Tab Gym en panel atleta del coach', done: true, note: 'Gráfica de progresión por ejercicio + detalle última sesión' },
      { title: 'Coach: aprobación de plan no aplica en flujo B2B', done: true, note: 'En B2B el coach genera el plan desde template (Fase 18 = constructor visual). No hay plan AI que aprobar. Stub descartado — control total en Fase 18.' },
      { title: 'Tabs Resumen/Plan/Progreso/Nutrición → datos reales de DB', done: true, note: 'Promise.all: HealthProfile, TrainingPlan+weeks+sessions, WeeklyCheckIn x8, NutritionPlan. Verificación coach-atleta.' },
      { title: 'Vinculación coach-atleta por código invitación', done: true, note: 'InviteCode model en DB. /api/coach/invite persiste código 7d. /api/invite/[code] valida y redime. /join/[code] UI completa.' },
      { title: 'Coach puede editar features del atleta', done: true, note: 'Toggles en panel de atleta' },
      { title: 'Feed de alertas del coach en dashboard', done: true, note: 'Detecta: sin check-in >7d, RPE ≥8, pérdida de peso >750g/semana, plan auto-ajustado. Lista con link directo al atleta.' },
      { title: 'Editor de sesión individual inline (Tab Plan)', done: true, note: 'Botón Editar por sesión. Form inline: tipo, duración, zona objetivo, descripción. API PATCH /api/coach/sessions/[id].' },
      { title: 'Log de ajustes automáticos en Tab Resumen del atleta', done: true, note: 'Columna RPE y Ajustes en tabla check-ins. Sección "Log de ajustes" con semana, fecha y triggers aplicados.' },
      { title: 'Coach activa atleta siempre desde Tab Resumen (features.plan=false al crear)', done: true, note: 'Bug fix: planTier=pro ya no bypasea /pending. Atleta siempre espera activación explícita del coach.' },
      { title: 'Dashboard coach — métricas de negocio (KPIs)', done: true, note: 'Vista CEO: ingresos/mes, atletas activos, check-ins semana, adherencia promedio, atletas con alertas, distribución por deporte, feed de actividad reciente.' },
      { title: 'Ruta /coach/athletes — lista dedicada de atletas', done: true, note: 'Separación: /coach/dashboard = métricas de negocio, /coach/athletes = lista operacional de asesorados. Breadcrumb en panel atleta actualizado.' },
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
      { title: 'Visualización de supersets en sesión (web + mobile)', done: true, note: 'Web: border-l coloreado + badge label en card. Mobile: punto de color en tabs + badge pill en header del ejercicio.' },
      { title: 'Página editar rutina del coach — /coach/gym/routines/[id]', done: true, note: 'Wizard 4 pasos pre-cargado desde DB. GET + PATCH en /api/coach/gym/routines/[id] con transacción Prisma.' },
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
      { title: 'Prisma connection pooling (PgBouncer/Neon)', done: true, note: 'PrismaPg adapter con max: 10 conexiones. DATABASE_URL apunta al pooler de Neon. Implementado en Fase 20.' },
      { title: 'Rate limiting en APIs críticas', done: true, note: 'rateLimitAsync (Upstash Redis) en register, onboarding/generate, ai/chat, nutrition/scan. Implementado en Fase 20.' },
      { title: 'Error pages personalizadas (404, 500)', done: true, note: 'src/app/not-found.tsx + error.tsx con diseño Medaliq.' },
      { title: 'Google OAuth con dominio real', done: false, note: 'Google Cloud Console → Client ID + Secret → GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en Vercel. Código ya implementado. Ver Fase 10.' },
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
      { title: 'Trial de 30 días gratis', done: true, note: 'Al completar onboarding B2C → trial.plan=TRIAL, trial.endsAt=+30d, monthlyLimit=999999. Middleware redirige a /upgrade al expirar.' },
      { title: 'Página /upgrade con opciones de plan', done: true, note: 'Pro $15/mes vs INACTIVE (limitado). Diseño Medaliq con comparativa de features. Botón temporal mailto: hasta integrar Wompi/Stripe.' },
      { title: 'Pasarela de pagos Wompi + Stripe', done: false, note: 'Wompi para Colombia, Stripe para internacional. Pro $15/mes. Detalle completo en Fase 13.' },
      { title: 'Email transaccional (Resend)', done: false, note: 'Welcome, activación B2B, trial expirando. Detalle completo en Fase 13 y Deuda Técnica.' },
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
    period: 'Completado',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
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
      { title: 'Notas del coach por sesión del plan (persistidas en DB)', done: true, note: 'coachNote en PlannedSession. API PATCH /api/coach/sessions/[id]/note con auth.' },
      { title: 'Control de alta manual desde admin + desactivación', done: true, note: '/admin/activaciones — secciones Pendientes y Activos. Activar Pro/Coach, Desactivar. API PATCH /api/admin/users/[id]/plan' },
      { title: 'Beta cerrada — acceso bloqueado hasta activación manual', done: true, note: 'Onboarding no habilita features. JWT campo activated. Middleware redirige a /pending. Polling automático cada 10s.' },
      { title: 'Google OAuth con dominio real', done: false, note: 'Google Cloud Console → Client ID + Secret → GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en Vercel. Código ya implementado.' },
      { title: 'Botón "Continuar con Google" en /login', done: false, note: 'UI pendiente. La lógica en auth.ts ya está lista.' },
      { title: 'SEO: meta tags + sitemap para páginas públicas (/coaches, /p/[slug])', done: false, note: 'og:image, description, sitemap.xml. Páginas de marketplace deben ser indexables.' },
      { title: 'Hardening: validación de inputs en todas las APIs (Zod)', done: false, note: 'Zod schemas en rutas POST/PATCH — actualmente confía demasiado en el cliente' },
      { title: 'Sentry para monitoreo de errores en producción', done: false, note: 'Alertas automáticas cuando algo falla. Gratis hasta 5k errores/mes.' },
      { title: 'Uptime Robot para alertas de disponibilidad', done: false, note: 'Ping cada 5 min — email/SMS si la app cae.' },
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
    period: 'En construcción',
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    items: [
      { title: 'manifest.json con iconos y theme_color (#1e3a5f)', done: true, note: 'public/manifest.json. Icons via /api/icons/[size]. Shortcuts a /plan, /checkin, /gym.' },
      { title: 'Service worker — caché básico de assets', done: true, note: 'public/sw.js. Cache-first para assets estáticos, network-first para páginas, offline fallback. ServiceWorkerRegistration.tsx lo registra. En dev: se des-registra automáticamente.' },
      { title: 'Meta tags apple-mobile-web-app para iOS', done: true, note: 'layout.tsx: appleWebApp meta, formatDetection. apple-icon.tsx (180x180). InstallPWABanner para Android (BeforeInstallPrompt) e iOS (instrucciones Share→Agregar).' },
      { title: 'Offline support para gym session tracker', done: false, note: 'Guardar sets localmente (IndexedDB) y sincronizar al reconectar. Feature más crítica para mobile.' },
      { title: 'Responsive audit completo en móvil real', done: false, note: 'Probar cada pantalla en iPhone SE, iPhone 14, Samsung Galaxy. Fix de padding/overflow.' },
      { title: 'Banner de instalación PWA en dashboard', done: true, note: 'InstallPWABanner.tsx implementado. BeforeInstallPrompt para Android + instrucciones Share→Agregar para iOS. Registrado en layout.' },
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
    period: 'En construcción',
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    items: [
      { title: 'Instalar Xcode (Mac App Store)', done: false, note: 'Xcode 15+ (~10GB). Requerido para builds iOS locales, debug BLE en iPhone real, HealthKit, y cualquier módulo nativo iOS. EAS complementa pero no reemplaza Xcode para desarrollo con dispositivos.' },
      { title: 'Instalar Android Studio', done: false, note: 'SDK Platform 34+. Requerido para debug BLE en Android, Health Connect, módulos nativos Kotlin, y emulador local. Crear AVD con API 34+.' },
      { title: 'Instalar Expo CLI y EAS CLI globalmente', done: false, note: 'pnpm add -g expo-cli eas-cli. EAS = build en la nube sin Xcode local para CI.' },
      { title: 'Crear cuenta Expo (expo.dev)', done: false, note: 'Gratuita. Necesaria para EAS builds, OTA updates y proyecto en la nube.' },
      { title: 'Convertir repo a monorepo pnpm', done: false, note: 'Pendiente. El mobile existe en /MEDALIQ-MOBILE separado del web. Crear pnpm-workspace.yaml y mover ambos a apps/web/ y apps/mobile/ cuando sea prioritario.' },
      { title: '[HECHO] Scaffold mobile con Expo managed workflow', done: true, note: 'Proyecto existe en /MEDALIQ-MOBILE. Expo managed workflow, TypeScript, estructura completa de rutas y componentes.' },
      { title: 'Crear packages/shared-types con tipos del backend', done: false, note: 'Pendiente (depende del monorepo). Hoy web y mobile tienen sus propios tipos duplicados. Priorizar cuando se unifique el repo.' },
      { title: 'Crear packages/api-client con fetch client tipado', done: false, note: 'Pendiente. Mobile tiene src/api/ propio con 10 clientes tipados. Web tiene sus propias llamadas. Unificar requiere monorepo.' },
      { title: '[HECHO] Configurar NativeWind (Tailwind para React Native)', done: true, note: 'NativeWind configurado y en uso en componentes mobile. Estilos consistentes con web (#1e3a5f, gradientes, cards).' },
      { title: '[HECHO] Variables de entorno mobile (EXPO_PUBLIC_API_URL)', done: true, note: 'EXPO_PUBLIC_API_URL configurado. src/api/client.ts usa la URL base para todos los endpoints /api/mobile/*.' },
    ],
  },
  {
    id: 'mobile-core',
    label: 'Fase 16B — Core Features Mobile',
    period: 'En construcción',
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    items: [
      { title: '[HECHO] Auth nativa: login email/password con JWT en SecureStore', done: true, note: 'src/api/auth.ts + expo-secure-store. Login/logout/getMe. Token Bearer en todas las requests. Boot: index.tsx → getMe → route guard.' },
      { title: '[HECHO] Bottom tabs: Dashboard, Plan, Gym, AI Coach, Check-in, Nutrición, Perfil', done: true, note: 'app/(app)/(tabs)/_layout.tsx con 6 tabs activos + AI Coach. Expo Router file-based. Safe area insets en todos.' },
      { title: '[HECHO] Dashboard mobile: sesión de hoy + métricas principales', done: true, note: 'app/(app)/(tabs)/dashboard.tsx. Llama /api/mobile/dashboard. Pull-to-refresh, estado de error con retry, teaser AI Coach.' },
      { title: '[HECHO] Plan semanal mobile', done: true, note: 'app/(app)/(tabs)/plan.tsx. Llama /api/mobile/plan. Vista de semanas y sesiones del plan activo.' },
      { title: '[HECHO] Gym session tracker mobile', done: true, note: 'app/(app)/gym-session.tsx + gym-history.tsx. Tracker sets/reps/peso, historial expandible. Llama /api/mobile/gym/*.' },
      { title: '[HECHO] Check-in semanal mobile', done: true, note: 'app/(app)/(tabs)/checkin.tsx. Formulario RPE, energía, peso, FC. Llama /api/mobile/checkin.' },
      { title: '[HECHO] AI Coach chat mobile', done: true, note: 'app/(app)/(tabs)/ai-coach.tsx. Chat con /api/mobile/ai/chat (response completa, no streaming). FlatList invertida, UpgradeWall si sin acceso.' },
      { title: '[HECHO] Nutrición mobile', done: true, note: 'app/(app)/(tabs)/nutrition.tsx. Llama /api/mobile/nutrition. Muestra macros objetivo y plan del día.' },
      { title: '[HECHO] Progreso y log mobile', done: true, note: 'app/(app)/progress.tsx + log.tsx. Gráficas de evolución, registro manual de sesiones.' },
      { title: '[HECHO] Onboarding mobile: wizard con detalles por deporte', done: true, note: 'app/(auth)/onboarding.tsx reescrito. stepHistory stack. sport-details por deporte, hr-fitness, ruta corta GYM/BODY. Sincronizado con flujo web.' },
      { title: '[HECHO] Perfil mobile con datos reales', done: true, note: 'app/(app)/(tabs)/profile.tsx. Muestra plan, links ayuda/soporte. Manejo de INACTIVE/trial expirado.' },
      { title: 'Push notifications: recordatorio sesión del día', done: false, note: 'expo-notifications + FCM. Programar notificación local para hora de entrenamiento. Pendiente.' },
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
      { title: 'API: POST /api/coach/plan/[planId]/sessions', done: true, note: 'Agregar sesión a una semana de plan existente.' },
      { title: 'API: PATCH /api/coach/plan/[planId]/week/[weekId]', done: false, note: 'Editar metadata de semana: phase, volumeKm, focusDescription, isRecoveryWeek.' },
      { title: 'Página /coach/athlete/[id]/plan/build (full-screen separada)', done: true, note: 'Página dedicada para el constructor — overlay fixed inset-0 z-50 que cubre el sidebar sin cambiar el layout.' },
      { title: 'Componente WeekGrid: 7 columnas (Lun-Dom) con cards de sesión', done: true, note: 'Cada celda: SessionCard o botón "+" para agregar. Muestra type, intensity, duración.' },
      { title: 'Componente SessionCard: type badge, intensity, duration, sportLabel', done: true, note: 'Acciones inline: edit (✏) y delete (🗑). Color por tipo de sesión (10 colores distintos).' },
      { title: 'Componente SessionModal: form completo add/edit sesión', done: true, note: 'type, durationMin (quick-pick + custom), zoneTarget, detailText. Confirmación de borrado inline.' },
      { title: 'Componente WeekNav: mini-overview todas las semanas + indicador completitud', done: false, note: 'Puntos ●/○ por semana. Navegar con flechas ← →. Fase y recovery visible.' },
      { title: '"Generar desde template → abrir en constructor" integrado', done: false, note: 'El template precarga todas las sesiones en el builder para que el coach las edite.' },
      { title: '"Copiar semana anterior" para acelerar construcción', done: false, note: 'Duplica todas las sesiones de la semana anterior en la semana actual.' },
      { title: 'Tab Plan del atleta: botón "Constructor visual"', done: true, note: 'Botón en Tab Plan que abre /coach/athlete/[id]/plan/build. Constructor visual completo implementado.' },
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
      { title: '[HECHO] Fix: botón "Activar Pro" en /upgrade — cambiado a mailto:hola@medaliq.com interim', done: true, note: 'Botón disabled eliminado. Ahora es un <a> con mailto que abre email pre-llenado con el email del usuario y asunto "Quiero Pro". Fix real: Stripe pendiente.' },
      { title: '[HECHO] Fix: sidebar coach href="/dashboard" → "/coach/dashboard"', done: true, note: 'CoachSidebarClient.tsx línea 72. Eliminada la redirección innecesaria que pasaba por middleware.' },
      { title: '[HECHO] Fix: tab "Gym" en panel atleta del coach → renombrado a "Sesiones"', done: true, note: 'AthleteDetailClient.tsx — TABS, useEffect y render renombrados de "Gym" a "Sesiones" en los 3 lugares.' },
      { title: '[HECHO] Fix: enlace "Log" agregado en sidebar del atleta', done: true, note: 'SidebarClient.tsx — ClipboardList icon importado, link /log agregado entre Progreso y Gym con show: true. i18n types.ts + 3 archivos de traducción actualizados.' },
      { title: '[HECHO] Fix: botón "Registrar" en /plan era un <button> muerto sin onClick', done: true, note: 'PlanClientWeekSession extendido con id, durationMin, zoneTarget, detailText. plan/page.tsx pasa los 4 campos nuevos. <button> convertido a <Link href="/log?sessionId=..."> con todos los params.' },
      { title: '[HECHO] Fix: React hooks order violation en log/page.tsx', done: true, note: 'useState calls (distanceKm, hrAvg, notes, notCompleted_reason, saving, saved) aparecían después del return condicional en línea 74. Movidos al inicio del componente antes del early return.' },
      { title: '[HECHO] Fix: React hooks order violation en checkin/page.tsx', done: true, note: 'Todo el state (prevMetrics, weightKg, hrResting, etc.) aparecía después del paywall return en línea 126. Movidos todos los hooks antes del return condicional de FREE.' },
      { title: '[HECHO] Fix: Benchmarks de progreso siempre mostraban "Mejorando" hardcodeado', done: true, note: 'ProgressClient.tsx — las 3 filas de benchmarks (5k estimado, pace Z2, FC reposo) mostraban badge estático verde. Ahora es dinámico: hrEnd < hrStart → Mejorando, igual → Sin cambio, mayor → Empeorando.' },
      { title: '[HECHO] Fix: /pending prometía notificación por email inexistente', done: true, note: 'Text "Te avisaremos por email cuando tu cuenta esté activa" cambiado a "Tu coach te notificará directamente". No hay sistema de email implementado aún.' },
      { title: 'Email transaccional mínimo (Resend): welcome + activación B2B + trial expirando', done: false, note: 'BLOQUEANTE para operar. Detalle y roadmap completo en Fase 13. Resend gratis hasta 3k/mes.' },
      { title: 'Wompi/Stripe: suscripción Pro $15/mes + webhook activa tier', done: false, note: '/upgrade tiene botón mailto: temporal. Detalle completo en Fase 13.' },
      { title: '[HECHO] Fix: onboarding — steps muertos eliminados (main-goal, gym-goal, body-goal, day-schedule)', done: true, note: 'Removidos de StepId union type en _types.ts y de STEP_LABELS + stepContent en page.tsx. Los componentes existen pero nunca se renderizan. TypeScript ahora enforza solo los 10 steps activos.' },
      { title: '[HECHO] Fix: onboarding FREE path derivaba mainGoal="BODY" en handleGenerate()', done: true, note: 'La cadena ternaria caía en "BODY" cuando healthGoal=FREE. La API route detecta FREE por data.healthGoal, no por mainGoal, así que funcionaba por casualidad. Fix: caso explícito healthGoal==="FREE" → mainGoal="FREE" antes de llamar a la API.' },
      { title: '[HECHO] Fix: dayOfWeek en gym-session mobile', done: true, note: 'gym-session.tsx, gym.tsx y plan.tsx ya usan d === 0 ? 7 : d correctamente. Bug ya estaba corregido.' },
      { title: '[HECHO] Modal RPE + notas al finalizar sesión gym en mobile', done: true, note: 'FinishModal ya implementado en gym-session.tsx — RPE selector 1-10, duración pre-llenada con tiempo real del timer, notas opcionales. Bottom sheet con animationType="slide". Ya estaba completo.' },
    ],
  },
  {
    id: 'qa-local',
    label: 'Fase QA — Testing E2E',
    period: 'Urgente — ahora',
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fca5a5',
    items: [
      { title: 'Test E2E: registro ATHLETE B2C → onboarding RUNNING → plan → dashboard', done: true, note: 'Probado manualmente. Plan generado, trial activo, JWT actualizado, dashboard carga.' },
      { title: 'Test E2E: registro COACH → dashboard coach directo (sin onboarding)', done: true, note: 'Probado manualmente. callbackUrl + middleware guard funcionan correctamente.' },
      { title: 'Gating de features por tier (TRIAL/INACTIVE)', done: true, note: 'Paywalls en /checkin, /progress, /gym, /gym/history, /gym/session. AICoachChat bloqueado si monthlyLimit=0.' },
      { title: 'B2B post-onboarding: redirect a /pending', done: true, note: 'API devuelve isB2B en la respuesta. handleGenerate pushea a /pending si isB2B, /dashboard si B2C.' },
      { title: 'Test E2E: onboarding STRENGTH', done: false, note: 'Sin FC (solo experienceLevel). strengthStyle en sportDetails.' },
      { title: 'Test E2E: onboarding BODY (recomposición corporal)', done: false, note: 'weightGoalKg + targetDate. Sin sport seleccionado. Template BODY_RECOMPOSITION_16W.' },
      { title: 'Verificar plan no queda vacío (PlanWeeks y PlannedSessions en DB)', done: false, note: 'Query: TrainingPlan → weeks.length > 0 → sessions.length > 0 por semana. Revisar timeout en createMany.' },
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
      { title: 'Notificaciones email post-lanzamiento: check-in semanal + plan actualizado', done: false, note: 'CRÍTICO para retención. (1) recordatorio check-in semanal, (2) "tu plan fue actualizado" post check-in — cierra el loop. Implementar después de emails base de Fase 13.' },
      { title: 'Quick-log de sesión desde el dashboard (1 click)', done: false, note: '"¿Completaste tu sesión de hoy?" [Sí / No / Parcial] directo en la card del dashboard. Reduce abandono del hábito.' },
      { title: 'Gráficas de progreso visuales (no tablas)', done: false, note: 'Curva de peso, curva de FC reposo, barra de adherencia en el tiempo. El atleta necesita VER que el producto funciona.' },
      { title: 'Mensajería coach → atleta (notas simples, no chat)', done: false, note: 'Coach envía nota corta desde su panel. Atleta la ve en dashboard. Si coach sigue usando WhatsApp, no retorna a Medaliq.' },
      { title: 'Fallback plan de comidas sin AI (plantillas estáticas)', done: false, note: 'Si Anthropic cae, el plan de comidas falla con error. Fallback: combinar alimentos de la librería Food según macros target.' },
      { title: 'Stripe + Wompi: suscripción Pro $15/mes', done: false, note: 'Sin pasarela de pago no hay revenue. Detalle completo en Fase 13.' },
      { title: '[HECHO] Simplificar onboarding: objetivo de salud primero, deporte opcional', done: true, note: 'Rediseño completo: healthGoal (Perder grasa/Ganar músculo/Condición/Recomposición) → hasSport (sí/no) → deporte opcional. Sin day-schedule. Flujo sin deporte: 5 pasos. Con deporte: 7 pasos. Peso objetivo condicionado por healthGoal, no mainGoal.' },
      { title: 'AI Chat con prompts sugeridos', done: false, note: 'El chat está vacío y el atleta no sabe qué preguntar. Agregar 4-5 prompts sugeridos según el deporte y fase del plan.' },
      { title: 'Ocultar Marketplace de coaches hasta 20+ coaches activos', done: false, note: 'Directorio vacío genera fricción. Mantener la infraestructura pero no promocionar hasta tener contenido.' },
      { title: 'Export PDF del plan semanal (ver Fase 23)', done: false, note: 'Coaches lo piden para compartir con atletas que no usan la app. Detalle de implementación en Fase 23.' },
      { title: 'Notificación al coach cuando atleta completa sesión (ver Fase 23)', done: false, note: 'Refuerza el loop coach-atleta dentro de la app. Compite con WhatsApp como canal de comunicación. Detalle en Fase 23.' },
    ],
  },
  {
    id: 'mobile-qa',
    label: 'Fase Mobile — QA & Fixes',
    period: 'Completado',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
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
  {
    id: 'infra-performance',
    label: 'Fase 20 — Infraestructura & Performance',
    period: 'Completado',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    borderColor: '#86efac',
    items: [
      // ── NIVEL 0 — Bugs que rompen flujos en producción ──────────────────────
      {
        title: '[NIVEL 0] Fix crítico: middleware — usuarios FREE redirigen a /pending en loop infinito',
        done: true,
        note: 'middleware.ts: la condición !activated (features.plan=false) atrapa tanto atletas B2B pendientes como atletas FREE. Fix: añadir && userPlan === "INACTIVE" para que solo B2B sin activar vayan a /pending. Atletas FREE (TRIAL con plan=false) pasan directo al dashboard.',
      },
      {
        title: '[NIVEL 0] Crear vercel.json con maxDuration 60s en rutas de generación',
        done: true,
        note: 'Sin esto, Vercel corta el request a los 10s y los planes de 18 semanas fallan silenciosamente en producción. Rutas afectadas: /api/onboarding/generate, /api/plan/new, /api/coach/athlete/[id]/plan.',
      },
      // ── NIVEL 1 — Performance antes de 100 usuarios activos ─────────────────
      {
        title: '[NIVEL 1] Dashboard web: consolidar queries — de 4 round-trips a 2',
        done: true,
        note: 'findFirst(último plan COMPLETED) y findUnique(weeklyCheckIn) se ejecutan siempre de forma secuencial después del Promise.all inicial. Moverlos dentro del Promise.all elimina 2 round-trips extra en cada load del dashboard. Impacto directo en latencia percibida.',
      },
      {
        title: '[NIVEL 1] Check-in: sacar llamada a Claude Haiku del path crítico',
        done: true,
        note: 'Actualmente evaluateAndAdjust() llama a Haiku síncrono dentro del request (~2-3s). Plan: separar evaluateRules() (sync, determinista, <1ms) de generateRecommendationText() (Haiku). El usuario recibe respuesta inmediata con las reglas. El texto AI se guarda async después con fire-and-forget. Reducción de latencia: 2-3s → <200ms.',
      },
      {
        title: '[NIVEL 1] Generator: reemplazar 36 awaits secuenciales por 2 batches paralelos',
        done: true,
        note: 'Dentro de $transaction, el loop crea planWeek una a una (18 awaits) y luego plannedSession.createMany una a una (18 awaits más). Fix: Promise.all(weeks.map(w => tx.planWeek.create())) luego Promise.all(weekIds.map(id => tx.plannedSession.createMany())). De 15-30s estimados a 2-4s. Elimina el riesgo de timeout en Vercel.',
      },
      {
        title: '[NIVEL 1] Rate limiting funcional en producción — migrar 4 rutas a rateLimitAsync',
        done: true,
        note: 'Las rutas /api/auth/register, /api/onboarding/generate, /api/mobile/onboarding/generate y /api/nutrition/foods/scan usan rateLimit() síncrono con Map en memoria. En Vercel serverless, cada request puede ir a una instancia distinta — el Map no se comparte. Fix: cambiar a rateLimitAsync() + configurar Upstash Redis (Free tier: 10k req/día, suficiente para beta).',
      },
      // ── NIVEL 2 — Escalabilidad antes de 1000 usuarios ─────────────────────
      {
        title: '[NIVEL 2] Cache SystemConfig (AIProfile) con unstable_cache TTL 1h',
        done: true,
        note: 'SystemConfig lo leen AI chat, check-in y generador de planes en cada request. El dato cambia máximo 1 vez al día (admin lo edita). Con Next.js unstable_cache TTL 3600s → 0 queries a SystemConfig en runtime salvo revalidación manual. Reducción estimada: 3 queries eliminadas por check-in/chat.',
      },
      {
        title: '[NIVEL 2] Agregar índices faltantes en DB: WeeklyCheckIn(userId), PlannedSession(weekId), PlanWeek(planId)',
        done: true,
        note: 'WeeklyCheckIn solo tiene @@unique([userId, weekNumber]) pero no @@index([userId]) — cada fetch de check-ins hace seq scan. PlannedSession no tiene índice en weekId, PlanWeek no tiene índice en planId. Con estos 3 índices, las queries de plan/semanas/sesiones pasan de O(n) a O(log n). Crear migración Prisma y aplicar en Neon.',
      },
      {
        title: '[NIVEL 2] Coach dashboard: agregar paginación (take: 20 + cursor)',
        done: true,
        note: 'La query de coach dashboard carga N atletas × plan × semanas × sesiones × logs en un solo query. Un coach con 50 atletas genera una query de múltiples segundos. Fix: take: 20 con cursor pagination. Agregar UI de paginación o scroll infinito en AthleteTabs.',
      },
      {
        title: '[NIVEL 2] Prisma: declarar pool explícito max: 10 en PrismaPg adapter',
        done: true,
        note: 'Sin configuración explícita del pool, Prisma abre conexiones sin límite controlado. Neon Free soporta ~20 conexiones simultáneas. Declarar max: 10 previene saturación del pool en picos de tráfico y deja margen para queries de larga duración.',
      },
      {
        title: '[NIVEL 2] Dashboard mobile: aplicar mismas optimizaciones de queries que web',
        done: true,
        note: '/api/mobile/dashboard tiene el mismo patrón de queries secuenciales post-lifecycle que el dashboard web. Consolidar findFirst(COMPLETED) dentro del Promise.all inicial y verificar que no haya round-trips innecesarios.',
      },
    ],
  },
  {
    id: 'coach-consolidation',
    label: 'Fase 21 — Consolidación Flujos Coach',
    period: 'En construcción',
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    items: [
      {
        title: 'Nuevo endpoint GET /api/coach/clients/check — verificar si email ya existe en DB',
        done: true,
        note: 'Recibe ?email=... y devuelve { exists, user? }. Permite al flujo de /coach/clients/new detectar si el atleta ya tiene cuenta antes de crear una nueva.',
      },
      {
        title: 'Nuevo endpoint POST /api/coach/clients/link — vincular atleta existente al coach',
        done: true,
        note: 'Crea relación CoachAthlete sin crear User nuevo. Para atletas que ya tienen cuenta en MedalIQ y quieren vincularse a un coach.',
      },
      {
        title: 'Rediseñar /coach/clients/new — flujo email-first unificado',
        done: true,
        note: 'Paso 1: ingresar email → verificar. Si existe: card del atleta + botón "Vincular a mi roster". Si no existe: form de creación. Un solo punto de entrada sin ambigüedad.',
      },
      {
        title: 'Limpiar /coach/invite — conectar a API real y eliminar mock',
        done: true,
        note: 'Conectado a POST /api/coach/invite real. Muestra historial con badges Activo/Usado/Expirado y botón copiar link. Sección "Crear directamente" eliminada — reemplazada por link a /coach/clients/new.',
      },
      {
        title: 'Eliminar /api/coach/athlete/[id]/activate — reemplazar por /config con gym incluido',
        done: true,
        note: 'Archivo /activate eliminado. Botón "Activar cuenta" en Tab Resumen llama PATCH /api/coach/athlete/[id]/config con features: { plan, checkin, nutrition, progress, log, gym } = true.',
      },
      {
        title: 'Remover selector de rol COACH de /register público',
        done: true,
        note: 'register/page.tsx no tiene selector de rol. API /api/auth/register hardcodea role=ATHLETE. Comentario explícito en código: "COACH solo se crea desde admin".',
      },
      {
        title: 'Fix: recalcular intensity al editar tipo de sesión en /api/coach/sessions/[sessionId]/edit',
        done: true,
        note: 'getSessionIntensity() extraído a src/lib/plan/intensity.ts. PATCH handler aplica intensity recalculada cuando cambia el tipo de sesión — sync training-nutrition se mantiene correcto.',
      },
      {
        title: 'Fix: corregir filtro date en coach dashboard (PlannedSession no tiene campo date)',
        done: true,
        note: 'Dashboard reescrito con métricas de negocio — ya no filtra por PlannedSession.date. Bug eliminado por rediseño completo de la pantalla.',
      },
      {
        title: 'Google OAuth: bloquear registro como COACH desde OAuth público',
        done: true,
        note: 'Resuelto al eliminar el selector de rol en /register. Google OAuth sigue la misma ruta de registro y siempre crea ATHLETE.',
      },
      {
        title: 'Test E2E: flujo B2B completo post-consolidación',
        done: false,
        note: 'Coach entra a /coach/clients/new → verifica email → crea o vincula atleta → atleta hace onboarding → va a /pending → coach activa con /config (incluyendo gym) → atleta accede al dashboard. Verificar que todos los pasos del flujo unificado funcionan sin fricción.',
      },
      {
        title: 'Test E2E: flujo invite code completo',
        done: false,
        note: 'Coach va a /coach/invite → genera código vía API real (POST /api/coach/invite) → código aparece en lista con estado → atleta visita /join/[code] → se registra → se vincula al coach → hace onboarding → va a /pending.',
      },
    ],
  },
  {
    id: 'nutrition-tracking',
    label: 'Fase 22 — Nutrición: Tracking Real + Mobile Completo',
    period: 'En construcción',
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    items: [
      {
        title: '[HECHO] API: endpoints FoodLog — crear, leer y resumir ingesta diaria',
        done: true,
        note: 'POST /api/nutrition/log + GET /api/nutrition/log?date= con totales y % vs target. Versiones mobile en /api/mobile/nutrition/log. intensityToDayType() mapea HIGH→hard, REST→rest, resto→easy. calcMacros() calcula macros por gramos consumidos. Cliente mobile: getFoodLogs() y logFood() en src/api/nutrition.ts.',
      },
      {
        title: '[HECHO] Mobile: FoodSetupFlow — configurar plan de comidas desde la app',
        done: true,
        note: 'src/components/FoodSetupFlow.tsx: Modal pageSheet 2 pasos (foods → prefs → generating → done). Mismo catálogo LatAm que web. Endpoint móvil /api/mobile/nutrition/generate-meals creado (Bearer token, mismo prompt que web). Al completar: invalidateQueries nutrition. Integrado en (tabs)/nutrition.tsx con botón "Configurar mi plan" cuando mealPlan=null.',
      },
      {
        title: '[HECHO] Mobile: food tracking — loggear comidas y ver progreso vs objetivo',
        done: true,
        note: 'FoodLogTracker.tsx: card con 4 barras de progreso (consumido/target, rojo si supera). Lista últimos 3 registros del día. LogFoodModal.tsx: búsqueda en librería, quick-picks de gramaje (50/100/150/200g), preview de macros en tiempo real, selector de mealType. Endpoint /api/mobile/nutrition/foods creado. useQuery(nutrition-log) + useMutation(logFood). Integrado en (tabs)/nutrition.tsx sobre las macros.',
      },
      {
        title: 'Refactor: mover getDayType a lib compartida + eliminar duplicado nutrition.tsx mobile',
        done: false,
        note: 'getDayType está duplicada en nutrition/page.tsx y /api/mobile/nutrition/route.ts con lógicas distintas. Crear src/lib/nutrition/day-type.ts y reutilizar en ambos. También: verificar cuál de app/(app)/nutrition.tsx vs app/(app)/(tabs)/nutrition.tsx se usa y eliminar el huérfano.',
      },
      {
        title: 'Coach: GET nutrición del atleta — ver MealPlan y FoodProfile desde panel',
        done: false,
        note: 'Agregar GET /api/coach/athlete/[id]/nutrition para leer NutritionPlan + MealPlan.data + FoodProfile. En Tab Nutrición del panel coach: mostrar alimentos disponibles del atleta, restricciones, comidas/día y fecha de última generación del plan. Solo lectura — el PATCH de macros ya existe.',
      },
    ],
  },
  {
    id: 'retention-metrics',
    label: 'Fase 23 — Retención: Métricas Avanzadas',
    period: 'Próximo',
    color: '#7c3aed',
    bgColor: '#faf5ff',
    borderColor: '#d8b4fe',
    items: [
      {
        title: 'Migración DB: medidas corporales en WeeklyCheckIn (cintura, brazos, caderas, piernas)',
        done: false,
        note: 'Nuevos campos opcionales Float?: waistCm, armsCm, hipsCm, thighsCm, chestCm. Se registran junto al peso en el check-in semanal. Migración Prisma + DIRECT_URL.',
      },
      {
        title: 'UI check-in web: sección "Medidas corporales" colapsable',
        done: false,
        note: 'Después del campo de peso, sección opcional con 5 inputs de circunferencias. Colapsable para no alargar el form a usuarios que no la usan. Solo aparece si la feature está activa en UserConfig.',
      },
      {
        title: 'Mobile: medidas corporales en check-in mobile',
        done: false,
        note: 'app/(app)/(tabs)/checkin.tsx — mismos 5 campos opcionales. Misma lógica de colapso. API /api/mobile/checkin ya acepta el body — solo agregar campos al payload y al schema Zod.',
      },
      {
        title: 'Gráficas de circunferencias en /progress (web + mobile)',
        done: false,
        note: 'Líneas separadas por zona (cintura, brazos, etc.) en la página de progreso. Mismo patrón de gráficas que peso y FC. El atleta ve visualmente la recomposición corporal incluso si el peso no baja.',
      },
      {
        title: 'Coach: ver medidas corporales en Tab Progreso del panel atleta',
        done: false,
        note: 'Agregar tabla de circunferencias al Tab Progreso. Junto al peso. Coach ve la evolución completa del atleta.',
      },
      {
        title: 'Migración DB + storage: fotos de progreso semanales (Vercel Blob)',
        done: false,
        note: 'Nuevo modelo ProgressPhoto { id, userId, checkInId?, url, takenAt, notes? }. Storage: Vercel Blob (gratis hasta 1GB, después $0.023/GB). API: POST /api/progress/photos (multipart upload) + GET /api/progress/photos?userId=.',
      },
      {
        title: 'UI check-in web: subir foto de progreso opcional',
        done: false,
        note: 'Input file al final del check-in semanal. Preview antes de subir. Máximo 5MB, formatos JPG/PNG/WEBP. Se sube a Vercel Blob y guarda la URL en DB.',
      },
      {
        title: 'Página /progress: comparador de fotos (antes / después)',
        done: false,
        note: 'Grid de fotos ordenadas por fecha. Selector de dos fechas para comparar side-by-side. El atleta ve el cambio visual — el motivador más poderoso para retención.',
      },
      {
        title: 'Mobile: subir foto de progreso desde check-in mobile',
        done: false,
        note: 'expo-image-picker para seleccionar o tomar foto. Upload multipart a /api/mobile/progress/photos. Compresión a 80% calidad antes de subir para reducir consumo de datos.',
      },
      {
        title: '[HECHO] Porcentaje de adherencia visible para el atleta en su dashboard',
        done: true,
        note: 'Implementado en Fase 24 — badge color-coded (verde/amber/rojo) en el header del dashboard. Últimas 4 semanas del plan activo. Ver Fase 24 para detalle técnico.',
      },
      {
        title: 'Detección automática de PRs en gym tracker',
        done: false,
        note: 'En /api/gym/session/complete: al guardar cada SetLog, comparar con el máximo histórico del mismo ejercicio para ese usuario. Si supera el récord → guardar flag isPR=true en SetLog. Schema: agregar isPR Boolean @default(false) en SetLog.',
      },
      {
        title: 'UI: badge PR en gym session tracker (web + mobile)',
        done: false,
        note: 'Cuando isPR=true en el set completado: mostrar badge 🏆 "¡Nuevo récord!" inline en la card del ejercicio. En historial de gym: icono trofeo junto a sets marcados como PR.',
      },
      {
        title: 'Export PDF del plan semanal',
        done: false,
        note: 'Generar PDF con las sesiones de la semana actual: tipo, duración, zona objetivo, descripción. Librería: @react-pdf/renderer (client-side) o puppeteer (server-side). Botón "Descargar semana" en /plan y en Tab Plan del coach. Coaches lo usan para compartir con atletas que no usan la app.',
      },
      {
        title: 'Notificación in-app al coach cuando atleta completa una sesión',
        done: false,
        note: 'Al hacer POST /api/log/session o completar gym session: crear registro en tabla Notification { coachId, athleteId, type: SESSION_COMPLETED, sessionId, readAt? }. Coach ve badge de notificaciones en su sidebar. Click → va al panel del atleta. Refuerza el loop coach-atleta dentro de la app.',
      },
    ],
  },
  {
    id: 'audit-sprint-1',
    label: 'Auditoría Técnica — Sprint 1: Bugs Confirmados',
    period: 'Urgente',
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    items: [
      {
        title: '[NUTRICIÓN] Fix: nutrition/page.tsx usa getDayType() local con strings del enum viejo',
        done: false,
        note: 'PARCIALMENTE CONFIRMADO. getDayType() local mapea "FARTLEK", "TIRADA_LARGA" etc. en vez de usar intensityToDayType() de day-type.ts que ya existe. La función daily-target.ts usa SessionIntensity (HIGH|MODERATE|LOW|REST) pero nutrition/page.tsx consulta session.type (string viejo). Deuda técnica: refactorizar para que ambas usen la misma fuente de verdad.',
      },
      {
        title: '[HECHO] Fix: inconsistencia REST carbs 0.6 vs 0.7',
        done: true,
        note: 'Verificado con Grep: daily-target.ts, generate-meals/route.ts, mobile/nutrition/route.ts, NutritionContent.tsx y mobile/nutrition/log — todos usan * 0.7 consistentemente. La inconsistencia era stale info. Sin cambio de código requerido.',
      },
      {
        title: '[COACH] Fix crítico seguridad: tempPassword devuelta en JSON plaintext',
        done: false,
        note: 'CONFIRMADO CRÍTICO. /api/coach/clients/create/route.ts:101 devuelve { tempPassword } en el JSON. /api/coach/athlete/[id]/reset-password/route.ts:39 igual. Contraseña visible en logs de Vercel, browser DevTools, network inspector. Fix: generar token de reset firmado (JWT corto), devolver link de reset al coach, nunca la contraseña.',
      },
      {
        title: '[COACH] Fix: cálculo de fecha de sesión incorrecto — off by one day',
        done: false,
        note: 'CONFIRMADO. /api/coach/plan/[planId]/sessions/route.ts:38-39 — sessionDate.setDate(startDate.getDate() + dayOfWeek). dayOfWeek=1 (lunes) sobre startDate=lunes → resultado es martes. Todas las sesiones caen un día tarde. Fix: setDate(getDate() + dayOfWeek - 1).',
      },
      {
        title: '[ATLETA] Fix: applyPlanAdjustments ignora sesiones en Z1 — edge case sin manejar',
        done: false,
        note: 'CONFIRMADO. adjustments.ts:224 — zoneMap = { Z5:Z4, Z4:Z3, Z3:Z2, Z2:Z1 }. Si sesión está en Z1, zoneMap["Z1"] = undefined → if(lowerZone) falla, ajuste no se aplica silenciosamente. También: coachNote existente se reemplaza con "[AUTO]..." en vez de concatenar. Fix: agregar Z1→"DESCANSO" al mapa y usar coachNote + " " + autoNote.',
      },
      {
        title: '[GYM] Implementar progresión de cargas real — hoy es solo sugerencia UI',
        done: false,
        note: 'CONFIRMADO. gym/session/page.tsx muestra "+2.5 kg recomendado" cuando allRepsHit pero no persiste nada. No existe campo suggestedNextWeightKg en WorkoutExercise ni modelo ExerciseProgression en schema. Fix: (1) migración DB con suggestedNextWeightKg en WorkoutExercise, (2) endpoint PATCH /api/gym/session/complete actualiza el campo, (3) próxima sesión del ejercicio lo carga como referencia.',
      },
    ],
  },
  {
    id: 'audit-sprint-2',
    label: 'Auditoría Técnica — Sprint 2: Calidad y Deuda',
    period: 'Próximo',
    color: '#7c3aed',
    bgColor: '#faf5ff',
    borderColor: '#d8b4fe',
    items: [
      {
        title: '[HECHO] Centralizar helpers de calendario duplicados (jsToOurDow, WEEK_DAYS)',
        done: true,
        note: 'Creado src/lib/utils/calendar.ts — jsToOurDow(), getTodayDow(), jsToWeekIdx(), WEEK_DAYS[], WEEK_DAYS_FULL[]. Fuente única para importar en todos los componentes que los usan.',
      },
      {
        title: '[HECHO] Centralizar PHASE_COLORS duplicados',
        done: true,
        note: 'Creado src/lib/constants/phases.ts — PHASE_COLORS record + getPhaseColor(phase) con normalización a mayúsculas y fallback DEFAULT. Importar en dashboard, plan y progress en lugar del objeto inline.',
      },
      {
        title: '[HECHO] Dividir CheckInClient.tsx (662 líneas, 5 responsabilidades)',
        done: true,
        note: 'Dividido en 4 archivos: checkin.types.ts (interfaces PrevMetrics, LastWeekSummary, CheckInState, TRIGGER_LABELS), SubmittedCheckInView.tsx, EarlyCheckInScreen.tsx, CheckInClient.tsx (~260 líneas). Orquesta con early returns según checkInState.',
      },
      {
        title: '[HECHO] Paginar sesiones en panel atleta del coach (evitar over-fetch)',
        done: true,
        note: 'Paginación client-side en AthleteDetailClient.tsx: estado planViewWeekIdx con default inteligente (última semana pasada). Tab Plan renderiza una sola semana con botones Anterior/Siguiente. Reduce DOM de 90 cards a ~5 sesiones. Sin round-trip adicional — datos ya en memoria.',
      },
      {
        title: '[HECHO] Mover alimentos hardcodeados de FoodSetupFlow a API',
        done: true,
        note: 'FoodSetupFlow.tsx: eliminada lista de 19 alimentos hardcodeados. Reemplazada por buildFoodCategories(allFoods) que agrupa por food.category desde DB usando CATEGORY_META (PROTEIN|CARB|FAT|VEG|FRUIT|DAIRY|LEGUME|OTHER). IDs mapeados directamente sin fuzzy matching. nutrition/page.tsx pasa allFoods desde la query de Foods.',
      },
      {
        title: 'Validar formato de MealPlan JSON antes de renderizar',
        done: false,
        note: 'nutrition/page.tsx:131 pasa mealPlan.data as any a NutritionContent. Si AI genera JSON con formato distinto, el componente crashea sin error claro. Fix: schema Zod para MealPlanData { hard, easy, rest } → validar antes de pasar al componente. Fallback: mostrar empty state con CTA a regenerar.',
      },
      {
        title: 'Estandarizar lógica REST carbs en NutritionContent (usar daily-target.ts)',
        done: false,
        note: 'NutritionContent.tsx:85 recalcula targets de día REST manualmente (carbsEasyG * 0.7). Debería importar getDailyNutritionTarget() de daily-target.ts para tener una sola fuente de verdad. Elimina duplicación y garantiza consistencia automática.',
      },
      {
        title: '[HECHO] Race condition en feature toggles del atleta (clicks rápidos)',
        done: true,
        note: 'AthleteFeatureToggles.tsx ya tiene saving: Partial<Record<keyof FeatureState, boolean>> por feature + disabled={saving[key]} en cada toggle. El botón queda inhabilitado mientras el request está en vuelo — la race condition estaba ya resuelta.',
      },
      {
        title: '[HECHO] Centralizar constantes de feature gating (COACH_ALLOWED_FEATURES)',
        done: true,
        note: 'Creado src/lib/constants/features.ts — COACH_ALLOWED_FEATURES, PLAN_REQUIRED_FEATURES, NUTRITION_REQUIRED_FEATURES, GYM_REQUIRED_FEATURES, PROGRESS_REQUIRED_FEATURES. Tipadas como FeatureKey[] para TypeScript enforcement.',
      },
    ],
  },
  {
    id: 'audit-sprint-3',
    label: 'Auditoría Técnica — Sprint 3: Arquitectura SOLID',
    period: 'Próximo',
    color: '#0891b2',
    bgColor: '#f0f9ff',
    borderColor: '#7dd3fc',
    items: [
      {
        title: 'Extraer lógica de generator.ts a use case en domain layer',
        done: false,
        note: 'generator.ts tiene 673 líneas mezclando: selección de template, cálculo HR zones, llamada a Haiku, escritura en DB, actualización de JWT config. Viola SRP y DIP. Plan: crear src/domain/plan/generate-plan.use-case.ts (puro, sin Prisma), src/infrastructure/db/prisma-plan.repository.ts (IPlanRepository). La ruta de API queda en ~25 líneas.',
      },
      {
        title: 'Extraer lógica de applyPlanAdjustments a domain layer',
        done: false,
        note: 'adjustments.ts llama prisma.plannedSession.update() directamente (línea 238). La lógica de evaluación (evaluateRules) ya es pura, pero la aplicación está acoplada a Prisma. Crear src/domain/checkin/adjust-plan.use-case.ts + src/infrastructure/db/prisma-session.repository.ts.',
      },
      {
        title: 'Mover umbrales de ajuste de check-in a SystemConfig',
        done: false,
        note: 'adjustments.ts tiene fcBaseline=62, sleepHours<6.5, rpe>=9, stressLevel>=8 hardcodeados. Deberían estar en SystemConfig (que admin edita en /admin) para poder calibrar sin redeploy. Agregar campo adjustmentThresholds JSON en SystemConfig.',
      },
      {
        title: '[HECHO] Eliminar duplicación de getISOWeekNumber entre checkin/route y mobile-auth',
        done: true,
        note: 'Creado src/lib/core/week-number.ts — getISOWeekNumber(date), getPlanWeekNumber(startDate, totalWeeks), getCurrentISOWeek(). Las dos funciones son distintas: ISO absoluta vs relativa al plan. Ambas disponibles desde una sola fuente.',
      },
      {
        title: 'Mover feature flag AI_ONBOARDING_ENABLED a SystemConfig',
        done: false,
        note: 'generator.ts:6-7 tiene const AI_ONBOARDING_ENABLED = false hardcodeado. Debería leerse de getCachedSystemConfig() para que el admin lo controle desde /admin sin redeploy.',
      },
      {
        title: 'Eliminar uso de "as any" en casting de enums (generator, config routes)',
        done: false,
        note: 'generator.ts usa status: "ACTIVE" as any, generatedBy: ... as any, intensity: ... as any en múltiples lugares. Si el enum del schema cambia, el error no se detecta en compilación. Fix: importar los tipos de @prisma/client y usar satisfies o cast tipado.',
      },
      {
        title: '[HECHO] Centralizar error handling — crear helpers unauthorized/badRequest/notFound',
        done: true,
        note: 'Creado src/lib/api/responses.ts — ok(), created(), badRequest(), unauthorized(), forbidden(), notFound(), conflict(), serverError(). Ambas rutas de checkin (web + mobile) ya los usan.',
      },
      {
        title: 'Separar contextos gym y plan training en /api/gym/session/complete',
        done: false,
        note: 'complete/route.ts mezcla dos responsabilidades: crear GymSession y buscar PlannedSession para vincular SessionLog. Son contextos distintos. Separar en: completarGymSession() → después, opcionalmente vincularSesionAlPlan(). Si falla el vínculo, la sesión gym no debería fallar.',
      },
    ],
  },
  {
    id: 'audit-concurrency',
    label: 'Auditoría Técnica — Concurrencia y Persistencia',
    period: 'Urgente',
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    items: [
      {
        title: '[HECHO] Check-in web sin transacción envolvente — 6 operaciones DB separadas',
        done: true,
        note: 'Resuelto con 3 fases en processCheckIn use case: (1) reads paralelos fuera de tx, (2) evaluación pura + AI Haiku fuera de tx (I/O externo no puede ir dentro de una $transaction), (3) todos los writes en prisma.$transaction({ timeout: 30s }) — upsert check-in + ajustar sesiones + sync peso + activar progress. PrismaDbClient type compartido entre full client y tx client. Si cualquier write falla, el check-in completo se rollbackea.',
      },
      {
        title: '[HECHO] Check-in mobile tiene el mismo problema de transacción',
        done: true,
        note: 'Resuelto automáticamente: mobile llama el mismo processCheckIn use case que web. Ambas rutas pasan db: prisma y el use case maneja el $transaction internamente. Fix en un solo lugar, aplica a los dos canales.',
      },
      {
        title: '[ALTO] AI recommendations de Haiku corre DENTRO de la transacción del generador',
        done: false,
        note: 'generator.ts:485 llama getAIRecommendations() (Anthropic Haiku) dentro del $transaction con timeout 30s. Si Haiku responde en 31s, la transacción expira, todo el plan se rollbackea y el atleta ve plan vacío sin error claro. Fix: mover la llamada AI ANTES de abrir la transacción. La tx solo maneja escrituras en DB, no I/O externo.',
      },
      {
        title: '[ALTO] applyPlanAdjustments sin lock — edición del coach puede perderse',
        done: false,
        note: 'adjustments.ts:176 hace loop de UPDATEs en sesiones sin SELECT FOR UPDATE. Race condition: coach edita sesión desde AthleteDetailClient → PATCH /api/coach/sessions/[id] → mientras tanto checkin dispara applyPlanAdjustments sobre la misma sesión → el ajuste automático sobrescribe la edición manual del coach. Fix: usar raw SQL SELECT ... FOR UPDATE o serializar los updates con timestamp de edición.',
      },
      {
        title: '[ALTO] Onboarding: upserts de HealthProfile y User.config sin transacción',
        done: false,
        note: '/api/onboarding/generate/route.ts:267-327 (path B2B) — healthProfile.upsert() y user.update() corren en secuencia sin $transaction. Si user.update() falla: atleta vinculado al coach, HealthProfile creado, pero onboarding NO marcado como completo. Estado fantasma: coach ve atleta activo, atleta no puede completar el flow. Fix: envolver ambas ops en una transacción.',
      },
      {
        title: '[MEDIO] Check-in duplicado posible en race condition (doble submit)',
        done: false,
        note: 'Si atleta hace submit dos veces en menos de 1s, ambos requests leen prevCheckIn en paralelo, calculan la misma trainingAdherence y hacen upsert. El UNIQUE constraint en (userId, weekNumber) evita duplicados, pero el segundo request SOBRESCRIBE el primero completamente. Triggers de applyPlanAdjustments se ejecutan dos veces. Fix: debounce en cliente (ya debería existir) + idempotency key en header.',
      },
    ],
  },
  {
    id: 'audit-mobile-security',
    label: 'Auditoría Técnica — Seguridad Mobile',
    period: 'Urgente',
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    items: [
      {
        title: '[HECHO] Feature gating en 4 endpoints mobile PRO',
        done: true,
        note: 'requireFeature(mobile.features, feature) aplicado: nutrition/log (GET+POST), progress, gym/week, nutrition/generate-meals. src/lib/guards/feature-gate.ts centralizado. Funciona con features del JWT — sin round-trip a DB.',
      },
      {
        title: '[HECHO] MobileTokenPayload incluye features.* — cliente mobile conoce su tier',
        done: true,
        note: 'MobileTokenPayload ya tiene features: UserConfig["features"]. signMobileToken() lo incluye en el JWT. El cliente mobile puede leer features sin llamada extra a la API.',
      },
      {
        title: '[HECHO] Onboarding mobile path GYM — validación B2B correcta',
        done: true,
        note: 'completeOnboardingUseCase llama checkIsB2B() dentro de cada path (FREE, GYM, SPORT/BODY). Si es B2B, conserva features actuales del coach y no activa TRIAL. El bug ya estaba corregido en el use case.',
      },
      {
        title: '[HECHO] POST /api/mobile/log/session — feature gating añadido',
        done: true,
        note: 'requireFeature(mobile.features, "log") añadido al handler. Usuarios FREE no pueden loggear sesiones del plan desde mobile.',
      },
      {
        title: '[MEDIO] weekOffset en gym/week sin validación de rango',
        done: false,
        note: '/api/mobile/gym/week/route.ts — weekOffset viene del query param sin validación. Un valor muy negativo o muy positivo puede causar comportamientos inesperados en el cálculo de fechas. Fix: if (Math.abs(weekOffset) > 52) return badRequest("weekOffset fuera de rango").',
      },
      {
        title: '[HECHO] 11 endpoints mobile sin rate limiting por usuario',
        done: true,
        note: 'rateLimitAsync aplicado en los 11 endpoints faltantes: checkin (GET 300, POST 100), dashboard (300), plan (300), nutrition (300), progress (300), gym/week (300), nutrition/foods (300), nutrition/log (GET 300, POST 100), log/session (100), gym/history (300), dashboard/week-sessions (300). Key pattern: mobile-${userId}:endpoint-name.',
      },
    ],
  },
  {
    id: 'audit-db-schema',
    label: 'Auditoría Técnica — Schema DB: Constraints Faltantes',
    period: 'Próximo',
    color: '#7c3aed',
    bgColor: '#faf5ff',
    borderColor: '#d8b4fe',
    items: [
      {
        title: '[HECHO] TrainingPlan sin UNIQUE constraint en (userId, status=ACTIVE)',
        done: true,
        note: 'Migración 20260623000002 aplica índice parcial vía raw SQL: CREATE UNIQUE INDEX "TrainingPlan_userId_active_unique" ON "TrainingPlan" (userId) WHERE status = \'ACTIVE\'. Prisma no soporta partial indexes declarativos — se aplica con directUrl en migrations. Permite múltiples planes COMPLETED/PAUSED por usuario.',
      },
      {
        title: '[HECHO] GymSession sin UNIQUE — posibles sesiones duplicadas el mismo día',
        done: true,
        note: 'schema.prisma: @@unique([athleteId, date, assignedWorkoutId]) en GymSession. Migración 20260623000002 aplica el índice en DB. Previene duplicados de sesión del mismo atleta/día/rutina.',
      },
      {
        title: '[ALTO] AssignedWorkout sin UNIQUE — atleta con dos rutinas activas simultáneas',
        done: false,
        note: 'No hay constraint en AssignedWorkout para garantizar que un atleta tenga solo una rutina isActive=true. Si el coach asigna dos veces, el gym tracker puede mostrar la rutina equivocada. Fix: validar en la API que si existe una AssignedWorkout isActive=true, desactivarla antes de crear la nueva (dentro de transacción).',
      },
      {
        title: '[MEDIO] CoachAthlete sin onDelete: Cascade al eliminar el coach',
        done: false,
        note: 'Si se elimina un User con rol COACH, las filas de CoachAthlete (coachedBy y coachOf) quedan huérfanas con referencias a un coachId que ya no existe. Consultas WHERE coachId=X devuelven registros sin usuario válido. Fix: agregar onDelete: Cascade o SetNull en la relación CoachAthlete→User.',
      },
      {
        title: '[HECHO] FoodLog sin constraint de unicidad — macros duplicadas por accidente',
        done: true,
        note: 'schema.prisma: @@unique([userId, foodId, date, mealType]) en FoodLog. Migración 20260623000002 aplica el índice. Un atleta no puede loggear el mismo alimento en el mismo mealType del mismo día dos veces.',
      },
      {
        title: '[MEDIO] FoodProfile.availableFoods es String[] sin FK a Food — referencias huérfanas',
        done: false,
        note: 'availableFoods: String[] almacena IDs de Food como strings sin foreign key. Prisma no valida que los IDs existan. Si un Food se desactiva o elimina, FoodProfile queda con IDs inválidos que silenciosamente devuelven null al hacer join. Fix: crear relación explícita Food[] o agregar validación en el API antes de guardar.',
      },
      {
        title: '[MEDIO] PlannedSession.sportLabel no existe en schema — campo documentado pero sin migrar',
        done: false,
        note: 'CLAUDE.md documenta sportLabel String? para etiquetas como "Sweet Spot 2×20min", "CSS 400m × 8". El campo está en los tipos TypeScript pero NO en schema.prisma ni en ninguna migración aplicada. Fix: crear migración que agregue sportLabel String? a PlannedSession.',
      },
      {
        title: '[BAJO] AthleteStatus enum le falta el valor COMPLETED',
        done: false,
        note: 'CLAUDE.md documenta AthleteStatus { ACTIVE | PAUSED | COMPLETED }. El schema actual solo tiene { ACTIVE | PAUSED }. COMPLETED es necesario para archivar atletas sin eliminar la relación histórica. Fix: migración que agregue COMPLETED al enum.',
      },
    ],
  },
  {
    id: 'audit-architecture',
    label: 'Auditoría Técnica — Arquitectura: Repository + Use Cases',
    period: 'Próximo',
    color: '#0891b2',
    bgColor: '#f0f9ff',
    borderColor: '#7dd3fc',
    items: [
      {
        title: '[HECHO] Crear helper requireFeature() centralizado para feature gating web + mobile',
        done: true,
        note: 'Creado src/lib/guards/feature-gate.ts — requireFeature(features, feature): NextResponse|null. Recibe UserConfig["features"] — funciona idéntico en web (Auth.js session) y mobile (JWT payload). Aplicado en los 4 endpoints mobile PRO.',
      },
      {
        title: '[HECHO] Crear helpers de respuesta HTTP centralizados',
        done: true,
        note: 'Creado src/lib/api/responses.ts — ok(), created(), badRequest(), unauthorized(), forbidden(), notFound(), conflict(), serverError(). Aplicado en ambas rutas de checkin. Pendiente: migrar las demás rutas gradualmente.',
      },
      {
        title: '[HECHO] Crear CheckInRepository e implementar transacción atómica',
        done: true,
        note: 'Creado src/infrastructure/db/check-in.repository.ts — PrismaCheckInRepository(db: PrismaDbClient). PrismaDbClient es Omit<PrismaClient, ciclo-de-vida> — asignable tanto al full client como al tx client. El use case crea instancias con tx dentro de $transaction: new PrismaCheckInRepository(tx). Mismo patrón en plan, health-profile y user repos.',
      },
      {
        title: '[HECHO] Extraer processCheckIn use case — lógica de negocio separada de la ruta',
        done: true,
        note: 'Creado src/domain/check-in/process-check-in.use-case.ts. Recibe deps inyectados: checkInRepo, planRepo, aiService, healthProfileRepo, userRepo. Orquesta: load context → evaluate rules (pure) → AI recommendation → save → adjust sessions → sync weight → activate progress. Web y mobile comparten el MISMO use case — solo difieren en auth y normalización de escala 1-5→1-10. Rutas reducidas a ~60 líneas cada una.',
      },
      {
        title: '[HECHO PARCIAL] Crear PlanRepository e implementar en generate-plan use case',
        done: true,
        note: 'Creado src/infrastructure/db/plan.repository.ts — PrismaPlanRepository implementa IPlanRepository: findActive(), getTrainingAdherence(), findWeekSessions(), updateSession(). Usado por processCheckIn use case. PENDIENTE: migrate generator.ts (673 líneas) al mismo patrón — aún usa Prisma directo.',
      },
      {
        title: 'Agregar features.* a MobileTokenPayload y signMobileToken',
        done: false,
        note: 'src/lib/mobile-auth.ts — extender MobileTokenPayload con features: UserConfig["features"]. En signMobileToken() leer config del user y incluir features en el JWT firmado. El cliente mobile puede leer features desde el token en cache (sin round-trip a /me). Misma paridad que el JWT web.',
      },
      {
        title: '[HECHO] Crear src/lib/core/week-number.ts — eliminar duplicación de getISOWeekNumber',
        done: true,
        note: 'Creado src/lib/core/week-number.ts — getISOWeekNumber() (ISO 8601 absoluta) y getPlanWeekNumber(startDate, totalWeeks) (relativa al inicio del plan, con clamp). Las dos funciones son semánticamente distintas — ambas expuestas desde una sola fuente. checkin/route.ts ya importa de aquí.',
      },
    ],
  },
  {
    id: 'core-sin-ia',
    label: 'Fase 24 — Core sin IA: Autosuficiencia del Usuario',
    period: 'En construcción',
    color: '#f97316',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    items: [
      {
        title: '[HECHO] Quick log desde dashboard — 1 clic para registrar sesión de hoy',
        done: true,
        note: 'QuickLog component ya existe en (athlete)/_components/QuickLog.tsx. Botón "¡Completé!" inline en la card de sesión del día. POST /api/log/session con plannedSessionId. Router.refresh() al completar.',
      },
      {
        title: '[HECHO] Racha de días activos (streak) en el dashboard',
        done: true,
        note: 'Streak ya calculado en dashboard/page.tsx. Cuenta días consecutivos con SessionLog. Badge "🔥 X días · racha activa" visible en el header si streakDays >= 2.',
      },
      {
        title: 'Récords personales visibles en progreso',
        done: false,
        note: 'Para atletas con gym: mostrar 1RM máximo por ejercicio (máx weightKg en SetLog). Para atletas de carrera: mostrar best pace por distancia (min/km en SessionLog.notes parseado). Empieza simple — tabla estática desde los datos que ya tenemos.',
      },
      {
        title: 'Resumen de semana en texto determinista en el dashboard',
        done: false,
        note: 'Sin IA. Frase construida desde datos: "Esta semana: 4 sesiones planificadas. Completaste 2. Hoy: Rodaje Z2 — día liviano." Cero costo, cero latencia. Muestra que la app "sabe" lo que hace el usuario sin necesidad de AI.',
      },
      {
        title: '[HECHO] Porcentaje de adherencia visible en el dashboard (últimas 4 semanas)',
        done: true,
        note: 'Calculado en dashboard/page.tsx usando activePlan.weeks ya cargadas. Slice de las últimas 4 semanas → count sesiones con log / total no-DESCANSO. Badge color verde/amber/rojo en el header junto al streak. Cero queries adicionales.',
      },
      {
        title: 'Fallback de plan de comidas sin IA (plantillas estáticas)',
        done: false,
        note: 'Cuando Anthropic no está disponible o el usuario no tiene acceso AI: generar plan de comidas desde combinaciones predefinidas de los alimentos seleccionados, ajustadas a los macros target. Sin costo, sin latencia. El usuario tiene plan aunque no tenga Pro.',
      },
      {
        title: 'Onboarding path FREE mejorado — UX 3 pasos claros',
        done: false,
        note: 'Cuando healthGoal === "FREE": el flujo ya existe (health-goal → physical → generating) pero el copy no es claro. Mejorar las pantallas con el mensaje: "Registrás tus entrenos. Ves tus métricas. Sin plan estructurado — vos decidís." El usuario entiende qué obtiene antes de completar.',
      },
      {
        title: '[HECHO] Gráficas de peso y FC de reposo con curva visual en /progress',
        done: true,
        note: 'LineChart SVG puro ya implementado en progress/_components/ProgressClient.tsx. Curva de peso con línea de meta, curva de FC reposo con TrendBadge. AdherenceVerticalChart y HorizontalKmChart también implementados. Sin dependencias externas.',
      },
    ],
  },
  {
    id: 'ia-proactiva',
    label: 'Fase 25 — IA Proactiva: Momentos Específicos (futuro)',
    period: 'Futuro',
    color: '#6b7280',
    bgColor: '#f9fafb',
    borderColor: '#e5e7eb',
    items: [
      {
        title: 'Briefing de lunes — resumen de semana generado por IA (1 llamada/semana/usuario)',
        done: false,
        note: 'Cada lunes al cargar el dashboard: si no hay briefing guardado para esta semana, disparar 1 llamada a Haiku (máx 150 tokens). Resultado guardado en cache (DB o Redis) — los reloads no generan nuevas llamadas. El usuario ve: "Esta semana tienes 4 sesiones. Tu check-in del sábado pasado mostró fatiga — ajustamos la intensidad del miércoles." Costo estimado: <$0.01 por usuario por semana.',
      },
      {
        title: 'Insight post check-in — análisis de tendencia en 2 líneas',
        done: false,
        note: 'Al completar el check-in semanal: 1 llamada a Haiku con contexto de los últimos 3 check-ins. Devuelve insight de 2 líneas visible en la pantalla de confirmación. Ya hay código parcial para esto (evaluateRules → generateRecommendationText). Necesita mejor UI para mostrar el resultado.',
      },
      {
        title: 'Micro-insight post sesión — feedback inmediato basado en RPE',
        done: false,
        note: 'Al loggear sesión con RPE: 1 llamada a Haiku (máx 100 tokens). Guardada en SessionLog.aiInsight. Máximo 1 insight por semana por usuario (no por sesión) para controlar costos. Fire-and-forget — no bloquea el flujo. El usuario ve el insight en el historial de la sesión.',
      },
      {
        title: 'Regla crítica: sin chat abierto — solo IA en momentos acotados',
        done: false,
        note: 'El chat abierto (ai/chat) se mantiene oculto por costo y por experiencia. La IA solo habla cuando el usuario hace una acción concreta (check-in, loggear sesión, inicio de semana). 3 momentos máximo. Cada momento = 1 llamada, resultado cacheado. NUNCA open-ended chat sin control de costo.',
      },
      {
        title: 'Dashboard de costos AI por usuario (admin)',
        done: false,
        note: 'En /admin: tabla con userId, llamadas AI del mes, tokens consumidos, costo estimado ($). Permite detectar outliers y actuar antes de que el costo escale. Alimentado por los contadores en User.config.ai.messagesThisMonth.',
      },
    ],
  },
  // ─── AUDITORÍA CONSOLIDADA 2026-06-23 ────────────────────────────────────────
  {
    id: 'audit-p0-security',
    label: 'Auditoría P0 — Seguridad & Revenue (HACER ANTES DE LANZAR)',
    period: 'Urgente',
    color: '#dc2626',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    items: [
      {
        title: '[HECHO] tempPassword devuelta en JSON plaintext en 2 endpoints',
        done: true,
        note: 'CONFIRMADO CRÍTICO. /api/coach/clients/create y /api/coach/athlete/[id]/reset-password devuelven { tempPassword } en el JSON de respuesta. La contraseña queda expuesta en logs de Vercel, DevTools del browser y network inspector. Fix: generar un token de reset firmado (JWT corto, 1h de vida), devolver un link de reset al coach, nunca la contraseña en texto plano.',
      },
      {
        title: '[HECHO] Feature gating en 4 endpoints mobile PRO',
        done: true,
        note: 'Creado src/lib/guards/feature-gate.ts — requireFeature(features, featureKey): NextResponse|null. Aplicado en: nutrition/log GET+POST (nutrition), progress GET (progress), gym/week GET (gym), nutrition/generate-meals POST (nutrition). Devuelve 402 con upgrade link si el usuario no tiene el feature activo. El check de aiPlan para la IA ya existía en generate-meals.',
      },
      {
        title: 'Stripe / Wompi — integración de pagos Pro $15/mes',
        done: false,
        note: 'Sin pasarela de pago no hay revenue. Flujo: usuario en /upgrade elige plan → Stripe Checkout o Wompi → webhook POST /api/webhooks/stripe activa tier PRO en DB → features.aiPlan=true + monthlyLimit=100. Para LatAm: Wompi (Colombia) + Stripe (resto). Prioridad: Wompi primero por mercado objetivo.',
      },
      {
        title: 'features.* ausentes en MobileTokenPayload — cliente mobile ciego a su tier',
        done: false,
        note: 'CONFIRMADO. src/lib/mobile-auth.ts — MobileTokenPayload solo tiene { id, email, role, userPlan }. El cliente mobile no puede leer qué features tiene activas sin un round-trip extra a /api/mobile/auth/me. Esto crea una ventana donde la app muestra tabs de features que no debería mostrar. Fix: extender MobileTokenPayload con features: UserConfig["features"] e incluirlo en signMobileToken(). Paridad con el JWT web.',
      },
    ],
  },
  {
    id: 'audit-p1-bugs',
    label: 'Auditoría P1 — Bugs Confirmados que Rompen Flujos',
    period: 'Urgente',
    color: '#ea580c',
    bgColor: '#fff7ed',
    borderColor: '#fed7aa',
    items: [
      {
        title: '[HECHO] AI Haiku corre DENTRO de $transaction del generador — timeout silencioso',
        done: true,
        note: 'Verificado en código: generate-plan.use-case.ts tiene Phase 2 (AI) FUERA del $transaction (líneas 99-104). La llamada a getAIRecommendations() ocurre antes de abrir la transacción en Phase 3 (línea 108). Bug ya resuelto en la refactorización hexagonal.',
      },
      {
        title: '[HECHO] applyPlanAdjustments race condition vs edición manual del coach',
        done: true,
        note: 'Fix aplicado en process-check-in.use-case.ts: antes del loop de ajuste, cada sesión con coachNotes existente que no contenga "[AUTO]" se omite (indica edición manual del coach). El auto-ajuste nunca sobrescribe ediciones intencionales del coach. Heurística pragmática sin schema change.',
      },
      {
        title: 'Onboarding B2B sin transacción — estado fantasma si user.update() falla',
        done: false,
        note: 'RIESGO BAJO — self-healing. Si updateConfig falla, el atleta es redirigido a /onboarding por el middleware (onboardingCompleted=false) y puede reintentar. Los upserts son idempotentes. Fix correcto requiere importar repos de infra en domain (patrón evitado) o reestructurar use case. Diferido: prioridad baja vs impacto real.',
      },
      {
        title: '[HECHO] Off-by-one en fecha de sesión del plan coach — todas las sesiones un día tarde',
        done: true,
        note: 'CONFIRMADO y CORREGIDO. /api/coach/plan/[planId]/sessions/route.ts línea 39: setDate(getDate() + dayOfWeek) → setDate(getDate() + dayOfWeek - 1). Con dayOfWeek=1 (lunes) y startDate=lunes, ahora cae en lunes. dayOfWeek 1→+0, 2→+1, ..., 7→+6.',
      },
      {
        title: '[HECHO] applyPlanAdjustments ignora sesiones en Z1 silenciosamente',
        done: true,
        note: 'Verificado en código actual: zoneMap = { Z5:Z4, Z4:Z3, Z3:Z2, Z2:Z1, Z1:Z1 }. Con Z1→Z1, la condición lowerZone !== session.zone es false → no hay update. Correcto. CoachNotes también concatena correctamente: const base = session.coachNotes ? session.coachNotes + " " : "".',
      },
      {
        title: '[HECHO] Onboarding mobile B2B + mainGoal=GYM salta detección B2B — activa TRIAL indebido',
        done: true,
        note: 'Verificado en código actual: completeOnboardingUseCase GYM path (línea 89) llama checkIsB2B() DENTRO del path, antes de activar features. features: isB2B ? currentConfig.features : { plan: true, ... }. B2B nunca activa features automáticamente.',
      },
    ],
  },
  {
    id: 'audit-p2-debt',
    label: 'Auditoría P2 — Deuda Técnica que Bloquea Escalar',
    period: 'Próximo',
    color: '#7c3aed',
    bgColor: '#faf5ff',
    borderColor: '#d8b4fe',
    items: [
      {
        title: 'Tests E2E: flujo B2B completo, invite code, generación de plan',
        done: false,
        note: 'Sin tests confirmados en código. Flujos no probados: (1) coach crea atleta → onboarding → /pending → coach activa → dashboard. (2) coach genera invite → /join/[code] → registro → vinculación → onboarding → /pending. (3) atleta B2C completa onboarding → plan generado con semanas + sesiones en DB → dashboard muestra plan real.',
      },
      {
        title: '[HECHO] CheckInClient.tsx 662 líneas — dividir en 3 componentes',
        done: true,
        note: 'Creados: checkin.types.ts (PrevMetrics, LastWeekSummary, CheckInState, TRIGGER_LABELS), SubmittedCheckInView.tsx (pantalla "ya enviaste"), EarlyCheckInScreen.tsx (pantalla "es muy temprano"). CheckInClient.tsx queda con el form principal + confirmación post-save + orchestración de estados. Re-exporta tipos para compatibilidad con checkin/page.tsx.',
      },
      {
        title: '[HECHO] Paginación panel atleta coach — 90 sesiones en 1 query',
        done: true,
        note: 'Fix client-side: planViewWeekIdx state en AthleteDetailClient.tsx. Default: última semana pasada (basado en startDate). Navegación Anterior/Siguiente entre semanas. El Tab Plan ahora renderiza UNA semana a la vez (5 sesiones) en lugar de 90. Los datos ya están en memoria — no se necesita un endpoint nuevo. Carga de 90 DOM nodes → 5.',
      },
      {
        title: '[HECHO] FoodSetupFlow — 19 alimentos hardcodeados en el cliente',
        done: true,
        note: 'Eliminado FOOD_CATEGORIES hardcodeado. Reemplazado por buildFoodCategories(allFoods) que agrupa por categoría de DB (PROTEIN, CARB, FAT, VEG, etc.). FoodItem type ahora incluye category. nutrition/page.tsx ya fetcheaba allFoods desde DB — se pasa directo como prop. matchFoodIds() eliminado — IDs se mapean directamente (names exactos de DB). Agregar un alimento en DB lo muestra inmediatamente sin redeploy.',
      },
      {
        title: '[HECHO] FoodLog sin constraint de unicidad — macros duplicadas por doble submit',
        done: true,
        note: 'Agregado @@unique([userId, foodId, date, mealType]) en schema.prisma. Migración: prisma/migrations/20260623000002_add_unique_constraints/migration.sql. Aplicar con pnpm prisma migrate deploy.',
      },
      {
        title: '[HECHO] TrainingPlan sin UNIQUE(userId, status=ACTIVE) — 2 planes activos posibles',
        done: true,
        note: 'Partial unique index via raw SQL en migración 20260623000002: CREATE UNIQUE INDEX "TrainingPlan_userId_active_unique" ON "TrainingPlan" ("userId") WHERE "status" = \'ACTIVE\'. Prisma schema no soporta partial indexes — se aplica por fuera del schema. Permite múltiples COMPLETED/PAUSED/ABANDONED.',
      },
      {
        title: '[HECHO] GymSession sin UNIQUE — sesiones duplicadas el mismo día posibles',
        done: true,
        note: 'Agregado @@unique([athleteId, date, assignedWorkoutId]) en schema.prisma. Migración: prisma/migrations/20260623000002_add_unique_constraints/migration.sql. Aplicar con pnpm prisma migrate deploy.',
      },
      {
        title: '11 endpoints mobile sin rate limiting por usuario',
        done: false,
        note: 'Solo /onboarding/generate, /ai/chat y /generate-meals tienen rateLimitAsync. Los demás (checkin, dashboard, plan, nutrition, progress, gym/week, nutrition/foods, nutrition/log, log/session, gym/history, dashboard/week-sessions) no tienen protección. Fix: rateLimitAsync(`mobile-${userId}:${endpoint}`, { limit: 100, windowMs: 60_000 }) en writes, 300 en reads.',
      },
      {
        title: '[HECHO] daily-target.ts:65 — REST carbs usa *0.6, resto del código usa *0.7',
        done: true,
        note: 'Verificado en código: daily-target.ts:65 ya usa carbsEasyG * 0.7. generate-meals/route.ts, nutrition/page.tsx, NutritionContent.tsx y mobile/nutrition/route.ts también usan * 0.7 para REST. La inconsistencia reportada en la auditoría ya estaba resuelta en una sesión anterior. No se requirió ningún cambio.',
      },
      {
        title: 'Race condition en feature toggles del coach — clicks rápidos sobrescriben',
        done: false,
        note: 'AthleteFeatureToggles.tsx hace optimistic update pero si el coach hace click 3 veces rápido, los reverts pueden ejecutarse en orden incorrecto. Fix: deshabilitar el toggle mientras el request está en vuelo — loading state por feature individual, no global.',
      },
    ],
  },
  {
    id: 'audit-p3-product',
    label: 'Auditoría P3 — Mejoras de Producto para Retención',
    period: 'Próximo',
    color: '#0891b2',
    bgColor: '#f0f9ff',
    borderColor: '#7dd3fc',
    items: [
      {
        title: 'Medidas corporales en check-in (cintura, brazos, caderas, piernas)',
        done: false,
        note: 'Migración DB: waistCm, armsCm, hipsCm, thighsCm Float? en WeeklyCheckIn. UI web: sección colapsable después del peso. Mobile: mismos campos en checkin.tsx. Progreso: líneas por zona en /progress igual que el peso.',
      },
      {
        title: 'Fotos de progreso semanales — Vercel Blob',
        done: false,
        note: 'Nuevo modelo ProgressPhoto { id, userId, checkInId?, url, takenAt }. Storage: Vercel Blob. API: POST /api/progress/photos (multipart) + GET para listar. UI: input file al final del check-in, comparador side-by-side en /progress. Mobile: expo-image-picker + compresión 80% antes de subir.',
      },
      {
        title: 'Récords personales gym (isPR detection al completar set)',
        done: false,
        note: 'Al guardar SetLog en /api/gym/session/complete: comparar weightKg con el máximo histórico del mismo ejercicio para ese usuario. Si supera → isPR=true en SetLog. Migración: isPR Boolean @default(false) en SetLog. UI: badge "Nuevo récord" inline + icono trofeo en historial.',
      },
      {
        title: 'Resumen de semana determinista en dashboard (sin AI)',
        done: false,
        note: 'Frase construida desde datos: "Esta semana: 4 sesiones planificadas. Completaste 2. Hoy: Rodaje Z2 — día liviano." Cero costo, cero latencia. Demuestra que la app entiende al usuario sin AI. Fácil de implementar con los datos que ya se cargan en dashboard/page.tsx.',
      },
      {
        title: 'Fallback plan de comidas sin AI (plantillas estáticas)',
        done: false,
        note: 'Cuando Anthropic no responde o el usuario no tiene tier con AI: combinar alimentos de la librería Food según macros target (proteína primero, luego carbos, luego grasas). Sin costo, sin latencia. El usuario tiene plan aunque la AI no esté disponible.',
      },
      {
        title: 'sportLabel String? en PlannedSession — documentado pero sin migración',
        done: false,
        note: 'CLAUDE.md documenta sportLabel String? para etiquetas específicas por deporte ("Sweet Spot 2×20min", "CSS 400m × 8"). El campo está mencionado en el schema pero NO tiene migración aplicada en Neon. Crear migración ALTER TABLE que agregue la columna.',
      },
      {
        title: 'AthleteStatus.COMPLETED en enum — documentado pero sin migración',
        done: false,
        note: 'CLAUDE.md documenta AthleteStatus { ACTIVE | PAUSED | COMPLETED }. El schema solo tiene { ACTIVE | PAUSED }. COMPLETED es necesario para archivar atletas sin eliminar la relación histórica. Migración: ALTER TYPE "AthleteStatus" ADD VALUE IF NOT EXISTS "COMPLETED".',
      },
      {
        title: 'Email transaccional — welcome, activación B2B, trial expirando (Resend)',
        done: false,
        note: 'Sin emails: el atleta B2B no sabe que su coach lo activó, el atleta B2C no recibe bienvenida, nadie sabe cuando su trial expira. Resend: gratis hasta 3k emails/mes. 3 templates prioritarios: welcome (post-onboarding), activado por coach (post-activate), trial-expiring-3d.',
      },
      {
        title: 'Forgot password (web + mobile)',
        done: false,
        note: 'El login mobile ya tiene un link de contacto como workaround pero no es un flujo real. Implementar: POST /api/auth/forgot-password → genera token firmado JWT 1h → Resend email con link → GET /api/auth/reset-password?token= → valida → PATCH password. Mismo flujo en web y mobile.',
      },
      {
        title: 'CoachAthlete sin onDelete: Cascade — huérfanas si se elimina un coach',
        done: false,
        note: 'Si se elimina un User con rol COACH, las filas de CoachAthlete quedan con coachId inválido. Consultas WHERE coachId=X devuelven registros sin usuario válido. Fix: migración que agrega onDelete: Cascade (o SetNull si se quiere preservar el historial) en la relación CoachAthlete→User.',
      },
    ],
  },
  {
    id: 'pulsefit-parity',
    label: 'Paridad Pulsefit',
    period: 'Próximo',
    color: '#7c3aed',
    bgColor: '#faf5ff',
    borderColor: '#d8b4fe',
    items: [
      {
        title: '[HECHO] Reducción de alcance: solo Running + Gym',
        done: true,
        note: 'Eliminados CYCLING, SWIMMING, TRIATHLON, FOOTBALL de toda la UI (onboarding web + mobile, selectores coach, filtros coaches). Schema DB intacto para compatibilidad histórica. Solo se eliminaron de los selectores UI.',
      },
      {
        title: 'ExerciseDB integration — 1,300+ GIFs para gym',
        done: false,
        note: 'Agregar gifUrl String? a Exercise model. Al importar ejercicios desde ExerciseDB API, cachear gifUrl en DB. Mostrar GIF animado en gym/session (al hacer tap en nombre del ejercicio) y en coach routines. Reducir barrera de adopción para atletas nuevos en gym.',
      },
      {
        title: 'Módulo de finanzas básico para coaches',
        done: false,
        note: 'Modelo Payment: coachAthleteId, amount, dueDate, status (PAID/PENDING/OVERDUE), notes. CRUD API: GET /api/coach/payments, POST /api/coach/payments, PATCH /api/coach/payments/[id]. Tab "Finanzas" en sidebar coach. Alertas de mora en dashboard coach. Sin pasarela — solo registro manual.',
      },
      {
        title: 'Mensajería asíncrona coach-atleta',
        done: false,
        note: 'Modelo Message: fromId, toId, content, readAt. API REST: GET /api/messages/[conversationId] + POST /api/messages. Polling cada 30s en cliente. Chat inline en detalle atleta (coach) y en dashboard atleta. Sin WebSockets — polling simple es suficiente para v1. Si coach sigue usando WhatsApp, no retorna a Medaliq.',
      },
      {
        title: 'Email transaccional con Resend — 3 templates',
        done: false,
        note: '(1) Recordatorio check-in: dom 18:00 si atleta no ha hecho check-in esa semana. (2) Sesión del día: lun 7am con detalles de la sesión programada. (3) Pago vencido: cuando Payment.status cambia a OVERDUE. Implementar con Vercel Cron Jobs. Template HTML con branding Medaliq.',
      },
      {
        title: '/join/[code] con branding del coach',
        done: false,
        note: 'La página /join/[code] actual muestra solo el formulario de registro genérico. Mejorar: mostrar foto, nombre, headline, especialidades y bio del coach en la mitad superior. Datos ya disponibles en CoachProfile. Convierte el onboarding B2B en un funnel branded del coach.',
      },
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

  // Completadas cerradas por defecto, el resto abiertas
  const [openPhases, setOpenPhases] = useState<Set<string>>(
    () => new Set(PHASES.filter((p) => p.period !== 'Completado').map((p) => p.id))
  )

  function togglePhase(id: string) {
    setOpenPhases((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

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

      {/* Controles expandir / colapsar */}
      <div className="flex justify-end gap-2 mb-4">
        <button
          onClick={() => setOpenPhases(new Set(PHASES.map((p) => p.id)))}
          className="text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        >
          Expandir todo
        </button>
        <button
          onClick={() => setOpenPhases(new Set())}
          className="text-xs text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        >
          Colapsar todo
        </button>
      </div>

      {/* Fases — acordeón */}
      <div className="space-y-3">
        {PHASES.map((phase) => {
          const { done, total, pct } = progress(phase.items)
          const isOpen = openPhases.has(phase.id)
          return (
            <div
              key={phase.id}
              className="rounded-xl border overflow-hidden"
              style={{ borderColor: phase.borderColor, backgroundColor: phase.bgColor }}
            >
              {/* Header clickeable */}
              <button
                onClick={() => togglePhase(phase.id)}
                className="w-full px-6 py-4 flex items-center justify-between text-left transition-opacity hover:opacity-80"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className="shrink-0 transition-transform duration-200"
                    style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', color: phase.color }}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                  <h2 className="font-bold text-gray-900 truncate">{phase.label}</h2>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[phase.period]}`}>
                    {phase.period}
                  </span>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <div className="w-24 bg-white/60 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: phase.color }} />
                  </div>
                  <span className="text-sm font-bold" style={{ color: phase.color }}>{done}/{total}</span>
                </div>
              </button>

              {/* Items — colapsables */}
              {isOpen && (
                <div className="divide-y border-t" style={{ borderColor: phase.borderColor }}>
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
              )}
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
