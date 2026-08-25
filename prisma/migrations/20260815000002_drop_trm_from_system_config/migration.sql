-- Drop TRM columns from SystemConfig — el TRM se obtiene live desde datos.gov.co
-- sin almacenamiento en DB (cambia diariamente, se cachea en Next.js Data Cache 1h)
ALTER TABLE "SystemConfig"
  DROP COLUMN IF EXISTS "trmUsdCop",
  DROP COLUMN IF EXISTS "trmUpdatedAt";
