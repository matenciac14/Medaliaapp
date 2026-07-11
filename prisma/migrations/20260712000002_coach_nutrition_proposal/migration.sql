-- CreateEnum
CREATE TYPE "CoachProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "CoachNutritionProposal" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "deltaKcal" INTEGER NOT NULL DEFAULT 0,
    "deltaProtein" INTEGER NOT NULL DEFAULT 0,
    "deltaCarbs" INTEGER NOT NULL DEFAULT 0,
    "deltaFat" INTEGER NOT NULL DEFAULT 0,
    "status" "CoachProposalStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachNutritionProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoachNutritionProposal_athleteId_status_idx" ON "CoachNutritionProposal"("athleteId", "status");

-- CreateIndex
CREATE INDEX "CoachNutritionProposal_coachId_idx" ON "CoachNutritionProposal"("coachId");

-- AddForeignKey
ALTER TABLE "CoachNutritionProposal" ADD CONSTRAINT "CoachNutritionProposal_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachNutritionProposal" ADD CONSTRAINT "CoachNutritionProposal_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
