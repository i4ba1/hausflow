import { v } from "convex/values";

export const organizationSummary = v.object({
  id: v.id("organizations"),
  name: v.string(),
  mode: v.union(v.literal("demo"), v.literal("live")),
  generation: v.number(),
  seeded: v.boolean(),
});
