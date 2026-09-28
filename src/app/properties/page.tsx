import Link from "next/link";
import { Building2, ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PropertiesPage() {
  return (
    <>
      <p className="text-xs font-semibold tracking-widest text-primary uppercase">
        Property context
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        Know the place behind the request.
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Synthetic properties from the inbox preview. Your connected workspace
        stores its own records.
      </p>
      <div className="mt-8 grid max-w-4xl gap-5 sm:grid-cols-2">
        {[
          {
            name: "Lindenhof",
            address: "Lindenstraße 12, Berlin",
            units: "Units 04 and 12",
            requests: 2,
          },
          {
            name: "Parkallee",
            address: "Parkallee 8, Berlin",
            units: "Units 01 and 02",
            requests: 1,
          },
        ].map((property) => (
          <article
            key={property.name}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <div className="mb-6 grid h-28 place-items-center rounded-xl bg-accent">
              <Building2 size={42} strokeWidth={1} className="text-primary" />
            </div>
            <h2 className="text-lg font-semibold">{property.name}</h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin size={14} />
              {property.address}
            </p>
            <div className="mt-5 flex justify-between border-t border-border pt-4 text-xs text-muted-foreground">
              <span>{property.units}</span>
              <span>{property.requests} sample requests</span>
            </div>
          </article>
        ))}
      </div>
      <Button className="mt-7" asChild>
        <Link href="/workspace">
          Manage your own properties
          <ArrowRight />
        </Link>
      </Button>
    </>
  );
}
