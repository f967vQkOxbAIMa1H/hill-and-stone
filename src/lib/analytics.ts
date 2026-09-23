// GA4 helpers. Client-safe; every call is a no-op when GA isn't configured.

type Params = Record<string, string | number | boolean | undefined>;
type Gtag = (command: "event" | "config" | "js" | "consent", target: string | Date, params?: Params) => void;

declare global {
  interface Window {
    gtag?: Gtag;
    dataLayer?: unknown[];
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

/** Sends a GA4 event. Conversions: generate_lead, begin_checkout, purchase. */
export function track(event: string, params: Params = {}) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", event, params);
}

/**
 * Page paths as reported to Google. Customer quote links contain a secret token, and the
 * return from Stripe carries a session id, so both are removed before anything leaves the browser.
 */
export function redactPath(pathname: string) {
  return pathname.replace(/^\/quote\/[^/?#]+/, "/quote/[token]");
}

/** Pages never reported to analytics. */
export const isUntracked = (pathname: string) => pathname === "/admin" || pathname.startsWith("/admin/");
