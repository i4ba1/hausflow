import { v } from "convex/values";

export const createBuildingArgs = {
  organizationId: v.id("organizations"),
  name: v.string(),
  address: v.string(),
};
export const buildingSummary = v.object({
  id: v.id("buildings"),
  name: v.string(),
  address: v.string(),
});
