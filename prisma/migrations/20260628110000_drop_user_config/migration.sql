-- Drop the deprecated config JSON blob — all data migrated to typed columns
ALTER TABLE "User" DROP COLUMN IF EXISTS "config";
