# Backend scaffold

Implemented features: organizations, properties, seeded demo data, maintenance cases, reviewed proposals, and simulated delivery. The main features use controller, service, repository, DTO, and model modules. Services enforce membership and owner-only setup/reset. Indexed repositories isolate current-generation records. Convex's generated types are committed and regenerated with `pnpm codegen`.

Authentication requires a Clerk JWT template named `convex` and `CLERK_JWT_ISSUER_DOMAIN` set in the Convex deployment. Set up these values before deploying functions. `pnpm backend` starts the interactive development deployment setup.

The demo uses deterministic triage and Convex scheduled mutations for simulated delivery, retries, reminders, and bounded reset cleanup. No external messages are sent. CSV imports use Convex storage, staged rows, and scheduled apply batches; a signed live email webhook, live AI, and provider-backed durable workflows belong to later phases. See `docs/ARCHITECTURE.md`.
