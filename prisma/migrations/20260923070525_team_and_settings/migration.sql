-- Team management
ALTER TYPE "UserRole" ADD VALUE 'TECHNICIAN' AFTER 'STAFF';
ALTER TYPE "EmailType" ADD VALUE 'STAFF_ACCOUNT_NOTICE';
ALTER TABLE "User" ADD COLUMN "deactivatedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;

-- Site settings edited from the admin
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'site',
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,
    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
