import { mutation } from "../_generated/server";
import { v } from "convex/values";
import * as service from "./service";

export const initialize = mutation({
  args: { organizationId: v.id("organizations") },
  returns: v.null(),
  handler: service.initialize,
});
export const reset = mutation({
  args: {
    organizationId: v.id("organizations"),
    expectedGeneration: v.number(),
    confirmation: v.string(),
  },
  returns: v.null(),
  handler: service.reset,
});
