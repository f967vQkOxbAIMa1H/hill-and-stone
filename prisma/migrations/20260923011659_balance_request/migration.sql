-- Balance payment requests from the admin
ALTER TYPE "EmailType" ADD VALUE 'BALANCE_REQUEST';
ALTER TYPE "QuoteEventType" ADD VALUE 'BALANCE_REQUESTED' AFTER 'PAID';
