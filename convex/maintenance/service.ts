import { ConvexError } from "convex/values";
import type { PaginationOptions } from "convex/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireMembership } from "../shared/authorization";
import { demoMessages } from "../demo/fixtures";
import * as repository from "./repository";

export async function scopedCase(
  ctx: QueryCtx,
  caseId: Id<"maintenanceCases">,
) {
  const record = await repository.caseById(ctx, caseId);
  if (!record)
    throw new ConvexError({ code: "NOT_FOUND", message: "Case unavailable." });
  const principal = await requireMembership(ctx, record.organizationId);
  if (record.generation !== principal.organization.generation)
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "This case belongs to an earlier demo.",
    });
  return { record, ...principal };
}

async function unitLabel(ctx: QueryCtx, record: Doc<"maintenanceCases">) {
  if (!record.unitId) return "Unit not identified";
  const unit = await ctx.db.get(record.unitId);
  if (
    !unit ||
    unit.organizationId !== record.organizationId ||
    unit.generation !== record.generation
  )
    return "Unit unavailable";
  const building = await ctx.db.get(unit.buildingId);
  if (!building || building.organizationId !== record.organizationId)
    return "Unit unavailable";
  return building.name + " · Unit " + unit.label;
}

export async function listCases(
  ctx: QueryCtx,
  args: {
    organizationId: Id<"organizations">;
    paginationOpts: PaginationOptions;
  },
) {
  const { organization } = await requireMembership(ctx, args.organizationId);
  if (args.paginationOpts.numItems < 1 || args.paginationOpts.numItems > 100)
    throw new ConvexError("Request 1–100 cases at a time.");
  const result = await repository
    .casesForOrganization(ctx, args.organizationId, organization.generation)
    .paginate(args.paginationOpts);
  return {
    ...result,
    page: await Promise.all(
      result.page.map(async (record) => ({
        id: record._id,
        subject: record.subject,
        senderName: record.senderName,
        status: record.status,
        urgency: record.urgency,
        unitLabel: await unitLabel(ctx, record),
        createdAt: record._creationTime,
      })),
    ),
  };
}

export async function detail(
  ctx: QueryCtx,
  args: { caseId: Id<"maintenanceCases"> },
) {
  const { record } = await scopedCase(ctx, args.caseId);
  const [messages, proposals, operations, orders, timeline, outbox] =
    await Promise.all([
      ctx.db
        .query("messages")
        .withIndex("by_case", (q) => q.eq("caseId", record._id))
        .order("desc")
        .take(50),
      repository.proposalsForCase(ctx, record._id),
      repository.operationsForCase(ctx, record._id),
      ctx.db
        .query("workOrders")
        .withIndex("by_case", (q) => q.eq("caseId", record._id))
        .order("desc")
        .take(25),
      ctx.db
        .query("auditEvents")
        .withIndex("by_case", (q) => q.eq("caseId", record._id))
        .order("desc")
        .take(50),
      ctx.db
        .query("outbox")
        .withIndex("by_case", (q) => q.eq("caseId", record._id))
        .order("desc")
        .take(25),
    ]);
  return {
    id: record._id,
    organizationId: record.organizationId,
    subject: record.subject,
    senderName: record.senderName,
    status: record.status,
    urgency: record.urgency,
    unitLabel: await unitLabel(ctx, record),
    createdAt: record._creationTime,
    unitId: record.unitId,
    summary: record.summary,
    missingInformation: record.missingInformation,
    sources: record.sources,
    revision: record.revision,
    assignee: record.assignee,
    resolutionNote: record.resolutionNote,
    messages: messages.reverse().map((m) => ({
      id: m._id,
      direction: m.direction,
      body: m.body,
      sender: m.sender,
    })),
    proposals: proposals.map((p) => ({
      id: p._id,
      kind: p.kind,
      content: p.content,
      version: p.version,
      status: p.status,
    })),
    operations: operations.map((o) => ({
      id: o._id,
      kind: o.kind,
      status: o.status,
      attempts: o.attempts,
      error: o.error,
      recipient: o.recipient,
    })),
    workOrders: await Promise.all(
      orders.map(async (o) => {
        const contractor = await ctx.db.get(o.contractorId);
        return {
          id: o._id,
          contractorName:
            contractor?.organizationId === record.organizationId
              ? contractor.name
              : "Contractor unavailable",
          description: o.description,
          status: o.status,
          reminderRaised: o.reminderRaised,
        };
      }),
    ),
    timeline: timeline
      .reverse()
      .map((a) => ({ id: a._id, message: a.message, at: a._creationTime })),
    outbox: outbox.map((o) => ({
      id: o._id,
      recipient: o.recipient,
      content: o.content,
      kind: o.kind,
    })),
  };
}

