import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { organizationSummary } from "./dto";
import * as service from "./service";

export const currentDemo = query({
  args: {},
  returns: v.union(organizationSummary, v.null()),
  handler: service.currentDemo,
});

export const createDemo = mutation({
  args: {},
  returns: v.id("organizations"),
  handler: service.createDemo,
});
