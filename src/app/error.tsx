"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-lg flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-xl font-medium">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">{error.message || "The page could not be shown."}</p>
      <Button className="w-fit" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
