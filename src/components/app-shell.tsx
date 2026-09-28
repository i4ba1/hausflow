"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  Building2,
  House,
  Inbox,
  Layers3,
  Settings2,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "Inbox", icon: Inbox },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/imports", label: "Imports", icon: Upload },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[236px_1fr]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-card focus:p-3"
      >
        Skip to content
      </a>
      <aside className="flex flex-col border-b border-border bg-card lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
        <Link
          href="/"
          className="flex items-center gap-3 px-6 py-7 text-xl font-semibold tracking-tight"
        >
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-white">
            <House size={21} />
          </span>
          hausflow<span className="text-primary">.</span>
        </Link>
        <div className="mx-4 mb-5 hidden rounded-xl border border-border bg-background p-3 lg:block">
          <p className="text-sm font-semibold">Lindenhof Verwaltung</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Synthetic portfolio preview
          </p>
        </div>
        <nav
          aria-label="Main navigation"
          className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col"
        >
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                pathname === href && "bg-accent text-primary",
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden p-5 lg:block">
          <div className="rounded-xl bg-background p-4">
            <Layers3 className="mb-3 text-primary" size={20} />
            <p className="text-sm font-semibold">
              A foundation for better care
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              From a tenant message to a resolved maintenance case.
            </p>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">HausFlow</p>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-border bg-card/70 px-5 py-4 lg:px-9">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="size-2 rounded-full bg-primary" />
            {pathname === "/workspace"
              ? "Connected workspace"
              : "Workspace preview"}
          </div>
          <Button variant="outline" asChild>
            <Link href="/workspace">
              Open workspace
              <ArrowUpRight />
            </Link>
          </Button>
        </header>
        <main
          id="main-content"
          className="mx-auto max-w-[1500px] px-5 py-8 lg:px-9 lg:py-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
