import { defineTable } from "convex/server";
import { v } from "convex/values";

export const importTables = {
  importJobs: defineTable({
    organizationId: v.id("organizations"),
    generation: v.number(),
    kind: v.union(
      v.literal("buildings"),
      v.literal("units"),
      v.literal("tenants"),
    ),
    fileName: v.string(),
    storageId: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("parsing"),
      v.literal("ready"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed"),
    ),
    createdBy: v.string(),
    rowCount: v.number(),
    validCount: v.number(),
    invalidCount: v.number(),
    processedCount: v.number(),
    importedCount: v.number(),
    updatedCount: v.number(),
    unchangedCount: v.number(),
    error: v.optional(v.string()),
  })
    .index("by_org_generation", ["organizationId", "generation"])
    .index("by_storage", ["storageId"]),
  importRows: defineTable({
    organizationId: v.id("organizations"),
    generation: v.number(),
    jobId: v.id("importJobs"),
    rowNumber: v.number(),
    externalId: v.string(),
    fields: v.record(v.string(), v.string()),
    status: v.union(
      v.literal("valid"),
      v.literal("invalid"),
      v.literal("imported"),
      v.literal("updated"),
      v.literal("unchanged"),
    ),
    error: v.optional(v.string()),
    errorCode: v.optional(v.string()),
  })
    .index("by_org_generation", ["organizationId", "generation"])
    .index("by_job_status", ["jobId", "status"])
    .index("by_job_row", ["jobId", "rowNumber"])
    .index("by_job_external", ["jobId", "externalId"]),
  importEvents: defineTable({
    organizationId: v.id("organizations"),
    generation: v.number(),
    jobId: v.id("importJobs"),
    actor: v.string(),
    message: v.string(),
  })
    .index("by_org_generation", ["organizationId", "generation"])
    .index("by_job", ["jobId"]),
};
