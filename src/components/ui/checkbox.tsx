import { cn } from "@/lib/utils";

export function Checkbox({ id, label, hint, className, ...props }: React.ComponentProps<"input"> & { id: string; label: string; hint?: string }) {
  return (
    <div className={cn("flex gap-3", className)}>
      <input id={id} type="checkbox" className="mt-0.5 size-5 shrink-0 cursor-pointer accent-navy-950" aria-describedby={hint ? `${id}-hint` : undefined} {...props} />
      <div>
        <label htmlFor={id} className="cursor-pointer font-semibold">
          {label}
        </label>
        {hint && (
          <p id={`${id}-hint`} className="text-sm text-navy-600">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
