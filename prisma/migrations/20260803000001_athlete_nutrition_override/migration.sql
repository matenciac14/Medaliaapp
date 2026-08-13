-- NUT-SWAP-01: AthleteNutritionOverride
-- Permite al atleta sustituir un alimento del plan del coach por uno equivalente (±10% kcal).
-- El swap persiste sin tocar el PlannedMeal original.

CREATE TABLE "AthleteNutritionOverride" (
    "id"             TEXT NOT NULL,
    "athleteId"      TEXT NOT NULL,
    "plannedMealId"  TEXT NOT NULL,
    "overrideFoodId" TEXT NOT NULL,
    "overrideGrams"  DOUBLE PRECISION NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteNutritionOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AthleteNutritionOverride_athleteId_plannedMealId_key"
    ON "AthleteNutritionOverride"("athleteId", "plannedMealId");

CREATE INDEX "AthleteNutritionOverride_athleteId_idx"
    ON "AthleteNutritionOverride"("athleteId");

ALTER TABLE "AthleteNutritionOverride"
    ADD CONSTRAINT "AthleteNutritionOverride_athleteId_fkey"
    FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AthleteNutritionOverride"
    ADD CONSTRAINT "AthleteNutritionOverride_plannedMealId_fkey"
    FOREIGN KEY ("plannedMealId") REFERENCES "PlannedMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AthleteNutritionOverride"
    ADD CONSTRAINT "AthleteNutritionOverride_overrideFoodId_fkey"
    FOREIGN KEY ("overrideFoodId") REFERENCES "Food"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
