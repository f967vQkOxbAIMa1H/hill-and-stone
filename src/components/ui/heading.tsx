import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Wide widths carry the brand voice; body-level headings stay at normal width.
const headingVariants = cva("tracking-[-0.01em] text-balance", {
  variants: {
    level: {
      display: "font-wide text-4xl leading-none font-extrabold sm:text-5xl lg:text-6xl",
      page: "font-wide text-3xl font-extrabold sm:text-4xl lg:text-5xl",
      section: "font-semiwide text-2xl font-bold sm:text-3xl",
      sub: "text-xl font-bold sm:text-2xl",
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
