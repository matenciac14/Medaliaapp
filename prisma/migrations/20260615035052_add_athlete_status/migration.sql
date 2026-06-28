-- CreateEnum
CREATE TYPE "AthleteStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- AlterTable
ALTER TABLE "CoachAthlete" ADD COLUMN     "status" "AthleteStatus" NOT NULL DEFAULT 'ACTIVE';
