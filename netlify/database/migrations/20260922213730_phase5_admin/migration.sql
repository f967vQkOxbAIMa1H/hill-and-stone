-- Lead statuses renamed in place to match the admin pipeline (existing rows keep their meaning).
ALTER TYPE "LeadStatus" RENAME VALUE 'QUOTED' TO 'QUOTE_SENT';
ALTER TYPE "LeadStatus" RENAME VALUE 'WON' TO 'ACCEPTED';
ALTER TYPE "LeadStatus" RENAME VALUE 'LOST' TO 'DECLINED';
ALTER TYPE "LeadStatus" ADD VALUE 'COMPLETED' BEFORE 'ARCHIVED';

-- Fixed-amount deposits
ALTER TABLE "Quote" ADD COLUMN "depositFixedCents" INTEGER;

-- Admin sessions
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
