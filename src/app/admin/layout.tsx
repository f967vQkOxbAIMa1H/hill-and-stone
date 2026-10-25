import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Hill & Stone admin" },
  robots: { index: false, follow: false },
  // "Add to Home Screen" on an iPhone opens the admin full screen, like an app.
  appleWebApp: { capable: true, title: "H&S Admin", statusBarStyle: "black" },
};

// Navy browser chrome on phones to match the admin bars; cover lets the tab bar sit on the home indicator's safe area.
export const viewport: Viewport = { themeColor: "#10243a", viewportFit: "cover" };

export default function AdminRoot({ children }: LayoutProps<"/admin">) {
  return children;
}
