"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumnIcon, CompassIcon, LayoutGridIcon, LifeBuoyIcon, PlusIcon } from "lucide-react";

import { useAuthDialog } from "@/components/shell/auth-dialog";
import { ViewerMark } from "@/components/shell/viewer-mark";
import { clerkEnabled } from "@/lib/clerk-enabled";
import type { Viewer } from "@/lib/types";
import { cn } from "@/lib/utils";

export function LeftRail({ viewer }: { viewer: Viewer | null }) {
  const pathname = usePathname();
  const openAuth = useAuthDialog();

  const nav = [
    { href: "/", label: "Discover", icon: CompassIcon, active: pathname === "/" },
    {
      href: "/collections",
      label: "Collections",
      icon: LayoutGridIcon,
      active:
        pathname.startsWith("/collections") ||
        (pathname.startsWith("/games/") && pathname !== "/games/new"),
    },
    {
      href: "/games/new",
      label: "Add game",
      icon: PlusIcon,
      active: pathname === "/games/new",
    },
    {
      href: "/analytics",
      label: "Analytics",
      icon: ChartColumnIcon,
      active: pathname === "/analytics" || pathname.startsWith("/analytics/"),
    },
    {
      href: "/profile",
      label: "Profile",
      icon: null,
      active: pathname === "/profile" || pathname.startsWith("/u/"),
    },
  ];

  return (
    <aside className="group/rail fixed inset-y-0 left-0 z-40 hidden w-14 flex-col overflow-hidden border-r border-white/10 bg-obsidian transition-[width] duration-150 ease-out hover:w-60 md:flex">
      <div className="flex h-14 items-center gap-3 border-b border-white/10 px-3">
        <div className="size-8 shrink-0 rounded-full bg-[#0d85ed]" />
        <span className="hidden truncate text-sm font-medium text-white group-hover/rail:inline">
          GameBits
        </span>
      </div>
      <nav className="flex flex-1 flex-col items-center gap-1 px-2 py-3 group-hover/rail:items-stretch">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = item.active;
          const className = cn(
            "flex size-10 shrink-0 items-center justify-center gap-3 rounded-xl text-white/80 group-hover/rail:w-full group-hover/rail:justify-start group-hover/rail:px-2.5",
            active ? "bg-white/10 text-white" : "hover:bg-white/8 hover:text-white",
          );
          const label = (
            <span className="hidden truncate text-sm font-medium group-hover/rail:inline">
              {item.label}
            </span>
          );
          if (item.label === "Profile") {
            const mark = (
              <>
                <ViewerMark viewer={viewer} />
                {label}
              </>
            );
            if (!viewer && clerkEnabled) {
              return (
                <button key={item.label} type="button" onClick={openAuth} className={className}>
                  {mark}
                </button>
              );
            }
            return (
              <Link key={item.label} href={item.href} className={className}>
                {mark}
              </Link>
            );
          }
          return (
            <Link key={item.label} href={item.href} className={className}>
              {Icon ? <Icon className="size-5 shrink-0" /> : null}
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-col items-center px-2 py-3 group-hover/rail:items-stretch">
        <a
          href="mailto:hello@gamebits.app"
          className="flex size-10 items-center justify-center gap-3 rounded-xl text-white/80 hover:bg-white/8 hover:text-white group-hover/rail:w-full group-hover/rail:justify-start group-hover/rail:px-2.5"
        >
          <LifeBuoyIcon className="size-5 shrink-0" />
          <span className="hidden truncate text-sm font-medium group-hover/rail:inline">
            Support
          </span>
        </a>
      </div>
    </aside>
  );
}
