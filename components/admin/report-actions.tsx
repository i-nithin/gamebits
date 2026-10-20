"use client";

import { useState } from "react";

import {
  banFromReportAction,
  dismissReportAction,
  removeReportedCommentAction,
  takeDownReportedGameAction,
  unbanUserAction,
} from "@/app/actions/moderation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function ReportActions({
  reportId,
  subjectId,
  canDismiss,
  canRemoveComment,
  canTakeDown,
  canBan,
  canUnban,
}: {
  reportId: string;
  subjectId: string | null;
  canDismiss: boolean;
  canRemoveComment: boolean;
  canTakeDown: boolean;
  canBan: boolean;
  canUnban: boolean;
}) {
  const [confirm, setConfirm] = useState<"comment" | "game" | "ban" | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {canDismiss ? (
          <form action={dismissReportAction}>
            <input type="hidden" name="reportId" value={reportId} />
            <Button type="submit" variant="outline">
              Dismiss
            </Button>
          </form>
        ) : null}
        {canRemoveComment ? (
          <Button type="button" variant="destructive" onClick={() => setConfirm("comment")}>
            Remove comment
          </Button>
        ) : null}
        {canTakeDown ? (
          <Button type="button" variant="destructive" onClick={() => setConfirm("game")}>
            Take down game
          </Button>
        ) : null}
        {canBan && subjectId ? (
          <Button type="button" variant="destructive" onClick={() => setConfirm("ban")}>
            Ban user
          </Button>
        ) : null}
        {canUnban && subjectId ? (
          <form action={unbanUserAction}>
            <input type="hidden" name="clerkUserId" value={subjectId} />
            <Button type="submit" variant="outline">
              Unban
            </Button>
          </form>
        ) : null}
      </div>

      <Dialog open={confirm === "comment"} onOpenChange={(open) => setConfirm(open ? "comment" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this comment?</DialogTitle>
            <DialogDescription>
              It disappears from the game. The author gets a notification, and the report stays on file.
            </DialogDescription>
          </DialogHeader>
          <form
            action={async (formData) => {
              await removeReportedCommentAction(formData);
              setConfirm(null);
            }}
          >
            <input type="hidden" name="reportId" value={reportId} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive">
                Remove comment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirm === "game"} onOpenChange={(open) => setConfirm(open ? "game" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take down this game?</DialogTitle>
            <DialogDescription>
              It leaves the public board. The developer gets a notification and cannot publish it again.
            </DialogDescription>
          </DialogHeader>
          <form
            action={async (formData) => {
              await takeDownReportedGameAction(formData);
              setConfirm(null);
            }}
          >
            <input type="hidden" name="reportId" value={reportId} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive">
                Take down game
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirm === "ban"} onOpenChange={(open) => setConfirm(open ? "ban" : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban this account?</DialogTitle>
            <DialogDescription>
              They are signed out, their games and comments are hidden, and this note is what they see when they
              sign in.
            </DialogDescription>
          </DialogHeader>
          <form
            action={async (formData) => {
              await banFromReportAction(formData);
              setConfirm(null);
            }}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="reportId" value={reportId} />
            <label className="flex flex-col gap-2 text-sm text-fog">
              Note for the user
              <Textarea name="reason" maxLength={500} placeholder="Why this account is banned" />
            </label>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive">
                Ban user
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
