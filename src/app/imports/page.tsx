import { isWorkspaceConfigured } from "@/lib/config";
import { ImportWorkspace } from "@/features/imports/import-workspace";
export default function ImportsPage() {
  if (isWorkspaceConfigured()) return <ImportWorkspace />;
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8">
      <p className="text-xs font-semibold tracking-widest text-primary uppercase">
        CSV migration
      </p>
      <h1 className="mt-3 text-3xl font-semibold">
        Bring your property records along.
      </h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        The connected workspace imports buildings, units, and tenants from CSV.
        Configure Clerk and Convex using the README to upload a file, preview
        row errors, and confirm valid records.
      </p>
    </section>
  );
}
