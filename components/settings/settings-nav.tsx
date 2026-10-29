"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellIcon, KeyRoundIcon, ShieldIcon, UserRoundIcon, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const TABS: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/settings/profile", label: "Profile", icon: UserRoundIcon },
  { href: "/settings/notifications", label: "Notifications", icon: BellIcon },
  { href: "/settings/developer", label: "Developer", icon: KeyRoundIcon },
  { href: "/settings/security", label: "Security", icon: ShieldIcon },
];

function tabClass(active: boolean, mobile: boolean) {
  if (mobile) {
    return cn(
      "flex shrink-0 items-center gap-2 rounded-md border px-3 py-1.5 text-sm",
      active
        ? "border-transparent bg-obsidian text-paper-white"
        : "border-iron bg-obsidian text-fog",
    );
  }
  return cn(
    "flex h-10 w-full items-center gap-3 rounded-md px-3.5 text-sm",
    active ? "bg-obsidian text-paper-white" : "text-fog hover:bg-obsidian/50 hover:text-paper-white",
  );
}

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <>
      <div className="z-20 -mx-4 shrink-0 border-b border-iron bg-page px-4 py-3 md:hidden">
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
      <aside className="hidden w-60 shrink-0 md:block">
        <p className="px-3.5 pt-1 text-sm text-paper-white">Settings</p>
        <nav aria-label="Settings" className="mt-3 flex flex-col gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link key={tab.href} href={tab.href} className={tabClass(active, false)} aria-current={active ? "page" : undefined}>
                <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
