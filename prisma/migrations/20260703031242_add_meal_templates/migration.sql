-- CreateTable
CREATE TABLE "MealTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mealType" "MealType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MealTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MealTemplate_userId_idx" ON "MealTemplate"("userId");

-- AddForeignKey
ALTER TABLE "MealTemplate" ADD CONSTRAINT "MealTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealTemplateItem" ADD CONSTRAINT "MealTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MealTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealTemplateItem" ADD CONSTRAINT "MealTemplateItem_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
