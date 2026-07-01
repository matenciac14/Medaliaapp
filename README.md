# Medaliq — Web + Backend

SaaS de coaching deportivo con AI para LatAm. Este directorio contiene el backend y la web app.

## Stack

- Next.js 16 App Router + TypeScript
- PostgreSQL (Neon serverless) + Prisma 7
- Tailwind CSS v4 + shadcn/ui
- Auth.js v5 — JWT strategy
- Claude API (Anthropic) — Haiku + Sonnet
- Resend — emails transaccionales
- pnpm

## Configuración local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Variables de entorno
cp .env.example .env.local
# Rellenar DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, RESEND_API_KEY, ANTHROPIC_API_KEY

# 3. Migraciones + seed
pnpm prisma migrate dev
pnpm prisma db seed

# 4. Levantar dev server
pnpm dev
```

## Usuarios seed

| Email | Password | Rol |
|-------|----------|-----|
| `admin@medaliq.com` | `admin123!` | ADMIN |
| `coach@medaliq.com` | `coach123` | COACH |
| `miguel@medaliq.com` | `atleta123` | ATHLETE (con plan + coach) |
| `ana@medaliq.com` | `atleta123` | ATHLETE (B2C, sin coach) |

## Rutas principales

| Ruta | Descripción |
|------|-------------|
| `/dashboard` | Dashboard atleta |
| `/plan` | Plan de entrenamiento semanal |
| `/checkin` | Check-in semanal |
| `/nutrition` | Nutrición + food log |
| `/progress` | Gráficas de progreso |
| `/gym` | Rutina de gym |
| `/coach/dashboard` | Panel del coach |
| `/coach/finanzas` | Pagos y facturación |
| `/admin` | Panel de administración |

---

## Testing manual en producción (medaliq.com)

### Usuarios requeridos y orden de creación

El tester debe crear los usuarios en este orden — hay dependencias entre flujos.

**Paso 1 — Coach**
Registrar en `/register` seleccionando rol Coach.

| Campo | Valor sugerido |
|-------|---------------|
| Email | `tester.coach@ejemplo.com` |
| Contraseña | cualquiera segura |
| Rol | COACH |

Después del registro: ir a `/coach/clients/invite` y copiar el link de invitación (`/join/[code]`). Necesario para crear atletas B2B.

---

**Paso 2 — Atleta B2B pendiente (sin activar)**
Abrir el link `/join/[code]` del coach y completar registro + onboarding hasta llegar a `/pending`.

| Estado esperado | El atleta ve la pantalla "en espera de activación" |
|-----------------|---------------------------------------------------|
| Flujo cubierto | Registro por invitación, onboarding B2B, `/pending` |

---

**Paso 3 — Activar atleta B2B y crear su plan**
Desde la cuenta del coach: ir a `/coach/clients` → activar al atleta → crear plan desde `/coach/athlete/[id]/plan`.

| Estado esperado | Atleta pasa a tener plan activo, accede a `/dashboard` |
|-----------------|-------------------------------------------------------|
| Flujos cubiertos | Activación B2B, plan builder coach, dashboard atleta |

---

**Paso 4 — Atleta B2C RUNNING**
Registrar directamente en `/register` como Atleta. Completar onboarding eligiendo meta de carrera (5K / 10K / Media / Maratón).

| Estado esperado | Plan generado automáticamente, acceso completo a features |
|-----------------|----------------------------------------------------------|
| Flujos cubiertos | Onboarding B2C, generación de plan, `/dashboard`, `/plan`, `/nutrition` |

Después del onboarding: hacer al menos **2 check-ins** desde `/checkin` con peso diferente. Esto activa `weeklyWeightChange` y `weightProgressPct` en el dashboard.

---

**Paso 5 — Atleta B2C STRENGTH**
Registrar en `/register` como Atleta. Completar onboarding eligiendo meta de fuerza (Recomposición corporal / Fuerza).

| Estado esperado | Plan de 16 semanas de fuerza generado |
|-----------------|--------------------------------------|
| Flujos cubiertos | Dashboard modo fuerza, `/gym` si tiene rutina asignada |

---

**Paso 6 — Atleta en RECOVERY**
Usar la cuenta del Paso 4 si el plan ya venció, o esperar a que `rawWeek > totalWeeks`. El sistema lo detecta automáticamente y muestra el modo RECOVERY en el dashboard.

| Estado esperado | Dashboard muestra "Plan completado", contador de días de recuperación |
|-----------------|----------------------------------------------------------------------|
| No requiere usuario nuevo | El mismo atleta B2C pasa a RECOVERY cuando el plan vence |

---

### Checklist de flujos por rol

**COACH**
- [ ] Registro + selección de rol Coach
- [ ] Dashboard `/coach/dashboard` (muestra banner si no hay atletas)
- [ ] Generar invite link en `/coach/clients/invite`
- [ ] Ver atleta B2B pendiente → activar
- [ ] Crear plan para atleta desde el plan builder
- [ ] Editar sesión individual del plan
- [ ] Ver mensajería con atleta en `/coach/messages`
- [ ] Registrar pago en `/coach/finanzas` (PENDING)
- [ ] Marcar pago como PAID
- [ ] Verificar que pago con `dueDate` pasada aparece como OVERDUE

**ATLETA (B2C o B2B activo)**
- [ ] Dashboard: modo TRAINING con sesión de hoy
- [ ] `/plan`: ver semanas, navegar entre semanas
- [ ] Completar sesión (log) → verificar `completedCount` sube en dashboard
- [ ] `/checkin`: llenar formulario semanal → verificar `checkinPending = false`
- [ ] `/checkin` con peso distinto al anterior → verificar `weeklyWeightChange` en dashboard
- [ ] `/nutrition`: ver targets del día según intensidad de la sesión de hoy
- [ ] `/progress`: gráfica de peso con al menos 2 check-ins
- [ ] `/log/run`: registrar sesión libre
- [ ] Mensajería con coach

**ATLETA B2B pendiente**
- [ ] Completar onboarding via `/join/[code]`
- [ ] Ver pantalla `/pending` correctamente
- [ ] Después de que coach active: acceder a `/dashboard` sin `/pending`

**ADMIN**
- [ ] `/admin/roadmap`: ver tablero de bugs y features
- [ ] `/admin/bi`: métricas de uso (WAU, retención, conversión)

---

### Limpieza post-testing

Para eliminar los usuarios de prueba de producción:

```bash
psql "$DATABASE_URL" -f scripts/cleanup-test-users.sql
```

El script elimina por email — editar el archivo con los emails usados en el test antes de ejecutar. No elimina `admin@medaliq.com`.

## Arquitectura

Hexagonal (Ports & Adapters). Ver `CLAUDE.md` para detalles completos de capas, schema y convenciones.

## Deploy

Auto-deploy en Vercel desde `main`. No pushear sin autorización explícita.

---

Hecho en Colombia — [medaliq.com](https://medaliq.com)
