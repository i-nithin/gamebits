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
import { SidebarLogoPreview } from "@/components/ads/ad-preview-media";
import { AdbitsFormCard, AdbitsFormSection } from "@/components/ads/adbits-form-card";
import { LabelWithInfo } from "@/components/game/field-info";
import { GameFormShell } from "@/components/game/game-form-shell";
import { WeekPicker } from "@/components/ads/week-picker";
import { Badge } from "@/components/ui/badge";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SIDEBAR_AD_UNIT_CENTS, formatUsd } from "@/lib/ad-catalog";
import type { AdCreativePrefill, WeekOption } from "@/lib/ads-types";
import { AD_NAME_MAX, AD_TAGLINE_MAX } from "@/lib/constants";

const inputClass = "h-9 rounded-lg border-iron bg-graphite";

export type AdEditTarget = {
  id: string;
  scheduleLabel: string;
};

export function AdBookingForm({
  weeks = [],
  monthLabel = "",
  prefill = null,
  mode,
  order = null,
}: {
  weeks?: WeekOption[];
  monthLabel?: string;
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

  const [weekKeys, setWeekKeys] = useState<string[]>([]);
  const [logoUrl, setLogoUrl] = useState(prefill?.format === "brand" ? (prefill.logoUrl ?? "") : "");
  const [productName, setProductName] = useState(
    prefill?.format === "brand" ? (prefill.productName ?? "") : "",
  );
  const [tagline, setTagline] = useState(prefill?.format === "brand" ? (prefill.tagline ?? "") : "");
  const [destinationUrl, setDestinationUrl] = useState(prefill?.destinationUrl ?? "");
  const [imageBusy, setImageBusy] = useState(false);

  const weekCount = weekKeys.length;
  const weeksOpen = weeks.some((week) => !week.full);
  const listHref = isAdmin ? "/4dm1n/adbits" : "/adbits/history";

  const preview = {
    format: "brand" as const,
    logoUrl,
    productName: productName.trim() || "Product name",
    tagline: tagline.trim() || "One line about the product",
    mediaUrl: null,
  };

  const creativeReady = Boolean(logoUrl);
  const sidebarTotal = formatUsd(SIDEBAR_AD_UNIT_CENTS * weekCount);
  const submitLabel = editing
    ? "Save ad"
    : isAdmin
      ? "Place ad"
      : weekCount > 0
        ? `Pay ${sidebarTotal}`
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
        unitCents={SIDEBAR_AD_UNIT_CENTS}
        admin={isAdmin}
      />
    </Field>
  );

  const nameField = (
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
      <FieldDescription>{AD_NAME_MAX - productName.length} characters left</FieldDescription>
    </Field>
  );

  const taglineField = (
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
      <FieldDescription>{AD_TAGLINE_MAX - tagline.length} characters left</FieldDescription>
    </Field>
  );

  const destinationField = (
    <Field>
      <LabelWithInfo htmlFor="destinationUrl" info="Where the card sends people. Must be an https link.">
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
  );

  const hidden = (
    <>
      {order ? <input type="hidden" name="orderId" value={order.id} /> : null}
      {weekKeys.map((key) => (
        <input key={key} type="hidden" name="weekKey" value={key} />
      ))}
      <input type="hidden" name="format" value="brand" />
      <input type="hidden" name="logoUrl" value={logoUrl} />
      <input type="hidden" name="mediaUrl" value="" />
      <input type="hidden" name="productName" value={productName} />
      <input type="hidden" name="tagline" value={tagline} />
      <input type="hidden" name="destinationUrl" value={destinationUrl} />
    </>
  );

  if (!isAdmin) {
    return (
      <AdbitsFormCard
        title={editing ? "Edit ad" : "Right sidebar"}
        description={
          editing
            ? "Change the card and where it sends people. The weeks stay."
            : `${formatUsd(SIDEBAR_AD_UNIT_CENTS)} per week. Tax may be added at checkout.`
        }
        preview={
          <SidebarLogoPreview
            logoUrl={logoUrl}
            productName={productName}
            tagline={tagline}
            onChange={setLogoUrl}
            onBusyChange={setImageBusy}
          />
        }
        hidden={hidden}
        submitLabel={submitLabel}
        submitDisabled={!creativeReady || (!editing && (weekCount < 1 || !weeksOpen))}
        pending={pending}
        uploading={imageBusy}
        error={state?.error}
        formAction={action}
      >
        <AdbitsFormSection label="Booking">{bookingField}</AdbitsFormSection>
        <AdbitsFormSection label="Creative">
          {nameField}
          {taglineField}
        </AdbitsFormSection>
        <AdbitsFormSection label="Destination">{destinationField}</AdbitsFormSection>
      </AdbitsFormCard>
    );
  }

  return (
    <GameFormShell
      breadcrumbs={[
        { label: "Admin", href: "/4dm1n" },
        { label: "Adbits", href: "/4dm1n/adbits" },
        { label: editing ? "Edit ad" : "Place an ad" },
      ]}
      backHref={listHref}
      cancelHref={listHref}
      submitLabel={submitLabel}
      submitDisabled={!creativeReady || (!editing && (weekCount < 1 || !weeksOpen))}
      pending={pending}
      uploading={imageBusy}
      error={state?.error}
      formAction={action}
      left={
        <div className="flex flex-col gap-5 sm:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div>
            <p className="text-xs tracking-wide text-fog uppercase">Creative</p>
            <h2 className="text-lg font-medium">Product logo</h2>
          </div>
          <AdImagePicker
            variant="logo"
            value={logoUrl}
            onChange={setLogoUrl}
            onBusyChange={setImageBusy}
          />

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
            <p className="text-sm text-fog">Upload a logo to see the card.</p>
          )}
        </div>
      }
      right={
        <div className="flex flex-col gap-6 pb-4">
          <div>
            <h1 className="text-lg font-medium text-paper-white sm:text-xl">
              {editing ? "Edit ad" : "Place an ad"}
            </h1>
            <p className="mt-1 text-sm text-fog">
              {editing
                ? "Change the card and where it sends people. The weeks stay."
                : "Goes live right away. Each week still stops at six ads."}
            </p>
          </div>

          <FieldGroup className="gap-4">
            {bookingField}
            {nameField}
            {taglineField}
            {destinationField}
          </FieldGroup>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {editing ? order.scheduleLabel : `${weekCount} ${weekCount === 1 ? "week" : "weeks"}`}
            </Badge>
            <Badge variant="outline">{editing ? "Weeks stay" : "Live on save"}</Badge>
          </div>
        </div>
      }
    >
      {hidden}
    </GameFormShell>
  );
}
