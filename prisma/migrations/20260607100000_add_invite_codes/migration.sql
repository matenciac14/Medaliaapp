-- Add InviteCode table for coach invite links
CREATE TABLE "InviteCode" (
    "id"        TEXT NOT NULL,
    "code"      TEXT NOT NULL,
    "coachId"   TEXT NOT NULL,
    "usedBy"    TEXT,
    "usedAt"    TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");

ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_coachId_fkey"
    FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
