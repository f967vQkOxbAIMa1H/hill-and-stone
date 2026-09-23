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
