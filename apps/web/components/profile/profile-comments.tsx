import Image from "next/image";
import Link from "next/link";
import { StarIcon } from "lucide-react";

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
    <div className="flex flex-col gap-0.5">
      {reviews.map((review) => (
        <Link
          key={review.id}
          href={`/games/${review.gameSlug}?review=${review.id}`}
          className="flex w-full gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-graphite"
        >
          <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-graphite sm:size-14">
            <Image
              src={review.gameLogoUrl}
              alt=""
              fill
              className="object-contain p-1.5"
              sizes="56px"
            />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-medium text-paper-white">{review.gameName}</span>
              <span className="shrink-0 text-xs text-fog">{reviewDate(review.createdAt)}</span>
            </span>
            <span className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map((star) => (
                <StarIcon
                  key={star}
                  className="size-3.5"
                  fill={star <= review.rating ? "currentColor" : "none"}
                  style={{ color: star <= review.rating ? "#83c3ff" : undefined }}
                />
              ))}
            </span>
            <span className="line-clamp-2 text-sm leading-6 text-fog">{review.body}</span>
          </span>
        </Link>
      ))}
    </div>
  );
}
