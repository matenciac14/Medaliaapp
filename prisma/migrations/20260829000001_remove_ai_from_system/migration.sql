-- Remove AI from the system: drop aiProfile column and clean up PlanSource enum
-- Idempotent: handles partial application from previous failed attempts

-- Step 1: Drop aiProfile from SystemConfig (idempotent)
ALTER TABLE "SystemConfig" DROP COLUMN IF EXISTS "aiProfile";

-- Step 2: Update any existing records that use non-COACH PlanSource values
UPDATE "TrainingPlan" SET "generatedBy" = 'COACH' WHERE "generatedBy" != 'COACH';

-- Step 3: Drop column default before type change
ALTER TABLE "TrainingPlan" ALTER COLUMN "generatedBy" DROP DEFAULT;

-- Step 4: Handle partial state — if PlanSource_old exists, the rename already happened
-- Drop the new incomplete PlanSource if it exists, rename old back, then redo properly
DO $$
BEGIN
  -- If both exist, drop the new one (it was created but column wasn't migrated)
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlanSource_old')
     AND EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlanSource') THEN
    DROP TYPE "PlanSource";
    ALTER TYPE "PlanSource_old" RENAME TO "PlanSource_tmp";
  ELSIF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlanSource_old') THEN
    ALTER TYPE "PlanSource_old" RENAME TO "PlanSource_tmp";
  ELSE
    ALTER TYPE "PlanSource" RENAME TO "PlanSource_tmp";
  END IF;
END $$;

-- Step 5: Create clean enum and migrate column
CREATE TYPE "PlanSource" AS ENUM ('COACH');
ALTER TABLE "TrainingPlan" ALTER COLUMN "generatedBy" TYPE "PlanSource" USING 'COACH'::"PlanSource";
ALTER TABLE "TrainingPlan" ALTER COLUMN "generatedBy" SET DEFAULT 'COACH'::"PlanSource";
DROP TYPE IF EXISTS "PlanSource_tmp";
DROP TYPE IF EXISTS "PlanSource_old";