export async function references(
  ctx: QueryCtx,
  args: { organizationId: Id<"organizations"> },
) {
  const { organization } = await requireMembership(ctx, args.organizationId);
  const units = await ctx.db
    .query("units")
    .withIndex("by_org_generation", (q) =>
      q
        .eq("organizationId", args.organizationId)
        .eq("generation", organization.generation),
    )
    .take(100);
  const contractors = await ctx.db
    .query("contractors")
    .withIndex("by_org_generation", (q) =>
      q
        .eq("organizationId", args.organizationId)
        .eq("generation", organization.generation),
    )
    .take(100);
  return {
    units: await Promise.all(
      units.map(async (unit) => {
        const building = await ctx.db.get(unit.buildingId);
        return {
          id: unit._id,
          label:
            (building?.organizationId === args.organizationId
              ? building.name
              : "Property") +
            " · Unit " +
            unit.label,
        };
      }),
    ),
    contractors: contractors.map((c) => ({
      id: c._id,
      name: c.name,
      specialty: c.specialty,
    })),
  };
}

async function triage(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  generation: number,
  category: string,
  unitId?: Id<"units">,
) {
  const sources: Doc<"maintenanceCases">["sources"] = [];
  if (unitId) {
    const unit = await ctx.db.get(unitId);
    if (
      unit?.organizationId === organizationId &&
      unit.generation === generation
    ) {
      const knowledge = await ctx.db
        .query("knowledgeRecords")
        .withIndex("by_building", (q) => q.eq("buildingId", unit.buildingId))
        .take(20);
      for (const item of knowledge
        .filter(
          (k) =>
            k.organizationId === organizationId &&
            k.generation === generation &&
            k.category === category,
        )
        .slice(0, 4)) {
        sources.push({
          kind: "knowledge",
          id: item._id,
          title: item.title,
          excerpt: item.content.slice(0, 2000),
          version: item.version,
        });
      }
      const history = await ctx.db
        .query("maintenanceCases")
        .withIndex("by_unit", (q) => q.eq("unitId", unitId))
        .order("desc")
        .take(20);
      const previous = history.find(
        (c) =>
          c.organizationId === organizationId &&
          c.generation === generation &&
          c.category === category &&
          c.status === "resolved",
      );
      if (previous)
        sources.push({
          kind: "case",
          id: previous._id,
          title: previous.subject,
          excerpt: previous.resolutionNote ?? previous.summary,
          version: previous.revision,
        });
    }
  }
  const missingInformation = [
    ...(!unitId
      ? [
          "The sender is not uniquely linked to a unit. Match the unit before dispatch.",
        ]
      : []),
    ...(sources.length === 0
      ? ["No relevant property instructions or previous repairs were found."]
      : []),
  ];
  return {
    sources,
    missingInformation,
    summary: unitId
      ? category === "heating"
        ? "Heating failure reported. Review the available history and confirm access before a contractor visit."
        : "A contained leak is reported. Confirm its location and the tenant's availability."
      : "A maintenance request needs manual unit matching. Ask for the property address and apartment number.",
    reply: unitId
      ? "Guten Tag, vielen Dank für Ihre Nachricht. Wir prüfen Ihre Meldung. Bitte teilen Sie uns mit, wann ein Termin in Ihrer Wohnung möglich wäre. Freundliche Grüße, Ihre Hausverwaltung"
      : "Guten Tag, vielen Dank für Ihre Nachricht. Bitte nennen Sie uns die Adresse und Wohnungsnummer, damit wir Ihre Meldung zuordnen können. Freundliche Grüße, Ihre Hausverwaltung",
    workOrder:
      category === "heating"
        ? "Inspect the reported heating failure, review the previous repair if available, and agree access with the tenant."
        : "Inspect the reported leak after confirming the location and access with the tenant.",
  };
}

