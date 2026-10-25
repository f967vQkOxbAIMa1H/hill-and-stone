import type { Metadata } from "next";
import { Archivo, Newsreader } from "next/font/google";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { SiteProvider } from "@/components/site-provider";
import { getSite } from "@/lib/settings";
import { brand } from "@/lib/site";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

// Headlines. Newsreader over Source Serif 4 and Fraunces: a real drawn italic (the second-line device) and an
// optical-size axis that keeps it calm and low-contrast at headline sizes, where Fraunces turns showy.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: `${brand.fullName} | Home repair in Northwest Arkansas`,
    template: `%s | ${brand.fullName}`,
  },
  description:
    "Hill & Stone Home Solutions: reliable home repair, improvement and property maintenance for homeowners, landlords and property managers in Fayetteville, Springdale, Rogers, Bentonville and surrounding Northwest Arkansas.",
  // Images come from app/opengraph-image.tsx; pages inherit these unless they override.
  openGraph: {
    type: "website",
    siteName: brand.fullName,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Business settings for client components; server components call getSite() directly.
  const site = await getSite();
  return (
    <html lang="en" className={`${archivo.variable} ${newsreader.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteProvider value={site}>{children}</SiteProvider>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
