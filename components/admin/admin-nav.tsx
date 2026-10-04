"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gamepad2Icon, LayersIcon, MegaphoneIcon, TagsIcon, UsersIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/4dm1n", label: "Users", match: "exact", icon: UsersIcon },
  { href: "/4dm1n/games", label: "Games", match: "prefix", icon: Gamepad2Icon },
  { href: "/4dm1n/categories", label: "Categories", match: "prefix", icon: TagsIcon },
  { href: "/4dm1n/platforms", label: "Platforms", match: "prefix", icon: LayersIcon },
  { href: "/4dm1n/adbits", label: "Adbits", match: "prefix", icon: MegaphoneIcon },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-14 flex h-[calc(100dvh-3.5rem)] w-40 shrink-0 flex-col gap-1 border-r border-white/10 bg-obsidian p-2">
      {ITEMS.map((item) => {
        const active =
          item.match === "exact" ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              buttonVariants({ variant: active ? "secondary" : "ghost" }),
              "w-full justify-start",
            )}
          >
            <Icon data-icon="inline-start" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
