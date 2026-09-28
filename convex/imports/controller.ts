import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import { internal } from "../_generated/api";
import { requireMembership } from "../shared/authorization";
import type { MutationCtx } from "../_generated/server";

const kind = v.union(
  v.literal("buildings"),
  v.literal("units"),
  v.literal("tenants"),
);
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 10_000;
const BATCH_SIZE = 25;

const headers: Record<"buildings" | "units" | "tenants", string[]> = {
  buildings: ["external_id", "name", "address"],
  units: ["external_id", "building_external_id", "label"],
  tenants: ["external_id", "unit_external_id", "name", "email", "phone"],
};

export const generateUploadUrl = mutation({
  args: { organizationId: v.id("organizations") },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.organizationId, "owner");
    return ctx.storage.generateUploadUrl();
  },
});

export const begin = mutation({
  args: {
    organizationId: v.id("organizations"),
    generation: v.number(),
    kind,
    fileName: v.string(),
    storageId: v.id("_storage"),
  },
  returns: v.id("importJobs"),
  handler: async (ctx, args) => {
    const { organization, identity } = await requireMembership(
      ctx,
      args.organizationId,
      "owner",
    );
    if (organization.generation !== args.generation)
      throw new ConvexError("The demo was reset. Refresh before importing.");
    const metadata = await ctx.storage.getMetadata(args.storageId);
    if (!metadata || metadata.size > MAX_FILE_BYTES || metadata.size === 0)
      throw new ConvexError("CSV must be between 1 byte and 5 MiB.");
    if (!args.fileName.toLowerCase().endsWith(".csv"))
      throw new ConvexError("Choose a .csv file.");
    const reused = await ctx.db
      .query("importJobs")
      .withIndex("by_storage", (q) => q.eq("storageId", args.storageId))
      .first();
    if (reused)
      throw new ConvexError("This uploaded file was already submitted.");
    const jobId = await ctx.db.insert("importJobs", {
      organizationId: args.organizationId,
      generation: args.generation,
      kind: args.kind,
      fileName: args.fileName.slice(0, 120),
      storageId: args.storageId,
      status: "parsing",
      createdBy: identity.subject,
      rowCount: 0,
      validCount: 0,
      invalidCount: 0,
      processedCount: 0,
      importedCount: 0,
      updatedCount: 0,
      unchangedCount: 0,
    });
    await ctx.db.insert("importEvents", {
      organizationId: args.organizationId,
      generation: args.generation,
      jobId,
      actor: identity.subject,
      message: "CSV uploaded for preview.",
    });
    await ctx.scheduler.runAfter(0, internal.imports.parse.run, { jobId });
    await ctx.scheduler.runAfter(
      7 * 24 * 60 * 60 * 1000,
      internal.imports.controller.cleanup,
      { jobId },
    );
    return jobId;
  },
});

export const list = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, args) => {
    const { organization } = await requireMembership(
      ctx,
      args.organizationId,
      "owner",
    );
    return ctx.db
      .query("importJobs")
      .withIndex("by_org_generation", (q) =>
        q
          .eq("organizationId", args.organizationId)
          .eq("generation", organization.generation),
      )
      .order("desc")
      .take(30);
  },
});

