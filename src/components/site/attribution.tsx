"use client";

import { useEffect } from "react";

const KEY = "hs_attribution";

/** Stores first-touch attribution for this browser session; read by the quote form. */
export function AttributionCapture() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
      const q = new URLSearchParams(window.location.search);
      const data = {
        utmSource: q.get("utm_source") ?? undefined,
        utmMedium: q.get("utm_medium") ?? undefined,
        utmCampaign: q.get("utm_campaign") ?? undefined,
        utmTerm: q.get("utm_term") ?? undefined,
        utmContent: q.get("utm_content") ?? undefined,
        gclid: q.get("gclid") ?? undefined,
        fbclid: q.get("fbclid") ?? undefined,
        landingPage: window.location.pathname,
        referrer: document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : undefined,
      };
      sessionStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // Storage unavailable (private mode, blocked): attribution is optional.
    }
  }, []);
  return null;
}

export function readAttribution(): string {
  try {
    return sessionStorage.getItem(KEY) ?? "{}";
  } catch {
    return "{}";
  }
}
