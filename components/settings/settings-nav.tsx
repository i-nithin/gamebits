"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellIcon, ShieldIcon, UserRoundIcon, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const TABS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/settings/profile", label: "Profile", icon: UserRoundIcon },
  { href: "/settings/notifications", label: "Notifications", icon: BellIcon },
  { href: "/settings/security", label: "Security", icon: ShieldIcon },
];

function tabClass(active: boolean, mobile: boolean) {
  if (mobile) {
    return cn(
      "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
      active
        ? "border-transparent bg-graphite text-paper-white"
        : "border-iron bg-obsidian text-fog",
    );
  }
  return cn(
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm",
    active ? "bg-graphite text-paper-white" : "text-fog hover:bg-graphite/60 hover:text-paper-white",
  );
}

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <>
      <div className="sticky top-14 z-20 -mx-4 border-b border-iron bg-page px-4 py-3 md:hidden">
        <nav
          aria-label="Settings"
          className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link key={tab.href} href={tab.href} className={tabClass(active, true)} aria-current={active ? "page" : undefined}>
                <Icon className="size-4 shrink-0" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <aside className="sticky top-14 hidden max-h-[calc(100dvh-3.5rem)] w-52 shrink-0 flex-col gap-2 self-start overflow-y-auto md:flex">
        <p className="px-3 text-sm font-medium text-paper-white">Settings</p>
        <nav aria-label="Settings" className="flex flex-col gap-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link key={tab.href} href={tab.href} className={tabClass(active, false)} aria-current={active ? "page" : undefined}>
                <Icon className="size-4 shrink-0" />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
