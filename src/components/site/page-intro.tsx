import { Container } from "@/components/ui/container";
import { Heading, Lede } from "@/components/ui/heading";

export function PageIntro({ title, lede, children }: { title: string; lede: string; children?: React.ReactNode }) {
  return (
    <section className="border-b border-navy-200">
      <Container className="py-16 sm:py-20">
        <Heading as="h1" level="page" className="max-w-[18ch]">
          {title}
        </Heading>
        <Lede className="mt-5">{lede}</Lede>
        {children}
      </Container>
    </section>
  );
}
