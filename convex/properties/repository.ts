import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export function listBuildings(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
) {
  return ctx.db
    .query("buildings")
    .withIndex("by_organization_archived", (q) =>
      q.eq("organizationId", organizationId).eq("archived", false),
    )
    .order("desc")
    .take(25);
}

export function insertBuilding(
  ctx: MutationCtx,
  input: {
    organizationId: Id<"organizations">;
    generation: number;
    name: string;
    address: string;
    createdBy: string;
  },
) {
  return ctx.db.insert("buildings", { ...input, archived: false });
}
