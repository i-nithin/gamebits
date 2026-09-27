"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellIcon,
  CompassIcon,
  LayoutGridIcon,
  LifeBuoyIcon,
  MenuIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { NotificationBell } from "@/components/notifications/notification-bell";
import { useNotificationsOptional } from "@/components/notifications/notification-provider";
import { useSearch } from "@/components/search/search-provider";
import { useAuthDialog } from "@/components/shell/auth-dialog";
import { ProfileMenu } from "@/components/shell/profile-menu";
import { ViewerMark } from "@/components/shell/viewer-mark";
import { Button } from "@/components/ui/button";
import { clerkEnabled } from "@/lib/clerk-enabled";
import type { Viewer } from "@/lib/types";
import { cn } from "@/lib/utils";

function NotificationsControl({ signedIn }: { signedIn: boolean }) {
  const notifications = useNotificationsOptional();
  const openAuth = useAuthDialog();

  if (signedIn && notifications) {
    return <NotificationBell />;
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Notifications"
      className="rounded-full text-white/80 hover:bg-white/10 hover:text-white"
      onClick={clerkEnabled ? openAuth : undefined}
    >
      <BellIcon />
    </Button>
  );
}

export function TopBar({ viewer }: { viewer: Viewer | null }) {
  const { setOpen } = useSearch();
  const pathname = usePathname();
  const openAuth = useAuthDialog();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  if (pathname !== menuPath) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

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
      href: "/admin",
      label: "Settings",
      icon: SettingsIcon,
      active: pathname.startsWith("/admin"),
    },
    {
      href: "/profile",
      label: "Profile",
      icon: null,
      active: pathname === "/profile" || pathname.startsWith("/u/"),
    },
  ];

  return (
    <>
      <header className="fixed top-0 right-0 left-0 z-30 h-14 border-b border-white/10 bg-obsidian md:left-14">
        <div className="flex h-full items-center gap-2 px-3 sm:gap-3 sm:px-4">
          <div className="flex shrink-0 items-center gap-1 md:hidden">
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="flex size-10 items-center justify-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white"
            >
              <MenuIcon className="size-5" strokeWidth={1.5} />
            </button>
            <div className="size-8 rounded-full bg-[#0d85ed]" />
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/12 bg-[#1a1a1a] px-3 text-left text-sm text-white/45 hover:border-white/20 md:w-72 md:flex-none"
          >
            <SearchIcon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">Search GameBits</span>
            <span className="hidden text-xs text-white/35 sm:inline">/</span>
          </button>
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          <NotificationsControl signedIn={Boolean(viewer)} />
          {clerkEnabled ? (
            <Link href="/games/new" aria-label="Add game">
              <Button variant="ghost" size="icon" className="rounded-full text-white/80 hover:bg-white/10 hover:text-white">
                <PlusIcon />
              </Button>
            </Link>
          ) : null}
          {viewer ? (
            <ProfileMenu viewer={viewer} />
          ) : clerkEnabled ? (
            <button
              type="button"
              aria-label="Sign in"
              onClick={openAuth}
              className="rounded-full text-white/80 hover:bg-white/10"
            >
              <ViewerMark viewer={null} className="size-8 text-sm" />
            </button>
          ) : null}
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-obsidian md:hidden">
          <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
            <div className="flex items-center gap-3">
              <div className="size-8 shrink-0 rounded-full bg-[#0d85ed]" />
              <span className="text-sm font-medium text-paper-white">GameBits</span>
            </div>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="flex size-10 items-center justify-center rounded-xl text-white/80 hover:bg-white/10 hover:text-white"
            >
              <XIcon className="size-5" strokeWidth={1.5} />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-2 px-4 py-2">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = item.active;
              const className = cn(
                "flex h-12 items-center gap-3 rounded-xl px-3 text-white/80",
                active ? "bg-white/10 text-white" : "hover:bg-white/8 hover:text-white",
              );
              if (item.label === "Profile") {
                const mark = (
                  <>
                    <ViewerMark viewer={viewer} />
                    <span className="text-sm font-medium">{item.label}</span>
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
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="flex flex-col gap-2 px-4 py-4">
            <a
              href="mailto:hello@gamebits.app"
              className="flex h-12 items-center gap-3 rounded-xl px-3 text-white/80 hover:bg-white/8 hover:text-white"
            >
              <LifeBuoyIcon className="size-5 shrink-0" />
              <span className="text-sm font-medium">Support</span>
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}
