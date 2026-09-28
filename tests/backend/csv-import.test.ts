import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.{ts,js}");

async function setup() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "import-owner" });
  const organizationId = await owner.mutation(
    api.organizations.controller.createDemo,
    {},
  );
  const jobId = await t.run(async (ctx) =>
    ctx.db.insert("importJobs", {
      organizationId,
      generation: 1,
      kind: "buildings",
      fileName: "buildings.csv",
      status: "parsing",
      createdBy: "import-owner",
      rowCount: 0,
      validCount: 0,
      invalidCount: 0,
      processedCount: 0,
      importedCount: 0,
      updatedCount: 0,
      unchangedCount: 0,
    }),
  );
  return { t, owner, organizationId, jobId };
}

describe("CSV import", () => {
  it("previews validation errors and rejects another organization's access", async () => {
    const { t, owner, jobId } = await setup();
    await t.mutation(internal.imports.controller.stage, {
      jobId,
      rows: [
        {
          rowNumber: 2,
          fields: { external_id: "b-1", name: "House", address: "Main 1" },
        },
        {
          rowNumber: 3,
          fields: { external_id: "b-1", name: "Copy", address: "Main 2" },
        },
        {
          rowNumber: 4,
          fields: { external_id: "b-2", name: "", address: "Main 3" },
        },
      ],
    });
    await t.mutation(internal.imports.controller.finish, { jobId });
    const detail = await owner.query(api.imports.controller.detail, { jobId });
    expect([
      detail.job.rowCount,
      detail.job.validCount,
      detail.job.invalidCount,
    ]).toEqual([3, 1, 2]);
    expect(detail.invalid.map((row) => row.error)).toEqual(
      expect.arrayContaining([
        "Duplicate external_id in this file.",
        "name is required.",
      ]),
    );
    const outsider = t.withIdentity({ subject: "outsider" });
    await expect(
      outsider.query(api.imports.controller.detail, { jobId }),
    ).rejects.toThrow("FORBIDDEN");
    await expect(
      outsider.mutation(api.imports.controller.confirm, { jobId }),
    ).rejects.toThrow("FORBIDDEN");
  });

  it("applies valid rows once and re-imports an identical record unchanged", async () => {
    vi.useFakeTimers();
    const { t, owner, organizationId, jobId } = await setup();
    const row = {
      rowNumber: 2,
      fields: { external_id: "b-1", name: "House", address: "Main 1" },
    };
    await t.mutation(internal.imports.controller.stage, { jobId, rows: [row] });
    await t.mutation(internal.imports.controller.finish, { jobId });
    await owner.mutation(api.imports.controller.confirm, { jobId });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const first = await owner.query(api.imports.controller.detail, { jobId });
    expect([first.job.status, first.job.importedCount]).toEqual([
      "completed",
      1,
    ]);
    expect(
      first.events.some((event) => event.message === "Import completed."),
    ).toBe(true);
    const secondJob = await t.run(async (ctx) =>
      ctx.db.insert("importJobs", {
        organizationId,
        generation: 1,
        kind: "buildings",
        fileName: "again.csv",
        status: "parsing",
        createdBy: "import-owner",
        rowCount: 0,
        validCount: 0,
        invalidCount: 0,
        processedCount: 0,
        importedCount: 0,
        updatedCount: 0,
        unchangedCount: 0,
      }),
    );
    await t.mutation(internal.imports.controller.stage, {
      jobId: secondJob,
      rows: [row],
    });
    await t.mutation(internal.imports.controller.finish, { jobId: secondJob });
    await owner.mutation(api.imports.controller.confirm, { jobId: secondJob });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const second = await owner.query(api.imports.controller.detail, {
      jobId: secondJob,
    });
    expect([second.job.importedCount, second.job.unchangedCount]).toEqual([
      0, 1,
    ]);
    const buildings = await t.run((ctx) => ctx.db.query("buildings").collect());
    expect(
      buildings.filter((building) => building.externalId === "b-1"),
    ).toHaveLength(1);
    vi.useRealTimers();
  });

  it("blocks missing parent references in the preview", async () => {
    const { t, owner, organizationId } = await setup();
    const unitJob = await t.run(async (ctx) =>
      ctx.db.insert("importJobs", {
        organizationId,
        generation: 1,
        kind: "units",
        fileName: "units.csv",
        status: "parsing",
        createdBy: "import-owner",
        rowCount: 0,
        validCount: 0,
        invalidCount: 0,
        processedCount: 0,
        importedCount: 0,
        updatedCount: 0,
        unchangedCount: 0,
      }),
    );
    await t.mutation(internal.imports.controller.stage, {
      jobId: unitJob,
      rows: [
        {
          rowNumber: 2,
          fields: {
            external_id: "u-1",
            building_external_id: "missing",
            label: "1A",
          },
        },
      ],
    });
    await t.mutation(internal.imports.controller.finish, { jobId: unitJob });
    const detail = await owner.query(api.imports.controller.detail, {
      jobId: unitJob,
    });
    expect(detail.invalid[0].error).toContain("Import buildings first");
  });
});
