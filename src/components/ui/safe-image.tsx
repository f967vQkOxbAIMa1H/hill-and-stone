"use client";

import { ImageOff } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/** A plain <img> that swaps to a tidy placeholder if the file is missing or can't be decoded. */
export function SafeImage({
  src,
  alt,
  className,
  fallbackLabel = "Photo unavailable",
  ...rest
}: React.ComponentProps<"img"> & { src: string; alt: string; fallbackLabel?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span role="img" aria-label={`${alt} (${fallbackLabel.toLowerCase()})`} className={cn("flex flex-col items-center justify-center gap-1 bg-stone-100 text-navy-600", className)}>
        <ImageOff aria-hidden className="size-5" />
        <span className="text-xs font-medium">{fallbackLabel}</span>
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- private or blob sources that next/image can't optimize
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} {...rest} />;
}
