"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="px-5 py-16 sm:px-8">
      <h1 className="font-semiwide text-2xl font-bold">This page didn&apos;t load</h1>
      <p className="mt-2 max-w-[60ch] text-navy-600">
        The server hit an error. Nothing you entered was lost unless you saw a save fail. Try again; if it keeps happening, note
        the reference below.
      </p>
      {error.digest && <p className="mt-2 text-sm text-navy-600">Reference {error.digest}</p>}
      <Button className="mt-6" variant="dark" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  );
}
