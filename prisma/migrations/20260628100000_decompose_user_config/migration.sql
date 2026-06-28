-- Migration: Descomponer User.config en columnas individuales
-- P0: Feature flags + onboarding + needsRoleSelection
-- P1: goalType en TrainingPlan, sportGoal en HealthProfile, version en MealPlan
-- P2: PaymentAuditLog, UserSubscription

-- ─── P0: Columnas en User ─────────────────────────────────────────────────────

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "featurePlan"      BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "featureCheckin"   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "featureNutrition" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "featureProgress"  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "featureLog"       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "featureCoach"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "featureGym"       BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "onboardingCompleted"   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "needsRoleSelection"    BOOLEAN NOT NULL DEFAULT false;

-- Poblar desde JSON existente para usuarios que ya tienen config
UPDATE "User"
SET
  "featurePlan"      = COALESCE((config->'features'->>'plan')::boolean,      true),
  "featureCheckin"   = COALESCE((config->'features'->>'checkin')::boolean,   true),
  "featureNutrition" = COALESCE((config->'features'->>'nutrition')::boolean, true),
  "featureProgress"  = COALESCE((config->'features'->>'progress')::boolean,  true),
  "featureLog"       = COALESCE((config->'features'->>'log')::boolean,       true),
  "featureCoach"     = COALESCE((config->'features'->>'coach')::boolean,     false),
  "featureGym"       = COALESCE((config->'features'->>'gym')::boolean,       true),
  "onboardingCompleted"   = COALESCE((config->'onboarding'->>'completed')::boolean, false),
  "onboardingCompletedAt" = CASE
    WHEN config->'onboarding'->>'completedAt' IS NOT NULL
    THEN (config->'onboarding'->>'completedAt')::timestamptz
    ELSE NULL
  END,
  "needsRoleSelection" = CASE
    WHEN config::text = '{}' OR config IS NULL THEN true
    ELSE false
  END
WHERE config IS NOT NULL AND config::text != '{}';

-- Coaches: defaults explícitos (ya deberían estar bien por la data migration, pero por si acaso)
UPDATE "User"
SET
  "featureCoach"     = true,
  "featurePlan"      = false,
  "featureCheckin"   = false,
  "featureNutrition" = false,
  "featureProgress"  = false,
  "featureLog"       = false,
  "featureGym"       = false,
  "onboardingCompleted"   = true,
  "needsRoleSelection"    = false
WHERE role = 'COACH';

-- ─── P0: sportGoal en HealthProfile ──────────────────────────────────────────

ALTER TABLE "HealthProfile"
  ADD COLUMN IF NOT EXISTS "sportGoal" TEXT;

UPDATE "HealthProfile" hp
SET "sportGoal" = u.config->'sport'->>'goal'
FROM "User" u
WHERE hp."userId" = u.id
  AND u.config->'sport'->>'goal' IS NOT NULL
  AND u.config->'sport'->>'goal' != 'null';

-- ─── P1: goalType en TrainingPlan ────────────────────────────────────────────

ALTER TABLE "TrainingPlan"
  ADD COLUMN IF NOT EXISTS "goalType" TEXT;

-- Parsear goalType del campo name (formato: "Plan GOALTYPE — fecha")
UPDATE "TrainingPlan"
SET "goalType" = CASE
  WHEN name LIKE '%RACE_5K%'            THEN 'RACE_5K'
  WHEN name LIKE '%RACE_10K%'           THEN 'RACE_10K'
  WHEN name LIKE '%RACE_HALF_MARATHON%' THEN 'RACE_HALF_MARATHON'
  WHEN name LIKE '%RACE_MARATHON%'      THEN 'RACE_MARATHON'
  WHEN name LIKE '%BODY_RECOMPOSITION%' THEN 'BODY_RECOMPOSITION'
  WHEN name LIKE '%STRENGTH_TRAINING%'  THEN 'STRENGTH_TRAINING'
  ELSE NULL
END
WHERE "goalType" IS NULL;

-- ─── P1: version en MealPlan ─────────────────────────────────────────────────

ALTER TABLE "MealPlan"
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;

-- ─── P2: PaymentAuditLog ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "PaymentAuditLog" (
  "id"        TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "action"    TEXT NOT NULL,
  "actorId"   TEXT NOT NULL,
  "note"      TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "PaymentAuditLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentAuditLog_paymentId_fkey"
    FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE,
  CONSTRAINT "PaymentAuditLog_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "PaymentAuditLog_paymentId_idx" ON "PaymentAuditLog"("paymentId");

-- ─── P2: SubscriptionTier enum + UserSubscription ───────────────────────────

DO $$ BEGIN
  CREATE TYPE "SubscriptionTier" AS ENUM ('TRIAL', 'FREE', 'PRO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "UserSubscription" (
  "id"                 TEXT NOT NULL,
  "userId"             TEXT NOT NULL,
  "tier"               "SubscriptionTier" NOT NULL DEFAULT 'TRIAL',
  "trialEndsAt"        TIMESTAMPTZ,
  "currentPeriodEnd"   TIMESTAMPTZ,
  "externalCustomerId" TEXT,
  "externalPriceId"    TEXT,
  "cancelAtPeriodEnd"  BOOLEAN NOT NULL DEFAULT false,
  "createdAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UserSubscription_userId_key" UNIQUE ("userId"),
  CONSTRAINT "UserSubscription_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Crear subscripción TRIAL para todos los usuarios existentes (30 días desde hoy)
INSERT INTO "UserSubscription" ("id", "userId", "tier", "trialEndsAt", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  id,
  'TRIAL'::"SubscriptionTier",
  NOW() + INTERVAL '30 days',
  NOW(),
  NOW()
FROM "User"
ON CONFLICT ("userId") DO NOTHING;