export async function simulate(
  ctx: MutationCtx,
  args: {
    organizationId: Id<"organizations">;
    scenario: keyof typeof demoMessages;
  },
): Promise<{ caseId: Id<"maintenanceCases">; duplicate: boolean }> {
  const { organization, identity } = await requireMembership(
    ctx,
    args.organizationId,
  );
  if (organization.mode !== "demo")
    throw new ConvexError("Simulation is available only in demo workspaces.");
  const scope = {
    organizationId: organization._id,
    generation: organization.generation,
  };
  const eventId = "fixture:" + args.scenario;
  const existing = await repository.eventByKey(
    ctx,
    scope.organizationId,
    scope.generation,
    eventId,
  );
  if (existing) return { caseId: existing.caseId, duplicate: true };
  const fixture = demoMessages[args.scenario];
  const tenants = await ctx.db
    .query("tenants")
    .withIndex("by_org_email", (q) =>
      q.eq("organizationId", organization._id).eq("email", fixture.senderEmail),
    )
    .take(10);
  const matches = tenants.filter(
    (t) => t.generation === organization.generation,
  );
  const links =
    matches.length === 1
      ? await ctx.db
          .query("tenantUnits")
          .withIndex("by_tenant", (q) => q.eq("tenantId", matches[0]._id))
          .take(10)
      : [];
  const validLinks = links.filter(
    (l) =>
      l.organizationId === organization._id &&
      l.generation === organization.generation,
  );
  const unitId = validLinks.length === 1 ? validLinks[0].unitId : undefined;
  const result = await triage(
    ctx,
    organization._id,
    organization.generation,
    fixture.category,
    unitId,
  );
  const conversationId = await ctx.db.insert("conversations", {
    ...scope,
    subject: fixture.subject,
  });
  const caseId = await ctx.db.insert("maintenanceCases", {
    ...scope,
    conversationId,
    subject: fixture.subject,
    senderName: fixture.senderName,
    senderEmail: fixture.senderEmail,
    unitId,
    tenantId: unitId ? matches[0]._id : undefined,
    category: fixture.category,
    urgency: fixture.category === "heating" ? "high" : "normal",
    summary: result.summary,
    missingInformation: result.missingInformation,
    sources: result.sources,
    status: "needs_review",
    revision: 1,
  });
  await ctx.db.insert("messages", {
    ...scope,
    caseId,
    conversationId,
    direction: "inbound",
    body: fixture.body,
    sender: fixture.senderEmail,
  });
  await ctx.db.insert("inboundEvents", { ...scope, eventId, caseId });
  await ctx.db.insert("proposals", {
    ...scope,
    caseId,
    kind: "reply",
    content: result.reply,
    version: 1,
    status: "draft",
  });
  await ctx.db.insert("proposals", {
    ...scope,
    caseId,
    kind: "work_order",
    content: result.workOrder,
    version: 1,
    status: "draft",
  });
  await repository.audit(
    ctx,
    { _id: caseId, ...scope },
    identity.subject,
    "Simulated email received once; deterministic assistant prepared suggestions.",
  );
  return { caseId, duplicate: false };
}

function assertOpen(record: Doc<"maintenanceCases">) {
  if (record.status === "resolved" || record.status === "canceled")
    throw new ConvexError(
      "Reopen a resolved case before taking action. Canceled cases are terminal.",
    );
}

async function scopedProposal(ctx: QueryCtx, proposalId: Id<"proposals">) {
  const proposal = await ctx.db.get(proposalId);
  if (!proposal) throw new ConvexError("Proposal unavailable.");
  const context = await scopedCase(ctx, proposal.caseId);
  if (
    proposal.organizationId !== context.record.organizationId ||
    proposal.generation !== context.record.generation
  )
    throw new ConvexError("Proposal unavailable.");
  return { ...context, proposal };
}

export async function cancelOperation(
  ctx: MutationCtx,
  operation: Doc<"operations">,
) {
  if (operation.scheduledId) await ctx.scheduler.cancel(operation.scheduledId);
  if (operation.reminderId) await ctx.scheduler.cancel(operation.reminderId);
  if (!["succeeded", "canceled"].includes(operation.status)) {
    await ctx.db.patch(operation._id, { status: "canceled", error: undefined });
    if (operation.workOrderId)
      await ctx.db.patch(operation.workOrderId, { status: "canceled" });
  }
}

export async function editProposal(
  ctx: MutationCtx,
  args: {
    proposalId: Id<"proposals">;
    expectedVersion: number;
    content: string;
  },
) {
  const { record, identity, proposal } = await scopedProposal(
    ctx,
    args.proposalId,
  );
  assertOpen(record);
  if (proposal.version !== args.expectedVersion)
    throw new ConvexError("This draft changed. Reload it before saving.");
  const content = args.content.trim();
  if (!content || content.length > 5000)
    throw new ConvexError("Drafts must contain 1–5,000 characters.");
  const previous = await repository.operationForVersion(
    ctx,
    proposal._id,
    proposal.version,
  );
  if (previous) await cancelOperation(ctx, previous);
  await ctx.db.patch(proposal._id, {
    content,
    version: proposal.version + 1,
    status: "draft",
  });
  await repository.audit(
    ctx,
    record,
    identity.subject,
    "Draft edited; a new approval is required.",
  );
  return null;
}

