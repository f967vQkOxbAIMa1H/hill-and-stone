import { cn } from "@/lib/utils";

/** Radio group styled as tiles. Native radios keep arrow-key navigation and form semantics. */
export function RadioTiles<T extends string>({
  name,
  legend,
  hint,
  error,
  options,
  value,
  onChange,
  columns = "sm:grid-cols-3",
}: {
  name: string;
  legend: string;
  hint?: string;
  error?: string;
  options: { value: T; label: string; description?: string }[];
  value: T | "";
  onChange: (value: T) => void;
  columns?: string;
}) {
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;
  return (
    <fieldset aria-describedby={describedBy} aria-invalid={error ? true : undefined}>
      <legend className="text-sm font-semibold">{legend}</legend>
      {hint && !error && (
        <p id={`${name}-hint`} className="mt-1 text-sm text-navy-600">
          {hint}
        </p>
      )}
      <div className={cn("mt-2 grid grid-cols-1 gap-2", columns)}>
        {options.map((o, i) => (
          <label
            key={o.value}
            className={cn(
              "relative flex min-h-11 cursor-pointer items-center rounded-control border bg-white px-3.5 py-2.5 transition-colors",
              "has-[:checked]:border-navy-950 has-[:checked]:bg-navy-950 has-[:checked]:text-stone-50",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-copper-500",
              error ? "border-danger-700" : "border-navy-300 hover:border-navy-600",
            )}
          >
            <input
              type="radio"
              name={name}
              id={i === 0 ? name : undefined}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span>
              <span className="block font-medium">{o.label}</span>
              {o.description && <span className="block text-sm opacity-80">{o.description}</span>}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={`${name}-error`} role="alert" className="mt-1.5 text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
    </fieldset>
  );
}
