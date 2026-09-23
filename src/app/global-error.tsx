"use client";

// Settings can't be loaded here, so this page uses the built-in defaults.
import { defaultSite as site } from "@/lib/site";

// Last-resort page when the root layout itself fails. It renders its own document without
// the site's CSS, so styles are inline and limited to the brand essentials.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", background: "#0f172a", color: "#f8fafc", fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", display: "flex", alignItems: "center" }}>
        <title>Something went wrong | Hill &amp; Stone</title>
        <main style={{ maxWidth: 560, padding: "48px 24px", margin: "0 auto" }}>
          <svg width="40" height="40" viewBox="0 0 32 32" aria-hidden>
            <path d="M2 17 L11 7 L16 12 L21 6 L30 17 Z" fill="#f8fafc" />
            <rect x="2" y="20" width="28" height="10" rx="2" fill="#d97706" />
          </svg>
          <h1 style={{ fontSize: 36, lineHeight: 1.1, margin: "24px 0 12px", fontWeight: 800 }}>The site hit a problem</h1>
          <p style={{ color: "#cbd5e1", fontSize: 18, lineHeight: 1.6, margin: 0 }}>
            Something went wrong on our end. Try again in a moment, or call {site.phone}.
            {error.digest ? ` (Reference ${error.digest})` : ""}
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
            <button onClick={() => retry()} style={{ background: "#d97706", color: "#0f172a", border: 0, borderRadius: 4, padding: "14px 22px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
              Try again
            </button>
            <a href={site.phoneHref} style={{ color: "#f8fafc", border: "1px solid rgba(248,250,252,.3)", borderRadius: 4, padding: "14px 22px", fontSize: 16, fontWeight: 600, textDecoration: "none" }}>
              Call {site.phone}
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
