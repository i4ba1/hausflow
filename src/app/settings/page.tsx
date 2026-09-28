import { isWorkspaceConfigured } from "@/lib/config";
export default function SettingsPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">
        Workspace settings
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Connection readiness for this scaffold. Secret values are never
        displayed.
      </p>
      <section className="mt-8 max-w-2xl rounded-2xl border border-border bg-card p-6">
        <h2 className="font-semibold">Service configuration</h2>
        <dl className="mt-5 space-y-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt>Clerk and Convex public configuration</dt>
            <dd className="font-medium">
              {isWorkspaceConfigured()
                ? "Provided — verify connection"
                : "Not configured"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Email and AI</dt>
            <dd className="text-muted-foreground">Phase 2 · not connected</dd>
          </div>
        </dl>
        <p className="mt-6 border-t border-border pt-5 text-sm leading-6 text-muted-foreground">
          Follow the README to configure your development workspace. Membership
          management, integration controls, and demo reset will be added during
          the planned delivery phases.
        </p>
      </section>
    </>
  );
}
