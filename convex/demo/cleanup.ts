import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

const tables = [
  "operations",
  "outbox",
  "auditEvents",
  "inboundEvents",
  "messages",
  "proposals",
  "workOrders",
  "maintenanceCases",
  "conversations",
  "importRows",
  "importEvents",
  "importJobs",
  "tenantUnits",
  "tenants",
  "units",
  "contractors",
  "knowledgeRecords",
  "buildings",
] as const;
export const run = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    generation: v.number(),
    tableIndex: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const organization = await ctx.db.get(args.organizationId);
    if (
      !organization ||
      organization.mode !== "demo" ||
      organization.generation <= args.generation
    )
      return null;
    const table = tables[args.tableIndex];
    if (!table) {
      // Buildings created before generation tracking are legacy demo data.
      const legacy = await ctx.db
        .query("buildings")
        .withIndex("by_org_generation", (q) =>
          q
            .eq("organizationId", args.organizationId)
            .eq("generation", undefined),
        )
        .take(25);
      for (const row of legacy) await ctx.db.delete(row._id);
      if (legacy.length === 25)
        await ctx.scheduler.runAfter(0, internal.demo.cleanup.run, args);
      return null;
    }
    const rows = await ctx.db
      .query(table)
      .withIndex("by_org_generation", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("generation", args.generation),
      )
      .take(25);
    for (const row of rows) {
      if (table === "operations") {
        const operation = await ctx.db.get(row._id as Id<"operations">);
        for (const scheduledId of [
          operation?.scheduledId,
          operation?.reminderId,
        ]) {
          if (scheduledId) {
            const job = await ctx.db.system.get(scheduledId);
            if (job?.state.kind === "pending")
              await ctx.scheduler.cancel(scheduledId);
          }
        }
      }
      if (table === "importJobs") {
        const job = await ctx.db.get(row._id as Id<"importJobs">);
        if (job?.storageId) await ctx.storage.delete(job.storageId);
      }
      await ctx.db.delete(row._id);
    }
    await ctx.scheduler.runAfter(0, internal.demo.cleanup.run, {
      ...args,
      tableIndex: rows.length === 25 ? args.tableIndex : args.tableIndex + 1,
    });
    return null;
  },
});
