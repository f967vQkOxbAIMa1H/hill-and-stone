// Display labels for admin screens. Client-safe.
import type { LeadStatus, QuoteEventType, QuoteStatus } from "@/generated/prisma/enums";

type Tone = "neutral" | "copper" | "success" | "danger" | "dark";

export const leadStatus: Record<LeadStatus, { label: string; tone: Tone }> = {
  PENDING_REVIEW: { label: "Pending review", tone: "copper" },
  CONTACTED: { label: "Contacted", tone: "neutral" },
  SITE_VISIT_SCHEDULED: { label: "Site visit booked", tone: "neutral" },
  QUOTE_SENT: { label: "Quote sent", tone: "dark" },
  ACCEPTED: { label: "Accepted", tone: "success" },
  DECLINED: { label: "Declined", tone: "danger" },
  COMPLETED: { label: "Completed", tone: "success" },
  ARCHIVED: { label: "Archived", tone: "neutral" },
};

/** Pipeline order for filters and the status picker. */
export const leadStatusOrder: LeadStatus[] = [
  "PENDING_REVIEW",
  "CONTACTED",
  "SITE_VISIT_SCHEDULED",
  "QUOTE_SENT",
  "ACCEPTED",
  "DECLINED",
  "COMPLETED",
  "ARCHIVED",
];

export const quoteStatus: Record<QuoteStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  SENT: { label: "Sent", tone: "dark" },
  VIEWED: { label: "Viewed", tone: "copper" },
  ACCEPTED: { label: "Accepted", tone: "success" },
  DECLINED: { label: "Declined", tone: "danger" },
  PAID: { label: "Paid", tone: "success" },
  EXPIRED: { label: "Expired", tone: "danger" },
  VOID: { label: "Void", tone: "neutral" },
};

export const quoteStatusOrder: QuoteStatus[] = ["DRAFT", "SENT", "VIEWED", "ACCEPTED", "PAID", "DECLINED", "EXPIRED", "VOID"];

export const eventLabel: Record<QuoteEventType, string> = {
  CREATED: "Draft created",
  UPDATED: "Draft updated",
  SENT: "Sent to client",
  VIEWED: "Viewed by client",
  ACCEPTED: "Accepted by client",
  DECLINED: "Declined by client",
  PAYMENT_STARTED: "Client opened checkout",
  PAID: "Payment received",
  BALANCE_REQUESTED: "Balance payment requested",
  PAYMENT_FAILED: "Payment failed",
  EXPIRED: "Expired",
  VOIDED: "Voided",
  REVIEW_REQUESTED: "Review link sent to client",
};
