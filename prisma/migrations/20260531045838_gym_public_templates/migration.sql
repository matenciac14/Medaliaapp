-- DropForeignKey
ALTER TABLE "AssignedWorkout" DROP CONSTRAINT "AssignedWorkout_coachId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutTemplate" DROP CONSTRAINT "WorkoutTemplate_coachId_fkey";

-- AlterTable
ALTER TABLE "AssignedWorkout" ALTER COLUMN "coachId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WorkoutTemplate" ADD COLUMN     "category" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "coachId" DROP NOT NULL,
ALTER COLUMN "daysPerWeek" SET DEFAULT 3;

-- AddForeignKey
ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedWorkout" ADD CONSTRAINT "AssignedWorkout_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
