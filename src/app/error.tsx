"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section
      role="alert"
      className="rounded-2xl border border-border bg-card p-8"
    >
      <h1 className="text-xl font-semibold">We could not load this view.</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Check your connection and workspace configuration, then try again.
      </p>
      <Button className="mt-5" onClick={reset}>
        Try again
      </Button>
    </section>
  );
}
