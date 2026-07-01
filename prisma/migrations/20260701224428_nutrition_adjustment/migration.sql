-- CreateEnum
CREATE TYPE "AdjustmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "SessionLog" ADD COLUMN     "actualIntensity" "SessionIntensity";

-- CreateTable
CREATE TABLE "PendingNutritionAdjustment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "sessionLogId" TEXT,
    "plannedIntensity" "SessionIntensity" NOT NULL,
    "actualIntensity" "SessionIntensity" NOT NULL,
    "deltaKcal" INTEGER NOT NULL,
    "deltaCarbsG" INTEGER NOT NULL,
    "plannedKcal" INTEGER NOT NULL,
    "plannedCarbsG" INTEGER NOT NULL,
    "adjustedKcal" INTEGER NOT NULL,
    "adjustedCarbsG" INTEGER NOT NULL,
    "status" "AdjustmentStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingNutritionAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingNutritionAdjustment_sessionLogId_key" ON "PendingNutritionAdjustment"("sessionLogId");

-- CreateIndex
CREATE INDEX "PendingNutritionAdjustment_userId_status_idx" ON "PendingNutritionAdjustment"("userId", "status");

-- CreateIndex
CREATE INDEX "PendingNutritionAdjustment_userId_date_idx" ON "PendingNutritionAdjustment"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PendingNutritionAdjustment_userId_date_key" ON "PendingNutritionAdjustment"("userId", "date");

-- AddForeignKey
ALTER TABLE "PendingNutritionAdjustment" ADD CONSTRAINT "PendingNutritionAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingNutritionAdjustment" ADD CONSTRAINT "PendingNutritionAdjustment_sessionLogId_fkey" FOREIGN KEY ("sessionLogId") REFERENCES "SessionLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
