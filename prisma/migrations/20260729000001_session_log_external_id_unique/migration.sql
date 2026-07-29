-- Deduplicación de actividades externas (Strava, HealthKit, Garmin)
-- NULL != NULL en PostgreSQL, así que filas sin externalId no colisionan.
CREATE UNIQUE INDEX IF NOT EXISTS "SessionLog_userId_externalId_key"
  ON "SessionLog"("userId", "externalId")
  WHERE "externalId" IS NOT NULL;

-- providerAccountId en WearableConnection para mapear webhooks al userId correcto
ALTER TABLE "WearableConnection"
  ADD COLUMN IF NOT EXISTS "providerAccountId" TEXT;

CREATE INDEX IF NOT EXISTS "WearableConnection_provider_providerAccountId_idx"
  ON "WearableConnection"("provider", "providerAccountId")
  WHERE "providerAccountId" IS NOT NULL;
