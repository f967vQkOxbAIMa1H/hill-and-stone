import type { Metadata } from "next";
import { ErrorScreen } from "@/components/site/error-screen";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="flex-1">
        <ErrorScreen
          title="We can't find that page"
          lede="The link may be old, or the address may have a typo. Everything we do is still a click away."
        />
      </main>
      <Footer />
    </>
  );
}
