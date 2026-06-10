-- Add gender field to HealthProfile for accurate TDEE calculation (Mifflin-St Jeor)
ALTER TABLE "HealthProfile" ADD COLUMN IF NOT EXISTS "gender" TEXT;
