-- CreateTable
CREATE TABLE "PerformanceBenchmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coachId" TEXT,
    "sport" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "testedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PerformanceBenchmark_userId_sport_idx" ON "PerformanceBenchmark"("userId", "sport");

-- CreateIndex
CREATE INDEX "PerformanceBenchmark_userId_metric_testedAt_idx" ON "PerformanceBenchmark"("userId", "metric", "testedAt");

-- AddForeignKey
ALTER TABLE "PerformanceBenchmark" ADD CONSTRAINT "PerformanceBenchmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