export async function rejectProposal(
  ctx: MutationCtx,
  args: { proposalId: Id<"proposals">; expectedVersion: number },
) {
  const { record, identity, proposal } = await scopedProposal(
    ctx,
    args.proposalId,
  );
  assertOpen(record);
  if (proposal.version !== args.expectedVersion)
    throw new ConvexError("This draft changed. Reload it before rejecting.");
  const previous = await repository.operationForVersion(
    ctx,
    proposal._id,
    proposal.version,
  );
  if (previous) await cancelOperation(ctx, previous);
  await ctx.db.patch(proposal._id, { status: "rejected" });
  await repository.audit(
    ctx,
    record,
    identity.subject,
    "Draft rejected. Edit it to prepare a new version.",
  );
  return null;
}

export async function approve(
  ctx: MutationCtx,
  args: {
    proposalId: Id<"proposals">;
    expectedVersion: number;
    contractorId?: Id<"contractors">;
    fault: "none" | "transient" | "persistent";
  },
): Promise<Id<"operations">> {
  const { record, identity, organization, proposal } = await scopedProposal(
    ctx,
    args.proposalId,
  );
  assertOpen(record);
  if (organization.mode !== "demo")
    throw new ConvexError("Live delivery has not been enabled.");
  if (proposal.version !== args.expectedVersion)
    throw new ConvexError("This draft changed. Reload it before approving.");
  const existing = await repository.operationForVersion(
    ctx,
    proposal._id,
    proposal.version,
  );
  if (existing) {
    if (existing.status === "canceled")
      throw new ConvexError("Edit the canceled draft before approving again.");
    return existing._id;
  }
  if (proposal.status !== "draft")
    throw new ConvexError("Only a draft can be approved.");
  const scope = {
    organizationId: record.organizationId,
    generation: record.generation,
  };
  let recipient = record.senderEmail;
  let workOrderId: Id<"workOrders"> | undefined;
  if (proposal.kind === "work_order") {
    const unit = record.unitId ? await ctx.db.get(record.unitId) : null;
    if (
      !unit ||
      unit.organizationId !== record.organizationId ||
      unit.generation !== record.generation
    )
      throw new ConvexError(
        "Match a valid unit before approving a work order.",
      );
    const contractor = args.contractorId
      ? await ctx.db.get(args.contractorId)
      : null;
    if (
      !contractor ||
      contractor.organizationId !== record.organizationId ||
      contractor.generation !== record.generation
    )
      throw new ConvexError("Select a contractor from this workspace.");
    recipient = contractor.email;
    workOrderId = await ctx.db.insert("workOrders", {
      ...scope,
      caseId: record._id,
      contractorId: contractor._id,
      description: proposal.content,
      status: "dispatch_pending",
      reminderRaised: false,
    });
    await repository.patchCase(ctx, record._id, {
      status: "in_progress",
      revision: record.revision + 1,
    });
  }
  const operationId = await ctx.db.insert("operations", {
    ...scope,
    caseId: record._id,
    proposalId: proposal._id,
    proposalVersion: proposal.version,
    kind: proposal.kind,
    content: proposal.content,
    recipient,
    approvedBy: identity.subject,
    workOrderId,
    status: "queued",
    attempts: 0,
    retryCount: 0,
    fault: args.fault,
  });
  await ctx.db.patch(proposal._id, { status: "approved" });
  const scheduledId = await ctx.scheduler.runAfter(
    0,
    internal.workflows.demoDelivery.run,
    { operationId },
  );
  await ctx.db.patch(operationId, { scheduledId });
  await repository.audit(
    ctx,
    record,
    identity.subject,
    proposal.kind === "reply"
      ? "Reply approved; simulated delivery queued."
      : "Work order approved; simulated dispatch queued.",
  );
  return operationId;
}

