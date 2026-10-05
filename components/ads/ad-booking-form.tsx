"use client";

import { useActionState, useState } from "react";

import {
  bookAdFormAction,
  placeAdminAdFormAction,
  saveAdminAdFormAction,
  saveOwnedAdFormAction,
} from "@/app/actions/ads";
import { AdCard } from "@/components/ads/ad-card";
import { AdImagePicker } from "@/components/ads/ad-image-picker";
import { LabelWithInfo } from "@/components/game/field-info";
import { GameFormShell } from "@/components/game/game-form-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SIDEBAR_AD_UNIT_CENTS, formatUsd } from "@/lib/ad-catalog";
import type { AdCreativePrefill, AdFormat, MonthOption } from "@/lib/ads-types";
import { AD_NAME_MAX, AD_TAGLINE_MAX } from "@/lib/constants";

const FORMATS: { id: AdFormat; label: string }[] = [
  { id: "brand", label: "Logo and tagline" },
  { id: "media", label: "Image or GIF" },
];

const inputClass = "h-9 rounded-lg border-iron bg-graphite";

function monthChoice(month: MonthOption) {
  const count = `${month.label} · ${month.booked}/${month.cap}`;
  return month.full ? `${count} · Full` : count;
}

export type AdEditTarget = {
  id: string;
  monthLabel: string;
  slotCount: number;
  monthKey: string;
};

