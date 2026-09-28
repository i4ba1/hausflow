import { defineTable } from "convex/server";
import { v } from "convex/values";

export const organizationTables = {
  organizations: defineTable({
    name: v.string(),
    mode: v.union(v.literal("demo"), v.literal("live")),
    ownerSubject: v.string(),
    generation: v.number(),
    seededGeneration: v.optional(v.number()),
  }).index("by_owner_mode", ["ownerSubject", "mode"]),
  memberships: defineTable({
    organizationId: v.id("organizations"),
    userSubject: v.string(),
    role: v.union(v.literal("owner"), v.literal("manager")),
  }).index("by_user_organization", ["userSubject", "organizationId"]),
};
