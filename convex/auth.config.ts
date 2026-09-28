import type { AuthConfig } from "convex/server";

const issuer = process.env.CLERK_JWT_ISSUER_DOMAIN;
if (!issuer) {
  throw new Error(
    "Set CLERK_JWT_ISSUER_DOMAIN in the Convex deployment environment before enabling authentication.",
  );
}

export default {
  providers: [{ domain: issuer, applicationID: "convex" }],
} satisfies AuthConfig;