export function AdBookingForm({
  months = [],
  prefill = null,
  mode,
  order = null,
}: {
  months?: MonthOption[];
  prefill?: AdCreativePrefill | null;
  mode: "user" | "admin";
  order?: AdEditTarget | null;
}) {
  const isAdmin = mode === "admin";
  const editing = order !== null;
  const [state, action, pending] = useActionState(
    editing
      ? isAdmin
        ? saveAdminAdFormAction
        : saveOwnedAdFormAction
      : isAdmin
        ? placeAdminAdFormAction
        : bookAdFormAction,
    null,
  );

  const [monthKey, setMonthKey] = useState(
    () => order?.monthKey ?? (months.find((month) => !month.full) ?? months[0])?.key ?? "",
  );
  const [slotCount, setSlotCount] = useState(order?.slotCount ?? 1);
  const [format, setFormat] = useState<AdFormat>(prefill?.format ?? "brand");
  const [logoUrl, setLogoUrl] = useState(prefill?.logoUrl ?? "");
  const [mediaUrl, setMediaUrl] = useState(prefill?.mediaUrl ?? "");
  const [productName, setProductName] = useState(prefill?.productName ?? "");
  const [tagline, setTagline] = useState(prefill?.tagline ?? "");
  const [destinationUrl, setDestinationUrl] = useState(prefill?.destinationUrl ?? "");
  const [imageBusy, setImageBusy] = useState(false);

  const selected = months.find((month) => month.key === monthKey) ?? null;
  const openSlots = selected ? Math.max(0, selected.cap - selected.booked) : 0;
  const slots = order ? order.slotCount : Math.min(slotCount, Math.max(openSlots, 1));
  const listHref = isAdmin ? "/4dm1n/adbits" : "/adbits";

  const preview =
    format === "brand"
      ? {
          format: "brand" as const,
          logoUrl,
          productName: productName.trim() || "Product name",
          tagline: tagline.trim() || "One line about the product",
          mediaUrl: null,
        }
      : {
          format: "media" as const,
          logoUrl: null,
          productName: null,
          tagline: null,
          mediaUrl,
        };

  const creativeReady = format === "brand" ? Boolean(logoUrl) : Boolean(mediaUrl);
  const sidebarTotal = formatUsd(SIDEBAR_AD_UNIT_CENTS * slots);

  return (
    <GameFormShell
      breadcrumbs={
        isAdmin
          ? [
              { label: "Admin", href: "/4dm1n" },
              { label: "Adbits", href: "/4dm1n/adbits" },
              { label: editing ? "Edit ad" : "Place an ad" },
            ]
          : [
              { label: "Adbits", href: "/adbits" },
              { label: editing ? "Edit ad" : "Book a slot" },
            ]
      }
      backHref={listHref}
      cancelHref={listHref}
      submitLabel={editing ? "Save ad" : isAdmin ? "Place ad" : `Pay ${sidebarTotal}`}
      submitDisabled={!creativeReady || (!editing && openSlots < 1)}
      pending={pending}
      uploading={imageBusy}
      error={state?.error}
      formAction={action}
      left={
        <div className="flex flex-col gap-5 sm:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div>
            <p className="text-xs tracking-wide text-fog uppercase">Creative</p>
            <h2 className="text-lg font-medium">
              {format === "brand" ? "Product logo" : "Ad image"}
            </h2>
          </div>
          {format === "brand" ? (
            <AdImagePicker
              key="logo"
              variant="logo"
              value={logoUrl}
              onChange={setLogoUrl}
              onBusyChange={setImageBusy}
            />
          ) : (
            <AdImagePicker
              key="media"
              variant="media"
              value={mediaUrl}
              onChange={setMediaUrl}
              onBusyChange={setImageBusy}
            />
          )}

          <div>
            <p className="text-xs tracking-wide text-fog uppercase">Preview</p>
            <h2 className="text-lg font-medium">How it runs</h2>
          </div>
          {creativeReady ? (
            <>
              <div className="flex flex-col gap-2">
                <p className="text-xs tracking-wide text-fog uppercase">Right rail</p>
                <div className="rounded-2xl border border-iron bg-charcoal p-3">
                  <AdCard ad={preview} className="w-full max-w-[320px]" />
                </div>
              </div>
              <div className="flex flex-col gap-2 pb-4">
                <p className="text-xs tracking-wide text-fog uppercase">On a phone</p>
                <div className="rounded-2xl border border-iron bg-charcoal p-3">
                  <AdCard ad={preview} compact className="w-full max-w-[320px]" />
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-fog">
              {format === "brand"
                ? "Upload a logo to see the card."
                : "Upload an image or GIF to see the card."}
            </p>
          )}
        </div>
      }
      right={
        <div className="flex flex-col gap-6 pb-4">
          <div>
            <h1 className="text-lg font-medium text-paper-white sm:text-xl">
              {editing ? "Edit ad" : isAdmin ? "Place an ad" : "Book a slot"}
            </h1>
            <p className="mt-1 text-sm text-fog">
              {editing
                ? "Change the card and where it sends people. The month and slot count stay."
                : isAdmin
                  ? "Goes live right away. A month still stops at six slots."
                  : `${formatUsd(SIDEBAR_AD_UNIT_CENTS)} per slot for the month you book. Tax may be added at checkout.`}
            </p>
          </div>

          <FieldGroup className="gap-4">
            {order ? (
              <p className="text-sm text-paper-white">
                {order.monthLabel} · {order.slotCount} {order.slotCount === 1 ? "slot" : "slots"}
              </p>
            ) : (
              <>
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
                  if (typeof value !== "string" || !value) return;
                  setMonthKey(value);
                  setSlotCount(1);
                }}
              >
                <SelectTrigger id="monthKey" type="button" className={`w-full ${inputClass}`}>
                  <SelectValue>
                    {selected ? monthChoice(selected) : "Choose a month"}
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
              {selected ? <FieldDescription>{selected.windowLabel}</FieldDescription> : null}
            </Field>

            <Field>
              <LabelWithInfo
                htmlFor="slotCount"
                info="Extra slots buy more airtime for the same card, not a second card."
              >
                Slots
              </LabelWithInfo>
              <Select
                value={String(slots)}
                onValueChange={(value) => {
                  if (typeof value === "string" && value) setSlotCount(Number(value));
                }}
                disabled={openSlots < 1}
              >
                <SelectTrigger id="slotCount" type="button" className={`w-full ${inputClass}`}>
                  <SelectValue>{openSlots < 1 ? "No slots open" : String(slots)}</SelectValue>
                </SelectTrigger>
                <SelectContent align="start" className="border-iron bg-obsidian p-1 shadow-lg">
                  <SelectGroup>
                    {Array.from({ length: openSlots }, (_, index) => String(index + 1)).map(
                      (value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ),
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FieldDescription>
                {openSlots < 1
                  ? "Pick another month to free up slots."
                  : isAdmin
                    ? `${openSlots} of ${selected?.cap ?? 6} still open this month.`
                    : `${slots} ${slots === 1 ? "slot" : "slots"} · ${sidebarTotal} before tax. ${openSlots} still open.`}
              </FieldDescription>
            </Field>
              </>
            )}

            <Field>
              <LabelWithInfo info="Logo and tagline builds the card for you. Image or GIF uses your own artwork.">
                Format
              </LabelWithInfo>
              <div className="flex items-center gap-2">
                {FORMATS.map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    size="sm"
                    variant={format === item.id ? "secondary" : "outline"}
                    aria-pressed={format === item.id}
                    onClick={() => setFormat(item.id)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </Field>

            {format === "brand" ? (
              <>
                <Field>
                  <LabelWithInfo htmlFor="productName" info="Shown as the headline on the card.">
                    Product name
                  </LabelWithInfo>
                  <Input
                    id="productName"
                    maxLength={AD_NAME_MAX}
                    value={productName}
                    onChange={(event) => setProductName(event.target.value)}
                    placeholder="Chatbase"
                    className={inputClass}
                  />
                  <FieldDescription>
                    {AD_NAME_MAX - productName.length} characters left
                  </FieldDescription>
                </Field>
                <Field>
                  <LabelWithInfo htmlFor="tagline" info="One short line under the name.">
                    Tagline
                  </LabelWithInfo>
                  <Input
                    id="tagline"
                    maxLength={AD_TAGLINE_MAX}
                    value={tagline}
                    onChange={(event) => setTagline(event.target.value)}
                    placeholder="AI agent for customer support"
                    className={inputClass}
                  />
                  <FieldDescription>
                    {AD_TAGLINE_MAX - tagline.length} characters left
                  </FieldDescription>
                </Field>
              </>
            ) : null}

            <Field>
              <LabelWithInfo
                htmlFor="destinationUrl"
                info="Where the card sends people. Must be an https link."
              >
                Click destination
              </LabelWithInfo>
              <Input
                id="destinationUrl"
                type="url"
                inputMode="url"
                required
                value={destinationUrl}
                onChange={(event) => setDestinationUrl(event.target.value)}
                placeholder="https://example.com"
                className={inputClass}
              />
            </Field>
          </FieldGroup>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {slots} {slots === 1 ? "slot" : "slots"}
            </Badge>
            <Badge variant="outline">
              {editing ? "Month and slots stay" : isAdmin ? "Live on save" : "Waiting for approval"}
            </Badge>
          </div>
        </div>
      }
    >
      {order ? <input type="hidden" name="orderId" value={order.id} /> : null}
      <input type="hidden" name="monthKey" value={order?.monthKey ?? monthKey} />
      <input type="hidden" name="slotCount" value={slots} />
      <input type="hidden" name="format" value={format} />
      <input type="hidden" name="logoUrl" value={format === "brand" ? logoUrl : ""} />
      <input type="hidden" name="mediaUrl" value={format === "media" ? mediaUrl : ""} />
      <input type="hidden" name="productName" value={format === "brand" ? productName : ""} />
      <input type="hidden" name="tagline" value={format === "brand" ? tagline : ""} />
      <input type="hidden" name="destinationUrl" value={destinationUrl} />
    </GameFormShell>
  );
}
