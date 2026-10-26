"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { StarIcon } from "lucide-react";

import { CommentEditor, RemoveCommentButton } from "@/components/game/comment-editor";
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

export function ProfileComments({
  reviews,
  onUpdated,
  onRemoved,
}: {
  reviews: ProfileReview[];
  onUpdated: (review: ProfileReview) => void;
  onRemoved: (id: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="grid max-w-5xl grid-cols-1 gap-3 xl:grid-cols-2">
      {reviews.map((review) => {
        const href = `/games/${review.gameSlug}?review=${review.id}`;
        return (
          <article
            key={review.id}
            className="flex min-w-0 gap-3 rounded-sm bg-obsidian p-4 sm:gap-4 border border-iron"
          >
            <Link
              href={href}
              className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-graphite ring-1 ring-white/10 sm:size-14"
            >
              <Image
                src={review.gameLogoUrl}
                alt=""
                fill
                className="object-cover"
                sizes="56px"
              />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <Link
                  href={href}
                  className="truncate text-sm font-medium text-paper-white hover:underline"
                >
                  {review.gameName}
                </Link>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-fog">{reviewDate(review.createdAt)}</span>
                  {editingId === review.id ? null : (
                    <>
                      <button
                        type="button"
                        className="text-xs font-medium text-fog hover:text-paper-white"
                        onClick={() => setEditingId(review.id)}
                      >
                        Edit
                      </button>
                      <RemoveCommentButton
                        reviewId={review.id}
                        onRemoved={() => onRemoved(review.id)}
                      />
                    </>
                  )}
                </span>
              </div>
              {editingId === review.id ? (
                <CommentEditor
                  gameId={review.gameId}
                  initialRating={review.rating}
                  initialBody={review.body}
                  onCancel={() => setEditingId(null)}
                  onSaved={(saved) => {
                    onUpdated({ ...review, rating: saved.rating, body: saved.body });
                    setEditingId(null);
                  }}
                />
              ) : (
                <>
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
                  <p className="mt-1 line-clamp-3 text-sm leading-6 text-fog">{review.body}</p>
                </>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
