"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { FlagIcon } from "lucide-react";

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
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { notifyError, notifySuccess } from "@/lib/notify";
import {
  GAME_OFFENSE_ISSUES,
  GAME_REPORT_CATEGORIES,
  REPORT_DETAILS_MAX,
  gameReportReason,
  type GameOffenseIssue,
  type GameReportCategory,
} from "@/lib/reports";

export function ReportGameButton({
  game,
  signedIn,
}: {
  game: { id: string; name: string; logoUrl: string } | null;
  signedIn: boolean;
}) {
  const openAuth = useAuthDialog();
  const [open, setOpen] = useState(false);
  if (!game) return null;

  if (!signedIn) {
    if (!clerkEnabled) return null;
    return (
      <button
        type="button"
        aria-label="Report game"
        className="flex size-9 items-center justify-center rounded-lg text-paper-white hover:bg-slate"
        onClick={openAuth}
      >
        <FlagIcon className="size-4" strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Report game"
        className="flex size-9 items-center justify-center rounded-lg text-paper-white hover:bg-slate"
        onClick={() => setOpen(true)}
      >
        <FlagIcon className="size-4" strokeWidth={1.5} />
      </button>
      <ReportGameDialog game={game} open={open} onOpenChange={setOpen} />
    </>
  );
}

function ReportGameDialog({
  game,
  open,
  onOpenChange,
}: {
  game: { id: string; name: string; logoUrl: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [category, setCategory] = useState<GameReportCategory | null>(null);
  const [issue, setIssue] = useState<GameOffenseIssue | "">("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const selected = GAME_REPORT_CATEGORIES.find((item) => item.id === category) ?? null;

  function close(next: boolean) {
    if (!next) {
      setCategory(null);
      setIssue("");
      setDetails("");
      setError(null);
    }
    onOpenChange(next);
  }

  function submit() {
    if (!category) return;
    const reason = gameReportReason(category, issue);
    startTransition(async () => {
      const result = await createReportAction({
        targetType: "game",
        targetId: game.id,
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
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        {selected ? (
          <>
            <DialogHeader>
              <DialogTitle>Report this game</DialogTitle>
              <DialogDescription>{selected.label}</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-3">
              <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-graphite">
                <Image src={game.logoUrl} alt="" fill className="object-cover" sizes="48px" />
              </span>
              <p className="truncate text-sm font-medium">{game.name}</p>
            </div>
            {selected.id === "offensive" ? (
              <label className="flex flex-col gap-2 text-sm text-fog">
                What issue are you reporting?
                <NativeSelect
                  className="w-full"
                  value={issue}
                  onChange={(event) => {
                    setIssue(event.target.value as GameOffenseIssue | "");
                    setError(null);
                  }}
                >
                  <NativeSelectOption value="">Choose an issue</NativeSelectOption>
                  {GAME_OFFENSE_ISSUES.map((item) => (
                    <NativeSelectOption key={item.id} value={item.id}>
                      {item.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </label>
            ) : (
              <p className="text-sm text-fog">Tell us what happened. This note is required.</p>
            )}
            <label className="flex flex-col gap-2 text-sm text-fog">
              {selected.id === "offensive" ? "Anything else to add? (optional)" : "Describe the issue"}
              <Textarea
                value={details}
                maxLength={REPORT_DETAILS_MAX}
                placeholder="Add details"
                onChange={(event) => setDetails(event.target.value)}
              />
            </label>
            {error ? <p className="text-xs text-error">{error}</p> : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  setCategory(null);
                  setIssue("");
                  setError(null);
                }}
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={
                  pending ||
                  (selected.id === "offensive" && !issue) ||
                  (selected.id !== "offensive" && !details.trim())
                }
                onClick={submit}
              >
                {pending ? <Spinner data-icon="inline-start" /> : null}
                Submit
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Report this game</DialogTitle>
              <DialogDescription>
                Tell us what is wrong with this game or its listing. We won&apos;t tell the developer who
                reported it.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              {GAME_REPORT_CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex flex-col gap-1 rounded-xl border border-iron px-4 py-3 text-left hover:bg-slate"
                  onClick={() => {
                    setCategory(item.id);
                    setError(null);
                  }}
                >
                  <span className="text-sm font-medium text-paper-white">{item.label}</span>
                  <span className="text-xs text-fog">{item.description}</span>
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
