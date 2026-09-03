# Medaliq — Web + Backend

SaaS de coaching deportivo para LatAm. Este directorio contiene el backend y la web app.

## Stack

- Next.js 16 App Router + TypeScript
- PostgreSQL (Neon serverless) + Prisma 7
- Tailwind CSS v4 + shadcn/ui
- Auth.js v5 — JWT strategy
- Resend — emails transaccionales
- pnpm

## Configuración local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Variables de entorno
cp .env.example .env.local
# Rellenar DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, RESEND_API_KEY

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
| `coach@medaliq.com` | `Coach2026!` | COACH |
| `miguel@medaliq.com` | `Atleta2026!` | ATHLETE (B2C, con plan) |
| `ana@medaliq.com` | `Atleta2026!` | ATHLETE (B2B, con coach) |

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


## Arquitectura

Hexagonal (Ports & Adapters). Ver `CLAUDE.md` para detalles completos de capas, schema y convenciones.

## Deploy

Auto-deploy en Vercel desde `main`. No pushear sin autorización explícita.

---

Hecho en Colombia — [medaliq.com](https://medaliq.com)
