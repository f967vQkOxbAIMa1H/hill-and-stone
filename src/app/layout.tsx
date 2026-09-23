import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { site } from "@/lib/site";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: `${site.name} | Home repair in Northwest Arkansas`,
    template: `%s | ${site.name}`,
  },
  description:
    "Licensed and insured home repair, carpentry, drywall, painting and exterior work in Fayetteville, Springdale, Rogers and Bentonville.",
  // Images come from app/opengraph-image.tsx; pages inherit these unless they override.
  openGraph: {
    type: "website",
    siteName: site.name,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
