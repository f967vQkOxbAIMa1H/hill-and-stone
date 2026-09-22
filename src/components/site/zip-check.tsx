"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { quoteHref, site, type ServiceArea } from "@/lib/site";

type Result = { tone: "yes" | "maybe" | "no"; message: string } | null;

export function ZipCheck({ areas }: { areas: ServiceArea[] }) {
  const id = useId();
  const [zip, setZip] = useState("");
  const [result, setResult] = useState<Result>(null);

  function check(e: React.FormEvent) {
    e.preventDefault();
    const value = zip.trim();
    if (!/^\d{5}$/.test(value)) {
      setResult({ tone: "no", message: "Enter a 5-digit ZIP code, like 72712." });
      return;
    }
    const match = areas.find((a) => a.zips.includes(value));
    if (match) {
      setResult({
        tone: "yes",
        message: `Yes, ${value} is ${match.name}. ${match.core ? "That's one of our primary areas." : "We work there regularly."}`,
      });
    } else if (value.startsWith("727")) {
      setResult({
        tone: "maybe",
        message: `${value} is in Northwest Arkansas but not on our list yet. Send a quote request or call and we'll confirm.`,
      });
    } else {
      setResult({ tone: "no", message: `${value} is outside the area we cover. We work in Benton and Washington counties only.` });
    }
  }

  return (
    <form onSubmit={check} className="mt-8 max-w-md" noValidate>
      <label htmlFor={id} className="text-sm font-semibold">
        Check your ZIP code
      </label>
      <div className="mt-1.5 flex gap-2">
        <Input
          id={id}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          placeholder="72712"
          value={zip}
          onChange={(e) => {
            setZip(e.target.value.replace(/\D/g, ""));
            setResult(null);
          }}
          aria-describedby={`${id}-result`}
          className="w-36"
        />
        <Button type="submit" variant="dark">
          Check
        </Button>
      </div>
      <p id={`${id}-result`} aria-live="polite" className="mt-3 min-h-6">
        {result && (
          <span className={result.tone === "yes" ? "font-semibold text-success-700" : result.tone === "maybe" ? "text-navy-950" : "text-danger-700"}>
            {result.message}{" "}
            {result.tone !== "no" && (
              <Link href={quoteHref} className="font-semibold whitespace-nowrap text-copper-700 underline underline-offset-4">
                Request a quote
              </Link>
            )}
            {result.tone === "maybe" && (
              <>
                {" or call "}
                <a href={site.phoneHref} className="font-semibold whitespace-nowrap text-copper-700 underline underline-offset-4">
                  {site.phone}
                </a>
              </>
            )}
          </span>
        )}
      </p>
    </form>
  );
}
