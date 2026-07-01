-- Add Payment model and PaymentStatus enum.
-- This migration retroactively captures the Payment table that was added via
-- prisma db push between add_invite_codes and remove_overdue_payment_status.

-- Create enum (original version included OVERDUE — removed later in 20260628000002)
DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create Payment table
CREATE TABLE IF NOT EXISTS "Payment" (
    "id"          TEXT NOT NULL,
    "coachId"     TEXT NOT NULL,
    "athleteId"   TEXT NOT NULL,
    "amount"      DOUBLE PRECISION NOT NULL,
    "currency"    TEXT NOT NULL DEFAULT 'COP',
    "description" TEXT,
    "dueDate"     TIMESTAMP(3) NOT NULL,
    "paidAt"      TIMESTAMP(3),
    "status"      "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "notes"       TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- FK constraints (add only if not already present)
DO $$ BEGIN
  ALTER TABLE "Payment" ADD CONSTRAINT "Payment_coachId_fkey"
    FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Payment" ADD CONSTRAINT "Payment_athleteId_fkey"
    FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "Payment_coachId_status_idx"   ON "Payment"("coachId", "status");
CREATE INDEX IF NOT EXISTS "Payment_coachId_athleteId_idx" ON "Payment"("coachId", "athleteId");
CREATE INDEX IF NOT EXISTS "Payment_dueDate_status_idx"   ON "Payment"("dueDate", "status");
