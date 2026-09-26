"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookmarkIcon,
  CompassIcon,
  LayoutGridIcon,
  LifeBuoyIcon,
  PlusIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export function LeftRail({ currentWeekHref }: { currentWeekHref: string }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const nav = [
    { href: "/", label: "Discover", icon: CompassIcon, active: pathname === "/" },
    {
      href: currentWeekHref,
      label: "Games",
      icon: LayoutGridIcon,
      active: pathname.startsWith("/week") || (pathname.startsWith("/games/") && pathname !== "/games/new"),
    },
    {
      href: "/bookmarks",
      label: "Saved",
      icon: BookmarkIcon,
      active: pathname === "/bookmarks",
    },
    {
      href: "/games/new",
      label: "Add game",
      icon: PlusIcon,
      active: pathname === "/games/new",
    },
    {
      href: "/admin",
      label: "Settings",
      icon: SettingsIcon,
      active: pathname.startsWith("/admin"),
    },
  ];

  return (
    <aside className="group/rail fixed top-0 left-0 z-40 hidden h-full w-14 flex-col overflow-hidden bg-void transition-[width] duration-150 ease-out hover:w-60 md:flex">
      <div className="flex h-14 items-center gap-3 px-3">
        <div className="size-8 shrink-0 rounded-full bg-ice-strong" />
        <span className="truncate text-sm font-medium text-paper-white opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100">
          GameBits
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-2 px-2 py-2">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = mounted && item.active;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex h-10 items-center gap-3 rounded-full px-2.5 text-paper-white",
                active ? "bg-graphite" : "hover:bg-slate",
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className="truncate text-sm font-medium opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-col gap-2 px-2 py-3">
        <Link
          href="/admin"
          className="flex h-10 items-center gap-3 rounded-full px-2.5 text-paper-white hover:bg-slate"
        >
          <UserIcon className="size-5 shrink-0" />
          <span className="truncate text-sm font-medium opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100">
            Profile
          </span>
        </Link>
        <a
          href="mailto:hello@gamebits.app"
          className="flex h-10 items-center gap-3 rounded-full px-2.5 text-paper-white hover:bg-slate"
        >
          <LifeBuoyIcon className="size-5 shrink-0" />
          <span className="truncate text-sm font-medium opacity-0 transition-opacity duration-150 group-hover/rail:opacity-100">
            Support
          </span>
        </a>
      </div>
    </aside>
  );
}
