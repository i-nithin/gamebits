"use client";

import { useActionState, useState } from "react";

import { upsertPlatformAction } from "@/app/actions/platforms";
import { PlatformLogoPicker } from "@/components/admin/platform-logo-picker";
import { LabelWithInfo } from "@/components/game/field-info";
import { GameFormShell } from "@/components/game/game-form-shell";
import { PlatformChip } from "@/components/game/platform-chip";
import { Badge } from "@/components/ui/badge";
import { Field, FieldContent, FieldDescription, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { platforms } from "@/db/schema";
import { slugify } from "@/lib/sanitize";

type PlatformRow = typeof platforms.$inferSelect;

export function PlatformForm({ platform }: { platform?: PlatformRow }) {
  const isEdit = Boolean(platform);
  const [name, setName] = useState(platform?.name ?? "");
  const [slug, setSlug] = useState(platform?.slug ?? "");
  const [sortOrder, setSortOrder] = useState(String(platform?.sortOrder ?? 0));
  const [logoUrl, setLogoUrl] = useState(platform?.logoUrl ?? "");
  const [archived, setArchived] = useState(Boolean(platform?.archivedAt));
  const [logoBusy, setLogoBusy] = useState(false);
  const [state, action, pending] = useActionState(upsertPlatformAction, null);

  const previewName = name.trim() || "Platform name";
  const previewSlug = slug.trim() || slugify(name) || "slug";

  return (
    <GameFormShell
      breadcrumbs={[
        { label: "Admin", href: "/admin" },
        { label: "Platforms", href: "/admin/platforms" },
        { label: isEdit ? platform!.name : "New platform" },
      ]}
      backHref="/admin/platforms"
      cancelHref="/admin/platforms"
      submitLabel={isEdit ? "Save platform" : "Add platform"}
      submitDisabled={!logoUrl}
      pending={pending}
      uploading={logoBusy}
      error={state?.error}
      formAction={action}
      left={
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs tracking-wide text-fog uppercase">Logo</p>
            <h2 className="text-lg font-medium">Platform icon</h2>
          </div>
          <PlatformLogoPicker
            value={logoUrl}
            onChange={setLogoUrl}
            onBusyChange={setLogoBusy}
          />
          <PlatformPreview
            name={previewName}
            slug={previewSlug}
            logoUrl={logoUrl}
            sortOrder={sortOrder}
            archived={isEdit && archived}
          />
        </div>
      }
      right={
        <div className="flex flex-col gap-6 pb-4">
          <div>
            <h1 className="text-lg font-medium text-paper-white sm:text-xl">
              {isEdit ? "Edit platform" : "Add a platform"}
            </h1>
            <p className="mt-1 text-sm text-fog">
              {isEdit
                ? "Replace the icon on the left, then save. Existing games keep showing the new mark."
                : "Upload an icon on the left, then name the store or device."}
            </p>
          </div>

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
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Steam Deck"
                className="h-9 rounded-lg border-iron bg-graphite"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
              <Field>
                <LabelWithInfo
                  htmlFor="slug"
                  info="Stable id used in URLs and migrations. Leave blank to generate from the name."
                >
                  Slug
                </LabelWithInfo>
                <Input
                  id="slug"
                  name="slug"
                  maxLength={40}
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  placeholder={slugify(name) || "steam-deck"}
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
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  className="h-9 rounded-lg border-iron bg-graphite"
                />
              </Field>
            </div>
            {isEdit ? (
              <Field orientation="horizontal" className="rounded-xl bg-obsidian px-3 py-3 card-ring">
                <Switch
                  id="archived"
                  name="archived"
                  checked={archived}
                  onCheckedChange={setArchived}
                />
                <FieldContent>
                  <LabelWithInfo
                    htmlFor="archived"
                    info="Hidden from new game listings. Games that already use it keep the chip."
                  >
                    Archive this platform
                  </LabelWithInfo>
                  <FieldDescription>
                    Hidden from new listings. Existing games keep the chip.
                  </FieldDescription>
                </FieldContent>
              </Field>
            ) : null}
          </FieldGroup>
        </div>
      }
    >
      {platform ? <input type="hidden" name="id" value={platform.id} /> : null}
      <input type="hidden" name="logoUrl" value={logoUrl} />
    </GameFormShell>
  );
}

function PlatformPreview({
  name,
  slug,
  logoUrl,
  sortOrder,
  archived,
}: {
  name: string;
  slug: string;
  logoUrl: string;
  sortOrder: string;
  archived: boolean;
}) {
  const order = Number.parseInt(sortOrder, 10);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs tracking-wide text-fog uppercase">Preview</p>
        <h2 className="text-lg font-medium">On the board</h2>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xs tracking-wide text-fog uppercase">Chip</p>
        {logoUrl ? (
          <PlatformChip platform={{ id: "preview", name, slug, logoUrl }} />
        ) : (
          <p className="text-sm text-fog">Upload a logo to see the chip.</p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">Order {Number.isInteger(order) ? order : 0}</Badge>
        <Badge variant={archived ? "outline" : "secondary"}>{archived ? "Archived" : "Live"}</Badge>
      </div>
    </div>
  );
}
