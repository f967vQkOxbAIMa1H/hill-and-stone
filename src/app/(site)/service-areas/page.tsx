import type { Metadata } from "next";
import { CtaBand } from "@/components/site/cta-band";
import { PageIntro } from "@/components/site/page-intro";
import { ServiceAreaMap } from "@/components/site/service-area-map";
import { ZipCheck } from "@/components/site/zip-check";
import { Container } from "@/components/ui/container";
import { serviceAreas } from "@/lib/site";

export const metadata: Metadata = {
  title: "Service areas",
  description:
    "Hill & Stone serves Fayetteville, Springdale, Rogers, Bentonville, Bella Vista, Lowell, Centerton, Farmington and nearby towns in Benton and Washington counties.",
};

export default function ServiceAreasPage() {
  return (
    <>
      <PageIntro
        title="Where we work"
        lede="We work along the I-49 corridor, from Fayetteville north to Bella Vista, and in the towns on either side. Staying close keeps drive time off your bill and lets us come back quickly for warranty work."
      >
        <ZipCheck areas={serviceAreas} />
      </PageIntro>

      <Container className="py-16 lg:py-20">
        <ServiceAreaMap areas={serviceAreas} />
      </Container>

      <CtaBand
        title="In the area? Let's look at your project."
        body="Send photos and a short description through the quote form. If you're just past the edge of our map, ask anyway."
      />
    </>
  );
}
