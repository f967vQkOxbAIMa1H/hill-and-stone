"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { GA_ID, isUntracked, redactPath, track } from "@/lib/analytics";

/**
 * Loads GA4 when NEXT_PUBLIC_GA_MEASUREMENT_ID is set. Automatic page views are off: they would
 * send full URLs, including private quote tokens. Page views are sent here with redacted paths
 * and no query string. The admin is never tracked.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const untracked = isUntracked(pathname);

  useEffect(() => {
    if (!GA_ID || untracked) return;
    const path = redactPath(pathname);
    track("page_view", { page_path: path, page_location: `${window.location.origin}${path}`, page_title: document.title });
  }, [pathname, untracked]);

  // Calls from the site's phone links count as leads too.
  useEffect(() => {
    if (!GA_ID) return;
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href^="tel:"]');
      if (link) track("click_to_call", { link_location: redactPath(window.location.pathname) });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (!GA_ID || untracked) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:false,page_location:location.origin+location.pathname.replace(/^\\/quote\\/[^/?#]+/,'/quote/[token]')});`}
      </Script>
    </>
  );
}

/** Fires one event when mounted, at most once per browser session for a given key. */
export function TrackOnce({ event, params, onceKey }: { event: string; params?: Record<string, string | number>; onceKey: string }) {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(`hs_tracked:${onceKey}`)) return;
      sessionStorage.setItem(`hs_tracked:${onceKey}`, "1");
    } catch {
      // Storage blocked: still send once for this render.
    }
    track(event, params);
  }, [event, params, onceKey]);
  return null;
}
