import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.{ts,js}");

describe("organization-scoped property access", () => {
  it("rejects anonymous workspace creation", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.organizations.controller.createDemo, {}),
    ).rejects.toThrow("UNAUTHENTICATED");
  });

  it("creates one personal workspace and persists trimmed buildings", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: "owner-a" });
    const organizationId = await owner.mutation(
      api.organizations.controller.createDemo,
      {},
    );
    expect(
      await owner.mutation(api.organizations.controller.createDemo, {}),
    ).toBe(organizationId);
    await owner.mutation(api.properties.controller.create, {
      organizationId,
      name: "  Lindenhof  ",
      address: "  Lindenstraße 12  ",
    });
    const buildings = await owner.query(api.properties.controller.list, {
      organizationId,
    });
    expect(buildings).toMatchObject([
      { name: "Lindenhof", address: "Lindenstraße 12" },
    ]);
    expect(buildings[0]).not.toHaveProperty("createdBy");
  });

  it("denies reads and writes using a different organization's ID", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: "owner-a" });
    const outsider = t.withIdentity({ subject: "owner-b" });
    const organizationId = await owner.mutation(
      api.organizations.controller.createDemo,
      {},
    );
    await expect(
      outsider.query(api.properties.controller.list, { organizationId }),
    ).rejects.toThrow("FORBIDDEN");
    await expect(
      outsider.mutation(api.properties.controller.create, {
        organizationId,
        name: "Intrusion",
        address: "No access",
      }),
    ).rejects.toThrow("FORBIDDEN");
  });

  it("lets managers read but not create; revoked membership denies subsequent reads", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: "owner-a" });
    const manager = t.withIdentity({ subject: "manager-a" });
    const organizationId = await owner.mutation(
      api.organizations.controller.createDemo,
      {},
    );
    const membershipId = await t.run((ctx) =>
      ctx.db.insert("memberships", {
        organizationId,
        userSubject: "manager-a",
        role: "manager",
      }),
    );
    expect(
      await manager.query(api.properties.controller.list, { organizationId }),
    ).toEqual([]);
    await expect(
      manager.mutation(api.properties.controller.create, {
        organizationId,
        name: "Denied",
        address: "Owner only",
      }),
    ).rejects.toThrow("FORBIDDEN");
    await t.run((ctx) => ctx.db.delete(membershipId));
    await expect(
      manager.query(api.properties.controller.list, { organizationId }),
    ).rejects.toThrow("FORBIDDEN");
  });

  it("rejects whitespace-only names without writing a record", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: "owner-a" });
    const organizationId = await owner.mutation(
      api.organizations.controller.createDemo,
      {},
    );
    await expect(
      owner.mutation(api.properties.controller.create, {
        organizationId,
        name: "   ",
        address: "Example",
      }),
    ).rejects.toThrow("INVALID_INPUT");
    expect(
      await owner.query(api.properties.controller.list, { organizationId }),
    ).toEqual([]);
  });
});
