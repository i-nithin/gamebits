"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { LogOutIcon, SettingsIcon, UserIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ViewerMark } from "@/components/shell/viewer-mark";
import type { Viewer } from "@/lib/types";

export function ProfileMenu({ viewer }: { viewer: Viewer }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openPath, setOpenPath] = useState(pathname);
  const rootRef = useRef<HTMLDivElement>(null);
  if (pathname !== openPath) {
    setOpenPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const settingsHref = viewer.handle ? `/u/${viewer.handle}/edit` : "/profile";
  const label = viewer.name.trim() || (viewer.handle ? `@${viewer.handle}` : "Profile");

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Account"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
        className="rounded-full hover:bg-slate"
      >
        <ViewerMark viewer={viewer} className="size-8 text-sm" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-iron bg-obsidian py-1 text-paper-white shadow-lg"
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <ViewerMark viewer={viewer} className="size-10 text-sm" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{label}</span>
              {viewer.handle ? (
                <span className="block truncate text-xs text-fog">@{viewer.handle}</span>
              ) : null}
            </span>
          </div>
          <div className="mx-3 border-t border-iron" />
          <MenuLink href="/profile" icon={UserIcon} onSelect={() => setOpen(false)}>
            Profile
          </MenuLink>
          <MenuLink href={settingsHref} icon={SettingsIcon} onSelect={() => setOpen(false)}>
            Settings
          </MenuLink>
          <div className="mx-3 border-t border-iron" />
          <SignOutButton redirectUrl="/">
            <button
              type="button"
              role="menuitem"
              className="flex h-11 w-full items-center gap-3 px-4 text-sm text-error hover:bg-slate"
            >
              <LogOutIcon className="size-4" />
              Log out
            </button>
          </SignOutButton>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  onSelect,
  children,
}: {
  href: string;
  icon: typeof UserIcon;
  onSelect: () => void;
  children: string;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onSelect}
      className="flex h-11 items-center gap-3 px-4 text-sm hover:bg-slate"
    >
      <Icon className="size-4" />
      {children}
    </Link>
  );
}
