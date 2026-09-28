import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export function casesForOrganization(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  generation: number,
) {
  return ctx.db
    .query("maintenanceCases")
    .withIndex("by_org_generation", (q) =>
      q.eq("organizationId", organizationId).eq("generation", generation),
    )
    .order("desc");
}
export function caseById(ctx: QueryCtx, id: Id<"maintenanceCases">) {
  return ctx.db.get(id);
}
export function proposalsForCase(
  ctx: QueryCtx,
  caseId: Id<"maintenanceCases">,
) {
  return ctx.db
    .query("proposals")
    .withIndex("by_case", (q) => q.eq("caseId", caseId))
    .take(10);
}
export function operationsForCase(
  ctx: QueryCtx,
  caseId: Id<"maintenanceCases">,
) {
  return ctx.db
    .query("operations")
    .withIndex("by_case", (q) => q.eq("caseId", caseId))
    .order("desc")
    .take(100);
}
export function eventByKey(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  generation: number,
  eventId: string,
) {
  return ctx.db
    .query("inboundEvents")
    .withIndex("by_event", (q) =>
      q
        .eq("organizationId", organizationId)
        .eq("generation", generation)
        .eq("eventId", eventId),
    )
    .unique();
}
export function operationForVersion(
  ctx: QueryCtx,
  proposalId: Id<"proposals">,
  proposalVersion: number,
) {
  return ctx.db
    .query("operations")
    .withIndex("by_proposal_version", (q) =>
      q.eq("proposalId", proposalId).eq("proposalVersion", proposalVersion),
    )
    .unique();
}
export function patchCase(
  ctx: MutationCtx,
  id: Id<"maintenanceCases">,
  patch: Partial<Omit<Doc<"maintenanceCases">, "_id" | "_creationTime">>,
) {
  return ctx.db.patch(id, patch);
}
export function audit(
  ctx: MutationCtx,
  record: Pick<
    Doc<"maintenanceCases">,
    "_id" | "organizationId" | "generation"
  >,
  actor: string,
  message: string,
) {
  return ctx.db.insert("auditEvents", {
    organizationId: record.organizationId,
    generation: record.generation,
    caseId: record._id,
    actor,
    message,
  });
}
