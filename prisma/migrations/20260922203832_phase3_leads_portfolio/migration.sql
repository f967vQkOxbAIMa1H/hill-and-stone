-- Rename lead status NEW -> PENDING_REVIEW in place (keeps existing rows).
ALTER TYPE "LeadStatus" RENAME VALUE 'NEW' TO 'PENDING_REVIEW';
ALTER TABLE "Lead" ALTER COLUMN "status" SET DEFAULT 'PENDING_REVIEW';

-- AlterEnum
ALTER TYPE "EmailType" ADD VALUE 'COI_REQUEST_NOTICE';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "results" TEXT;

-- AlterTable
ALTER TABLE "Testimonial" ADD COLUMN "projectId" TEXT;

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
