import { ImageResponse } from "next/og";
import { brand as site, serviceAreas } from "@/lib/site";

export const alt = `${site.name}: home repair in Northwest Arkansas`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Social share card, used for every page unless a page provides its own.
export default function OpengraphImage() {
  const core = serviceAreas.filter((a) => a.core).map((a) => a.name);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#0f172a", color: "#f8fafc", position: "relative" }}>
        <svg width="1200" height="630" viewBox="0 0 1200 630" style={{ position: "absolute", top: 0, left: 0 }}>
          {Array.from({ length: 14 }, (_, i) => (
            <path key={i} d={`M0 ${40 + i * 36} L180 ${22 + i * 36} L300 ${32 + i * 36} L450 ${14 + i * 36} L630 ${30 + i * 36} L780 ${20 + i * 36} L960 ${36 + i * 36} L1080 ${24 + i * 36} L1200 ${40 + i * 36}`} fill="none" stroke="#f8fafc" strokeOpacity="0.08" strokeWidth="2" />
          ))}
          <path d="M600 630 L600 470 L760 380 L860 430 L990 330 L1100 410 L1200 370 L1200 630 Z" fill="#1e293b" />
        </svg>
        <div style={{ display: "flex", flexDirection: "column", padding: "72px 80px", flex: 1, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <svg width="64" height="64" viewBox="0 0 32 32">
              <path d="M2 17 L11 7 L16 12 L21 6 L30 17 Z" fill="#f8fafc" />
              <rect x="2" y="20" width="28" height="10" rx="2" fill="#d97706" />
            </svg>
            <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>{site.name}</span>
          </div>
          <div style={{ display: "flex", marginTop: 64, fontSize: 76, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2, maxWidth: 820 }}>
            Reliable NWA home repairs, done right.
          </div>
          <div style={{ display: "flex", marginTop: "auto", fontSize: 30, color: "#cbd5e1" }}>{core.join(", ")}</div>
        </div>
        <div style={{ display: "flex", height: 18, background: "#d97706" }} />
      </div>
    ),
    size,
  );
}
