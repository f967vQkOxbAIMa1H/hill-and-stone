-- AlterEnum
ALTER TYPE "EmailType" ADD VALUE 'LOW_RATING_FEEDBACK';

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "paymentRequestedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Testimonial" ADD COLUMN     "authorEmail" TEXT;
