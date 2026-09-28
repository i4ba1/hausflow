import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export async function seedDemo(
  ctx: MutationCtx,
  organizationId: Id<"organizations">,
  generation: number,
  owner: string,
) {
  const scope = { organizationId, generation };
  const buildings = [];
  for (const [name, address] of [
    ["Lindenhof", "Lindenstraße 12, Berlin"],
    ["Parkallee", "Parkallee 8, Berlin"],
  ]) {
    buildings.push(
      await ctx.db.insert("buildings", {
        ...scope,
        name,
        address,
        createdBy: owner,
        archived: false,
      }),
    );
  }
  const units = [];
  for (const [index, label] of [
    [0, "12"],
    [0, "04"],
    [1, "02"],
    [1, "01"],
  ] as const) {
    units.push(
      await ctx.db.insert("units", {
        ...scope,
        buildingId: buildings[index],
        label,
      }),
    );
  }
  for (const [index, name, email] of [
    [0, "Anna Weber", "anna@example.invalid"],
    [1, "Jonas Fischer", "jonas@example.invalid"],
    [2, "Mia Schneider", "mia@example.invalid"],
    [3, "Lukas Braun", "lukas@example.invalid"],
  ] as const) {
    const tenantId = await ctx.db.insert("tenants", { ...scope, name, email });
    await ctx.db.insert("tenantUnits", {
      ...scope,
      tenantId,
      unitId: units[index],
    });
  }
  for (const [name, email, specialty] of [
    ["Klar Wärme", "heating@example.invalid", "Heating"],
    ["Rohr & Co", "plumbing@example.invalid", "Plumbing"],
  ]) {
    await ctx.db.insert("contractors", { ...scope, name, email, specialty });
  }
  for (const [buildingIndex, title, category, content] of [
    [
      0,
      "Heating access instructions",
      "heating",
      "Confirm an appointment with the tenant. Ask the contractor to check the previous valve adjustment.",
    ],
    [
      0,
      "Plumbing access instructions",
      "water",
      "Confirm leak location and tenant availability before a visit.",
    ],
    [
      1,
      "Shared entrance instructions",
      "access",
      "Confirm that the entrance remains secure before scheduling an inspection.",
    ],
  ] as const) {
    await ctx.db.insert("knowledgeRecords", {
      ...scope,
      buildingId: buildings[buildingIndex],
      title,
      category,
      content,
      version: 1,
    });
  }
  const conversationId = await ctx.db.insert("conversations", {
    ...scope,
    subject: "Previous heating repair",
  });
  const caseId = await ctx.db.insert("maintenanceCases", {
    ...scope,
    conversationId,
    subject: "Previous heating repair",
    senderName: "Anna Weber",
    senderEmail: "anna@example.invalid",
    unitId: units[0],
    category: "heating",
    urgency: "normal",
    summary: "Heating valve inspected and adjusted.",
    missingInformation: [],
    sources: [],
    status: "resolved",
    resolutionNote:
      "Heating valve inspected and adjusted. Follow-up recommended if the issue returns.",
    revision: 1,
  });
  await ctx.db.insert("messages", {
    ...scope,
    caseId,
    conversationId,
    direction: "inbound",
    sender: "anna@example.invalid",
    body: "Die Heizung bleibt kalt. Bitte prüfen Sie das Ventil.",
  });
  await ctx.db.insert("auditEvents", {
    ...scope,
    caseId,
    actor: owner,
    message:
      "Seeded prior repair: valve inspected and adjusted; case resolved.",
  });
}
