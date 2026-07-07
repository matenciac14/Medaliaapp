-- Migration: DB Schema v2 — UserStatus + SessionDiscipline + NutritionSource
-- También elimina Goal model (eliminado de código en PR #65, pendiente migración DB)

-- ── 0. Eliminar Goal table y goalId en TrainingPlan (limpieza PR #65) ─────────
ALTER TABLE "TrainingPlan" DROP COLUMN IF EXISTS "goalId";
DROP TABLE IF EXISTS "Goal";

-- ── 1. UserStatus enum + User.status ─────────────────────────────────────────
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BLOCKED', 'DELETED');

ALTER TABLE "User" ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- ── 2. SessionDiscipline enum + SessionLog.discipline ────────────────────────
CREATE TYPE "SessionDiscipline" AS ENUM ('RUNNING', 'STRENGTH', 'CYCLING', 'SWIMMING', 'OTHER');

ALTER TABLE "SessionLog" ADD COLUMN "discipline" "SessionDiscipline";

-- ── 3. NutritionSource enum + NutritionPlan.source ───────────────────────────
CREATE TYPE "NutritionSource" AS ENUM ('SYSTEM', 'COACH', 'ATHLETE');

ALTER TABLE "NutritionPlan" ADD COLUMN "source" "NutritionSource" NOT NULL DEFAULT 'SYSTEM';
