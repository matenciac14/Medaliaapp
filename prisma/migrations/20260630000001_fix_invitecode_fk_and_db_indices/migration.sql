-- BUG-023: Add FK from InviteCode.usedBy → User (onDelete: SetNull)
-- DB: CoachAthlete.updatedAt + @@index([athleteId])
-- DB: Índices faltantes — SessionLog.completedAt, CoachProfile.isPublic,
--     WorkoutTemplate(isPublic, isActive), InviteCode(coachId, expiresAt)

-- AlterTable: CoachAthlete.updatedAt — NOT NULL with DEFAULT NOW() for existing rows
ALTER TABLE "CoachAthlete" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- CreateIndex
CREATE INDEX "CoachAthlete_athleteId_idx" ON "CoachAthlete"("athleteId");

CREATE INDEX "CoachProfile_isPublic_idx" ON "CoachProfile"("isPublic");

CREATE INDEX "InviteCode_coachId_idx" ON "InviteCode"("coachId");

CREATE INDEX "InviteCode_expiresAt_idx" ON "InviteCode"("expiresAt");

CREATE INDEX "SessionLog_completedAt_idx" ON "SessionLog"("completedAt");

CREATE INDEX "WorkoutTemplate_isPublic_isActive_idx" ON "WorkoutTemplate"("isPublic", "isActive");

-- AddForeignKey: InviteCode.usedBy → User (BUG-023)
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_usedBy_fkey"
  FOREIGN KEY ("usedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
