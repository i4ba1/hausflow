import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export async function requireIdentity(ctx: Pick<QueryCtx, "auth">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity)
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Sign in to continue.",
    });
  return identity;
}

export async function requireMembership(
  ctx: QueryCtx,
  organizationId: Id<"organizations">,
  requiredRole?: "owner",
) {
  const identity = await requireIdentity(ctx);
  const membership = await ctx.db
    .query("memberships")
    .withIndex("by_user_organization", (q) =>
      q
        .eq("userSubject", identity.subject)
        .eq("organizationId", organizationId),
    )
    .unique();
  const organization = membership ? await ctx.db.get(organizationId) : null;
  if (
    !membership ||
    !organization ||
    (requiredRole && membership.role !== requiredRole)
  ) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "You do not have access to this operation.",
    });
  }
  return { identity, membership, organization };
}
