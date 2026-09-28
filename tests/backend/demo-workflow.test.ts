import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.{ts,js}");
afterEach(() => vi.useRealTimers());

async function setup() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner-a" });
  const organizationId = await owner.mutation(
    api.organizations.controller.createDemo,
    {},
  );
  await owner.mutation(api.demo.controller.initialize, { organizationId });
  return { t, owner, organizationId };
}

describe("personal demo workflow", () => {
  it("seeds exactly one private portfolio and recognizes duplicate incoming events", async () => {
    const { t, owner, organizationId } = await setup();
    await owner.mutation(api.demo.controller.initialize, { organizationId });
    const counts = await t.run(async (ctx) => ({
      buildings: await ctx.db.query("buildings").collect(),
      units: await ctx.db.query("units").collect(),
      tenants: await ctx.db.query("tenants").collect(),
      contractors: await ctx.db.query("contractors").collect(),
      knowledge: await ctx.db.query("knowledgeRecords").collect(),
    }));
    expect([
      counts.buildings.length,
      counts.units.length,
      counts.tenants.length,
      counts.contractors.length,
      counts.knowledge.length,
    ]).toEqual([2, 4, 4, 2, 3]);
    const first = await owner.mutation(api.maintenance.controller.simulate, {
      organizationId,
      scenario: "heating",
    });
    const again = await owner.mutation(api.maintenance.controller.simulate, {
      organizationId,
      scenario: "heating",
    });
    expect(again).toEqual({ caseId: first.caseId, duplicate: true });
    const detail = await owner.query(api.maintenance.controller.detail, {
      caseId: first.caseId,
    });
    expect(detail.unitLabel).toContain("Unit 12");
    expect(detail.sources.map((source) => source.kind)).toEqual(
      expect.arrayContaining(["knowledge", "case"]),
    );
    expect(detail.messages).toHaveLength(1);
    expect(detail.proposals).toHaveLength(2);
    const outsider = t.withIdentity({ subject: "owner-b" });
    await expect(
      outsider.query(api.maintenance.controller.detail, {
        caseId: first.caseId,
      }),
    ).rejects.toThrow("FORBIDDEN");
    await expect(
      outsider.mutation(api.maintenance.controller.simulate, {
        organizationId,
        scenario: "unknown_sender",
      }),
    ).rejects.toThrow("FORBIDDEN");
  });

  it("sends an approved reply once to the simulated outbox and requires new approval after editing", async () => {
    vi.useFakeTimers();
    const { t, owner, organizationId } = await setup();
    const { caseId } = await owner.mutation(
      api.maintenance.controller.simulate,
      { organizationId, scenario: "heating" },
    );
    const detail = await owner.query(api.maintenance.controller.detail, {
      caseId,
    });
    const reply = detail.proposals.find((p) => p.kind === "reply")!;
    const operationId = await owner.mutation(
      api.maintenance.controller.approve,
      { proposalId: reply.id, expectedVersion: reply.version, fault: "none" },
    );
    const same = await owner.mutation(api.maintenance.controller.approve, {
      proposalId: reply.id,
      expectedVersion: reply.version,
      fault: "none",
    });
    expect(same).toBe(operationId);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    let updated = await owner.query(api.maintenance.controller.detail, {
      caseId,
    });
    expect(updated.outbox).toHaveLength(1);
    expect(updated.operations[0].status).toBe("succeeded");
    await owner.mutation(api.maintenance.controller.editProposal, {
      proposalId: reply.id,
      expectedVersion: reply.version,
      content: "Edited German reply",
    });
    updated = await owner.query(api.maintenance.controller.detail, { caseId });
    expect(updated.proposals.find((p) => p.id === reply.id)).toMatchObject({
      version: 2,
      status: "draft",
    });
    expect(updated.outbox).toHaveLength(1);
  });

  it("holds unidentified and unsupported requests for manual review", async () => {
    const { t, owner, organizationId } = await setup();
    const unknown = await owner.mutation(api.maintenance.controller.simulate, {
      organizationId,
      scenario: "unknown_sender",
    });
    let detail = await owner.query(api.maintenance.controller.detail, {
      caseId: unknown.caseId,
    });
    expect(detail.unitId).toBeUndefined();
    expect(detail.sources).toEqual([]);
    expect(detail.missingInformation).toContainEqual(
      expect.stringContaining("not uniquely linked"),
    );
    const work = detail.proposals.find((p) => p.kind === "work_order")!;
    const refs = await owner.query(api.maintenance.controller.references, {
      organizationId,
    });
    await expect(
      owner.mutation(api.maintenance.controller.approve, {
        proposalId: work.id,
        expectedVersion: 1,
        contractorId: refs.contractors[0].id,
        fault: "none",
      }),
    ).rejects.toThrow("Match a valid unit");
    await owner.mutation(api.maintenance.controller.matchUnit, {
      caseId: unknown.caseId,
      expectedRevision: detail.revision,
      unitId: refs.units[0].id,
    });
    detail = await owner.query(api.maintenance.controller.detail, {
      caseId: unknown.caseId,
    });
    expect(detail.unitId).toBe(refs.units[0].id);
    const missing = await owner.mutation(api.maintenance.controller.simulate, {
      organizationId,
      scenario: "missing_knowledge",
    });
    const missingDetail = await owner.query(api.maintenance.controller.detail, {
      caseId: missing.caseId,
    });
    expect(missingDetail.sources).toEqual([]);
    expect(missingDetail.missingInformation).toContainEqual(
      expect.stringContaining("No relevant"),
    );
    const outsider = t.withIdentity({ subject: "owner-b" });
    const otherOrganization = await outsider.mutation(
      api.organizations.controller.createDemo,
      {},
    );
    await outsider.mutation(api.demo.controller.initialize, {
      organizationId: otherOrganization,
    });
    const otherRefs = await outsider.query(
      api.maintenance.controller.references,
      { organizationId: otherOrganization },
    );
    await expect(
      owner.mutation(api.maintenance.controller.matchUnit, {
        caseId: missing.caseId,
        expectedRevision: missingDetail.revision,
        unitId: otherRefs.units[0].id,
      }),
    ).rejects.toThrow("Select a unit");
  });

  it("retries transient simulated delivery, exhausts persistent failures, and manually recovers", async () => {
    vi.useFakeTimers();
    const { t, owner, organizationId } = await setup();
    const { caseId } = await owner.mutation(
      api.maintenance.controller.simulate,
      { organizationId, scenario: "heating" },
    );
    const detail = await owner.query(api.maintenance.controller.detail, {
      caseId,
    });
    const [reply, work] = [
      detail.proposals.find((p) => p.kind === "reply")!,
      detail.proposals.find((p) => p.kind === "work_order")!,
    ];
    const refs = await owner.query(api.maintenance.controller.references, {
      organizationId,
    });
    await owner.mutation(api.maintenance.controller.approve, {
      proposalId: reply.id,
      expectedVersion: 1,
      fault: "transient",
    });
    const operationId = await owner.mutation(
      api.maintenance.controller.approve,
      {
        proposalId: work.id,
        expectedVersion: 1,
        contractorId: refs.contractors[0].id,
        fault: "persistent",
      },
    );
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    let updated = await owner.query(api.maintenance.controller.detail, {
      caseId,
    });
    expect(updated.operations.find((o) => o.kind === "reply")).toMatchObject({
      status: "succeeded",
      attempts: 2,
    });
    expect(updated.operations.find((o) => o.id === operationId)).toMatchObject({
      status: "failed",
      attempts: 4,
    });
    expect(updated.outbox).toHaveLength(1);
    expect(updated.workOrders[0].status).toBe("dispatch_pending");
    await owner.mutation(api.maintenance.controller.retry, { operationId });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    updated = await owner.query(api.maintenance.controller.detail, { caseId });
    expect(updated.operations.find((o) => o.id === operationId)?.status).toBe(
      "succeeded",
    );
    expect(updated.outbox).toHaveLength(2);
    expect(updated.workOrders[0].status).toBe("dispatched");
  });

  it("makes old-generation jobs inert after a confirmed reset", async () => {
    vi.useFakeTimers();
    const { t, owner, organizationId } = await setup();
    const { caseId } = await owner.mutation(
      api.maintenance.controller.simulate,
      { organizationId, scenario: "heating" },
    );
    const detail = await owner.query(api.maintenance.controller.detail, {
      caseId,
    });
    const reply = detail.proposals.find((p) => p.kind === "reply")!;
    const operationId = await owner.mutation(
      api.maintenance.controller.approve,
      { proposalId: reply.id, expectedVersion: 1, fault: "none" },
    );
    await expect(
      owner.mutation(api.demo.controller.reset, {
        organizationId,
        expectedGeneration: 1,
        confirmation: "wrong",
      }),
    ).rejects.toThrow("RESET");
    await owner.mutation(api.demo.controller.reset, {
      organizationId,
      expectedGeneration: 1,
      confirmation: "RESET",
    });
    await expect(
      owner.query(api.maintenance.controller.detail, { caseId }),
    ).rejects.toThrow("earlier demo");
    await t.mutation(internal.workflows.demoDelivery.run, { operationId });
    const oldOutbox = await t.run((ctx) => ctx.db.query("outbox").collect());
    expect(oldOutbox).toEqual([]);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const current = await owner.query(
      api.organizations.controller.currentDemo,
      {},
    );
    expect(current).toMatchObject({ generation: 2, seeded: true });
    const records = await owner.query(api.properties.controller.list, {
      organizationId,
    });
    expect(records).toHaveLength(2);
    const prior = await t.run((ctx) => ctx.db.get(caseId));
    expect(prior).toBeNull();
  });

  it("invalidates a queued approval when its draft changes", async () => {
    vi.useFakeTimers();
    const { t, owner, organizationId } = await setup();
    const { caseId } = await owner.mutation(
      api.maintenance.controller.simulate,
      { organizationId, scenario: "heating" },
    );
    const detail = await owner.query(api.maintenance.controller.detail, {
      caseId,
    });
    const reply = detail.proposals.find((p) => p.kind === "reply")!;
    const operationId = await owner.mutation(
      api.maintenance.controller.approve,
      { proposalId: reply.id, expectedVersion: 1, fault: "none" },
    );
    await owner.mutation(api.maintenance.controller.editProposal, {
      proposalId: reply.id,
      expectedVersion: 1,
      content: "A revised reply that needs review",
    });
    await t.mutation(internal.workflows.demoDelivery.run, { operationId });
    const updated = await owner.query(api.maintenance.controller.detail, {
      caseId,
    });
    expect(
      updated.operations.find((operation) => operation.id === operationId)
        ?.status,
    ).toBe("canceled");
    expect(updated.outbox).toEqual([]);
    expect(
      updated.proposals.find((proposal) => proposal.id === reply.id),
    ).toMatchObject({ version: 2, status: "draft" });
  });

  it("suppresses a scheduled follow-up after resolution and rejects another organization's contractor", async () => {
    vi.useFakeTimers();
    const { t, owner, organizationId } = await setup();
    const { caseId } = await owner.mutation(
      api.maintenance.controller.simulate,
      { organizationId, scenario: "heating" },
    );
    const detail = await owner.query(api.maintenance.controller.detail, {
      caseId,
    });
    const work = detail.proposals.find(
      (proposal) => proposal.kind === "work_order",
    )!;
    const other = t.withIdentity({ subject: "owner-b" });
    const otherOrganizationId = await other.mutation(
      api.organizations.controller.createDemo,
      {},
    );
    await other.mutation(api.demo.controller.initialize, {
      organizationId: otherOrganizationId,
    });
    const otherRefs = await other.query(api.maintenance.controller.references, {
      organizationId: otherOrganizationId,
    });
    await expect(
      owner.mutation(api.maintenance.controller.approve, {
        proposalId: work.id,
        expectedVersion: 1,
        contractorId: otherRefs.contractors[0].id,
        fault: "none",
      }),
    ).rejects.toThrow("Select a contractor");
    const refs = await owner.query(api.maintenance.controller.references, {
      organizationId,
    });
    const operationId = await owner.mutation(
      api.maintenance.controller.approve,
      {
        proposalId: work.id,
        expectedVersion: 1,
        contractorId: refs.contractors[0].id,
        fault: "none",
      },
    );
    await t.mutation(internal.workflows.demoDelivery.run, { operationId });
    let updated = await owner.query(api.maintenance.controller.detail, {
      caseId,
    });
    expect(updated.workOrders[0].status).toBe("dispatched");
    await owner.mutation(api.maintenance.controller.transition, {
      caseId,
      expectedRevision: updated.revision,
      status: "resolved",
      note: "Contractor completed the repair.",
    });
    updated = await owner.query(api.maintenance.controller.detail, { caseId });
    await t.mutation(internal.workflows.demoDelivery.remind, {
      workOrderId: updated.workOrders[0].id,
    });
    updated = await owner.query(api.maintenance.controller.detail, { caseId });
    expect(updated.workOrders[0]).toMatchObject({
      status: "completed",
      reminderRaised: false,
    });
    expect(
      updated.timeline.some((entry) =>
        entry.message.includes("Follow-up reminder"),
      ),
    ).toBe(false);
  });
});
