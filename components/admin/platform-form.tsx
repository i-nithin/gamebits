"use client";

import { useActionState, useState } from "react";

import { upsertPlatformAction } from "@/app/actions/platforms";
import { LabelWithInfo } from "@/components/game/field-info";
import { LogoPicker } from "@/components/game/media-picker";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { platforms } from "@/db/schema";

type PlatformRow = typeof platforms.$inferSelect;

export function PlatformForm({ platform }: { platform?: PlatformRow }) {
  const isEdit = Boolean(platform);
  const [logoUrl, setLogoUrl] = useState(platform?.logoUrl ?? "");
  const [logoBusy, setLogoBusy] = useState(false);
  const [state, action, pending] = useActionState(upsertPlatformAction, null);

  return (
    <form action={action} className="flex max-w-xl flex-col gap-6">
      {platform ? <input type="hidden" name="id" value={platform.id} /> : null}
      <input type="hidden" name="logoUrl" value={logoUrl} />
      {state?.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      <FieldGroup className="gap-4">
        <Field>
          <LabelWithInfo htmlFor="name" info="Shown on game chips, cards, and the add-game form.">
            Name
          </LabelWithInfo>
          <Input
            id="name"
            name="name"
            required
            maxLength={40}
            defaultValue={platform?.name ?? ""}
            placeholder="Steam Deck"
            className="h-9 rounded-lg border-iron bg-graphite"
          />
        </Field>
        <Field>
          <LabelWithInfo htmlFor="slug" info="Stable id used in URLs and migrations. Leave blank to generate from the name.">
            Slug
          </LabelWithInfo>
          <Input
            id="slug"
            name="slug"
            maxLength={40}
            defaultValue={platform?.slug ?? ""}
            placeholder="steam-deck"
            className="h-9 rounded-lg border-iron bg-graphite"
          />
        </Field>
        <Field>
          <LabelWithInfo htmlFor="sortOrder" info="Lower numbers appear first in the selector.">
            Sort order
          </LabelWithInfo>
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            min={0}
            max={10000}
            defaultValue={platform?.sortOrder ?? 0}
            className="h-9 rounded-lg border-iron bg-graphite"
          />
        </Field>
        <Field>
          <LabelWithInfo info="A small mark shown next to the platform name. Square PNG, WebP, or SVG.">
            Logo
          </LabelWithInfo>
          <LogoPicker value={logoUrl} onChange={setLogoUrl} onBusyChange={setLogoBusy} />
        </Field>
        {isEdit ? (
          <Field orientation="horizontal">
            <input
              id="archived"
              name="archived"
              type="checkbox"
              defaultChecked={Boolean(platform?.archivedAt)}
              className="size-4 rounded border-iron"
            />
            <LabelWithInfo
              htmlFor="archived"
              info="Hidden from new game listings. Games that already use it keep the chip."
            >
              Archive this platform
            </LabelWithInfo>
          </Field>
        ) : null}
      </FieldGroup>
      <Button type="submit" disabled={pending || logoBusy || !logoUrl}>
        {pending ? "Saving…" : isEdit ? "Save platform" : "Add platform"}
      </Button>
    </form>
  );
}
