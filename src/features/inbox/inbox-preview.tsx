"use client";

import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Search,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { previewCases } from "./preview-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function InboxPreview() {
  const [selectedId, setSelectedId] = useState<string>("heating");
  const [search, setSearch] = useState("");
  const filtered = previewCases.filter((item) =>
    `${item.sender} ${item.subject} ${item.property}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const selected =
    filtered.find((item) => item.id === selectedId) ?? filtered[0];
  return (
    <>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-[.16em] text-primary uppercase">
            Your daily overview
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            A little clarity. A lot of care.
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Every tenant request, with the context to take the next step.
          </p>
        </div>
        <span className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
          Illustrative data · 27 September
        </span>
      </div>
      <div className="mb-7 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Open requests", value: "03", note: "Across 2 properties" },
          {
            label: "Ready for review",
            value: "03",
            note: "Manager approval comes first",
          },
          {
            label: "Connected properties",
            value: "02",
            note: "Synthetic portfolio fixtures",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-border bg-card p-5"
          >
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {item.value}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
          <h2 className="font-semibold">
            Maintenance inbox{" "}
            <span className="ml-2 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
              3
            </span>
          </h2>
          <div className="relative w-full sm:w-64">
            <Search
              size={16}
              className="absolute top-3.5 left-3 text-muted-foreground"
            />
            <label htmlFor="inbox-search" className="sr-only">
              Search requests
            </label>
            <Input
              id="inbox-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search requests…"
              className="pl-9"
            />
          </div>
        </div>
        <div className="grid xl:grid-cols-[330px_1fr]">
          <div
            className="border-b border-border xl:border-r xl:border-b-0"
            aria-label="Maintenance requests"
          >
            {filtered.length === 0 && (
              <p className="p-6 text-sm text-muted-foreground">
                No requests match your search.
              </p>
            )}
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                aria-pressed={selected?.id === item.id}
                className={cn(
                  "block w-full border-b border-border p-5 text-left transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  selected?.id === item.id &&
                    "border-l-2 border-l-primary bg-accent/40",
                )}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">{item.sender}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.time}
                  </span>
                </div>
                <p className="text-sm leading-6 font-medium">{item.subject}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.property}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-md px-2 py-1 text-[11px] font-medium",
                      item.priority === "High"
                        ? "bg-amber-50 text-amber-800"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {item.priority} priority
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Needs review
                  </span>
                </div>
              </button>
            ))}
          </div>
          {selected ? (
            <article className="p-5 lg:p-7">
              <div className="mb-5 flex items-center gap-2 text-xs text-muted-foreground">
                Inbox
                <ChevronRight size={12} />
                {selected.category}
              </div>
              <h2 className="text-xl font-semibold tracking-tight">
                {selected.subject}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {selected.property}
              </p>
              <div className="mt-7 flex gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
                  {selected.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {selected.sender}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      Tenant · email
                    </span>
                  </p>
                  <p
                    lang="de"
                    className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground"
                  >
                    {selected.body}
                  </p>
                </div>
              </div>
              <section className="mt-7 rounded-xl border border-primary/20 bg-accent/40 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Sparkles size={16} />
                    Suggested next step
                  </h3>
                  <span className="text-[11px] text-muted-foreground">
                    Simulated assistant
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6">{selected.summary}</p>
                <div className="mt-4 rounded-lg border border-border bg-card p-3">
                  <p className="flex items-center gap-2 text-xs font-semibold">
                    <BookOpen size={14} />
                    {selected.source}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {selected.note}
                  </p>
                </div>
                <p className="mt-4 text-xs leading-5 text-muted-foreground">
                  This is a read-only preview. Live triage, replies, and
                  work-order approvals are planned for the next phases.
                </p>
              </section>
              <div className="mt-6 flex justify-end">
                <Button asChild>
                  <Link href="/workspace">
                    Explore your workspace
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </article>
          ) : (
            <div className="p-8 text-sm text-muted-foreground">
              Try searching for a tenant name, property, or issue.
            </div>
          )}
        </div>
      </div>
      <p className="mt-5 text-xs text-muted-foreground">
        All names, messages, and property records shown here are synthetic. No
        messages are sent.
      </p>
    </>
  );
}
