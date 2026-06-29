-- AddColumn timezone and locale to User
ALTER TABLE "User" ADD COLUMN "timezone" TEXT;
ALTER TABLE "User" ADD COLUMN "locale" TEXT;
