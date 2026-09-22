"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { StarIcon } from "lucide-react";

import { upsertReviewAction } from "@/app/actions/reviews";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { REVIEW_BODY_MAX } from "@/lib/constants";
import { clerkEnabled } from "@/lib/clerk-enabled";
import type { GameReviewItem } from "@/lib/types";

function Stars({
  value,
  onChange,
}: {
  value: number;
  onChange?: (value: number) => void;
}) {
  if (!onChange) {
    return (
      <div className="flex gap-1" aria-label={`${value} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            className="size-4"
            fill={star <= value ? "currentColor" : "none"}
            style={{ color: star <= value ? "#83c3ff" : undefined }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="text-fog"
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          onClick={() => onChange(star)}
        >
          <StarIcon
            className="size-4"
            fill={star <= value ? "currentColor" : "none"}
            style={{ color: star <= value ? "#83c3ff" : undefined }}
          />
        </button>
      ))}
    </div>
  );
}

export function GameReviews({
  slug,
  gameId,
  signedIn,
  displayName,
  imageUrl,
  initialReviews,
  nextCursor,
  average,
  count,
  viewerReview,
}: {
  slug: string;
  gameId: string;
  signedIn: boolean;
  displayName: string;
  imageUrl: string | null;
  initialReviews: GameReviewItem[];
  nextCursor: string | null;
  average: number | null;
  count: number;
  viewerReview: { rating: number; body: string } | null;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [cursor, setCursor] = useState(nextCursor);
  const [rating, setRating] = useState(viewerReview?.rating ?? 0);
  const [body, setBody] = useState(viewerReview?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(Boolean(viewerReview));
  const sentinel = useRef<HTMLDivElement>(null);
  const cursorRef = useRef(nextCursor);
  const loadingRef = useRef(false);
  cursorRef.current = cursor;

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting || loadingRef.current || !cursorRef.current) return;
      const currentCursor = cursorRef.current;
      loadingRef.current = true;
      void fetch(`/api/games/${slug}/reviews?cursor=${encodeURIComponent(currentCursor)}`)
        .then((response) => response.json())
        .then((page: { items: GameReviewItem[]; nextCursor: string | null }) => {
          setReviews((current) => {
            const seen = new Set(current.map((item) => item.id));
            return [...current, ...page.items.filter((item) => !seen.has(item.id))];
          });
          setCursor(page.nextCursor);
        })
        .finally(() => {
          loadingRef.current = false;
        });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [slug]);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-fog">
        {count > 0 && average != null
          ? `${average.toFixed(1)} average · ${count} review${count === 1 ? "" : "s"}`
          : "No reviews yet"}
      </p>
      {signedIn ? (
        <form
          className="flex flex-col gap-3"
          action={(formData) => {
            if (rating < 1) {
              setError("Choose a star rating");
              return;
            }
            formData.set("rating", String(rating));
            formData.set("displayName", displayName);
            if (imageUrl) formData.set("imageUrl", imageUrl);
            setError(null);
            startTransition(async () => {
              try {
                const result = await upsertReviewAction(formData);
                if (result?.review) {
                  setSaved(true);
                  setReviews((current) => {
                    const without = current.filter((item) => item.id !== result.review.id);
                    return [result.review, ...without];
                  });
                }
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not save review");
              }
            });
          }}
        >
          <input type="hidden" name="gameId" value={gameId} />
          <Stars value={rating} onChange={setRating} />
          <Textarea
            name="body"
            required
            maxLength={REVIEW_BODY_MAX}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="What stood out?"
            className="min-h-24"
          />
          {error ? <p className="text-xs text-error">{error}</p> : null}
          <Button type="submit" disabled={pending} className="w-fit">
            {pending ? "Saving…" : saved ? "Update review" : "Post review"}
          </Button>
        </form>
      ) : clerkEnabled ? (
        <p className="text-sm text-fog">Sign in to leave a rating and comment.</p>
      ) : null}
      <ul className="flex flex-col gap-4">
        {reviews.map((review) => (
          <li key={review.id} className="flex gap-3">
            <Avatar size="sm">
              {review.imageUrl ? <AvatarImage src={review.imageUrl} alt="" /> : null}
              <AvatarFallback>{review.displayName.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{review.displayName}</span>
                <Stars value={review.rating} />
              </div>
              <p className="text-sm leading-6 text-fog">{review.body}</p>
            </div>
          </li>
        ))}
      </ul>
      {cursor ? <div ref={sentinel} className="h-8" /> : null}
    </div>
  );
}
