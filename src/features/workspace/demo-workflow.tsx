"use client";

import { useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import {
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type OrganizationId = Id<"organizations">;
type CaseId = Id<"maintenanceCases">;
type Scenario = "heating" | "unknown_sender" | "missing_knowledge";
type Fault = "none" | "transient" | "persistent";

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function CaseView({
  caseId,
  organizationId,
}: {
  caseId: CaseId;
  organizationId: OrganizationId;
}) {
  const record = useQuery(api.maintenance.controller.detail, { caseId });
  const referenceData = useQuery(api.maintenance.controller.references, {
    organizationId,
  });
  const editProposal = useMutation(api.maintenance.controller.editProposal);
  const rejectProposal = useMutation(api.maintenance.controller.rejectProposal);
  const approve = useMutation(api.maintenance.controller.approve);
  const retry = useMutation(api.maintenance.controller.retry);
  const matchUnit = useMutation(api.maintenance.controller.matchUnit);
  const assign = useMutation(api.maintenance.controller.assignToMe);
  const transition = useMutation(api.maintenance.controller.transition);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [matchId, setMatchId] = useState("");
  const [note, setNote] = useState("");

  async function act(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "This action failed. Refresh and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (record === undefined || referenceData === undefined)
    return (
      <p role="status" className="p-6 text-sm text-muted-foreground">
        Loading caseâ€¦
      </p>
    );
  const closed = record.status === "resolved" || record.status === "canceled";
  return (
    <div className="p-5 lg:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">
          Maintenance case
        </p>
        <span className="rounded-md bg-muted px-2 py-1 text-xs capitalize">
          {statusLabel(record.status)}
        </span>
      </div>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">
        {record.subject}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {record.senderName} Â· {record.unitLabel} Â· {record.urgency} priority
      </p>
      <div className="mt-5 space-y-3">
        {record.messages.map((message) => (
          <div
            key={message.id}
            className="rounded-xl border border-border bg-background p-4"
          >
            <p className="text-xs font-medium text-muted-foreground">
              {message.direction === "inbound"
                ? "Incoming simulated email Â· " + message.sender
                : "Simulated outgoing reply"}
            </p>
            <p
              className="mt-2 whitespace-pre-wrap text-sm leading-6"
              lang={message.direction === "inbound" ? "de" : undefined}
            >
              {message.body}
            </p>
          </div>
        ))}
      </div>
      <section className="mt-5 rounded-xl border border-primary/20 bg-accent/40 p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Sparkles size={16} />
          Deterministic assistant suggestion
        </h3>
        <p className="mt-3 text-sm leading-6">{record.summary}</p>
        {record.missingInformation.length > 0 && (
          <ul className="mt-3 space-y-1 text-xs text-amber-800">
            {record.missingInformation.map((item) => (
              <li key={item}>Needs review: {item}</li>
            ))}
          </ul>
        )}
        <div className="mt-4 space-y-2">
          {record.sources.length ? (
            record.sources.map((source) => (
              <div
                key={source.kind + source.id}
                className="rounded-lg border border-border bg-card p-3"
              >
                <p className="text-xs font-semibold">
                  {source.title} Â· version {source.version}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {source.excerpt}
                </p>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">
              No supporting property records found.
            </p>
          )}
        </div>
      </section>
      {!record.unitId && !closed && (
        <section className="mt-6 rounded-xl border border-border p-5">
          <h3 className="font-semibold">Match the unit</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Only a manager can choose the unit; the assistant will not guess.
          </p>
          <label htmlFor="match-unit" className="mt-4 block text-sm">
            Unit
          </label>
          <select
            id="match-unit"
            value={matchId}
            onChange={(event) => setMatchId(event.target.value)}
            className="mt-2 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
          >
            <option value="">Choose a unitâ€¦</option>
            {referenceData.units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label}
              </option>
            ))}
          </select>
          <Button
            className="mt-3"
            variant="outline"
            disabled={busy || !matchId}
            onClick={() =>
              act(
                () =>
                  matchUnit({
                    caseId,
                    unitId: matchId as Id<"units">,
                    expectedRevision: record.revision,
                  }),
                "Unit matched. Review the drafts before approving.",
              )
            }
          >
            Match unit
          </Button>
        </section>
      )}
      <section className="mt-6">
        <h3 className="font-semibold">Drafts for manager review</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Nothing leaves the app. Approvals write only to a simulated outbox.
        </p>
        <div className="mt-4 grid gap-4">
          {record.proposals.map((proposal) => (
            <DraftCard
              key={proposal.id + "-" + proposal.version}
              proposal={proposal}
              closed={closed}
              contractors={referenceData.contractors}
              unitReady={Boolean(record.unitId)}
              busy={busy}
              act={act}
              edit={editProposal}
              reject={rejectProposal}
              approve={approve}
            />
          ))}
        </div>
      </section>
      <section className="mt-7 rounded-xl border border-border p-5">
        <h3 className="font-semibold">Case controls</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {!closed && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => act(() => assign({ caseId }), "Assigned to you.")}
            >
              Assign to me
            </Button>
          )}
          {record.status === "needs_review" && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                act(
                  () =>
                    transition({
                      caseId,
                      expectedRevision: record.revision,
                      status: "in_progress",
                      note: "",
                    }),
                  "Case moved to in progress.",
                )
              }
            >
              Start work
            </Button>
          )}
          {record.status === "resolved" && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                act(
                  () =>
                    transition({
                      caseId,
                      expectedRevision: record.revision,
                      status: "needs_review",
                      note: "",
                    }),
                  "Case reopened for review.",
                )
              }
            >
              Reopen
            </Button>
          )}
        </div>
        {!closed && (
          <>
            <label htmlFor="resolution-note" className="mt-4 block text-sm">
              Resolution or cancellation note
            </label>
            <Input
              id="resolution-note"
              className="mt-2"
              value={note}
              maxLength={2000}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Describe what happened"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                disabled={busy || !note.trim()}
                onClick={() =>
                  act(
                    () =>
                      transition({
                        caseId,
                        expectedRevision: record.revision,
                        status: "resolved",
                        note,
                      }),
                    "Case resolved.",
                  )
                }
              >
                Resolve case
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  act(
                    () =>
                      transition({
                        caseId,
                        expectedRevision: record.revision,
                        status: "canceled",
                        note,
                      }),
                    "Case canceled.",
                  )
                }
              >
                Cancel case
              </Button>
            </div>
          </>
        )}
      </section>
      {record.operations.length > 0 && (
        <section className="mt-7">
          <h3 className="font-semibold">Simulated delivery</h3>
          <ul className="mt-3 space-y-3">
            {record.operations.map((operation) => (
              <li
                key={operation.id}
                className="rounded-lg border border-border p-4 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium capitalize">
                    {statusLabel(operation.kind)} Â· {operation.recipient}
                  </span>
                  <span className="capitalize">
                    {statusLabel(operation.status)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Attempts: {operation.attempts}
                </p>
                {operation.error && (
                  <p className="mt-2 text-xs text-destructive">
                    {operation.error}
                  </p>
                )}
                {operation.status === "failed" && !closed && (
                  <Button
                    className="mt-3"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      act(
                        () => retry({ operationId: operation.id }),
                        "Manual retry queued.",
                      )
                    }
                  >
                    <RotateCcw />
                    Retry simulated delivery
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {record.outbox.length > 0 && (
        <section className="mt-7">
          <h3 className="font-semibold">Simulated outbox</h3>
          <ul className="mt-3 space-y-2">
            {record.outbox.map((item) => (
              <li key={item.id} className="rounded-lg bg-muted p-3 text-xs">
                <strong className="capitalize">
                  {statusLabel(item.kind)} to {item.recipient}
                </strong>
                <p className="mt-2 whitespace-pre-wrap leading-5">
                  {item.content}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {record.workOrders.length > 0 && (
        <section className="mt-7">
          <h3 className="font-semibold">Work orders</h3>
          <ul className="mt-3 space-y-2">
            {record.workOrders.map((order) => (
              <li
                key={order.id}
                className="rounded-lg border border-border p-3 text-sm"
              >
                <strong>{order.contractorName}</strong> Â·{" "}
                <span className="capitalize">{statusLabel(order.status)}</span>
                <p className="mt-2 text-xs text-muted-foreground">
                  {order.description}
                </p>
                {order.reminderRaised && (
                  <p className="mt-2 text-xs text-primary">
                    Follow-up reminder raised.
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="mt-7">
        <h3 className="font-semibold">Activity timeline</h3>
        <ol className="mt-3 border-l border-border pl-5">
          {record.timeline.map((item) => (
            <li
              key={item.id}
              className="relative mb-4 text-xs leading-5 text-muted-foreground before:absolute before:-left-[25px] before:top-1 before:size-2 before:rounded-full before:bg-primary"
            >
              <time>{new Date(item.at).toLocaleString()}</time>
              <p className="mt-1 text-foreground">{item.message}</p>
            </li>
          ))}
        </ol>
      </section>
      {notice && (
        <p role="status" className="mt-4 flex gap-2 text-sm text-primary">
          <Check size={16} />
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 flex gap-2 text-sm text-destructive">
          <CircleAlert size={16} />
          {error}
        </p>
      )}
    </div>
  );
}

type Proposal = {
  id: Id<"proposals">;
  kind: "reply" | "work_order";
  content: string;
  version: number;
  status: string;
};
type Contractor = { id: Id<"contractors">; name: string; specialty: string };
type EditMutation = ReturnType<
  typeof useMutation<typeof api.maintenance.controller.editProposal>
>;
type RejectMutation = ReturnType<
  typeof useMutation<typeof api.maintenance.controller.rejectProposal>
>;
type ApproveMutation = ReturnType<
  typeof useMutation<typeof api.maintenance.controller.approve>
>;

function DraftCard({
  proposal,
  closed,
  contractors,
  unitReady,
  busy,
  act,
  edit,
  reject,
  approve,
}: {
  proposal: Proposal;
  closed: boolean;
  contractors: Contractor[];
  unitReady: boolean;
  busy: boolean;
  act: (action: () => Promise<unknown>, success: string) => Promise<void>;
  edit: EditMutation;
  reject: RejectMutation;
  approve: ApproveMutation;
}) {
  const [content, setContent] = useState(proposal.content);
  const [contractorId, setContractorId] = useState("");
  const [fault, setFault] = useState<Fault>("none");
  const changeable = !closed;
  return (
    <article className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold capitalize">
          {proposal.kind === "reply" ? "Tenant reply" : "Contractor work order"}
        </h4>
        <span className="text-xs capitalize text-muted-foreground">
          {proposal.status} Â· version {proposal.version}
        </span>
      </div>
      <label
        className="mt-4 block text-xs font-medium"
        htmlFor={"draft-" + proposal.id}
      >
        Draft content
      </label>
      <textarea
        id={"draft-" + proposal.id}
        className="mt-2 min-h-28 w-full rounded-lg border border-border p-3 text-sm leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={content}
        maxLength={5000}
        onChange={(event) => setContent(event.target.value)}
        disabled={!changeable}
      />
      {proposal.kind === "work_order" && (
        <>
          <label
            htmlFor={"contractor-" + proposal.id}
            className="mt-3 block text-xs font-medium"
          >
            Contractor
          </label>
          <select
            id={"contractor-" + proposal.id}
            className="mt-2 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
            value={contractorId}
            onChange={(event) => setContractorId(event.target.value)}
            disabled={!changeable}
          >
            <option value="">Choose a contractorâ€¦</option>
            {contractors.map((contractor) => (
              <option key={contractor.id} value={contractor.id}>
                {contractor.name} Â· {contractor.specialty}
              </option>
            ))}
          </select>
        </>
      )}
      <label
        htmlFor={"fault-" + proposal.id}
        className="mt-3 block text-xs font-medium"
      >
        Delivery simulation
      </label>
      <select
        id={"fault-" + proposal.id}
        className="mt-2 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm"
        value={fault}
        onChange={(event) => setFault(event.target.value as Fault)}
        disabled={!changeable}
      >
        <option value="none">Success</option>
        <option value="transient">Fail once, then retry</option>
        <option value="persistent">Fail through automatic retries</option>
      </select>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={
            busy ||
            !changeable ||
            !content.trim() ||
            content === proposal.content
          }
          onClick={() =>
            act(
              () =>
                edit({
                  proposalId: proposal.id,
                  expectedVersion: proposal.version,
                  content,
                }),
              "New draft version saved. Review and approve again.",
            )
          }
        >
          Save changes
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy || !changeable || proposal.status === "rejected"}
          onClick={() =>
            act(
              () =>
                reject({
                  proposalId: proposal.id,
                  expectedVersion: proposal.version,
                }),
              "Draft rejected.",
            )
          }
        >
          Reject
        </Button>
        <Button
          size="sm"
          disabled={
            busy ||
            !changeable ||
            proposal.status !== "draft" ||
            content !== proposal.content ||
            (proposal.kind === "work_order" && (!unitReady || !contractorId))
          }
          onClick={() =>
            act(
              () =>
                approve({
                  proposalId: proposal.id,
                  expectedVersion: proposal.version,
                  contractorId:
                    proposal.kind === "work_order"
                      ? (contractorId as Id<"contractors">)
                      : undefined,
                  fault,
                }),
              "Approved. Simulated delivery queued.",
            )
          }
        >
          <Send />
          Approve simulated {proposal.kind === "reply" ? "reply" : "work order"}
        </Button>
      </div>
      {content !== proposal.content && (
        <p className="mt-2 text-xs text-amber-800">
          Save this edit before approving.
        </p>
      )}
    </article>
  );
}

export function DemoWorkflow({
  organizationId,
  generation,
  onReset,
}: {
  organizationId: OrganizationId;
  generation: number;
  onReset: () => void;
}) {
  const { results, status, loadMore } = usePaginatedQuery(
    api.maintenance.controller.list,
    { organizationId },
    { initialNumItems: 25 },
  );
  const simulate = useMutation(api.maintenance.controller.simulate);
  const reset = useMutation(api.demo.controller.reset);
  const [selectedId, setSelectedId] = useState<CaseId | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const activeId = selectedId ?? results[0]?.id;
  async function inject(scenario: Scenario) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await simulate({ organizationId, scenario });
      setSelectedId(result.caseId);
      setNotice(
        result.duplicate
          ? "Duplicate event recognized. No new message or case was created."
          : "Simulated email received and queued for review.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not simulate this message.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function resetDemo() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await reset({
        organizationId,
        expectedGeneration: generation,
        confirmation,
      });
      setSelectedId(null);
      setConfirmation("");
      onReset();
      setNotice("Demo reset with fresh synthetic records.");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not reset the demo.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-8">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-widest text-primary uppercase">
              Sample scenarios
            </p>
            <h2 className="mt-2 text-lg font-semibold">
              Receive a tenant message
            </h2>
          </div>
          <span className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-primary">
            Simulated email and assistant
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Run a scenario twice to see duplicate prevention. All addresses use
          the .invalid domain.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => inject("heating")}
          >
            Recurring heating
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => inject("unknown_sender")}
          >
            Unknown sender
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => inject("missing_knowledge")}
          >
            Missing instructions
          </Button>
        </div>
        {notice && (
          <p role="status" className="mt-4 text-sm text-primary">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card xl:grid xl:grid-cols-[290px_1fr]">
        <div className="border-b border-border xl:border-r xl:border-b-0">
          <div className="border-b border-border p-5">
            <h2 className="font-semibold">Cases</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Your recent activity in this organization
            </p>
          </div>
          {results.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              aria-pressed={activeId === item.id}
              className={
                "w-full border-b border-border p-4 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring " +
                (activeId === item.id ? "bg-accent/50" : "")
              }
            >
              <span className="flex items-center justify-between gap-2 text-sm font-semibold">
                {item.senderName}
                <ChevronRight size={14} />
              </span>
              <span className="mt-2 block text-sm">{item.subject}</span>
              <span className="mt-2 flex items-center justify-between text-xs capitalize text-muted-foreground">
                <span>{item.unitLabel}</span>
                <span>{statusLabel(item.status)}</span>
              </span>
            </button>
          ))}
          {status === "LoadingFirstPage" && (
            <p className="p-5 text-sm" role="status">
              Loading casesâ€¦
            </p>
          )}
          {status === "CanLoadMore" && (
            <div className="p-4">
              <Button variant="outline" size="sm" onClick={() => loadMore(25)}>
                Load more
              </Button>
            </div>
          )}
        </div>
        {activeId ? (
          <CaseView caseId={activeId} organizationId={organizationId} />
        ) : (
          <p className="p-8 text-sm text-muted-foreground">
            Choose a sample scenario to begin.
          </p>
        )}
      </div>
      <section className="mt-7 rounded-xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <Clock3 size={18} />
          Reset your demo
        </h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          This removes the case history and any properties you added to this
          personal demo, then restores the seed records. Type RESET to confirm.
        </p>
        <div className="mt-4 flex max-w-md gap-2">
          <label htmlFor="reset-confirmation" className="sr-only">
            Type RESET to confirm demo reset
          </label>
          <Input
            id="reset-confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="RESET"
          />
          <Button
            variant="outline"
            disabled={busy || confirmation !== "RESET"}
            onClick={resetDemo}
          >
            <RotateCcw />
            Reset
          </Button>
        </div>
      </section>
    </section>
  );
}
