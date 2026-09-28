export function isWorkspaceConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_CONVEX_URL &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  );
}
