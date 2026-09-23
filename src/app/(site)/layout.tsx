import { AttributionCapture } from "@/components/site/attribution";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { LocalBusinessJsonLd } from "@/components/site/local-business-jsonld";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <LocalBusinessJsonLd />
      <AttributionCapture />
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}

/**
 * Public pages are cached and rebuilt when the admin saves settings, projects or reviews.
 * The 60-second ceiling is a safety net: if a rebuild that started before a save finishes
 * after it, Next can keep the older page, and this bounds that to a minute.
 */
export const revalidate = 60;
