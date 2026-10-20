"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { StarIcon } from "lucide-react";

import { upsertReviewAction } from "@/app/actions/reviews";
import { CommentEditor, RemoveCommentButton } from "@/components/game/comment-editor";
import { ReportCommentButton } from "@/components/reports/report-comment-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { REVIEW_BODY_MAX } from "@/lib/constants";
import { notifyError, notifySuccess } from "@/lib/notify";
import { clerkEnabled } from "@/lib/clerk-enabled";
import type { GameReviewItem } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  viewerId = null,
  initialReviews,
  nextCursor,
  average,
  count,
  viewerReview,
  highlightReviewId = null,
}: {
  slug: string;
  gameId: string;
  signedIn: boolean;
  viewerId?: string | null;
  initialReviews: GameReviewItem[];
  nextCursor: string | null;
  average: number | null;
  count: number;
  viewerReview: { rating: number; body: string } | null;
  highlightReviewId?: string | null;
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [cursor, setCursor] = useState(nextCursor);
  const [rating, setRating] = useState(viewerReview?.rating ?? 0);
  const [body, setBody] = useState(viewerReview?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(Boolean(viewerReview));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reviewCount, setReviewCount] = useState(count);
  const [reviewAverage, setReviewAverage] = useState(average);
  const sentinel = useRef<HTMLDivElement>(null);
  const cursorRef = useRef(nextCursor);
  const loadingRef = useRef(false);
  const scrolledRef = useRef(false);

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

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

  useEffect(() => {
    if (!highlightReviewId || scrolledRef.current) return;
    const node = document.getElementById(`review-${highlightReviewId}`);
    if (!node) return;
    scrolledRef.current = true;
    node.scrollIntoView({ block: "center" });
  }, [highlightReviewId, reviews]);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-fog">
        {reviewCount > 0 && reviewAverage != null
          ? `${reviewAverage.toFixed(1)} average · ${reviewCount} review${reviewCount === 1 ? "" : "s"}`
          : "No reviews yet"}
      </p>
      {signedIn ? (
        <form
          className="flex flex-col gap-3"
          action={(formData) => {
            if (rating < 1) {
              setError("Choose a star rating.");
              return;
            }
            formData.set("rating", String(rating));
            setError(null);
            const updating = saved;
            startTransition(async () => {
              try {
                const result = await upsertReviewAction(formData);
                if (result?.review) {
                  const previous = reviews.find((item) => item.id === result.review.id)?.rating;
                  setSaved(true);
                  notifySuccess(updating ? "Review updated." : "Review posted.");
                  setReviews((current) => {
                    const without = current.filter((item) => item.id !== result.review.id);
                    return [result.review, ...without];
                  });
                  if (previous == null) {
                    setReviewCount((current) => current + 1);
                    setReviewAverage((current) => {
                      if (reviewCount < 1 || current == null) return result.review.rating;
                      return (current * reviewCount + result.review.rating) / (reviewCount + 1);
                    });
                  } else if (previous !== result.review.rating) {
                    setReviewAverage((current) => {
                      if (reviewCount < 1) return result.review.rating;
                      const base = current ?? previous;
                      return (base * reviewCount - previous + result.review.rating) / reviewCount;
                    });
                  }
                }
              } catch (err) {
                notifyError(
                  "Couldn't save that review.",
                  err instanceof Error ? err.message : "Try again in a moment.",
                );
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
            {pending ? <Spinner data-icon="inline-start" /> : null}
            {pending ? "Saving…" : saved ? "Update review" : "Post review"}
          </Button>
        </form>
      ) : clerkEnabled ? (
        <p className="text-sm text-fog">Sign in to leave a rating and comment.</p>
      ) : null}
      <ul className="flex flex-col gap-4">
        {reviews.map((review) => (
          <li
            key={review.id}
            id={`review-${review.id}`}
            className={cn(
              "flex scroll-mt-24 gap-3",
              highlightReviewId === review.id && "rounded-xl bg-graphite px-3 py-3",
            )}
          >
            <Avatar size="sm">
              {review.imageUrl ? <AvatarImage src={review.imageUrl} alt="" /> : null}
              <AvatarFallback>{review.displayName.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{review.displayName}</span>
                {editingId === review.id ? null : <Stars value={review.rating} />}
                {viewerId && review.clerkUserId === viewerId && editingId !== review.id ? (
                  <span className="ml-auto flex shrink-0 gap-3">
                    <button
                      type="button"
                      className="text-xs font-medium text-fog hover:text-paper-white"
                      onClick={() => setEditingId(review.id)}
                    >
                      Edit
                    </button>
                    <RemoveCommentButton
                      reviewId={review.id}
                      onRemoved={() => {
                        setReviews((current) => current.filter((item) => item.id !== review.id));
                        setEditingId(null);
                        setSaved(false);
                        setRating(0);
                        setBody("");
                        setReviewCount((current) => Math.max(0, current - 1));
                        setReviewAverage((current) => {
                          if (reviewCount <= 1) return null;
                          const base = current ?? review.rating;
                          return (base * reviewCount - review.rating) / (reviewCount - 1);
                        });
                      }}
                    />
                  </span>
                ) : editingId === review.id ? null : (
                  <ReportCommentButton reviewId={review.id} signedIn={signedIn} />
                )}
              </div>
              {editingId === review.id ? (
                <CommentEditor
                  gameId={gameId}
                  initialRating={review.rating}
                  initialBody={review.body}
                  onCancel={() => setEditingId(null)}
                  onSaved={(savedReview) => {
                    const previous = review.rating;
                    setReviews((current) =>
                      current.map((item) =>
                        item.id === savedReview.id ? { ...item, ...savedReview } : item,
                      ),
                    );
                    setRating(savedReview.rating);
                    setBody(savedReview.body);
                    setSaved(true);
                    setEditingId(null);
                    setReviewAverage((current) => {
                      if (reviewCount < 1) return savedReview.rating;
                      const base = current ?? previous;
                      return (base * reviewCount - previous + savedReview.rating) / reviewCount;
                    });
                  }}
                />
              ) : (
                <p className="text-sm leading-6 text-fog">{review.body}</p>
              )}
            </div>
          </li>
        ))}
      </ul>
      {cursor ? <div ref={sentinel} className="h-8" /> : null}
    </div>
  );
}
