-- Migration: feature_flags_body_measurements_db_types
--
-- Changes:
--   1. CoachSubscriptionTier enum + UserSubscription.coachTier (feature flags entrenadores)
--   2. TrainingPlan.goalType String? → GoalType enum
--   3. SessionLog.freeSessionType String? → SessionType enum
--   4. Payment.amount Float → Decimal(12,2) (precisión monetaria)
--   5. WeeklyCheckIn + medidas corporales (waistCm, armsCm, hipsCm, thighsCm)
--   6. Tablas faltantes en historial: WeeklyRoutine, Message, AdminAuditLog
--   7. GymSession.plannedSessionId + índices faltantes
--   8. PlannedSession.sportLabel, workoutDayId + FK
--   9. SetLog.isPR
--  10. CoachAthlete.coachGoal, privateNotes + FKs CASCADE

-- CreateEnum
CREATE TYPE "CoachSubscriptionTier" AS ENUM ('STARTER', 'GROWTH', 'PRO', 'SCALE');

-- DropForeignKey
ALTER TABLE "CoachAthlete" DROP CONSTRAINT "CoachAthlete_athleteId_fkey";
ALTER TABLE "CoachAthlete" DROP CONSTRAINT "CoachAthlete_coachId_fkey";
ALTER TABLE "GymSession" DROP CONSTRAINT "GymSession_assignedWorkoutId_fkey";
ALTER TABLE "PaymentAuditLog" DROP CONSTRAINT "PaymentAuditLog_actorId_fkey";
ALTER TABLE "PaymentAuditLog" DROP CONSTRAINT "PaymentAuditLog_paymentId_fkey";
ALTER TABLE "UserSubscription" DROP CONSTRAINT "UserSubscription_userId_fkey";

-- AlterTable: CoachAthlete
ALTER TABLE "CoachAthlete" ADD COLUMN "coachGoal" TEXT,
ADD COLUMN "privateNotes" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable: GymSession
ALTER TABLE "GymSession" ADD COLUMN "plannedSessionId" TEXT,
ALTER COLUMN "assignedWorkoutId" DROP NOT NULL;

-- AlterTable: Payment.amount Float → Decimal(12,2)
ALTER TABLE "Payment" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable: PaymentAuditLog
ALTER TABLE "PaymentAuditLog" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable: PlannedSession
ALTER TABLE "PlannedSession" ADD COLUMN "sportLabel" TEXT,
ADD COLUMN "workoutDayId" TEXT;

-- AlterTable: SessionLog.freeSessionType String? → SessionType enum
ALTER TABLE "SessionLog" ADD COLUMN "freeSessionType" "SessionType";

-- AlterTable: SetLog.isPR
ALTER TABLE "SetLog" ADD COLUMN "isPR" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: TrainingPlan.goalType String? → GoalType enum
ALTER TABLE "TrainingPlan" DROP COLUMN "goalType";
ALTER TABLE "TrainingPlan" ADD COLUMN "goalType" "GoalType";

-- AlterTable: User
ALTER TABLE "User" ALTER COLUMN "onboardingCompletedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable: UserSubscription + coachTier
ALTER TABLE "UserSubscription" ADD COLUMN "coachTier" "CoachSubscriptionTier" NOT NULL DEFAULT 'STARTER',
ALTER COLUMN "trialEndsAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "currentPeriodEnd" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable: WeeklyCheckIn + medidas corporales
ALTER TABLE "WeeklyCheckIn" ADD COLUMN "armsCm" DOUBLE PRECISION,
ADD COLUMN "hipsCm" DOUBLE PRECISION,
ADD COLUMN "thighsCm" DOUBLE PRECISION,
ADD COLUMN "waistCm" DOUBLE PRECISION;

-- CreateTable: WeeklyRoutine
CREATE TABLE "WeeklyRoutine" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "daysPerWeek" INTEGER NOT NULL DEFAULT 4,
    "days" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WeeklyRoutine_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Message
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AdminAuditLog
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetUserId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyRoutine_userId_key" ON "WeeklyRoutine"("userId");
CREATE INDEX "Message_fromId_toId_createdAt_idx" ON "Message"("fromId", "toId", "createdAt");
CREATE INDEX "Message_toId_readAt_idx" ON "Message"("toId", "readAt");
CREATE INDEX "AdminAuditLog_adminId_idx" ON "AdminAuditLog"("adminId");
CREATE INDEX "AdminAuditLog_targetUserId_idx" ON "AdminAuditLog"("targetUserId");
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt" DESC);
CREATE UNIQUE INDEX "GymSession_plannedSessionId_key" ON "GymSession"("plannedSessionId");
CREATE INDEX "GymSession_athleteId_date_idx" ON "GymSession"("athleteId", "date");
CREATE UNIQUE INDEX "GymSession_athleteId_date_plannedSessionId_key" ON "GymSession"("athleteId", "date", "plannedSessionId");
CREATE INDEX "PlannedSession_date_idx" ON "PlannedSession"("date");

-- AddForeignKey
ALTER TABLE "CoachAthlete" ADD CONSTRAINT "CoachAthlete_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CoachAthlete" ADD CONSTRAINT "CoachAthlete_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlannedSession" ADD CONSTRAINT "PlannedSession_workoutDayId_fkey" FOREIGN KEY ("workoutDayId") REFERENCES "WorkoutDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WeeklyRoutine" ADD CONSTRAINT "WeeklyRoutine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GymSession" ADD CONSTRAINT "GymSession_assignedWorkoutId_fkey" FOREIGN KEY ("assignedWorkoutId") REFERENCES "AssignedWorkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GymSession" ADD CONSTRAINT "GymSession_plannedSessionId_fkey" FOREIGN KEY ("plannedSessionId") REFERENCES "PlannedSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentAuditLog" ADD CONSTRAINT "PaymentAuditLog_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentAuditLog" ADD CONSTRAINT "PaymentAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
