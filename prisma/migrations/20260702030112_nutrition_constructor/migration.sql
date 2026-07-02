-- CreateEnum
CREATE TYPE "NutritionDayType" AS ENUM ('HARD', 'EASY', 'REST');

-- CreateTable
CREATE TABLE "NutritionTemplate" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "goal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionTemplateDay" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "dayType" "NutritionDayType" NOT NULL,

    CONSTRAINT "NutritionTemplateDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionTemplateMeal" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "mealType" "MealType" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NutritionTemplateMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionTemplateFoodItem" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,
    "kcal" DOUBLE PRECISION NOT NULL,
    "proteinG" DOUBLE PRECISION NOT NULL,
    "carbsG" DOUBLE PRECISION NOT NULL,
    "fatG" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NutritionTemplateFoodItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignedNutritionPlan" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignedNutritionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NutritionTemplate_coachId_idx" ON "NutritionTemplate"("coachId");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionTemplateDay_templateId_dayType_key" ON "NutritionTemplateDay"("templateId", "dayType");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionTemplateMeal_dayId_mealType_key" ON "NutritionTemplateMeal"("dayId", "mealType");

-- CreateIndex
CREATE INDEX "NutritionTemplateFoodItem_mealId_idx" ON "NutritionTemplateFoodItem"("mealId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignedNutritionPlan_athleteId_key" ON "AssignedNutritionPlan"("athleteId");

-- CreateIndex
CREATE INDEX "AssignedNutritionPlan_coachId_idx" ON "AssignedNutritionPlan"("coachId");

-- CreateIndex
CREATE INDEX "AssignedNutritionPlan_templateId_idx" ON "AssignedNutritionPlan"("templateId");

-- AddForeignKey
ALTER TABLE "NutritionTemplate" ADD CONSTRAINT "NutritionTemplate_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionTemplateDay" ADD CONSTRAINT "NutritionTemplateDay_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NutritionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionTemplateMeal" ADD CONSTRAINT "NutritionTemplateMeal_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "NutritionTemplateDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionTemplateFoodItem" ADD CONSTRAINT "NutritionTemplateFoodItem_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "NutritionTemplateMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionTemplateFoodItem" ADD CONSTRAINT "NutritionTemplateFoodItem_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedNutritionPlan" ADD CONSTRAINT "AssignedNutritionPlan_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NutritionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedNutritionPlan" ADD CONSTRAINT "AssignedNutritionPlan_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedNutritionPlan" ADD CONSTRAINT "AssignedNutritionPlan_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
