import { defineTable } from "convex/server";
import { v } from "convex/values";

export const propertyTables = {
  buildings: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    address: v.string(),
    createdBy: v.string(),
    archived: v.boolean(),
    generation: v.optional(v.number()),
    externalId: v.optional(v.string()),
  })
    .index("by_organization_archived", ["organizationId", "archived"])
    .index("by_org_generation", ["organizationId", "generation"])
    .index("by_external", ["organizationId", "generation", "externalId"]),
  units: defineTable({
    organizationId: v.id("organizations"),
    generation: v.number(),
    buildingId: v.id("buildings"),
    label: v.string(),
    externalId: v.optional(v.string()),
  })
    .index("by_org_generation", ["organizationId", "generation"])
    .index("by_external", ["organizationId", "generation", "externalId"]),
  tenants: defineTable({
    organizationId: v.id("organizations"),
    generation: v.number(),
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    externalId: v.optional(v.string()),
  })
    .index("by_org_generation", ["organizationId", "generation"])
    .index("by_org_email", ["organizationId", "email"])
    .index("by_external", ["organizationId", "generation", "externalId"]),
  tenantUnits: defineTable({
    organizationId: v.id("organizations"),
    generation: v.number(),
    tenantId: v.id("tenants"),
    unitId: v.id("units"),
  })
    .index("by_org_generation", ["organizationId", "generation"])
    .index("by_tenant", ["tenantId"]),
  contractors: defineTable({
    organizationId: v.id("organizations"),
    generation: v.number(),
    name: v.string(),
    email: v.string(),
    specialty: v.string(),
  }).index("by_org_generation", ["organizationId", "generation"]),
  knowledgeRecords: defineTable({
    organizationId: v.id("organizations"),
    generation: v.number(),
    buildingId: v.id("buildings"),
    title: v.string(),
    content: v.string(),
    category: v.string(),
    version: v.number(),
  })
    .index("by_org_generation", ["organizationId", "generation"])
    .index("by_building", ["buildingId"]),
};
