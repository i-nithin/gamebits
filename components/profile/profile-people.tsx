import Image from "next/image";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";

import type { FollowProfile } from "@/lib/types";

export function ProfilePeople({ people }: { people: FollowProfile[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,14rem),1fr))] gap-3">
      {people.map((person) => {
        const initial = person.name.trim().charAt(0).toUpperCase() || "?";
        return (
          <Link
            key={person.clerkUserId}
            href={`/u/${person.handle}`}
            className="group flex min-w-0 items-center gap-3 rounded-2xl bg-obsidian/40 p-4 transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-graphite/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ice-signal"
          >
            <span className="relative size-14 shrink-0 overflow-hidden rounded-full bg-slate ring-1 ring-white/10">
              {person.imageUrl ? (
                <Image src={person.imageUrl} alt="" fill className="object-cover" sizes="56px" />
              ) : (
                <span className="flex size-full items-center justify-center text-sm font-medium text-paper-white">
                  {initial}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-paper-white">
                {person.name}
              </span>
              <span className="mt-0.5 block truncate text-xs text-fog">@{person.handle}</span>
            </span>
            <ChevronRightIcon className="size-4 shrink-0 text-fog/60 transition-transform group-hover:translate-x-0.5 group-hover:text-paper-white" />
          </Link>
        );
      })}
    </div>
  );
}
