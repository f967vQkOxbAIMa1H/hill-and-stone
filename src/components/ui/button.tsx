import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Copper buttons always carry navy text: white on #D97706 fails WCAG AA.
export const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-control font-semibold whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[1.1em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-copper-500 text-navy-950 hover:bg-copper-400 active:bg-copper-500",
        dark: "bg-navy-950 text-stone-50 hover:bg-navy-800",
        outline: "border border-navy-950/20 bg-transparent text-navy-950 hover:border-navy-950 hover:bg-white",
        "outline-light": "border border-stone-50/30 bg-transparent text-stone-50 hover:border-stone-50 hover:bg-white/5",
        ghost: "text-navy-950 hover:bg-navy-950/5",
        danger: "bg-danger-700 text-white hover:bg-danger-700/90",
      },
      size: {
        sm: "h-9 px-3.5 text-sm",
        md: "h-11 px-5 text-base",
        lg: "h-14 px-7 text-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonVariants = VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: React.ComponentProps<"button"> & ButtonVariants) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export function ButtonLink({ className, variant, size, ...props }: React.ComponentProps<typeof Link> & ButtonVariants) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
