import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { buildingSummary, createBuildingArgs } from "./dto";
import * as service from "./service";

export const list = query({
  args: { organizationId: v.id("organizations") },
  returns: v.array(buildingSummary),
  handler: service.listBuildings,
});
export const create = mutation({
  args: createBuildingArgs,
  returns: v.id("buildings"),
  handler: service.createBuilding,
});
