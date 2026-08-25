-- CreateEnum
CREATE TYPE "AthleteUserType" AS ENUM ('B2C_FREE', 'B2C_PRO', 'B2B');

-- CreateTable
CREATE TABLE "TierFeatureConfig" (
    "id"               TEXT NOT NULL,
    "userType"         "AthleteUserType" NOT NULL,
    "featurePlan"      BOOLEAN NOT NULL DEFAULT false,
    "featureCheckin"   BOOLEAN NOT NULL DEFAULT false,
    "featureNutrition" BOOLEAN NOT NULL DEFAULT true,
    "featureProgress"  BOOLEAN NOT NULL DEFAULT false,
    "featureLog"       BOOLEAN NOT NULL DEFAULT true,
    "featureGym"       BOOLEAN NOT NULL DEFAULT true,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "updatedBy"        TEXT,

    CONSTRAINT "TierFeatureConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TierFeatureConfig_userType_key" ON "TierFeatureConfig"("userType");

-- Seed default rows for each tier
INSERT INTO "TierFeatureConfig" ("id", "userType", "featurePlan", "featureCheckin", "featureNutrition", "featureProgress", "featureLog", "featureGym", "updatedAt")
VALUES
  ('cfg-b2c-free', 'B2C_FREE', false, false, true,  false, true, true, NOW()),
  ('cfg-b2c-pro',  'B2C_PRO',  true,  true,  true,  true,  true, true, NOW()),
  ('cfg-b2b',      'B2B',      true,  true,  true,  true,  true, true, NOW());
