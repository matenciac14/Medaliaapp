-- Migration 1: identity, notification, food proposal
-- Coach identity (anti-fraude + billing) · Notification model · FoodProposal model

-- ── 1. User — coach identity fields ──────────────────────────────────────────
ALTER TABLE "User" ADD COLUMN "identification" TEXT;
ALTER TABLE "User" ADD COLUMN "phoneWa"        TEXT;
ALTER TABLE "User" ADD COLUMN "showPhoneWa"    BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "User_identification_key" ON "User"("identification");
CREATE UNIQUE INDEX "User_phoneWa_key"         ON "User"("phoneWa");

-- ── 2. Notification model ─────────────────────────────────────────────────────
CREATE TABLE "Notification" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "type"      TEXT NOT NULL,
    "title"     TEXT NOT NULL,
    "body"      TEXT NOT NULL,
    "read"      BOOLEAN NOT NULL DEFAULT false,
    "metadata"  JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_read_idx"      ON "Notification"("userId", "read");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 3. Food — new fields ──────────────────────────────────────────────────────
ALTER TABLE "Food" ADD COLUMN "source"  TEXT NOT NULL DEFAULT 'system';
ALTER TABLE "Food" ADD COLUMN "barcode" TEXT;
ALTER TABLE "Food" ADD COLUMN "country" TEXT;

CREATE UNIQUE INDEX "Food_barcode_key" ON "Food"("barcode");
CREATE INDEX "Food_barcode_idx"        ON "Food"("barcode");
CREATE INDEX "Food_country_idx"        ON "Food"("country");

-- ── 4. FoodProposalStatus enum + FoodProposal model ──────────────────────────
CREATE TYPE "FoodProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "FoodProposal" (
    "id"             TEXT NOT NULL,
    "submittedById"  TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "category"       TEXT NOT NULL,
    "kcalPer100g"    DOUBLE PRECISION NOT NULL,
    "proteinPer100g" DOUBLE PRECISION NOT NULL,
    "carbsPer100g"   DOUBLE PRECISION NOT NULL,
    "fatPer100g"     DOUBLE PRECISION NOT NULL,
    "country"        TEXT,
    "notes"          TEXT,
    "status"         "FoodProposalStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById"   TEXT,
    "reviewNote"     TEXT,
    "foodId"         TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodProposal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FoodProposal_status_idx"        ON "FoodProposal"("status");
CREATE INDEX "FoodProposal_submittedById_idx" ON "FoodProposal"("submittedById");

ALTER TABLE "FoodProposal" ADD CONSTRAINT "FoodProposal_submittedById_fkey"
    FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FoodProposal" ADD CONSTRAINT "FoodProposal_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FoodProposal" ADD CONSTRAINT "FoodProposal_foodId_fkey"
    FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE SET NULL ON UPDATE CASCADE;
