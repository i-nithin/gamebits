"use client";

import Image from "next/image";
import { useActionState } from "react";
import { RocketIcon } from "lucide-react";

import { launchGameAction } from "@/app/actions/launch";
import { GameFormShell } from "@/components/game/game-form-shell";
import { PlatformChipList } from "@/components/game/platform-chip";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { WEEK_LISTING_CAP } from "@/lib/constants";
import { formatIsoWeekLabel } from "@/lib/iso-week";
import type { GamePlatformItem } from "@/lib/types";

export function GameLaunchForm({
  game,
  defaultYear,
  defaultWeek,
}: {
  game: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string;
    coverUrl: string;
    platforms: GamePlatformItem[];
    developerName: string;
  };
  defaultYear: number;
  defaultWeek: number;
}) {
  const [state, action, pending] = useActionState(launchGameAction, null);
  const detailHref = `/games/${game.slug}`;

  return (
    <GameFormShell
      breadcrumbs={[
        { label: game.name, href: detailHref },
        { label: "Launch" },
      ]}
      backHref={detailHref}
      cancelHref={detailHref}
      submitLabel="Launch game"
      pending={pending}
      error={state?.error}
      formAction={action}
      left={
        <div className="flex h-full min-h-0 flex-col gap-3">
          <span className="shrink-0 text-sm font-medium text-paper-white">Game</span>
          <div className="relative min-h-48 flex-1 overflow-hidden rounded-2xl card-ring bg-graphite sm:min-h-0">
            <Image
              src={game.logoUrl || game.coverUrl}
              alt=""
              fill
              className="object-cover"
              sizes="50vw"
            />
          </div>
          {game.platforms.length > 0 ? (
            <PlatformChipList platforms={game.platforms} />
          ) : null}
        </div>
      }
      right={
        <>
          <div className="flex flex-col gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl card-ring bg-graphite">
              <RocketIcon className="size-5 text-ice-signal" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-medium text-paper-white">Launch on the board</h1>
              <p className="text-sm leading-6 text-fog">
                Schedule <span className="text-paper-white">{game.name}</span> by{" "}
                {game.developerName} onto an ISO week. Boards cap at {WEEK_LISTING_CAP} games.
              </p>
            </div>
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="year">ISO year</FieldLabel>
              <Input
                id="year"
                name="year"
                type="number"
                required
                defaultValue={defaultYear}
                className="h-10 rounded-lg border-iron bg-graphite"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="week">ISO week</FieldLabel>
              <Input
                id="week"
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
            <Field orientation="horizontal">
              <input
                id="featured"
                name="featured"
                type="checkbox"
                className="size-4 rounded border-iron"
              />
              <FieldLabel htmlFor="featured">Featured in carousel</FieldLabel>
            </Field>
          </FieldGroup>
        </>
      }
    >
      <input type="hidden" name="gameId" value={game.id} />
    </GameFormShell>
  );
}
