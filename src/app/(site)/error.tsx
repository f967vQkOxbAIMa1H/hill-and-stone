"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/site/error-screen";
import { Button } from "@/components/ui/button";

// Renders inside the site layout, so the header and footer stay put.
export default function SiteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <ErrorScreen
      title="This page didn't load"
      lede={`Something went wrong on our end, not yours. Try again, or call us and we'll help directly.${error.digest ? ` (Reference ${error.digest})` : ""}`}
      action={
        <Button size="lg" onClick={() => retry()}>
          Try again
        </Button>
      }
    />
  );
}
