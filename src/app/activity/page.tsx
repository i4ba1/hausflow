import { PhasePage } from "@/components/phase-page";
export default function ActivityPage() {
  return (
    <PhasePage
      title="Every step, accounted for."
      description="A place to understand how requests move forward, where processing failed, and what needs your attention."
      phase="Phases 1–2 · Planned"
      items={[
        "A chronological history of messages, approvals, and status changes.",
        "Durable workflow progress, retry counts, and clear failure states.",
        "Scoped audit events and model usage, visible only to your organization.",
      ]}
    />
  );
}
