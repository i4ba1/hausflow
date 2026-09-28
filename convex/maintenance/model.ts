import { defineTable } from "convex/server";
import { v } from "convex/values";

export const caseStatus = v.union(
  v.literal("needs_review"),
  v.literal("in_progress"),
  v.literal("resolved"),
  v.literal("canceled"),
);
export const proposalKind = v.union(
  v.literal("reply"),
  v.literal("work_order"),
);
export const faultMode = v.union(
  v.literal("none"),
  v.literal("transient"),
  v.literal("persistent"),
);
export const scenario = v.union(
  v.literal("heating"),
  v.literal("unknown_sender"),
  v.literal("missing_knowledge"),
);
export const sourceReference = v.object({
  kind: v.union(v.literal("knowledge"), v.literal("case")),
  id: v.string(),
  title: v.string(),
  excerpt: v.string(),
  version: v.number(),
});
const scope = { organizationId: v.id("organizations"), generation: v.number() };

export const maintenanceTables = {
  conversations: defineTable({ ...scope, subject: v.string() }).index(
    "by_org_generation",
    ["organizationId", "generation"],
  ),
  maintenanceCases: defineTable({
    ...scope,
    conversationId: v.id("conversations"),
    subject: v.string(),
    senderName: v.string(),
    senderEmail: v.string(),
    unitId: v.optional(v.id("units")),
    tenantId: v.optional(v.id("tenants")),
    category: v.string(),
    urgency: v.union(v.literal("normal"), v.literal("high")),
    summary: v.string(),
    missingInformation: v.array(v.string()),
    sources: v.array(sourceReference),
    status: caseStatus,
    assignee: v.optional(v.string()),
    resolutionNote: v.optional(v.string()),
    revision: v.number(),
  })
    .index("by_org_generation", ["organizationId", "generation"])
    .index("by_unit", ["unitId"]),
  messages: defineTable({
    ...scope,
    caseId: v.id("maintenanceCases"),
    conversationId: v.id("conversations"),
    direction: v.union(v.literal("inbound"), v.literal("outbound")),
    body: v.string(),
    sender: v.string(),
  })
    .index("by_org_generation", ["organizationId", "generation"])
    .index("by_case", ["caseId"]),
  inboundEvents: defineTable({
    ...scope,
    eventId: v.string(),
    caseId: v.id("maintenanceCases"),
  })
    .index("by_org_generation", ["organizationId", "generation"])
    .index("by_event", ["organizationId", "generation", "eventId"]),
  proposals: defineTable({
    ...scope,
    caseId: v.id("maintenanceCases"),
    kind: proposalKind,
    content: v.string(),
    version: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
  })
    .index("by_org_generation", ["organizationId", "generation"])
    .index("by_case", ["caseId"]),
  workOrders: defineTable({
    ...scope,
    caseId: v.id("maintenanceCases"),
    contractorId: v.id("contractors"),
    description: v.string(),
    status: v.union(
      v.literal("dispatch_pending"),
      v.literal("dispatched"),
      v.literal("completed"),
      v.literal("canceled"),
    ),
    reminderRaised: v.boolean(),
  })
    .index("by_org_generation", ["organizationId", "generation"])
    .index("by_case", ["caseId"]),
  operations: defineTable({
    ...scope,
    caseId: v.id("maintenanceCases"),
    proposalId: v.id("proposals"),
    proposalVersion: v.number(),
    kind: proposalKind,
    content: v.string(),
    recipient: v.string(),
    approvedBy: v.string(),
    workOrderId: v.optional(v.id("workOrders")),
    status: v.union(
      v.literal("queued"),
      v.literal("retrying"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("canceled"),
    ),
    attempts: v.number(),
    retryCount: v.number(),
    fault: faultMode,
    error: v.optional(v.string()),
    scheduledId: v.optional(v.id("_scheduled_functions")),
    reminderId: v.optional(v.id("_scheduled_functions")),
  })
    .index("by_org_generation", ["organizationId", "generation"])
    .index("by_case", ["caseId"])
    .index("by_proposal_version", ["proposalId", "proposalVersion"]),
  outbox: defineTable({
    ...scope,
    operationId: v.id("operations"),
    caseId: v.id("maintenanceCases"),
    recipient: v.string(),
    content: v.string(),
    kind: proposalKind,
  })
    .index("by_org_generation", ["organizationId", "generation"])
    .index("by_operation", ["operationId"])
    .index("by_case", ["caseId"]),
  auditEvents: defineTable({
    ...scope,
    caseId: v.id("maintenanceCases"),
    actor: v.string(),
    message: v.string(),
  })
    .index("by_org_generation", ["organizationId", "generation"])
    .index("by_case", ["caseId"]),
};
