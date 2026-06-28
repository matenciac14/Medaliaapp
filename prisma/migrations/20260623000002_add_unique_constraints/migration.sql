-- AddUniqueConstraints: FoodLog, GymSession, TrainingPlan (partial)

-- FoodLog: prevent duplicate food entries for same user/food/date/meal
-- (un atleta no puede loggear el mismo alimento en el mismo mealType del mismo día dos veces)
CREATE UNIQUE INDEX IF NOT EXISTS "FoodLog_userId_foodId_date_mealType_key"
  ON "FoodLog" ("userId", "foodId", "date", "mealType");

-- GymSession: prevent duplicate sessions for same athlete/date/routine
-- (un atleta no puede tener dos sesiones de la misma rutina en el mismo día)
CREATE UNIQUE INDEX IF NOT EXISTS "GymSession_athleteId_date_assignedWorkoutId_key"
  ON "GymSession" ("athleteId", "date", "assignedWorkoutId");

-- TrainingPlan: partial unique index — only one ACTIVE plan per user
-- Prisma schema no soporta partial indexes; se aplica via raw SQL
-- Permite múltiples planes COMPLETED/PAUSED/ABANDONED por usuario
CREATE UNIQUE INDEX IF NOT EXISTS "TrainingPlan_userId_active_unique"
  ON "TrainingPlan" ("userId")
  WHERE "status" = 'ACTIVE';
