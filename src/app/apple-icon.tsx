import { ImageResponse } from "next/og";
import { MARK_PATH, MARK_RATIO, MARK_VIEWBOX } from "@/components/brand/LogoMark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon: the navy mark on cream. iOS rounds the corners itself.
export default function AppleIcon() {
  const w = 128;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4f2ed" }}>
        <svg width={w} height={Math.round(w / MARK_RATIO)} viewBox={MARK_VIEWBOX}>
          <path fill="#10243a" fillRule="evenodd" d={MARK_PATH} />
        </svg>
      </div>
    ),
    size,
  );
}
