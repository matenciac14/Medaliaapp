-- DBA-P1 fixes — auditoría de módulos 2026-07
-- 1. SessionLog.sessionDate  2. Message onDelete SetNull  3. Benchmark CHECK constraints

-- ── 1. SessionLog.sessionDate ─────────────────────────────────────────────────
-- Registros históricos: null (completedAt como fallback)
-- Registros nuevos: fecha real elegida por el atleta (puede ser ayer/anteayer)
ALTER TABLE "SessionLog" ADD COLUMN "sessionDate" DATE;

-- ── 2. Message.fromId / toId onDelete: SetNull ────────────────────────────────
-- Permite preservar mensajes cuando un usuario elimina su cuenta
-- (vs Cascade que los borraba completamente)

-- Hacer columnas nullable para soportar SetNull
ALTER TABLE "Message" ALTER COLUMN "fromId" DROP NOT NULL;
ALTER TABLE "Message" ALTER COLUMN "toId"   DROP NOT NULL;

-- Eliminar FKs anteriores con Cascade
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_fromId_fkey";
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_toId_fkey";

-- Recrear con SetNull
ALTER TABLE "Message"
  ADD CONSTRAINT "Message_fromId_fkey"
  FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_toId_fkey"
  FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 3. PerformanceBenchmark — normalización y CHECK constraints ───────────────
-- Los metrics usan valores como '5K_TIME', '1RM_SQUAT' — no se puede usar enum Prisma
-- (no pueden empezar con número). Alternativa: CHECK constraint + validación en API.

-- Normalizar a UPPERCASE existentes
UPDATE "PerformanceBenchmark" SET "sport"  = UPPER("sport")  WHERE "sport"  != UPPER("sport");
UPDATE "PerformanceBenchmark" SET "metric" = UPPER("metric") WHERE "metric" != UPPER("metric");

-- CHECK constraint para sport
ALTER TABLE "PerformanceBenchmark"
  ADD CONSTRAINT "benchmark_sport_valid"
  CHECK ("sport" IN ('RUNNING', 'CYCLING', 'SWIMMING', 'STRENGTH', 'TRIATHLON'));

-- CHECK constraint para metric
ALTER TABLE "PerformanceBenchmark"
  ADD CONSTRAINT "benchmark_metric_valid"
  CHECK ("metric" IN (
    '5K_TIME', '10K_TIME', 'HALF_MARATHON_TIME', 'MARATHON_TIME',
    'FTP_WATTS', 'CSS_PACE', 'PACE_Z2',
    '1RM_SQUAT', '1RM_DEADLIFT', '1RM_BENCH', 'VO2MAX'
  ));
