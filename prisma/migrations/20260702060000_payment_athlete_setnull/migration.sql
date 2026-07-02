-- DBI-15: Make Payment.athleteId nullable + SET NULL on athlete delete
-- Preserves payment history when an athlete account is deleted

ALTER TABLE "Payment" ALTER COLUMN "athleteId" DROP NOT NULL;

ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_athleteId_fkey";
ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_athleteId_fkey"
  FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