export async function retry(
  ctx: MutationCtx,
  args: { operationId: Id<"operations"> },
): Promise<null> {
  const operation = await ctx.db.get(args.operationId);
  if (!operation) throw new ConvexError("Operation unavailable.");
  const { record, organization, identity } = await scopedCase(
    ctx,
    operation.caseId,
  );
  assertOpen(record);
  if (
    operation.organizationId !== record.organizationId ||
    operation.generation !== organization.generation ||
    organization.mode !== "demo"
  )
    throw new ConvexError("Operation unavailable.");
  if (operation.status !== "failed")
    throw new ConvexError("Only a failed operation can be retried.");
  const proposal = await ctx.db.get(operation.proposalId);
  if (
    !proposal ||
    proposal.version !== operation.proposalVersion ||
    proposal.status !== "approved"
  )
    throw new ConvexError("This approval is no longer valid.");
  const scheduledId = await ctx.scheduler.runAfter(
    0,
    internal.workflows.demoDelivery.run,
    { operationId: operation._id },
  );
  await ctx.db.patch(operation._id, {
    status: "queued",
    retryCount: 0,
    error: undefined,
    fault: "none",
    scheduledId,
  });
  await repository.audit(
    ctx,
    record,
    identity.subject,
    "Manual retry queued; simulated fault cleared.",
  );
  return null;
}

export async function matchUnit(
  ctx: MutationCtx,
  args: {
    caseId: Id<"maintenanceCases">;
    unitId: Id<"units">;
    expectedRevision: number;
  },
) {
  const { record, identity } = await scopedCase(ctx, args.caseId);
  assertOpen(record);
  if (record.revision !== args.expectedRevision)
    throw new ConvexError("This case changed. Reload it before matching.");
  const unit = await ctx.db.get(args.unitId);
  if (
    !unit ||
    unit.organizationId !== record.organizationId ||
    unit.generation !== record.generation
  )
    throw new ConvexError("Select a unit from this workspace.");
  if (record.unitId) throw new ConvexError("This case is already matched.");
  const result = await triage(
    ctx,
    record.organizationId,
    record.generation,
    record.category,
    unit._id,
  );
  await repository.patchCase(ctx, record._id, {
    unitId: unit._id,
    summary: result.summary,
    sources: result.sources,
    missingInformation: result.missingInformation,
    revision: record.revision + 1,
  });
  await repository.audit(
    ctx,
    record,
    identity.subject,
    "Unit matched manually; sources refreshed. Review existing drafts before approval.",
  );
  return null;
}

export async function transition(
  ctx: MutationCtx,
  args: {
    caseId: Id<"maintenanceCases">;
    expectedRevision: number;
    status: "needs_review" | "in_progress" | "resolved" | "canceled";
    note: string;
  },
) {
  const { record, identity } = await scopedCase(ctx, args.caseId);
  if (record.revision !== args.expectedRevision)
    throw new ConvexError("This case changed. Reload it before updating.");
  const allowed =
    record.status === "canceled"
      ? []
      : record.status === "resolved"
        ? ["needs_review"]
        : ["in_progress", "resolved", "canceled"];
  if (!allowed.includes(args.status) || args.status === record.status)
    throw new ConvexError("This status change is not allowed.");
  const note = args.note.trim();
  if (note.length > 2000 || (args.status === "resolved" && !note))
    throw new ConvexError("Resolution needs a note of 1–2,000 characters.");
  if (args.status === "resolved" || args.status === "canceled") {
    const operations = await repository.operationsForCase(ctx, record._id);
    for (const operation of operations) await cancelOperation(ctx, operation);
    const orders = await ctx.db
      .query("workOrders")
      .withIndex("by_case", (q) => q.eq("caseId", record._id))
      .take(100);
    for (const order of orders) {
      if (order.status !== "canceled" && order.status !== "completed")
        await ctx.db.patch(order._id, {
          status:
            args.status === "resolved" && order.status === "dispatched"
              ? "completed"
              : "canceled",
        });
    }
  }
  await repository.patchCase(ctx, record._id, {
    status: args.status,
    resolutionNote: args.status === "resolved" ? note : record.resolutionNote,
    revision: record.revision + 1,
  });
  await repository.audit(
    ctx,
    record,
    identity.subject,
    "Case status: " +
      args.status.replaceAll("_", " ") +
      (note ? ". " + note : ""),
  );
  return null;
}

export async function assignToMe(
  ctx: MutationCtx,
  args: { caseId: Id<"maintenanceCases"> },
) {
  const { record, identity } = await scopedCase(ctx, args.caseId);
  assertOpen(record);
  await repository.patchCase(ctx, record._id, {
    assignee: identity.subject,
    revision: record.revision + 1,
  });
  await repository.audit(
    ctx,
    record,
    identity.subject,
    "Case assigned to the current manager.",
  );
  return null;
}
