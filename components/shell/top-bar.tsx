"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import {
  BellIcon,
  CompassIcon,
  LayoutGridIcon,
  LifeBuoyIcon,
  MenuIcon,
  SearchIcon,
  SettingsIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useSearch } from "@/components/search/search-provider";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { cn } from "@/lib/utils";

export function TopBar({ currentWeekHref }: { currentWeekHref: string }) {
  const { setOpen } = useSearch();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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
      href: currentWeekHref,
      label: "Games",
      icon: LayoutGridIcon,
      active: pathname.startsWith("/week") || pathname.startsWith("/games"),
    },
    {
      href: "/admin",
      label: "Settings",
      icon: SettingsIcon,
      active: pathname.startsWith("/admin"),
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-obsidian px-3 sm:gap-3 sm:px-4">
        <div className="flex shrink-0 items-center gap-1 md:hidden">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="flex size-10 items-center justify-center rounded-full text-paper-white hover:bg-slate"
          >
            <MenuIcon className="size-5" strokeWidth={1.5} />
          </button>
          <div className="size-8 rounded-full bg-ice-strong" />
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full border border-iron bg-graphite px-3 text-left text-sm text-fog sm:px-4 sm:text-base"
        >
          <SearchIcon className="size-4 shrink-0 text-paper-white" />
          <span className="min-w-0 flex-1 truncate">Search GameBits</span>
          {mounted ? <Kbd className="hidden sm:inline-flex">/</Kbd> : null}
        </button>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" aria-label="Notifications" className="rounded-full hover:bg-slate">
            <BellIcon />
          </Button>
          {clerkEnabled && mounted ? (
            <>
              <Show when="signed-out">
                <SignInButton mode="modal">
                  <Button variant="outline" className="h-8 rounded-full px-2.5 text-xs sm:text-sm">
                    Sign in
                  </Button>
                </SignInButton>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </>
          ) : null}
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-void md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="size-8 shrink-0 rounded-full bg-ice-strong" />
              <span className="text-sm font-medium text-paper-white">GameBits</span>
            </div>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="flex size-10 items-center justify-center rounded-full text-paper-white hover:bg-slate"
            >
              <XIcon className="size-5" strokeWidth={1.5} />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-2 px-4 py-2">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = mounted && item.active;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex h-12 items-center gap-3 rounded-full px-3 text-paper-white",
                    active ? "bg-graphite" : "hover:bg-slate",
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="flex flex-col gap-2 px-4 py-4">
            <Link
              href="/admin"
              className="flex h-12 items-center gap-3 rounded-full px-3 text-paper-white hover:bg-slate"
            >
              <UserIcon className="size-5 shrink-0" />
              <span className="text-sm font-medium">Profile</span>
            </Link>
            <a
              href="mailto:hello@gamebits.app"
              className="flex h-12 items-center gap-3 rounded-full px-3 text-paper-white hover:bg-slate"
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
