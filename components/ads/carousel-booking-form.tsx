"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  bookCarouselFormAction,
  placeAdminCarouselFormAction,
  saveAdminCarouselFormAction,
  saveOwnedCarouselFormAction,
} from "@/app/actions/ads";
import { AdImagePicker } from "@/components/ads/ad-image-picker";
import { CarouselMediaPreview } from "@/components/ads/ad-preview-media";
import { AdbitsFormCard, AdbitsFormSection } from "@/components/ads/adbits-form-card";
import { CarouselSlide } from "@/components/ads/carousel-slide";
import { LabelWithInfo } from "@/components/game/field-info";
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
import { WeekPicker } from "@/components/ads/week-picker";
import { CAROUSEL_AD_UNIT_CENTS, formatUsd } from "@/lib/ad-catalog";
import type { CarouselGameChoice, WeekOption } from "@/lib/ads-types";
import {
  AD_TAGLINE_MAX,
  CAROUSEL_BADGE_LABELS,
  CAROUSEL_BADGES,
  type CarouselBadge,
} from "@/lib/constants";

const inputClass = "h-9 rounded-lg border-iron bg-graphite";

function GameLogo({ logoUrl }: { logoUrl: string }) {
  return (
    <span className="relative size-5 shrink-0 overflow-hidden rounded-sm bg-graphite">
      <Image src={logoUrl} alt="" fill className="object-cover" sizes="20px" />
    </span>
  );
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
  scheduleLabel: string;
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
  weeks = [],
  monthLabel = "",
  games,
  mode,
  order,
  prefill,
  initialGameId,
}: {
  weeks?: WeekOption[];
  monthLabel?: string;
  games: CarouselGameChoice[];
  mode: "user" | "admin";
  order?: CarouselEditTarget;
  prefill?: CarouselPrefill | null;
  initialGameId?: string | null;
}) {
  const isAdmin = mode === "admin";
  const editing = Boolean(order);
  const listHref = isAdmin ? "/4dm1n/adbits?placement=carousel" : "/adbits/history";
  const action = editing
    ? isAdmin
      ? saveAdminCarouselFormAction
      : saveOwnedCarouselFormAction
    : isAdmin
      ? placeAdminCarouselFormAction
      : bookCarouselFormAction;
  const [state, formAction, pending] = useActionState(action, null);
  const [weekKeys, setWeekKeys] = useState<string[]>([]);
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
  const weekCount = weekKeys.length;
  const weeksOpen = weeks.some((week) => !week.full);
  const selectedGame = eligible.find((game) => game.id === gameId) ?? null;
  const countdownIso = localInputToIso(countdownLocal);
  const newGameHref = isAdmin ? "/4dm1n/games/new?next=admin-carousel" : "/games/new?next=carousel";

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

  const carouselTotal = formatUsd(CAROUSEL_AD_UNIT_CENTS * weekCount);
  const submitLabel = editing
    ? "Save ad"
    : isAdmin
      ? "Place ad"
      : weekCount > 0
        ? `Pay ${carouselTotal}`
        : "Pay";

  const bookingField = order ? (
    <p className="text-sm text-paper-white">{order.scheduleLabel}</p>
  ) : (
    <Field>
      <LabelWithInfo
        htmlFor="weekKey"
        info="A week runs Monday to Monday at midnight Pacific Time. You can book any open weeks of next month."
      >
        Weeks
      </LabelWithInfo>
      <WeekPicker
        weeks={weeks}
        monthLabel={monthLabel}
        selected={weekKeys}
        onChange={setWeekKeys}
        unitCents={CAROUSEL_AD_UNIT_CENTS}
        admin={isAdmin}
      />
    </Field>
  );

  const gameField = (
    <Field>
      <LabelWithInfo htmlFor="gameId" info="The card uses this game's name, developer, rating, and IARC badge.">
        Game
      </LabelWithInfo>
      {eligible.length === 0 ? (
        <p className="text-sm text-fog">
          {games.length === 0 ? (
            isAdmin ? (
              "Add a game before booking a carousel slot."
            ) : (
              <>
                <Link href={newGameHref} className="text-ice-signal hover:underline">
                  Add a game
                </Link>{" "}
                before booking a carousel slot.
              </>
            )
          ) : (
            "Add an IARC rating to a game before it can run in the carousel."
          )}
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
                  <GameLogo logoUrl={selectedGame.logoUrl} />
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
                    <GameLogo logoUrl={game.logoUrl} />
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
  );

  const destinationField = (
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
  );

  const taglineField = (
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
  );

  const badgeField = (
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
  );

  const countdownField = (
    <Field>
      <LabelWithInfo
        htmlFor="countdownLocal"
        info="Optional timer in the top left. It stays on the card during the weeks this ad is in the carousel."
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
  );

  const hidden = (
    <>
      {order ? <input type="hidden" name="orderId" value={order.id} /> : null}
      {weekKeys.map((key) => (
        <input key={key} type="hidden" name="weekKey" value={key} />
      ))}
      <input type="hidden" name="gameId" value={gameId} />
      <input type="hidden" name="destinationUrl" value={destinationUrl} />
      <input type="hidden" name="tagline" value={tagline} />
      <input type="hidden" name="badge" value={badge} />
      <input type="hidden" name="countdownEndsAt" value={countdownIso} />
      <input type="hidden" name="mediaUrl" value={mediaUrl} />
    </>
  );

  if (!isAdmin) {
    return (
      <AdbitsFormCard
        title={editing ? "Edit carousel ad" : "Hero carousel"}
        description={
          editing
            ? "Change the card and where it sends people. The weeks stay."
            : `${formatUsd(CAROUSEL_AD_UNIT_CENTS)} per week in the home carousel. Tax may be added at checkout. It rotates every 10 seconds.`
        }
        preview={
          <CarouselMediaPreview slide={preview} onChange={setMediaUrl} onBusyChange={setMediaBusy} />
        }
        hidden={hidden}
        submitLabel={submitLabel}
        submitDisabled={
          !mediaUrl || !gameId || !destinationUrl.trim() || (!editing && (weekCount < 1 || !weeksOpen))
        }
        pending={pending}
        uploading={mediaBusy}
        error={state?.error}
        formAction={formAction}
      >
        <AdbitsFormSection label="Booking">{bookingField}</AdbitsFormSection>
        <AdbitsFormSection label="Game">{gameField}</AdbitsFormSection>
        <AdbitsFormSection label="Creative">
          {taglineField}
          {badgeField}
          {countdownField}
        </AdbitsFormSection>
        <AdbitsFormSection label="Destination">{destinationField}</AdbitsFormSection>
      </AdbitsFormCard>
    );
  }

  return (
    <GameFormShell
      breadcrumbs={[
        { label: "Adbits", href: "/4dm1n/adbits?placement=carousel" },
        { label: editing ? "Edit carousel ad" : "Carousel ad" },
      ]}
      backHref={listHref}
      cancelHref={listHref}
      submitLabel={submitLabel}
      submitDisabled={
        !mediaUrl || !gameId || !destinationUrl.trim() || (!editing && (weekCount < 1 || !weeksOpen))
      }
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
                ? "Change the card and where it sends people. The weeks stay."
                : "Goes live right away. Each week still stops at six ads."}
            </p>
          </div>
          <FieldGroup className="gap-4">
            {bookingField}
            {gameField}
            {destinationField}
            {taglineField}
            {badgeField}
            {countdownField}
          </FieldGroup>
        </div>
      }
    >
      {hidden}
    </GameFormShell>
  );
}
