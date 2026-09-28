import Link from "next/link";
import { ArrowRight, CircleDashed } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PhasePage({
  title,
  description,
  phase,
  items,
}: {
  title: string;
  description: string;
  phase: string;
  items: readonly string[];
}) {
  return (
    <>
      <p className="text-xs font-semibold tracking-widest text-primary uppercase">
        {phase}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      <section className="mt-8 max-w-3xl rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold">What comes next</h2>
        <ul className="mt-5 space-y-4">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 text-sm text-muted-foreground"
            >
              <CircleDashed
                size={18}
                className="mt-0.5 shrink-0 text-primary"
              />
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-6 border-t border-border pt-5 text-xs text-muted-foreground">
          These capabilities are planned, not yet implemented.
        </p>
      </section>
      <Button className="mt-6" variant="outline" asChild>
        <Link href="/workspace">
          Open scaffold workspace
          <ArrowRight />
        </Link>
      </Button>
    </>
  );
}
