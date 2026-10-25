import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Headlines are Newsreader (editorial serif with a true italic); body and UI stay Archivo.
// A second line in <em> sets in serif italic: "Thoughtful repairs. <em>Properly finished.</em>"
const headingVariants = cva("font-serif tracking-[-0.015em] text-balance [&_em]:italic", {
  variants: {
    level: {
      display: "text-[2.625rem] leading-[1.02] font-normal sm:text-5xl lg:text-6xl",
      page: "text-4xl leading-[1.05] font-normal sm:text-5xl",
      section: "text-3xl leading-[1.1] font-normal sm:text-4xl",
      sub: "text-xl leading-snug font-medium sm:text-2xl",
    },
  },
  defaultVariants: { level: "section" },
});

type HeadingProps = React.ComponentProps<"h2"> &
  VariantProps<typeof headingVariants> & { as?: "h1" | "h2" | "h3" | "h4" };

export function Heading({ as: Tag = "h2", level, className, ...props }: HeadingProps) {
  return <Tag className={cn(headingVariants({ level }), className)} {...props} />;
}

export function Lede({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("max-w-[60ch] text-lg text-navy-600", className)} {...props} />;
}
