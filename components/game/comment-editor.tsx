"use client";

import { useState, useTransition } from "react";
import { StarIcon } from "lucide-react";

import { deleteReviewAction, upsertReviewAction } from "@/app/actions/reviews";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { REVIEW_BODY_MAX } from "@/lib/constants";
import { notifyError, notifySuccess } from "@/lib/notify";

export type SavedComment = {
  id: string;
  rating: number;
  body: string;
  displayName: string;
  imageUrl: string | null;
  createdAt: string;
  handle: string | null;
};

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
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

export function CommentEditor({
  gameId,
  initialRating,
  initialBody,
  onCancel,
  onSaved,
}: {
  gameId: string;
  initialRating: number;
  initialBody: string;
  onCancel: () => void;
  onSaved: (review: SavedComment) => void;
}) {
  const [rating, setRating] = useState(initialRating);
  const [body, setBody] = useState(initialBody);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-2"
      action={(formData) => {
        if (rating < 1) {
          notifyError("Couldn't save that comment.", "Choose a star rating.");
          return;
        }
        formData.set("gameId", gameId);
        formData.set("rating", String(rating));
        startTransition(async () => {
          try {
            const result = await upsertReviewAction(formData);
            if (result?.review) {
              notifySuccess("Comment updated.");
              onSaved(result.review);
            }
          } catch (err) {
            notifyError(
              "Couldn't save that comment.",
              err instanceof Error ? err.message : "Try again in a moment.",
            );
          }
        });
      }}
    >
      <StarPicker value={rating} onChange={setRating} />
      <Textarea
        name="body"
        required
        maxLength={REVIEW_BODY_MAX}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        className="min-h-20"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          Save
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function RemoveCommentButton({
  reviewId,
  onRemoved,
}: {
  reviewId: string;
  onRemoved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        className="text-xs font-medium text-fog hover:text-paper-white"
        onClick={() => setOpen(true)}
      >
        Remove
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this comment?</DialogTitle>
            <DialogDescription>This comment will be deleted from the game.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await deleteReviewAction(reviewId);
                  if ("error" in result) {
                    notifyError("Couldn't remove that comment.", result.error);
                    return;
                  }
                  notifySuccess("Comment removed.");
                  setOpen(false);
                  onRemoved();
                });
              }}
            >
              {pending ? <Spinner data-icon="inline-start" /> : null}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
