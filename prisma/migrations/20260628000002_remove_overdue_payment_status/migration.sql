-- Remove OVERDUE from PaymentStatus enum.
--
-- Wrapped in a DO block so the shadow DB can replay safely even when
-- the Payment table does not yet exist (it is created later in
-- 20260628100000_decompose_user_config).

DO $$ BEGIN
  -- Only run if Payment table exists (idempotent replay safety)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Payment'
  ) THEN
    -- 0. Cleanup if a previous attempt left the type half-done
    DROP TYPE IF EXISTS "PaymentStatus_new";

    -- 1. Reset OVERDUE rows to PENDING
    UPDATE "Payment" SET status = 'PENDING' WHERE status = 'OVERDUE';

    -- 2. Create new enum without OVERDUE
    CREATE TYPE "PaymentStatus_new" AS ENUM ('PENDING', 'PAID');

    -- 3. Drop DEFAULT before mutating column type
    ALTER TABLE "Payment" ALTER COLUMN status DROP DEFAULT;

    -- 4. Cast column to new enum
    ALTER TABLE "Payment"
      ALTER COLUMN status TYPE "PaymentStatus_new"
      USING status::text::"PaymentStatus_new";

    -- 5. Restore DEFAULT with new type
    ALTER TABLE "Payment" ALTER COLUMN status SET DEFAULT 'PENDING'::"PaymentStatus_new";

    -- 6. Drop old enum and rename new
    DROP TYPE IF EXISTS "PaymentStatus";
    ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
  ELSE
    -- Table will be created by 20260628100000_decompose_user_config with
    -- the correct (PENDING | PAID) enum — nothing to do here.
    RAISE NOTICE 'Payment table not found — skipping enum migration (will be created correctly later).';
  END IF;
END $$;
