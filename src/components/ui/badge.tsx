import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1.5 rounded-control px-2 py-0.5 text-sm font-semibold", {
  variants: {
    tone: {
      neutral: "bg-navy-200 text-navy-900",
      copper: "bg-copper-100 text-copper-700",
      success: "bg-success-100 text-success-700",
      danger: "bg-danger-100 text-danger-700",
      dark: "bg-navy-900 text-stone-50",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
