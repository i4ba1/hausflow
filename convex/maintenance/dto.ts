import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { caseStatus, faultMode, scenario, sourceReference } from "./model";

export const caseArgs = { caseId: v.id("maintenanceCases") };
export const organizationArgs = { organizationId: v.id("organizations") };
export const listArgs = {
  ...organizationArgs,
  paginationOpts: paginationOptsValidator,
};
export const simulateArgs = { ...organizationArgs, scenario };
export const editArgs = {
  proposalId: v.id("proposals"),
  expectedVersion: v.number(),
  content: v.string(),
};
export const approveArgs = {
  proposalId: v.id("proposals"),
  expectedVersion: v.number(),
  contractorId: v.optional(v.id("contractors")),
  fault: faultMode,
};
export const caseSummary = v.object({
  id: v.id("maintenanceCases"),
  subject: v.string(),
  senderName: v.string(),
  status: caseStatus,
  urgency: v.string(),
  unitLabel: v.string(),
  createdAt: v.number(),
});
export const caseDetail = v.object({
  ...caseSummary.fields,
  organizationId: v.id("organizations"),
  summary: v.string(),
  missingInformation: v.array(v.string()),
  sources: v.array(sourceReference),
  revision: v.number(),
  unitId: v.optional(v.id("units")),
  assignee: v.optional(v.string()),
  resolutionNote: v.optional(v.string()),
  messages: v.array(
    v.object({
      id: v.id("messages"),
      direction: v.string(),
      body: v.string(),
      sender: v.string(),
    }),
  ),
  proposals: v.array(
    v.object({
      id: v.id("proposals"),
      kind: v.union(v.literal("reply"), v.literal("work_order")),
      content: v.string(),
      version: v.number(),
      status: v.string(),
    }),
  ),
  operations: v.array(
    v.object({
      id: v.id("operations"),
      kind: v.string(),
      status: v.string(),
      attempts: v.number(),
      error: v.optional(v.string()),
      recipient: v.string(),
    }),
  ),
  workOrders: v.array(
    v.object({
      id: v.id("workOrders"),
      contractorName: v.string(),
      description: v.string(),
      status: v.string(),
      reminderRaised: v.boolean(),
    }),
  ),
  timeline: v.array(
    v.object({ id: v.id("auditEvents"), message: v.string(), at: v.number() }),
  ),
  outbox: v.array(
    v.object({
      id: v.id("outbox"),
      recipient: v.string(),
      content: v.string(),
      kind: v.string(),
    }),
  ),
});