export const detail = query({
  args: { jobId: v.id("importJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new ConvexError("Import unavailable.");
    const { organization } = await requireMembership(
      ctx,
      job.organizationId,
      "owner",
    );
    if (job.generation !== organization.generation)
      throw new ConvexError("Import unavailable.");
    const invalid = await ctx.db
      .query("importRows")
      .withIndex("by_job_status", (q) =>
        q.eq("jobId", job._id).eq("status", "invalid"),
      )
      .take(25);
    const events = await ctx.db
      .query("importEvents")
      .withIndex("by_job", (q) => q.eq("jobId", job._id))
      .order("desc")
      .take(20);
    return { job, invalid, events };
  },
});

export const errors = query({
  args: { jobId: v.id("importJobs"), cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new ConvexError("Import unavailable.");
    const { organization } = await requireMembership(
      ctx,
      job.organizationId,
      "owner",
    );
    if (job.generation !== organization.generation)
      throw new ConvexError("Import unavailable.");
    return ctx.db
      .query("importRows")
      .withIndex("by_job_status", (q) =>
        q.eq("jobId", job._id).eq("status", "invalid"),
      )
      .paginate({ numItems: 250, cursor: args.cursor ?? null });
  },
});

export const confirm = mutation({
  args: { jobId: v.id("importJobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) throw new ConvexError("Import unavailable.");
    const { organization, identity } = await requireMembership(
      ctx,
      job.organizationId,
      "owner",
    );
    if (job.generation !== organization.generation || job.status !== "ready")
      throw new ConvexError("This preview is no longer ready.");
    await ctx.db.patch(job._id, { status: "running" });
    await ctx.db.insert("importEvents", {
      organizationId: job.organizationId,
      generation: job.generation,
      jobId: job._id,
      actor: identity.subject,
      message: "Valid rows confirmed for import.",
    });
    await ctx.scheduler.runAfter(0, internal.imports.controller.applyNext, {
      jobId: job._id,
    });
    return null;
  },
});

export const parseContext = internalQuery({
  args: { jobId: v.id("importJobs") },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job || job.status !== "parsing" || !job.storageId) return null;
    const organization = await ctx.db.get(job.organizationId);
    if (!organization || organization.generation !== job.generation)
      return null;
    return {
      storageId: job.storageId,
      kind: job.kind,
      headers: headers[job.kind],
    };
  },
});

function validate(fields: Record<string, string>, expected: string[]) {
  const externalId = fields.external_id?.trim() ?? "";
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/.test(externalId))
    return "external_id must be 1–80 letters, digits, dots, underscores, colons, or hyphens.";
  for (const key of expected.filter((key) => key !== "phone")) {
    if (!fields[key]?.trim()) return `${key} is required.`;
    if (fields[key].length > 250) return `${key} exceeds 250 characters.`;
  }
  if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))
    return "email is invalid.";
  if (fields.phone && fields.phone.length > 40)
    return "phone exceeds 40 characters.";
  return null;
}

function errorCode(error: string) {
  if (error.startsWith("Duplicate")) return "DUPLICATE_EXTERNAL_ID";
  if (error.includes("was not found") || error.startsWith("Referenced"))
    return "MISSING_REFERENCE";
  if (error.includes("email")) return "INVALID_EMAIL";
  return "INVALID_FIELD";
}

