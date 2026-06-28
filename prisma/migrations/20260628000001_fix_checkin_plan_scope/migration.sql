-- Fix WeeklyCheckIn.weekNumber scope — bug: check-ins de Plan B sobreescriben los de Plan A.
--
-- Problema: @@unique([userId, weekNumber]) no tiene en cuenta a cuál plan pertenece el check-in.
-- Un atleta que empieza un segundo plan pisa silenciosamente los check-ins del plan anterior.
--
-- Solución: agregar planId + dos partial indexes para manejar NULL correctamente.
-- (Prisma no soporta partial indexes en schema — se aplican aquí manualmente.)

-- 1. Agregar columna planId (nullable — null = check-in sin plan activo, usa ISO week)
ALTER TABLE "WeeklyCheckIn" ADD COLUMN "planId" TEXT;

-- 2. Eliminar el unique constraint que causaba el bug
DROP INDEX IF EXISTS "WeeklyCheckIn_userId_weekNumber_key";

-- 3. Unicidad cuando hay plan activo: un atleta no puede tener dos check-ins
--    en la misma semana del mismo plan
CREATE UNIQUE INDEX "WeeklyCheckIn_plan_week_unique"
  ON "WeeklyCheckIn" ("userId", "planId", "weekNumber")
  WHERE "planId" IS NOT NULL;

-- 4. Unicidad sin plan: un atleta sin plan activo no puede tener dos check-ins
--    en la misma ISO week
CREATE UNIQUE INDEX "WeeklyCheckIn_free_week_unique"
  ON "WeeklyCheckIn" ("userId", "weekNumber")
  WHERE "planId" IS NULL;

-- 5. Index para lookups por planId (ej. historial de check-ins de un plan)
CREATE INDEX "WeeklyCheckIn_planId_idx" ON "WeeklyCheckIn" ("planId");
