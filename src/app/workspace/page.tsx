import { isWorkspaceConfigured } from "@/lib/config";
import { Workspace } from "@/features/workspace/workspace";

export default function WorkspacePage() {
  if (!isWorkspaceConfigured())
    return (
      <section className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">
          Your workspace
        </p>
        <h1 className="mt-3 text-2xl font-semibold">
          Connect your development workspace
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          The public preview works without accounts. To create and save your own
          property records, configure Clerk and Convex using the project README
          and environment template.
        </p>
        <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm leading-6">
          <li>
            Copy <code>.env.example</code> to <code>.env.local</code> and
            configure Clerk.
          </li>
          <li>
            Create a Convex development deployment and set the Clerk JWT issuer.
          </li>
          <li>Set the Convex URL, deploy the backend, and restart the app.</li>
        </ol>
        <p className="mt-6 text-xs text-muted-foreground">
          No email or AI credentials are needed for this scaffold.
        </p>
      </section>
    );
  return <Workspace />;
}
