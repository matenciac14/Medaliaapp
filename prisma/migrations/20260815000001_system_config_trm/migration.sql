-- AlterTable — SystemConfig: add TRM fields for real-time exchange rate
ALTER TABLE "SystemConfig"
  ADD COLUMN IF NOT EXISTS "trmUsdCop"    DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "trmUpdatedAt" TIMESTAMP(3);
