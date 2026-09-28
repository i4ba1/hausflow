"use node";

import Papa from "papaparse";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 10_000;

export const run = internalAction({
  args: { jobId: v.id("importJobs") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    try {
      const context = await ctx.runQuery(
        internal.imports.controller.parseContext,
        args,
      );
      if (!context) return null;
      const blob = await ctx.storage.get(context.storageId);
      if (!blob || blob.size === 0 || blob.size > MAX_FILE_BYTES)
        throw new Error("CSV must be between 1 byte and 5 MiB.");
      const text = new TextDecoder("utf-8", { fatal: true })
        .decode(await blob.arrayBuffer())
        .replace(/^\uFEFF/, "");
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: "greedy",
        transformHeader: (header) => header.trim(),
      });
      if (parsed.errors.length) throw new Error("CSV contains malformed rows.");
      const actual = parsed.meta.fields ?? [];
      const expected =
        context.kind === "tenants" && actual.length === 4
          ? context.headers.slice(0, 4)
          : context.headers;
      if (actual.join(",") !== expected.join(","))
        throw new Error(`Expected columns: ${context.headers.join(", ")}.`);
      if (parsed.data.length > MAX_ROWS)
        throw new Error("CSV exceeds 10,000 rows.");
      for (let index = 0; index < parsed.data.length; index += 50) {
        const rows = parsed.data
          .slice(index, index + 50)
          .map((fields, offset) => ({
            rowNumber: index + offset + 2,
            fields: { ...fields, phone: fields.phone ?? "" },
          }));
        await ctx.runMutation(internal.imports.controller.stage, {
          jobId: args.jobId,
          rows,
        });
      }
      await ctx.runMutation(internal.imports.controller.finish, {
        jobId: args.jobId,
      });
    } catch (cause) {
      const raw = cause instanceof Error ? cause.message : "";
      const message =
        raw.startsWith("Expected columns:") ||
        raw === "CSV contains malformed rows." ||
        raw === "CSV exceeds 10,000 rows." ||
        raw === "CSV must be between 1 byte and 5 MiB."
          ? raw
          : "Unable to parse CSV. Check UTF-8 encoding and try again.";
      await ctx.runMutation(internal.imports.controller.finish, {
        jobId: args.jobId,
        error: message.slice(0, 160),
      });
    }
    return null;
  },
});
