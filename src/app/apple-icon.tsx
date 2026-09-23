import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon: the logo mark on navy.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a" }}>
        <svg width="132" height="132" viewBox="0 0 32 32">
          <path d="M2 17 L11 7 L16 12 L21 6 L30 17 Z" fill="#f8fafc" />
          <rect x="2" y="20" width="28" height="10" rx="2" fill="#d97706" />
        </svg>
      </div>
    ),
    size,
  );
}
