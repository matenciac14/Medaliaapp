-- AlterTable
ALTER TABLE "GymSession" ADD COLUMN     "exerciseOverrides" JSONB;

-- AlterTable
ALTER TABLE "WorkoutTemplate" ADD COLUMN     "athleteId" TEXT;

-- AddForeignKey
ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
