-- DBA-P0 fixes — auditoría de módulos 2026-07
-- 1. FoodLog macro snapshot  2. FoodLog.mealType enum  3. GymSession CHECK

-- ── 1. FoodLog snapshot de macros ────────────────────────────────────────────
-- Columnas nullable: registros existentes tienen null (fallback a food.* en reads)
-- Registros nuevos: calculados y persistidos al crear
ALTER TABLE "FoodLog" ADD COLUMN "kcalLogged"    DOUBLE PRECISION;
ALTER TABLE "FoodLog" ADD COLUMN "proteinLogged" DOUBLE PRECISION;
ALTER TABLE "FoodLog" ADD COLUMN "carbsLogged"   DOUBLE PRECISION;
ALTER TABLE "FoodLog" ADD COLUMN "fatLogged"     DOUBLE PRECISION;

-- ── 2. FoodLog.mealType String → MealType enum ───────────────────────────────
-- Normalizar a UPPERCASE por si hay datos inconsistentes
UPDATE "FoodLog" SET "mealType" = UPPER("mealType");
-- Crear tipo enum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'PRE_WORKOUT', 'POST_WORKOUT');
-- Cambiar columna — valores ya son uppercase y válidos
ALTER TABLE "FoodLog" ALTER COLUMN "mealType" TYPE "MealType" USING "mealType"::"MealType";

-- ── 3. GymSession CHECK constraint exclusivo ──────────────────────────────────
-- assignedWorkoutId (rutina de coach) y plannedSessionId (plan de running)
-- son mutuamente exclusivos — DB lo garantiza ahora
ALTER TABLE "GymSession" ADD CONSTRAINT "gym_session_exclusive_fk"
  CHECK ("assignedWorkoutId" IS NULL OR "plannedSessionId" IS NULL);

-- ── 4. Partial indexes ya existentes ─────────────────────────────────────────
-- Creados en migraciones anteriores. No requieren SQL adicional.
-- WeeklyCheckIn (plan/free scope): 20260628000001_fix_checkin_plan_scope
-- TrainingPlan (un solo ACTIVE por user): 20260623000002_add_unique_constraints
-- ADVERTENCIA: prisma db push puede eliminar estos indexes.
-- Usar SIEMPRE prisma migrate deploy en producción (nunca db push).
