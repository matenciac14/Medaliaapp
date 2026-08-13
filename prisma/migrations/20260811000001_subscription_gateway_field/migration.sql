-- AlterTable
ALTER TABLE "UserSubscription" ADD COLUMN "gateway" TEXT,
                               ADD COLUMN "lastWebhookEventId" TEXT;
