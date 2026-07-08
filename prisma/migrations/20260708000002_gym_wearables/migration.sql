-- Migration 2: gym set types + wearables data fields
-- SetLogType enum + SetLog.setLogType · SessionLog wearables · HealthProfile vo2max · WeeklyCheckIn HRV

-- ── 1. SetLogType enum + SetLog field ────────────────────────────────────────
CREATE TYPE "SetLogType" AS ENUM ('WORK', 'WARMUP', 'DROPSET');

ALTER TABLE "SetLog" ADD COLUMN "setLogType" "SetLogType" NOT NULL DEFAULT 'WORK';

-- ── 2. SessionLog — wearables fields ─────────────────────────────────────────
-- hrAvg y hrMax ya existen (DBA-P1). Agregar solo los campos nuevos de INT-05.
ALTER TABLE "SessionLog" ADD COLUMN "caloriesBurned"  INTEGER;
ALTER TABLE "SessionLog" ADD COLUMN "avgPaceSecPerKm" INTEGER;
ALTER TABLE "SessionLog" ADD COLUMN "dataSource"      TEXT;
ALTER TABLE "SessionLog" ADD COLUMN "externalId"      TEXT;

-- ── 3. HealthProfile — vo2max estimate ───────────────────────────────────────
ALTER TABLE "HealthProfile" ADD COLUMN "vo2maxEstimate" DOUBLE PRECISION;

-- ── 4. WeeklyCheckIn — HRV ───────────────────────────────────────────────────
ALTER TABLE "WeeklyCheckIn" ADD COLUMN "hrvMs" DOUBLE PRECISION;
