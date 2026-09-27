import type { Metadata } from "next";
import { Archivo } from "next/font/google";
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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title: {
    default: `${brand.name} | Home repair in Northwest Arkansas`,
    template: `%s | ${brand.name}`,
  },
  description:
    "Hill & Stone (Hillstone) Home Company: licensed and insured minor home repair, carpentry, drywall, painting and exterior work in Fayetteville, Springdale, Rogers and Bentonville.",
  // Images come from app/opengraph-image.tsx; pages inherit these unless they override.
  openGraph: {
    type: "website",
    siteName: brand.name,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Business settings for client components; server components call getSite() directly.
  const site = await getSite();
  return (
    <html lang="en" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteProvider value={site}>{children}</SiteProvider>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
