"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-24 text-center">
      <h1 className="text-xl font-medium">Something broke</h1>
      <p className="text-sm text-fog">The board could not be loaded.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
