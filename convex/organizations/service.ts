import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireIdentity, requireMembership } from "../shared/authorization";
import * as repository from "./repository";

export async function currentDemo(ctx: QueryCtx) {
  const identity = await requireIdentity(ctx);
  const organization = await repository.findPersonalDemo(ctx, identity.subject);
  if (!organization) return null;
  await requireMembership(ctx, organization._id);
  return {
    id: organization._id,
    name: organization.name,
    mode: organization.mode,
    generation: organization.generation,
    seeded: organization.seededGeneration === organization.generation,
  };
}

export async function createDemo(ctx: MutationCtx) {
  const identity = await requireIdentity(ctx);
  const existing = await repository.findPersonalDemo(ctx, identity.subject);
  if (existing) {
    await requireMembership(ctx, existing._id);
    return existing._id;
  }
  return repository.insertPersonalDemo(ctx, identity.subject);
}
