import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { audit } from "../maintenance/repository";

export async function processDemoOperation(
  ctx: MutationCtx,
  args: { operationId: Id<"operations"> },
): Promise<null> {
  const operation = await ctx.db.get(args.operationId);
  if (!operation || !["queued", "retrying"].includes(operation.status))
    return null;
  const organization = await ctx.db.get(operation.organizationId);
  const record = await ctx.db.get(operation.caseId);
  const proposal = await ctx.db.get(operation.proposalId);
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user_organization", (q) =>
      q
        .eq("userSubject", operation.approvedBy)
        .eq("organizationId", operation.organizationId),
    )
    .unique();
  if (
    !organization ||
    organization.mode !== "demo" ||
    organization.generation !== operation.generation ||
    !record ||
    record.organizationId !== operation.organizationId ||
    record.generation !== operation.generation ||
    ["resolved", "canceled"].includes(record.status) ||
    !proposal ||
    proposal.organizationId !== operation.organizationId ||
    proposal.generation !== operation.generation ||
    proposal.status !== "approved" ||
    proposal.version !== operation.proposalVersion ||
    !membership
  ) {
    await ctx.db.patch(operation._id, {
      status: "canceled",
      error: "Approval or workspace is no longer valid.",
    });
    if (operation.workOrderId && (await ctx.db.get(operation.workOrderId)))
      await ctx.db.patch(operation.workOrderId, { status: "canceled" });
    return null;
  }
  const attempts = operation.attempts + 1;
  const failed =
    operation.fault === "persistent" ||
    (operation.fault === "transient" && operation.attempts === 0);
  if (failed) {
    if (operation.retryCount < 3) {
      const delay = [5000, 30000, 120000][operation.retryCount];
      const scheduledId = await ctx.scheduler.runAfter(
        delay,
        internal.workflows.demoDelivery.run,
        { operationId: operation._id },
      );
      await ctx.db.patch(operation._id, {
        status: "retrying",
        attempts,
        retryCount: operation.retryCount + 1,
        error: "Simulated temporary delivery failure.",
        scheduledId,
      });
      await audit(
        ctx,
        record,
        "system",
        "Simulated delivery failed; retry " +
          (operation.retryCount + 1) +
          " queued.",
      );
    } else {
      await ctx.db.patch(operation._id, {
        status: "failed",
        attempts,
        error:
          "Simulated delivery failed after four attempts. Manual retry is available.",
      });
      await audit(
        ctx,
        record,
        "system",
        "Automatic retries exhausted. Manual retry clears the simulated fault.",
      );
    }
    return null;
  }
  const existing = await ctx.db
    .query("outbox")
    .withIndex("by_operation", (q) => q.eq("operationId", operation._id))
    .unique();
  if (!existing) {
    await ctx.db.insert("outbox", {
      organizationId: operation.organizationId,
      generation: operation.generation,
      operationId: operation._id,
      caseId: operation.caseId,
      recipient: operation.recipient,
      content: operation.content,
      kind: operation.kind,
    });
    if (operation.kind === "reply")
      await ctx.db.insert("messages", {
        organizationId: operation.organizationId,
        generation: operation.generation,
        caseId: operation.caseId,
        conversationId: record.conversationId,
        direction: "outbound",
        body: operation.content,
        sender: "Simulated property manager",
      });
  }
  await ctx.db.patch(operation._id, {
    status: "succeeded",
    attempts,
    error: undefined,
  });
  if (operation.workOrderId) {
    await ctx.db.patch(operation.workOrderId, { status: "dispatched" });
    const reminderId = await ctx.scheduler.runAfter(
      48 * 60 * 60 * 1000,
      internal.workflows.demoDelivery.remind,
      { workOrderId: operation.workOrderId },
    );
    await ctx.db.patch(operation._id, { reminderId });
  }
  await audit(
    ctx,
    record,
    "system",
    operation.kind === "reply"
      ? "Reply added to the simulated outbox. No external email was sent."
      : "Work order dispatched to the simulated outbox; follow-up due in 48 hours.",
  );
  return null;
}

export const run = internalMutation({
  args: { operationId: v.id("operations") },
  returns: v.null(),
  handler: processDemoOperation,
});
export const remind = internalMutation({
  args: { workOrderId: v.id("workOrders") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const order = await ctx.db.get(args.workOrderId);
    if (!order || order.status !== "dispatched" || order.reminderRaised)
      return null;
    const organization = await ctx.db.get(order.organizationId);
    const record = await ctx.db.get(order.caseId);
    if (
      !organization ||
      organization.mode !== "demo" ||
      organization.generation !== order.generation ||
      !record ||
      record.generation !== order.generation ||
      record.organizationId !== order.organizationId ||
      ["resolved", "canceled"].includes(record.status)
    )
      return null;
    await ctx.db.patch(order._id, { reminderRaised: true });
    await audit(
      ctx,
      record,
      "system",
      "Follow-up reminder: confirm the contractor's progress on this unresolved work order.",
    );
    return null;
  },
});
