-- Add SessionIntensity enum and intensity field to PlannedSession
CREATE TYPE "SessionIntensity" AS ENUM ('HIGH', 'MODERATE', 'LOW', 'REST');
ALTER TABLE "PlannedSession" ADD COLUMN IF NOT EXISTS "intensity" "SessionIntensity" NOT NULL DEFAULT 'MODERATE';
