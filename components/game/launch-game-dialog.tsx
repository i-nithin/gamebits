"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { RocketIcon, XIcon } from "lucide-react";

import { launchGameAction } from "@/app/actions/launch";
import { PlatformChipList } from "@/components/game/platform-chip";
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { WEEK_LISTING_CAP } from "@/lib/constants";
import { formatIsoWeekLabel } from "@/lib/iso-week";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { GamePlatformItem } from "@/lib/types";

export type LaunchGameTarget = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
  coverUrl: string;
  platforms: GamePlatformItem[];
  developerName: string;
};

export function LaunchGameDialog({
  open,
  onOpenChange,
  game,
  defaultYear,
  defaultWeek,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: LaunchGameTarget;
  defaultYear: number;
  defaultWeek: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-scrim backdrop-blur-none max-md:hidden" />
        <DialogPrimitive.Popup className="fixed inset-0 z-50 flex h-dvh w-full max-w-none translate-none flex-col overflow-y-auto rounded-none border-0 bg-page px-6 py-6 text-paper-white outline-none data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 md:inset-auto md:top-1/2 md:left-1/2 md:h-auto md:max-h-[calc(100dvh-2rem)] md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:border md:border-iron md:bg-obsidian md:shadow-lg md:data-open:zoom-in-95 md:data-closed:zoom-out-95">
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-lg text-fog hover:bg-white/8 hover:text-paper-white"
          >
            <XIcon className="size-4" />
          </DialogPrimitive.Close>
          {open ? (
            <LaunchForm
              game={game}
              defaultYear={defaultYear}
              defaultWeek={defaultWeek}
              onDone={() => onOpenChange(false)}
            />
          ) : null}
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}

function LaunchForm({
  game,
  defaultYear,
  defaultWeek,
  onDone,
}: {
  game: LaunchGameTarget;
  defaultYear: number;
  defaultWeek: number;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(launchGameAction, null);
  const seen = useRef(state);

  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (!state) return;
    if ("error" in state) {
      notifyError("Couldn't launch this game.", state.error);
      return;
    }
    notifySuccess("Game launched.");
    onDone();
    router.refresh();
  }, [state, router, onDone]);

  return (
    <form action={action} className="flex flex-col gap-6 pt-2">
      <div className="flex items-start gap-3 pr-8">
        <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-graphite">
          <Image
            src={game.logoUrl || game.coverUrl}
            alt=""
            fill
            className="object-cover"
            sizes="56px"
          />
        </span>
        <div className="min-w-0">
          <DialogTitle className="text-xl font-medium text-paper-white">Launch on the board</DialogTitle>
          <DialogDescription className="mt-1 text-sm leading-6 text-fog">
            Schedule <span className="text-paper-white">{game.name}</span> by {game.developerName}{" "}
            onto an ISO week. Boards cap at {WEEK_LISTING_CAP} games.
          </DialogDescription>
        </div>
      </div>

      {game.platforms.length > 0 ? <PlatformChipList platforms={game.platforms} /> : null}

      <input type="hidden" name="gameId" value={game.id} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="launch-year">ISO year</FieldLabel>
          <Input
            id="launch-year"
            name="year"
            type="number"
            required
            defaultValue={defaultYear}
            className="h-10 rounded-lg border-iron bg-graphite"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="launch-week">ISO week</FieldLabel>
          <Input
            id="launch-week"
            name="week"
            type="number"
            required
            min={1}
            max={53}
            defaultValue={defaultWeek}
            className="h-10 rounded-lg border-iron bg-graphite"
          />
          <p className="text-xs text-fog">
            Defaults to {formatIsoWeekLabel(defaultYear, defaultWeek)}. Weeks run Monday–Sunday UTC.
          </p>
        </Field>
      </FieldGroup>

      <div className="flex items-center justify-end gap-2">
        <DialogPrimitive.Close
          render={
            <Button type="button" variant="outline" className="h-9 rounded-full border-iron px-5" />
          }
        >
          Cancel
        </DialogPrimitive.Close>
        <Button
          type="submit"
          disabled={pending}
          className="h-9 rounded-full bg-ice-strong px-5 text-paper-white hover:bg-ice-strong/90"
        >
          {pending ? <Spinner data-icon="inline-start" /> : <RocketIcon data-icon="inline-start" />}
          {pending ? "Launching…" : "Launch game"}
        </Button>
      </div>
    </form>
  );
}
