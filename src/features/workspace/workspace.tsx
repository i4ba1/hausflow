"use client";

import { useState } from "react";
import { SignInButton, UserButton } from "@clerk/nextjs";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Building2, Plus } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DemoWorkflow } from "./demo-workflow";

const buildingSchema = z.object({
  name: z.string().trim().min(1, "Enter a property name.").max(120),
  address: z.string().trim().min(1, "Enter an address.").max(300),
});
type BuildingInput = z.infer<typeof buildingSchema>;

function Buildings({
  organizationId,
}: {
  organizationId: Id<"organizations">;
}) {
  const buildings = useQuery(api.properties.controller.list, {
    organizationId,
  });
  const create = useMutation(api.properties.controller.create);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BuildingInput>({ resolver: zodResolver(buildingSchema) });
  async function onSubmit(values: BuildingInput) {
    setError("");
    setNotice("");
    try {
      await create({ organizationId, ...values });
      reset();
      setNotice("Property saved to your workspace.");
    } catch {
      setError(
        "Could not save this property. Check your connection and permissions, then try again.",
      );
    }
  }
  return (
    <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_340px]">
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">Your properties</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          Showing the latest 25 active properties.
        </p>
        {buildings === undefined ? (
          <p className="mt-5 text-sm" role="status">
            Loading properties…
          </p>
        ) : buildings.length === 0 ? (
          <div className="py-12 text-center">
            <Building2 className="mx-auto mb-3 text-primary" />
            <p className="font-medium">A fresh start.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Add your first property to this private workspace.
            </p>
          </div>
        ) : (
          <ul className="mt-5 divide-y divide-border">
            {buildings.map((building) => (
              <li key={building.id} className="py-4">
                <p className="font-medium">{building.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {building.address}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <h2 className="text-lg font-semibold">Add a property</h2>
        <div className="mt-5">
          <label htmlFor="building-name" className="text-sm font-medium">
            Property name
          </label>
          <Input
            id="building-name"
            className="mt-2"
            placeholder="Lindenhof"
            maxLength={120}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
            {...register("name")}
          />
          {errors.name && (
            <p id="name-error" className="mt-2 text-xs text-destructive">
              {errors.name.message}
            </p>
          )}
        </div>
        <div className="mt-4">
          <label htmlFor="building-address" className="text-sm font-medium">
            Address
          </label>
          <Input
            id="building-address"
            className="mt-2"
            placeholder="Lindenstraße 12, Berlin"
            maxLength={300}
            aria-invalid={!!errors.address}
            aria-describedby={errors.address ? "address-error" : undefined}
            {...register("address")}
          />
          {errors.address && (
            <p id="address-error" className="mt-2 text-xs text-destructive">
              {errors.address.message}
            </p>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <p role="status" className="mt-4 text-sm text-primary">
          {notice}
        </p>
        <Button className="mt-4 w-full" type="submit" disabled={isSubmitting}>
          <Plus />
          {isSubmitting ? "Saving…" : "Save property"}
        </Button>
      </form>
    </div>
  );
}

function WorkspaceContent() {
  const organization = useQuery(api.organizations.controller.currentDemo, {});
  const create = useMutation(api.organizations.controller.createDemo);
  const initialize = useMutation(api.demo.controller.initialize);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function createWorkspace() {
    setPending(true);
    setError("");
    try {
      await create({});
    } catch {
      setError("Could not create your workspace. Please try again.");
    } finally {
      setPending(false);
    }
  }
  async function loadSampleData(organizationId: Id<"organizations">) {
    setPending(true);
    setError("");
    try {
      await initialize({ organizationId });
    } catch {
      setError(
        "Could not load the sample data. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }
  if (organization === undefined)
    return <p role="status">Loading your workspace…</p>;
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-primary uppercase">
            Personal demo workspace
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            {organization?.name ?? "Make room for better property care."}
          </h1>
        </div>
        <UserButton />
      </div>
      {organization ? (
        <>
          <p className="mt-3 text-sm text-muted-foreground">
            Records are stored in Convex and scoped to your organization. Email
            delivery and assistant suggestions are simulated.
          </p>
          {!organization.seeded && (
            <section className="mt-7 rounded-2xl border border-primary/20 bg-accent/40 p-6">
              <h2 className="text-lg font-semibold">
                Load a sample property portfolio
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Add two buildings, four units, tenants, contractors,
                instructions, and a prior heating repair to explore the
                maintenance workflow.
              </p>
              <Button
                className="mt-4"
                disabled={pending}
                onClick={() => loadSampleData(organization.id)}
              >
                {pending ? "Loading…" : "Load sample data"}
              </Button>
              {error && (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {error}
                </p>
              )}
            </section>
          )}
          {organization.seeded && (
            <DemoWorkflow
              organizationId={organization.id}
              generation={organization.generation}
              onReset={() => {}}
            />
          )}
          <Buildings organizationId={organization.id} />
        </>
      ) : (
        <section className="mt-8 max-w-2xl rounded-2xl border border-border bg-card p-7">
          <h2 className="text-lg font-semibold">
            Create your personal demo workspace
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Start with an empty organization and add synthetic property records.
            Only you have access initially.
          </p>
          <Button className="mt-5" onClick={createWorkspace} disabled={pending}>
            {pending ? "Creating…" : "Create workspace"}
          </Button>
          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}
        </section>
      )}
    </>
  );
}

export function Workspace() {
  return (
    <>
      <AuthLoading>
        <p role="status">Checking your session…</p>
      </AuthLoading>
      <Unauthenticated>
        <section className="mx-auto max-w-xl rounded-2xl border border-border bg-card p-8">
          <h1 className="text-2xl font-semibold">
            Your property workspace awaits.
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Sign in to create an isolated workspace and save your own property
            records.
          </p>
          <SignInButton mode="modal">
            <Button className="mt-6">Sign in to continue</Button>
          </SignInButton>
        </section>
      </Unauthenticated>
      <Authenticated>
        <WorkspaceContent />
      </Authenticated>
    </>
  );
}
