import Image from "next/image";
import Link from "next/link";
import { StarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ProfileReview } from "@/lib/types";

function reviewDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function ProfileComments({ reviews }: { reviews: ProfileReview[] }) {
  return (
    <div className="grid max-w-5xl grid-cols-1 gap-3 xl:grid-cols-2">
      {reviews.map((review) => (
        <Link
          key={review.id}
          href={`/games/${review.gameSlug}?review=${review.id}`}
          className="flex min-w-0 gap-3 rounded-2xl bg-obsidian/40 p-4 transition-[background-color,transform] hover:-translate-y-0.5 hover:bg-graphite/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ice-signal sm:gap-4"
        >
          <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-graphite ring-1 ring-white/10 sm:size-14">
            <Image
              src={review.gameLogoUrl}
              alt=""
              fill
              className="object-cover"
              sizes="56px"
            />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <span className="truncate text-sm font-medium text-paper-white">
                {review.gameName}
              </span>
              <span className="shrink-0 text-xs text-fog">{reviewDate(review.createdAt)}</span>
            </span>
            <span className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  className={cn(
                    "size-3.5",
                    star <= review.rating ? "fill-ice-signal text-ice-signal" : "text-iron",
                  )}
                />
              ))}
            </span>
            <span className="mt-1 line-clamp-3 text-sm leading-6 text-fog">{review.body}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
