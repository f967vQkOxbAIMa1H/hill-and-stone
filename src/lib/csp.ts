// Content-Security-Policy for the whole site. Imported by next.config.ts and src/proxy.ts, so it
// stays plain TypeScript with no app imports.

/**
 * With a nonce, only scripts carrying it run ('strict-dynamic' then trusts what they load, like
 * GA's gtag.js), so an injected script is refused. Without one (the cached public pages), scripts
 * must come from this site or Google Tag Manager, and inline scripts are allowed because a page
 * built ahead of time can't carry a per-request nonce. Those pages only show text the business's
 * own staff writes, which React escapes.
 */
export function contentSecurityPolicy(nonce?: string) {
  const isDev = process.env.NODE_ENV === "development";
  // Only upgrade subresource requests when the site is actually served over HTTPS; on a plain-HTTP
  // preview (a LAN address) the upgrade would point every asset at a port with no TLS.
  const httpsSite = (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://");
  const ga = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    ? " https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com"
    : "";
  const eval_ = isDev ? " 'unsafe-eval'" : "";
  const scripts = nonce
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${eval_}`
    : `script-src 'self' 'unsafe-inline'${eval_}${ga ? " https://www.googletagmanager.com" : ""}`;
  return [
    "default-src 'self'",
    scripts,
    // Inline style attributes are needed for server-rendered animation and layout values.
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' blob: data:${ga}`,
    "font-src 'self'",
    `connect-src 'self'${ga}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(httpsSite ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
