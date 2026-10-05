"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import {
  bookCarouselFormAction,
  placeAdminCarouselFormAction,
  saveAdminCarouselFormAction,
  saveOwnedCarouselFormAction,
} from "@/app/actions/ads";
import { AdImagePicker } from "@/components/ads/ad-image-picker";
import { CarouselSlide } from "@/components/ads/carousel-slide";
import { LabelWithInfo } from "@/components/game/field-info";
import { IarcBadge } from "@/components/game/iarc-badge";
import { GameFormShell } from "@/components/game/game-form-shell";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CAROUSEL_AD_UNIT_CENTS, formatUsd } from "@/lib/ad-catalog";
import type { CarouselGameChoice, MonthOption } from "@/lib/ads-types";
import {
  AD_TAGLINE_MAX,
  CAROUSEL_BADGE_LABELS,
  CAROUSEL_BADGES,
  type CarouselBadge,
} from "@/lib/constants";

const inputClass = "h-9 rounded-lg border-iron bg-graphite";

function monthChoice(month: MonthOption) {
  const count = `${month.label} · ${month.booked}/${month.cap}`;
  return month.full ? `${count} · Full` : count;
}

function isoToLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function localInputToIso(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

export type CarouselEditTarget = {
  id: string;
  monthLabel: string;
  monthKey: string;
};

export type CarouselPrefill = {
  gameId: string | null;
  tagline: string | null;
  mediaUrl: string | null;
  destinationUrl: string;
  badge: CarouselBadge | null;
  countdownEndsAt: string | null;
};

export function CarouselBookingForm({
  months = [],
  games,
  mode,
  order,
  prefill,
  initialGameId,
}: {
  months?: MonthOption[];
  games: CarouselGameChoice[];
  mode: "user" | "admin";
  order?: CarouselEditTarget;
  prefill?: CarouselPrefill | null;
  initialGameId?: string | null;
}) {
  const isAdmin = mode === "admin";
  const editing = Boolean(order);
  const listHref = isAdmin ? "/4dm1n/adbits?placement=carousel" : "/adbits?placement=carousel";
  const action = editing
    ? isAdmin
      ? saveAdminCarouselFormAction
      : saveOwnedCarouselFormAction
    : isAdmin
      ? placeAdminCarouselFormAction
      : bookCarouselFormAction;
  const [state, formAction, pending] = useActionState(action, null);
  const openMonths = months.filter((month) => !month.full);
  const [monthKey, setMonthKey] = useState(
    order?.monthKey ?? openMonths[0]?.key ?? months[0]?.key ?? "",
  );
  const eligible = games.filter((game) => game.iarcRating);
  const blocked = games.filter((game) => !game.iarcRating);
  const requestedGameId = prefill?.gameId || initialGameId || "";
  const startingGame = eligible.some((game) => game.id === requestedGameId)
    ? requestedGameId
    : prefill?.gameId
      ? ""
      : (eligible[0]?.id ?? "");
  const [gameId, setGameId] = useState(startingGame);
  const [destinationUrl, setDestinationUrl] = useState(prefill?.destinationUrl ?? "");
  const [tagline, setTagline] = useState(prefill?.tagline ?? "");
  const [badge, setBadge] = useState<CarouselBadge | "">(prefill?.badge ?? "");
  const [countdownLocal, setCountdownLocal] = useState(isoToLocalInput(prefill?.countdownEndsAt ?? null));
  const [mediaUrl, setMediaUrl] = useState(prefill?.mediaUrl ?? "");
  const [mediaBusy, setMediaBusy] = useState(false);
  const selectedMonth = months.find((month) => month.key === monthKey) ?? months[0];
  const selectedGame = eligible.find((game) => game.id === gameId) ?? null;
  const countdownIso = localInputToIso(countdownLocal);

  const preview = {
    mediaUrl,
    tagline: tagline.trim() || null,
    badge: badge || null,
    countdownEndsAt: countdownIso || null,
    gameName: selectedGame?.name ?? "",
    developerName: selectedGame?.developerName ?? "",
    iarcRating: selectedGame?.iarcRating ?? null,
    reviewAverage: selectedGame?.reviewAverage ?? null,
    reviewCount: selectedGame?.reviewCount ?? 0,
  };

  return (
    <GameFormShell
      breadcrumbs={
        isAdmin
          ? [
              { label: "Adbits", href: "/4dm1n/adbits?placement=carousel" },
              { label: editing ? "Edit carousel ad" : "Carousel ad" },
            ]
          : [
              { label: "Adbits", href: "/adbits?placement=carousel" },
              { label: editing ? "Edit carousel ad" : "Carousel ad" },
            ]
      }
      backHref={listHref}
      cancelHref={listHref}
      submitLabel={
        editing ? "Save ad" : isAdmin ? "Place ad" : `Pay ${formatUsd(CAROUSEL_AD_UNIT_CENTS)}`
      }
      submitDisabled={!mediaUrl || !gameId || !destinationUrl.trim() || (!editing && !monthKey)}
      pending={pending}
      uploading={mediaBusy}
      error={state?.error}
      formAction={formAction}
      left={
        <div className="flex flex-col gap-4">
          <AdImagePicker
            variant="carousel"
            value={mediaUrl}
            onChange={setMediaUrl}
            onBusyChange={setMediaBusy}
          />
          <div>
            <p className="text-xs tracking-wide text-fog uppercase">Preview</p>
            <h2 className="text-lg font-medium">How it runs</h2>
          </div>
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-iron bg-charcoal">
            <CarouselSlide slide={preview} />
          </div>
        </div>
      }
      right={
        <div className="flex flex-col gap-6 pb-4">
          <div>
            <h1 className="text-lg font-medium text-paper-white sm:text-xl">
              {editing ? "Edit carousel ad" : "Carousel ad"}
            </h1>
            <p className="mt-1 text-sm text-fog">
              {editing
                ? "Change the card and where it sends people. The month stays the same."
                : isAdmin
                  ? "Goes live right away. The carousel still stops at six slots."
                  : `One slot in the home carousel for the month you book. ${formatUsd(CAROUSEL_AD_UNIT_CENTS)} before tax at checkout. It rotates every 10 seconds.`}
            </p>
          </div>
          <FieldGroup className="gap-4">
            {order ? (
              <p className="text-sm text-paper-white">{order.monthLabel} · 1 slot</p>
            ) : (
              <Field>
                <LabelWithInfo
                  htmlFor="monthKey"
                  info="Slots are monthly. A month starts and ends at midnight Pacific Time."
                >
                  Month
                </LabelWithInfo>
                <Select
                  value={monthKey}
                  onValueChange={(value) => {
                    if (typeof value === "string" && value) setMonthKey(value);
                  }}
                >
                  <SelectTrigger id="monthKey" type="button" className={`w-full ${inputClass}`}>
                    <SelectValue>
                      {selectedMonth ? monthChoice(selectedMonth) : "Choose a month"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start" className="border-iron bg-obsidian p-1 shadow-lg">
                    <SelectGroup>
                      {months.map((month) => (
                        <SelectItem key={month.key} value={month.key} disabled={month.full}>
                          {monthChoice(month)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                {selectedMonth ? (
                  <FieldDescription>{selectedMonth.windowLabel}</FieldDescription>
                ) : null}
              </Field>
            )}

            <Field>
              <LabelWithInfo htmlFor="gameId" info="The card uses this game's name, developer, rating, and IARC badge.">
                Game
              </LabelWithInfo>
              {eligible.length === 0 ? (
                <p className="text-sm text-fog">
                  {games.length === 0
                    ? "Add a game before booking a carousel slot."
                    : "Add an IARC rating to a game before it can run in the carousel."}
                </p>
              ) : (
                <Select
                  value={gameId}
                  onValueChange={(value) => {
                    if (typeof value === "string" && value) setGameId(value);
                  }}
                >
                  <SelectTrigger id="gameId" type="button" className={`w-full ${inputClass}`}>
                    <SelectValue>
                      {selectedGame ? (
                        <span className="flex items-center gap-2">
                          {selectedGame.iarcRating ? (
                            <IarcBadge rating={selectedGame.iarcRating} className="h-8" />
                          ) : null}
                          <span className="truncate">{selectedGame.name}</span>
                        </span>
                      ) : (
                        "Choose a game"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start" className="border-iron bg-obsidian p-1 shadow-lg">
                    <SelectGroup>
                      {eligible.map((game) => (
                        <SelectItem key={game.id} value={game.id}>
                          <span className="flex items-center gap-2">
                            {game.iarcRating ? (
                              <IarcBadge rating={game.iarcRating} className="h-8" />
                            ) : null}
                            {game.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
              {blocked.length > 0 ? (
                <ul className="flex flex-col gap-1 text-sm text-fog">
                  {blocked.map((game) => (
                    <li key={game.id}>
                      {game.name} needs an IARC rating.{" "}
                      <Link href={`/games/${game.slug}/edit`} className="text-ice-signal hover:underline">
                        Edit game
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Field>

            <Field>
              <LabelWithInfo htmlFor="destinationUrl" info="Where a click on the carousel card goes. Use https.">
                Click destination
              </LabelWithInfo>
              <Input
                id="destinationUrl"
                type="url"
                inputMode="url"
                required
                value={destinationUrl}
                onChange={(event) => setDestinationUrl(event.target.value)}
                placeholder="https://"
                className={inputClass}
              />
            </Field>

            <Field>
              <LabelWithInfo htmlFor="tagline" info="Optional short line shown above the game name.">
                Tagline
              </LabelWithInfo>
              <Input
                id="tagline"
                maxLength={AD_TAGLINE_MAX}
                value={tagline}
                onChange={(event) => setTagline(event.target.value)}
                placeholder="Optional"
                className={inputClass}
              />
              <FieldDescription>{AD_TAGLINE_MAX - tagline.length} characters left</FieldDescription>
            </Field>

            <Field>
              <LabelWithInfo htmlFor="badge" info="Optional label in the top right of the card.">
                Tag
              </LabelWithInfo>
              <NativeSelect
                id="badge"
                value={badge}
                onChange={(event) => setBadge(event.target.value as CarouselBadge | "")}
                className="h-9 w-full"
              >
                <NativeSelectOption value="">None</NativeSelectOption>
                {CAROUSEL_BADGES.map((item) => (
                  <NativeSelectOption key={item} value={item}>
                    {CAROUSEL_BADGE_LABELS[item]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            <Field>
              <LabelWithInfo
                htmlFor="countdownLocal"
                info="Optional timer in the top left. It stays on the card for the whole month this ad is in the carousel."
              >
                Countdown
              </LabelWithInfo>
              <Input
                id="countdownLocal"
                type="datetime-local"
                value={countdownLocal}
                onChange={(event) => setCountdownLocal(event.target.value)}
                className={inputClass}
              />
            </Field>
          </FieldGroup>
        </div>
      }
    >
      {order ? <input type="hidden" name="orderId" value={order.id} /> : null}
      <input type="hidden" name="monthKey" value={order?.monthKey ?? monthKey} />
      <input type="hidden" name="gameId" value={gameId} />
      <input type="hidden" name="destinationUrl" value={destinationUrl} />
      <input type="hidden" name="tagline" value={tagline} />
      <input type="hidden" name="badge" value={badge} />
      <input type="hidden" name="countdownEndsAt" value={countdownIso} />
      <input type="hidden" name="mediaUrl" value={mediaUrl} />
    </GameFormShell>
  );
}
