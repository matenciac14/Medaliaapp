-- SetLog: make workoutExerciseId nullable (SetNull on delete)
-- and add exerciseName for historical preservation + indexes for performance

ALTER TABLE "SetLog" ALTER COLUMN "workoutExerciseId" DROP NOT NULL;

ALTER TABLE "SetLog" ADD COLUMN IF NOT EXISTS "exerciseName" TEXT;

-- Drop old FK constraint
ALTER TABLE "SetLog" DROP CONSTRAINT IF EXISTS "SetLog_workoutExerciseId_fkey";

-- Add FK with onDelete: SetNull
ALTER TABLE "SetLog" ADD CONSTRAINT "SetLog_workoutExerciseId_fkey"
  FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Performance indexes
CREATE INDEX IF NOT EXISTS "SetLog_sessionId_idx" ON "SetLog"("sessionId");
CREATE INDEX IF NOT EXISTS "SetLog_workoutExerciseId_idx" ON "SetLog"("workoutExerciseId");
