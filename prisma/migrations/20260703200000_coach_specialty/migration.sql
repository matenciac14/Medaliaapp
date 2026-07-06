-- Migration: 20260703200000_coach_specialty
-- ARCH-02: CoachSpecialty enum + primarySpecialty column in CoachProfile
-- Run via: pnpm prisma migrate deploy (uses DIRECT_URL)

-- 1. Create enum
CREATE TYPE "CoachSpecialty" AS ENUM ('RUNNING', 'GYM', 'NUTRITION', 'ALL');

-- 2. Add column to CoachProfile with default ALL (safe for existing rows)
ALTER TABLE "CoachProfile"
  ADD COLUMN "primarySpecialty" "CoachSpecialty" NOT NULL DEFAULT 'ALL';
