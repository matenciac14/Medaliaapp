-- AlterTable
ALTER TABLE "GymSession" ADD COLUMN "energyState" TEXT,
ADD COLUMN "discomfort" TEXT;

-- AlterTable
ALTER TABLE "SessionLog" ADD COLUMN "energyState" TEXT,
ADD COLUMN "discomfort" TEXT;
