import { ImageResponse } from "next/og";
import { MARK_PATH, MARK_RATIO, MARK_VIEWBOX } from "@/components/brand/LogoMark";
import { brand as site, serviceAreas } from "@/lib/site";

export const alt = `${site.fullName}: home repair in Northwest Arkansas`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#10243a";
const CREAM = "#f4f2ed";
const SAND = "#e3dacd";
const MUTED = "#4f5d6b";

// Social share card, used for every page unless a page provides its own: the navy mark on cream.
export default function OpengraphImage() {
  const core = serviceAreas.filter((a) => a.core).map((a) => a.name);
  const markW = 150;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: CREAM, color: NAVY }}>
        <div style={{ display: "flex", flexDirection: "column", padding: "72px 80px", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <svg width={markW} height={Math.round(markW / MARK_RATIO)} viewBox={MARK_VIEWBOX}>
              <path fill={NAVY} fillRule="evenodd" d={MARK_PATH} />
            </svg>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: 7 }}>HILL &amp; STONE</span>
              <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: 7, color: MUTED }}>HOME SOLUTIONS</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 72, fontSize: 72, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.5 }}>
            <span>Thoughtful repairs.</span>
            <span style={{ fontStyle: "italic", fontWeight: 400 }}>Properly finished.</span>
          </div>
        </div>
        <div style={{ display: "flex", background: SAND, padding: "26px 80px", fontSize: 26, color: NAVY }}>{core.join(" · ")} &amp; surrounding Northwest Arkansas</div>
      </div>
    ),
    size,
  );
}
