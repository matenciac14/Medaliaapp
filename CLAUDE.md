# Medaliq

## Qué es
SaaS de coaching deportivo con AI para LatAm. Cubre recomposición corporal, metas de carrera (cualquier deporte) y entrenadores con atletas. El "cerebro" es un AI coach que hace intake personalizado, genera planes periodizados y los ajusta automáticamente según datos reales del usuario.

## Stack
- Next.js + TypeScript + PostgreSQL + Prisma v5
- Tailwind + shadcn/ui
- Auth.js v5 · pnpm
- Claude API (Anthropic) — motor del AI coach

## Estado
- [x] Scaffold inicial
- [x] Schema Prisma (User, HealthProfile, Goal, TrainingPlan, SessionLog, WeeklyCheckIn, NutritionPlan, CoachAthlete)
- [ ] Auth + DB conectada
- [ ] Onboarding conversacional (AI intake)
- [ ] Generador de plan
- [ ] Calendario de sesiones
- [ ] Check-in semanal
- [ ] Dashboard de progreso

## Reglas del producto
- El AI NO puede medicar ni diagnosticar — solo coaching deportivo
- Banderas rojas médicas → escalar, no continuar el flujo
- Multi-tenant: atletas directos (B2C) + entrenadores con atletas (B2B)
- Planes son vivos, no PDFs estáticos

## Rutas principales
- /onboarding → intake conversacional
- /dashboard → vista del atleta
- /plan → calendario 18 semanas
- /checkin → registro semanal
- /coach → dashboard del entrenador (B2B)

## Ver reglas globales
~/.claude/CLAUDE.md