export const stage = internalMutation({
  args: {
    jobId: v.id("importJobs"),
    rows: v.array(
      v.object({
        rowNumber: v.number(),
        fields: v.record(v.string(), v.string()),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    const organization = job && (await ctx.db.get(job.organizationId));
    if (
      !job ||
      job.status !== "parsing" ||
      organization?.generation !== job.generation
    )
      return null;
    if (args.rows.length > 50 || job.rowCount + args.rows.length > MAX_ROWS)
      throw new ConvexError("CSV exceeds 10,000 rows.");
    let validCount = job.validCount,
      invalidCount = job.invalidCount;
    for (const row of args.rows) {
      const fields = Object.fromEntries(
        Object.entries(row.fields).map(([key, value]) => [key, value.trim()]),
      );
      const externalId = fields.external_id ?? "";
      let error = validate(fields, headers[job.kind]);
      if (!error && job.kind === "units") {
        const building = await ctx.db
          .query("buildings")
          .withIndex("by_external", (q) =>
            q
              .eq("organizationId", job.organizationId)
              .eq("generation", job.generation)
              .eq("externalId", fields.building_external_id),
          )
          .first();
        if (!building)
          error = "building_external_id was not found. Import buildings first.";
      }
      if (!error && job.kind === "tenants") {
        const unit = await ctx.db
          .query("units")
          .withIndex("by_external", (q) =>
            q
              .eq("organizationId", job.organizationId)
              .eq("generation", job.generation)
              .eq("externalId", fields.unit_external_id),
          )
          .first();
        if (!unit)
          error = "unit_external_id was not found. Import units first.";
      }
      if (
        !error &&
        (await ctx.db
          .query("importRows")
          .withIndex("by_job_external", (q) =>
            q.eq("jobId", job._id).eq("externalId", externalId),
          )
          .first())
      )
        error = "Duplicate external_id in this file.";
      await ctx.db.insert("importRows", {
        organizationId: job.organizationId,
        generation: job.generation,
        jobId: job._id,
        rowNumber: row.rowNumber,
        externalId,
        fields,
        status: error ? "invalid" : "valid",
        ...(error ? { error, errorCode: errorCode(error) } : {}),
      });
      if (error) invalidCount++;
      else validCount++;
    }
    await ctx.db.patch(job._id, {
      rowCount: job.rowCount + args.rows.length,
      validCount,
      invalidCount,
    });
    return null;
  },
});

export const finish = internalMutation({
  args: { jobId: v.id("importJobs"), error: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    const organization = job && (await ctx.db.get(job.organizationId));
    if (
      !job ||
      job.status !== "parsing" ||
      organization?.generation !== job.generation
    )
      return null;
    await ctx.db.patch(job._id, {
      status: args.error ? "failed" : "ready",
      ...(args.error ? { error: args.error } : {}),
    });
    await ctx.db.insert("importEvents", {
      organizationId: job.organizationId,
      generation: job.generation,
      jobId: job._id,
      actor: "system",
      message: args.error ? "CSV preview failed." : "CSV preview ready.",
    });
    return null;
  },
});

export const applyNext = internalMutation({
  args: { jobId: v.id("importJobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    const organization = job && (await ctx.db.get(job.organizationId));
    if (
      !job ||
      job.status !== "running" ||
      organization?.generation !== job.generation
    )
      return null;
    const rows = await ctx.db
      .query("importRows")
      .withIndex("by_job_status", (q) =>
        q.eq("jobId", job._id).eq("status", "valid"),
      )
      .take(BATCH_SIZE);
    let importedCount = job.importedCount,
      updatedCount = job.updatedCount;
    let unchangedCount = job.unchangedCount,
      invalidCount = job.invalidCount;
    for (const row of rows) {
      const result = await applyRow(ctx, job, row.fields);
      await ctx.db.patch(
        row._id,
        result === "invalid"
          ? {
              status: "invalid",
              errorCode: "MISSING_REFERENCE_OR_EMAIL_CONFLICT",
              error:
                "Referenced record is missing or email belongs to another tenant.",
            }
          : { status: result },
      );
      if (result === "imported") importedCount++;
      if (result === "updated") updatedCount++;
      if (result === "unchanged") unchangedCount++;
      if (result === "invalid") invalidCount++;
    }
    const more = await ctx.db
      .query("importRows")
      .withIndex("by_job_status", (q) =>
        q.eq("jobId", job._id).eq("status", "valid"),
      )
      .first();
    await ctx.db.patch(job._id, {
      importedCount,
      updatedCount,
      unchangedCount,
      invalidCount,
      processedCount: job.processedCount + rows.length,
      status: more ? "running" : "completed",
    });
    if (!more)
      await ctx.db.insert("importEvents", {
        organizationId: job.organizationId,
        generation: job.generation,
        jobId: job._id,
        actor: "system",
        message: "Import completed.",
      });
    if (more)
      await ctx.scheduler.runAfter(
        0,
        internal.imports.controller.applyNext,
        args,
      );
    return null;
  },
});

type ApplyCtx = MutationCtx;

async function applyRow(
  ctx: ApplyCtx,
  job: {
    organizationId: import("../_generated/dataModel").Id<"organizations">;
    generation: number;
    kind: "buildings" | "units" | "tenants";
  },
  fields: Record<string, string>,
): Promise<"imported" | "updated" | "unchanged" | "invalid"> {
  const scope = {
    organizationId: job.organizationId,
    generation: job.generation,
  };
  const externalId = fields.external_id;
  if (job.kind === "buildings") {
    const existing = await ctx.db
      .query("buildings")
      .withIndex("by_external", (q) =>
        q
          .eq("organizationId", scope.organizationId)
          .eq("generation", scope.generation)
          .eq("externalId", externalId),
      )
      .first();
    if (!existing) {
      await ctx.db.insert("buildings", {
        ...scope,
        externalId,
        name: fields.name,
        address: fields.address,
        archived: false,
        createdBy: "csv-import",
      });
      return "imported";
    }
    if (existing.name === fields.name && existing.address === fields.address)
      return "unchanged";
    await ctx.db.patch(existing._id, {
      name: fields.name,
      address: fields.address,
    });
    return "updated";
  }
  if (job.kind === "units") {
    const building = await ctx.db
      .query("buildings")
      .withIndex("by_external", (q) =>
        q
          .eq("organizationId", scope.organizationId)
          .eq("generation", scope.generation)
          .eq("externalId", fields.building_external_id),
      )
      .first();
    if (!building) return "invalid";
    const existing = await ctx.db
      .query("units")
      .withIndex("by_external", (q) =>
        q
          .eq("organizationId", scope.organizationId)
          .eq("generation", scope.generation)
          .eq("externalId", externalId),
      )
      .first();
    if (!existing) {
      await ctx.db.insert("units", {
        ...scope,
        externalId,
        buildingId: building._id,
        label: fields.label,
      });
      return "imported";
    }
    if (existing.buildingId === building._id && existing.label === fields.label)
      return "unchanged";
    await ctx.db.patch(existing._id, {
      buildingId: building._id,
      label: fields.label,
    });
    return "updated";
  }
  const unit = await ctx.db
    .query("units")
    .withIndex("by_external", (q) =>
      q
        .eq("organizationId", scope.organizationId)
        .eq("generation", scope.generation)
        .eq("externalId", fields.unit_external_id),
    )
    .first();
  if (!unit) return "invalid";
  const existing = await ctx.db
    .query("tenants")
    .withIndex("by_external", (q) =>
      q
        .eq("organizationId", scope.organizationId)
        .eq("generation", scope.generation)
        .eq("externalId", externalId),
    )
    .first();
  const emailOwner = await ctx.db
    .query("tenants")
    .withIndex("by_org_email", (q) =>
      q
        .eq("organizationId", scope.organizationId)
        .eq("email", fields.email.toLowerCase()),
    )
    .filter((q) => q.eq(q.field("generation"), scope.generation))
    .first();
  if (emailOwner && emailOwner._id !== existing?._id) return "invalid";
  const phone = fields.phone || undefined;
  let tenantId = existing?._id;
  let result: "imported" | "updated" | "unchanged" = "unchanged";
  if (!existing) {
    tenantId = await ctx.db.insert("tenants", {
      ...scope,
      externalId,
      name: fields.name,
      email: fields.email.toLowerCase(),
      phone,
    });
    result = "imported";
  } else if (
    existing.name !== fields.name ||
    existing.email !== fields.email.toLowerCase() ||
    existing.phone !== phone
  ) {
    await ctx.db.patch(existing._id, {
      name: fields.name,
      email: fields.email.toLowerCase(),
      phone,
    });
    result = "updated";
  }
  const links = await ctx.db
    .query("tenantUnits")
    .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId!))
    .take(100);
  if (!links.some((link) => link.unitId === unit._id)) {
    await ctx.db.insert("tenantUnits", {
      ...scope,
      tenantId: tenantId!,
      unitId: unit._id,
    });
    if (result === "unchanged") result = "updated";
  }
  return result;
}

export const cleanup = internalMutation({
  args: { jobId: v.id("importJobs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return null;
    const rows = await ctx.db
      .query("importRows")
      .withIndex("by_job_row", (q) => q.eq("jobId", job._id))
      .take(25);
    for (const row of rows) await ctx.db.delete(row._id);
    if (rows.length)
      await ctx.scheduler.runAfter(
        0,
        internal.imports.controller.cleanup,
        args,
      );
    else if (job.storageId) {
      await ctx.storage.delete(job.storageId);
      await ctx.db.patch(job._id, { storageId: undefined });
    }
    return null;
  },
});
