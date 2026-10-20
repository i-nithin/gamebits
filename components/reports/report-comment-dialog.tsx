"use client";

import { useState, useTransition } from "react";

import { createReportAction } from "@/app/actions/reports";
import { useAuthDialog } from "@/components/shell/auth-dialog";
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
import { clerkEnabled } from "@/lib/clerk-enabled";
import { notifyError, notifySuccess } from "@/lib/notify";
import { REPORT_DETAILS_MAX, REVIEW_REPORT_REASONS, type ReviewReportReason } from "@/lib/reports";

export function ReportCommentButton({
  reviewId,
  signedIn,
}: {
  reviewId: string;
  signedIn: boolean;
}) {
  const openAuth = useAuthDialog();
  const [open, setOpen] = useState(false);

  if (!signedIn) {
    if (!clerkEnabled) return null;
    return (
      <button
        type="button"
        className="ml-auto text-xs font-medium text-fog hover:text-paper-white"
        onClick={openAuth}
      >
        Report
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className="ml-auto text-xs font-medium text-fog hover:text-paper-white"
        onClick={() => setOpen(true)}
      >
        Report
      </button>
      <ReportCommentDialog reviewId={reviewId} open={open} onOpenChange={setOpen} />
    </>
  );
}

function ReportCommentDialog({
  reviewId,
  open,
  onOpenChange,
}: {
  reviewId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState<ReviewReportReason | "">("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close(next: boolean) {
    if (!next) {
      setReason("");
      setDetails("");
      setError(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report this comment</DialogTitle>
          <DialogDescription>
            Tell us what is wrong with it. We won&apos;t tell them who reported it.
          </DialogDescription>
        </DialogHeader>
        <fieldset className="flex flex-col gap-1">
          <legend className="sr-only">Why are you reporting this comment?</legend>
          {REVIEW_REPORT_REASONS.map((item) => (
            <label key={item.id} className="flex items-center gap-3 rounded-lg px-1 py-2 text-sm">
              <input
                type="radio"
                name="comment-report-reason"
                value={item.id}
                checked={reason === item.id}
                onChange={() => {
                  setReason(item.id);
                  setError(null);
                }}
                className="size-4 accent-ice-signal"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-2 text-sm text-fog">
          Anything else to add?{reason === "other" ? " (required)" : " (optional)"}
          <Textarea
            value={details}
            maxLength={REPORT_DETAILS_MAX}
            placeholder="Add details"
            onChange={(event) => setDetails(event.target.value)}
          />
        </label>
        {error ? <p className="text-xs text-error">{error}</p> : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={() => close(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending || !reason || (reason === "other" && !details.trim())}
            onClick={() => {
              if (!reason) {
                setError("Choose a reason.");
                return;
              }
              if (reason === "other" && !details.trim()) {
                setError("Add a short description.");
                return;
              }
              startTransition(async () => {
                const result = await createReportAction({
                  targetType: "review",
                  targetId: reviewId,
                  reason,
                  details,
                });
                if ("error" in result) {
                  setError(result.error);
                  notifyError("Couldn't send that report.", result.error);
                  return;
                }
                notifySuccess("Report submitted.");
                close(false);
              });
            }}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
