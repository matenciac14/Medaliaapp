-- DB-04: Exercise Rewrite — WorkoutX-compatible schema
-- Fases 1-3 combinadas: additive → backfill → destructive

-- ─── Fase 1: Agregar nuevas columnas (nullable) ───────────────────────────────

ALTER TABLE "Exercise" ADD COLUMN "bodyPart"          TEXT;
ALTER TABLE "Exercise" ADD COLUMN "target"            TEXT;
ALTER TABLE "Exercise" ADD COLUMN "equipment_new"     TEXT;
ALTER TABLE "Exercise" ADD COLUMN "difficulty"        TEXT;
ALTER TABLE "Exercise" ADD COLUMN "mechanic"          TEXT;
ALTER TABLE "Exercise" ADD COLUMN "force"             TEXT;
ALTER TABLE "Exercise" ADD COLUMN "caloriesPerMinute" DOUBLE PRECISION;
ALTER TABLE "Exercise" ADD COLUMN "met"               DOUBLE PRECISION;
ALTER TABLE "Exercise" ADD COLUMN "popularityRank"    INTEGER;
ALTER TABLE "Exercise" ADD COLUMN "isUnilateral"      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Exercise" ADD COLUMN "recommendedSets"   TEXT;
ALTER TABLE "Exercise" ADD COLUMN "recommendedReps"   TEXT;
ALTER TABLE "Exercise" ADD COLUMN "secondaryMuscles"  TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Exercise" ADD COLUMN "instructions"      TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Exercise" ADD COLUMN "gifUrl"            TEXT;
ALTER TABLE "Exercise" ADD COLUMN "gifStoredUrl"      TEXT;
ALTER TABLE "Exercise" ADD COLUMN "source"            TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE "Exercise" ADD COLUMN "syncedAt"          TIMESTAMP(3);
ALTER TABLE "Exercise" ADD COLUMN "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT now();

-- ─── Fase 2: Backfill desde columnas antiguas (39 ejercicios existentes) ──────

UPDATE "Exercise" SET
  "equipment_new" = CASE equipment::TEXT
    WHEN 'BARBELL'    THEN 'barbell'
    WHEN 'DUMBBELL'   THEN 'dumbbell'
    WHEN 'MACHINE'    THEN 'machine'
    WHEN 'CABLE'      THEN 'cable'
    WHEN 'SMITH'      THEN 'smith machine'
    WHEN 'BODYWEIGHT' THEN 'body weight'
    WHEN 'KETTLEBELL' THEN 'kettlebell'
    WHEN 'BAND'       THEN 'resistance band'
    ELSE 'other'
  END,
  "mechanic" = CASE category::TEXT
    WHEN 'COMPOUND'  THEN 'compound'
    WHEN 'ISOLATION' THEN 'isolation'
    ELSE NULL
  END,
  "bodyPart" = CASE "muscleGroups"[1]
    WHEN 'CHEST'      THEN 'chest'
    WHEN 'BACK'       THEN 'back'
    WHEN 'LATS'       THEN 'back'
    WHEN 'TRAPS'      THEN 'back'
    WHEN 'SHOULDERS'  THEN 'shoulders'
    WHEN 'BICEPS'     THEN 'upper arms'
    WHEN 'TRICEPS'    THEN 'upper arms'
    WHEN 'QUADRICEPS' THEN 'upper legs'
    WHEN 'HAMSTRINGS' THEN 'upper legs'
    WHEN 'GLUTES'     THEN 'upper legs'
    WHEN 'CALVES'     THEN 'lower legs'
    WHEN 'CORE'       THEN 'waist'
    WHEN 'FOREARMS'   THEN 'lower arms'
    ELSE 'upper body'
  END,
  "target" = CASE "muscleGroups"[1]
    WHEN 'CHEST'      THEN 'pectorals'
    WHEN 'BACK'       THEN 'upper back'
    WHEN 'LATS'       THEN 'lats'
    WHEN 'TRAPS'      THEN 'traps'
    WHEN 'SHOULDERS'  THEN 'delts'
    WHEN 'BICEPS'     THEN 'biceps'
    WHEN 'TRICEPS'    THEN 'triceps'
    WHEN 'QUADRICEPS' THEN 'quads'
    WHEN 'HAMSTRINGS' THEN 'hamstrings'
    WHEN 'GLUTES'     THEN 'glutes'
    WHEN 'CALVES'     THEN 'calves'
    WHEN 'CORE'       THEN 'abs'
    WHEN 'FOREARMS'   THEN 'forearms'
    ELSE 'general'
  END,
  "gifUrl" = COALESCE("imageUrl", 'https://api.workoutxapp.com/placeholder.gif');

-- ─── Fase 3: Destructiva — Drop columnas viejas, rename, drop enums ───────────

ALTER TABLE "Exercise" DROP COLUMN "muscleGroups";
ALTER TABLE "Exercise" DROP COLUMN "equipment";
ALTER TABLE "Exercise" DROP COLUMN "category";
ALTER TABLE "Exercise" DROP COLUMN "isGlobal";
ALTER TABLE "Exercise" DROP COLUMN "imageUrl";
ALTER TABLE "Exercise" DROP COLUMN "tips";
ALTER TABLE "Exercise" RENAME COLUMN "equipment_new" TO "equipment";

-- Hacer NOT NULL las columnas requeridas después del backfill
ALTER TABLE "Exercise" ALTER COLUMN "bodyPart"  SET NOT NULL;
ALTER TABLE "Exercise" ALTER COLUMN "target"    SET NOT NULL;
ALTER TABLE "Exercise" ALTER COLUMN "equipment" SET NOT NULL;
ALTER TABLE "Exercise" ALTER COLUMN "gifUrl"    SET NOT NULL;

-- Drop enums (solo posible después de dropear las columnas que los usaban)
DROP TYPE IF EXISTS "EquipmentType";
DROP TYPE IF EXISTS "ExerciseCategory";

-- Índices para filtrado eficiente
CREATE INDEX "Exercise_bodyPart_idx"  ON "Exercise"("bodyPart");
CREATE INDEX "Exercise_target_idx"    ON "Exercise"("target");
CREATE INDEX "Exercise_equipment_idx" ON "Exercise"("equipment");
