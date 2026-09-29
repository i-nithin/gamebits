import Image from "next/image";
import Link from "next/link";

import type { FollowProfile } from "@/lib/types";

export function ProfilePeople({ people }: { people: FollowProfile[] }) {
  return (
    <div className="flex flex-col gap-0.5">
      {people.map((person) => {
        const initial = person.name.trim().charAt(0).toUpperCase() || "?";
        return (
          <Link
            key={person.clerkUserId}
            href={`/u/${person.handle}`}
            className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-graphite"
          >
            <span className="relative size-12 shrink-0 overflow-hidden rounded-full bg-slate">
              {person.imageUrl ? (
                <Image src={person.imageUrl} alt="" fill className="object-cover" sizes="48px" />
              ) : (
                <span className="flex size-full items-center justify-center text-sm font-medium text-paper-white">
                  {initial}
                </span>
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-paper-white">{person.name}</span>
              <span className="block truncate text-xs text-fog">@{person.handle}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
