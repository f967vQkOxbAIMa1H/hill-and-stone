"use client";

import { CheckCircle2, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { describedBy, Field, Input, Textarea } from "@/components/ui/field";
import { track } from "@/lib/analytics";
import { flattenErrors } from "@/lib/quote-request/schema";
import { reviewSubmissionSchema } from "@/lib/reviews";
import { cn } from "@/lib/utils";

type Values = { rating: number; body: string; authorName: string; city: string; email: string };
type Errors = Partial<Record<keyof Values | "form", string>>;

const ratingWords = ["", "Poor", "Fair", "Okay", "Good", "Excellent"];

export function ReviewForm({ ownerName }: { ownerName: string | null }) {
  const router = useRouter();
  const [values, setValues] = useState<Values>({ rating: 0, body: "", authorName: "", city: "", email: "" });
  const [hover, setHover] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<"idle" | "sending" | { published: boolean }>("idle");

  const set = <K extends keyof Values>(k: K, v: Values[K]) => {
    setValues((prev) => ({ ...prev, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined, form: undefined }));
  };
  const err = (k: keyof Errors) => errors[k];

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = reviewSubmissionSchema.safeParse(values);
    if (!parsed.success) {
      const errs = flattenErrors(parsed.error) as Errors;
      setErrors(errs);
      const first = Object.keys(errs)[0];
      document.getElementById(first === "rating" ? "review-rating-1" : `review-${first}`)?.focus();
      return;
    }
    setState("sending");
    const website_url_hp = (e.currentTarget.elements.namedItem("website_url_hp") as HTMLInputElement).value;
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, website_url_hp }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw data.errors ?? {};
      track("review_submitted", { rating: values.rating });
      setState({ published: !!data.published });
      if (data.published) router.refresh();
    } catch (errs) {
      setErrors({ form: "Your review didn't send. Check your connection and try again.", ...(errs as Errors) });
      setState("idle");
    }
  }

  if (typeof state === "object") {
    return (
      <div role="status" className="flex gap-3 rounded-panel border border-navy-200 bg-white p-6">
        <CheckCircle2 aria-hidden className="size-6 shrink-0 text-success-700" />
        <div>
          {state.published ? (
            <>
              <p className="font-bold">Thanks, {values.authorName.split(" ")[0]}. Your review is posted.</p>
              <p className="mt-1 text-navy-600">It helps neighbors find someone they can trust with their house.</p>
            </>
          ) : (
            <>
              <p className="font-bold">Thanks for telling us, {values.authorName.split(" ")[0]}.</p>
              <p className="mt-1 text-navy-600">
                Your feedback went straight to {ownerName ?? "the owner"}, who will reach out at {values.email} to make it right.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  const shown = hover || values.rating;

  return (
    <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
      <div aria-hidden className="absolute -left-[9999px]">
        <input name="website_url_hp" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset className="sm:col-span-2" aria-describedby={err("rating") ? "review-rating-error" : undefined}>
        <legend className="text-sm font-semibold text-navy-950">Your rating</legend>
        <div className="mt-1.5 flex items-center gap-3">
          <div
            className="flex rounded-control has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-copper-500"
            onMouseLeave={() => setHover(0)}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n} className="cursor-pointer p-1" onMouseEnter={() => setHover(n)}>
                <input
                  id={`review-rating-${n}`}
                  type="radio"
                  name="rating"
                  value={n}
                  checked={values.rating === n}
                  onChange={() => set("rating", n)}
                  className="sr-only"
                />
                <Star aria-hidden className={cn("size-8 transition-colors", n <= shown ? "fill-copper-500 text-copper-500" : "text-navy-300")} />
                <span className="sr-only">
                  {n} star{n === 1 ? "" : "s"}, {ratingWords[n]}
                </span>
              </label>
            ))}
          </div>
          <span aria-hidden className="min-w-20 text-sm font-semibold text-navy-600">
            {ratingWords[shown]}
          </span>
        </div>
        {err("rating") && (
          <p id="review-rating-error" role="alert" className="mt-1.5 text-sm font-medium text-danger-700">
            {err("rating")}
          </p>
        )}
      </fieldset>

      <Field id="review-body" label="Your review" hint="What we did, and how it went." error={err("body")} className="sm:col-span-2">
        <Textarea
          id="review-body"
          rows={5}
          maxLength={2000}
          value={values.body}
          onChange={(e) => set("body", e.target.value)}
          {...describedBy("review-body", { hint: "What we did, and how it went.", error: err("body") })}
        />
      </Field>
      <Field id="review-authorName" label="Name to show" hint="First name and last initial is fine." error={err("authorName")}>
        <Input id="review-authorName" autoComplete="name" value={values.authorName} onChange={(e) => set("authorName", e.target.value)} {...describedBy("review-authorName", { hint: "First name and last initial is fine.", error: err("authorName") })} />
      </Field>
      <Field id="review-city" label="Town" error={err("city")}>
        <Input id="review-city" autoComplete="address-level2" placeholder="Fayetteville" value={values.city} onChange={(e) => set("city", e.target.value)} {...describedBy("review-city", { error: err("city") })} />
      </Field>
      <Field id="review-email" label="Email" hint="So we can follow up. Never shown on the site." error={err("email")} className="sm:col-span-2">
        <Input id="review-email" type="email" autoComplete="email" value={values.email} onChange={(e) => set("email", e.target.value)} {...describedBy("review-email", { hint: "So we can follow up. Never shown on the site.", error: err("email") })} />
      </Field>

      <div className="sm:col-span-2">
        {err("form") && (
          <p role="alert" className="mb-4 rounded-control bg-danger-100 px-3 py-2 text-sm font-medium text-danger-700">
            {err("form")}
          </p>
        )}
        <Button type="submit" variant="dark" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Send review"}
        </Button>
        <p className="mt-3 text-sm text-navy-600">By sending, you agree we can show your review, name and town on this site.</p>
      </div>
    </form>
  );
}
