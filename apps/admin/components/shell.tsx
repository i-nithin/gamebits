"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import {
  BarChart3Icon,
  CalendarIcon,
  Gamepad2Icon,
  LayersIcon,
  LayoutDashboardIcon,
  ShapesIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react";

import type { StaffRole } from "@gamebits/auth/roles";

const NAV: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboardIcon;
  min: StaffRole;
}> = [
  { href: "/", label: "Overview", icon: LayoutDashboardIcon, min: "editor" },
  { href: "/week", label: "This week", icon: CalendarIcon, min: "editor" },
  { href: "/games", label: "Games", icon: Gamepad2Icon, min: "editor" },
  { href: "/platforms", label: "Platforms", icon: LayersIcon, min: "editor" },
  { href: "/categories", label: "Categories", icon: ShapesIcon, min: "editor" },
  { href: "/analytics", label: "Analytics", icon: BarChart3Icon, min: "admin" },
  { href: "/users", label: "Users", icon: UsersIcon, min: "admin" },
  { href: "/staff", label: "Staff", icon: ShieldIcon, min: "owner" },
];

const RANK: Record<StaffRole, number> = { editor: 1, admin: 2, owner: 3 };

function active(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({
  role,
  children,
}: {
  role: StaffRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const items = NAV.filter((item) => RANK[role] >= RANK[item.min]);

  return (
    <div className="flex min-h-dvh">
      <aside className="flex w-56 shrink-0 flex-col border-r border-white/10 bg-obsidian">
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
          <span className="size-2.5 rounded-full bg-ice" />
          <div>
            <p className="text-sm font-medium">GameBits</p>
            <p className="text-[11px] tracking-wide text-fog uppercase">Operator</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {items.map((item) => {
            const Icon = item.icon;
            const on = active(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm ${
                  on ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 px-4 py-3 text-xs text-fog capitalize">{role}</div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-end border-b border-white/10 px-6">
          <UserButton />
        </header>
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-fog">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-charcoal px-4 py-3">
      <p className="text-xs tracking-wide text-fog uppercase">{label}</p>
      <p className="mt-1 font-mono text-2xl">{value}</p>
    </div>
  );
}

export function Forbidden({ need }: { need: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-charcoal p-6">
      <h1 className="text-lg font-medium">Restricted</h1>
      <p className="mt-1 text-sm text-fog">This page is limited to {need}.</p>
    </div>
  );
}
