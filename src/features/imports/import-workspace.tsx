"use client";

import { useState } from "react";
import {
  AuthLoading,
  Authenticated,
  Unauthenticated,
  useConvex,
  useMutation,
  useQuery,
} from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

type Kind = "buildings" | "units" | "tenants";
const templates: Record<Kind, string> = {
  buildings: "external_id,name,address\nb-001,Example House,Main Street 1\n",
  units: "external_id,building_external_id,label\nu-001,b-001,1A\n",
  tenants:
    "external_id,unit_external_id,name,email,phone\nt-001,u-001,Alex Example,alex@example.com,\n",
};
function download(name: string, value: string) {
  const url = URL.createObjectURL(
    new Blob([value], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}

function ImportContent() {
  const organization = useQuery(api.organizations.controller.currentDemo, {});
  const create = useMutation(api.organizations.controller.createDemo);
  const generateUploadUrl = useMutation(
    api.imports.controller.generateUploadUrl,
  );
  const begin = useMutation(api.imports.controller.begin);
  const confirm = useMutation(api.imports.controller.confirm);
  const convex = useConvex();
  const [kind, setKind] = useState<Kind>("buildings");
  const [file, setFile] = useState<File | null>(null);
  const [selected, setSelected] = useState<Id<"importJobs"> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const jobs = useQuery(
    api.imports.controller.list,
    organization ? { organizationId: organization.id } : "skip",
  );
  const detail = useQuery(
    api.imports.controller.detail,
    selected ? { jobId: selected } : "skip",
  );
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Import failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function upload() {
    if (!organization || !file) return;
    await run(async () => {
      if (
        file.size === 0 ||
        file.size > 5 * 1024 * 1024 ||
        !file.name.toLowerCase().endsWith(".csv")
      )
        throw new Error("Choose a .csv file between 1 byte and 5 MiB.");
      const url = await generateUploadUrl({ organizationId: organization.id });
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: file,
      });
      if (!response.ok) throw new Error("Upload failed. Try again.");
      const { storageId } = (await response.json()) as {
        storageId: Id<"_storage">;
      };
      const jobId = await begin({
        organizationId: organization.id,
        generation: organization.generation,
        kind,
        fileName: file.name,
        storageId,
      });
      setSelected(jobId);
      setFile(null);
      setNotice("CSV uploaded. Preview is being prepared.");
    });
  }
  async function downloadErrors(jobId: Id<"importJobs">) {
    await run(async () => {
      const rows: string[] = ["row_number,external_id,error_code,error"];
      let cursor: string | undefined;
      do {
        const result = await convex.query(api.imports.controller.errors, {
          jobId,
          cursor,
        });
        rows.push(
          ...result.page.map((row) =>
            [
              String(row.rowNumber),
              row.externalId,
              row.errorCode ?? "",
              row.error ?? "",
            ]
              .map(csvCell)
              .join(","),
          ),
        );
        cursor = result.isDone ? undefined : result.continueCursor;
      } while (cursor);
      download("hausflow-import-errors.csv", rows.join("\r\n") + "\r\n");
    });
  }
  if (organization === undefined) return <p role="status">Loading imports…</p>;
  if (!organization)
    return (
      <section className="rounded-2xl border bg-card p-7">
        <h1 className="text-2xl font-semibold">
          Create a workspace to import records
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Imports are private to your personal demo workspace.
        </p>
        <Button
          className="mt-5"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await create({});
            })
          }
        >
          Create workspace
        </Button>
        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </section>
    );
  return (
    <div className="space-y-7">
      <header>
        <p className="text-xs font-semibold tracking-widest text-primary uppercase">
          CSV migration
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Import property records</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Import buildings first, then units, then tenants. Preview validates
          rows before applying changes.
        </p>
      </header>
      <section className="rounded-2xl border bg-card p-6">
        <h2 className="font-semibold">New import</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-sm" htmlFor="import-kind">
            Record type
          </label>
          <select
            id="import-kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as Kind)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="buildings">Buildings</option>
            <option value="units">Units</option>
            <option value="tenants">Tenants</option>
          </select>
          <Button
            variant="outline"
            onClick={() =>
              download(`hausflow-${kind}-template.csv`, templates[kind])
            }
          >
            Download template
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Use UTF-8 CSV with exact template columns. Maximum 5 MiB or 10,000
          rows. External IDs identify records on repeat imports.
        </p>
        <input
          aria-label="CSV file"
          className="mt-5 block w-full text-sm"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <Button className="mt-4" disabled={!file || busy} onClick={upload}>
          {busy ? "Working…" : "Upload and preview"}
        </Button>
      </section>
      {notice && (
        <p role="status" className="text-sm text-primary">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <section className="rounded-2xl border bg-card p-6">
        <h2 className="font-semibold">Import history</h2>
        {!jobs?.length && (
          <p className="mt-3 text-sm text-muted-foreground">No imports yet.</p>
        )}
        <div className="mt-4 space-y-2">
          {jobs?.map((job) => (
            <button
              key={job._id}
              onClick={() => setSelected(job._id)}
              className="flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm hover:bg-muted"
              aria-pressed={selected === job._id}
            >
              <span>
                {job.fileName} · {job.kind}
              </span>
              <span className="capitalize">{job.status}</span>
            </button>
          ))}
        </div>
      </section>
      {detail && (
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="font-semibold">{detail.job.fileName}</h2>
          <p className="mt-2 text-sm capitalize">Status: {detail.job.status}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {detail.job.rowCount} rows · {detail.job.validCount} valid ·{" "}
            {detail.job.invalidCount} invalid · {detail.job.processedCount}{" "}
            processed
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {detail.job.importedCount} created · {detail.job.updatedCount}{" "}
            updated · {detail.job.unchangedCount} unchanged
          </p>
          {detail.job.error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {detail.job.error}
            </p>
          )}
          {detail.invalid.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold">Invalid rows</h3>
              <ul className="mt-2 space-y-2 text-sm text-destructive">
                {detail.invalid.map((row) => (
                  <li key={row._id}>
                    Row {row.rowNumber}: {row.error}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="mt-4"
                disabled={busy}
                onClick={() => downloadErrors(detail.job._id)}
              >
                Download all errors
              </Button>
            </div>
          )}
          {detail.job.status === "ready" && (
            <Button
              className="mt-5"
              disabled={busy || detail.job.validCount === 0}
              onClick={() =>
                run(async () => {
                  await confirm({ jobId: detail.job._id });
                  setNotice("Import started.");
                })
              }
            >
              Import {detail.job.validCount} valid rows
            </Button>
          )}
          {detail.events.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-sm font-semibold">Import activity</h3>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {detail.events.map((event) => (
                  <li key={event._id}>
                    {new Date(event._creationTime).toLocaleString()} ·{" "}
                    {event.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export function ImportWorkspace() {
  return (
    <>
      <AuthLoading>
        <p role="status">Checking your session…</p>
      </AuthLoading>
      <Unauthenticated>
        <section className="rounded-2xl border bg-card p-7">
          <h1 className="text-2xl font-semibold">Sign in to import records</h1>
          <SignInButton mode="modal">
            <Button className="mt-5">Sign in</Button>
          </SignInButton>
        </section>
      </Unauthenticated>
      <Authenticated>
        <ImportContent />
      </Authenticated>
    </>
  );
}
