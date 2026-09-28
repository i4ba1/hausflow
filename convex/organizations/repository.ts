import type { MutationCtx, QueryCtx } from "../_generated/server";

export function findPersonalDemo(ctx: QueryCtx, subject: string) {
  return ctx.db
    .query("organizations")
    .withIndex("by_owner_mode", (q) =>
      q.eq("ownerSubject", subject).eq("mode", "demo"),
    )
    .unique();
}

export async function insertPersonalDemo(ctx: MutationCtx, subject: string) {
  const organizationId = await ctx.db.insert("organizations", {
    name: "My demo workspace",
    mode: "demo",
    ownerSubject: subject,
    generation: 1,
  });
  await ctx.db.insert("memberships", {
    organizationId,
    userSubject: subject,
    role: "owner",
  });
  return organizationId;
}
