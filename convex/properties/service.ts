import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireMembership } from "../shared/authorization";
import * as repository from "./repository";

export async function listBuildings(
  ctx: QueryCtx,
  args: { organizationId: Id<"organizations"> },
) {
  const { organization } = await requireMembership(ctx, args.organizationId);
  const buildings = await repository.listBuildings(ctx, args.organizationId);
  return buildings
    .filter(
      (building) =>
        building.generation === organization.generation ||
        (organization.generation === 1 && building.generation === undefined),
    )
    .map((building) => ({
      id: building._id,
      name: building.name,
      address: building.address,
    }));
}

export async function createBuilding(
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    name: string;
    address: string;
  },
) {
  const { identity, organization } = await requireMembership(
    ctx,
    args.organizationId,
    "owner",
  );
  const name = args.name.trim();
  const address = args.address.trim();
  if (!name || name.length > 120 || !address || address.length > 300) {
    throw new ConvexError({
      code: "INVALID_INPUT",
      message:
        "Provide a name (1–120 characters) and address (1–300 characters).",
    });
  }
  return repository.insertBuilding(ctx, {
    ...args,
    generation: organization.generation,
    name,
    address,
    createdBy: identity.subject,
  });
}
