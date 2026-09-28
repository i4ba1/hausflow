import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { caseStatus } from "./model";
import * as dto from "./dto";
import * as service from "./service";

export const list = query({
  args: dto.listArgs,
  returns: v.object({
    page: v.array(dto.caseSummary),
    isDone: v.boolean(),
    continueCursor: v.string(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(
      v.union(
        v.literal("SplitRecommended"),
        v.literal("SplitRequired"),
        v.null(),
      ),
    ),
  }),
  handler: service.listCases,
});
export const detail = query({
  args: dto.caseArgs,
  returns: dto.caseDetail,
  handler: service.detail,
});
export const references = query({
  args: dto.organizationArgs,
  returns: v.object({
    units: v.array(v.object({ id: v.id("units"), label: v.string() })),
    contractors: v.array(
      v.object({
        id: v.id("contractors"),
        name: v.string(),
        specialty: v.string(),
      }),
    ),
  }),
  handler: service.references,
});
export const simulate = mutation({
  args: dto.simulateArgs,
  returns: v.object({
    caseId: v.id("maintenanceCases"),
    duplicate: v.boolean(),
  }),
  handler: service.simulate,
});
export const editProposal = mutation({
  args: dto.editArgs,
  returns: v.null(),
  handler: service.editProposal,
});
export const rejectProposal = mutation({
  args: { proposalId: v.id("proposals"), expectedVersion: v.number() },
  returns: v.null(),
  handler: service.rejectProposal,
});
export const approve = mutation({
  args: dto.approveArgs,
  returns: v.id("operations"),
  handler: service.approve,
});
export const retry = mutation({
  args: { operationId: v.id("operations") },
  returns: v.null(),
  handler: service.retry,
});
export const matchUnit = mutation({
  args: {
    ...dto.caseArgs,
    unitId: v.id("units"),
    expectedRevision: v.number(),
  },
  returns: v.null(),
  handler: service.matchUnit,
});
export const transition = mutation({
  args: {
    ...dto.caseArgs,
    expectedRevision: v.number(),
    status: caseStatus,
    note: v.string(),
  },
  returns: v.null(),
  handler: service.transition,
});
export const assignToMe = mutation({
  args: dto.caseArgs,
  returns: v.null(),
  handler: service.assignToMe,
});
