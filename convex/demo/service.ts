import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { requireMembership } from "../shared/authorization";
import { seedDemo } from "./seed";

export async function initialize(
  ctx: MutationCtx,
  args: { organizationId: Id<"organizations"> },
): Promise<null> {
  const { organization, identity } = await requireMembership(
    ctx,
    args.organizationId,
    "owner",
  );
  if (organization.mode !== "demo")
    throw new ConvexError("Only demo workspaces can load sample data.");
  if (organization.seededGeneration === organization.generation) return null;
  await seedDemo(
    ctx,
    organization._id,
    organization.generation,
    identity.subject,
  );
  await ctx.db.patch(organization._id, {
    seededGeneration: organization.generation,
  });
  return null;
}

export async function reset(
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    expectedGeneration: number;
    confirmation: string;
  },
): Promise<null> {
  const { organization, identity } = await requireMembership(
    ctx,
    args.organizationId,
    "owner",
  );
  if (
    organization.mode !== "demo" ||
    organization.ownerSubject !== identity.subject
  )
    throw new ConvexError("Only your own demo can be reset.");
  if (args.confirmation !== "RESET")
    throw new ConvexError("Type RESET to confirm.");
  if (organization.generation !== args.expectedGeneration)
    throw new ConvexError(
      "The workspace was already reset. Reload before trying again.",
    );
  const generation = organization.generation + 1;
  await ctx.db.patch(organization._id, {
    generation,
    seededGeneration: generation,
  });
  await seedDemo(ctx, organization._id, generation, identity.subject);
  await ctx.scheduler.runAfter(0, internal.demo.cleanup.run, {
    organizationId: organization._id,
    generation: organization.generation,
    tableIndex: 0,
  });
  return null;
}
