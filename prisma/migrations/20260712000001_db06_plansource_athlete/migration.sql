-- DB-06: NutritionTemplate.coachId nullable + athleteId FK (atleta B2C puede crear plantillas propias)
ALTER TABLE "NutritionTemplate" ALTER COLUMN "coachId" DROP NOT NULL;
ALTER TABLE "NutritionTemplate" ADD COLUMN "athleteId" TEXT;
ALTER TABLE "NutritionTemplate" ADD CONSTRAINT "NutritionTemplate_athleteId_fkey"
  FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "NutritionTemplate_athleteId_idx" ON "NutritionTemplate"("athleteId");

-- PLAN-DB-01: PlanSource enum — agregar valor ATHLETE (plan self-built por atleta B2C)
ALTER TYPE "PlanSource" ADD VALUE 'ATHLETE';
