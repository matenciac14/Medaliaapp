-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('TIP', 'ROUTINE_SHOWCASE', 'ACHIEVEMENT', 'ANNOUNCEMENT');

-- CreateTable
CREATE TABLE "CoachProfile" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "headline" TEXT,
    "specialties" TEXT[],
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'CO',
    "whatsapp" TEXT,
    "instagram" TEXT,
    "yearsExp" INTEGER,
    "certifications" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachProgram" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sport" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "durationWeeks" INTEGER,
    "priceMonth" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "includes" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachPost" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" "PostType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "tags" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachProfile_coachId_key" ON "CoachProfile"("coachId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachProfile_slug_key" ON "CoachProfile"("slug");

-- AddForeignKey
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachProgram" ADD CONSTRAINT "CoachProgram_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachPost" ADD CONSTRAINT "CoachPost_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
