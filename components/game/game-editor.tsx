"use client";

import { useActionState, useState } from "react";
import {
  Gamepad2Icon,
  GlobeIcon,
  JoystickIcon,
  MessageCircleIcon,
  RocketIcon,
  SmartphoneIcon,
  StoreIcon,
} from "lucide-react";

import { upsertGameAction } from "@/app/actions/admin";
import { GameFormShell } from "@/components/game/game-form-shell";
import { LogoPicker, MediaPicker, type DraftMedia } from "@/components/game/media-picker";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { games } from "@/db/schema";
import {
  GAME_LINK_FIELDS,
  GAME_STATUS_LABELS,
  GAME_STATUSES,
  PLATFORMS,
  type GameLinkKind,
} from "@/lib/constants";
import { parseVideoEmbed, withVideosFirst } from "@/lib/urls";

const LINK_ICONS: Record<GameLinkKind, typeof GlobeIcon> = {
  web: GlobeIcon,
  steam: Gamepad2Icon,
  playstore: SmartphoneIcon,
  appstore: SmartphoneIcon,
  nintendo: JoystickIcon,
  playstation: JoystickIcon,
  xbox: Gamepad2Icon,
  discord: MessageCircleIcon,
  x: StoreIcon,
};

type GameRow = typeof games.$inferSelect;

function initialMedia(game?: GameRow): DraftMedia[] {
  if (!game) return [];
  const items: DraftMedia[] = [];
  if (game.trailerUrl && parseVideoEmbed(game.trailerUrl)) {
    items.push({ key: "trailer", kind: "video", url: game.trailerUrl });
  }
  if (game.coverUrl) {
    items.push({ key: "cover", kind: "image", url: game.coverUrl });
  }
  return withVideosFirst(items);
}

export function GameEditor({ game }: { game?: GameRow }) {
  const [logoUrl, setLogoUrl] = useState(game?.coverUrl ?? "");
  const [platforms, setPlatforms] = useState<string[]>(() => game?.platforms ?? []);
  const [draftMedia, setDraftMedia] = useState<DraftMedia[]>(() => initialMedia(game));
  const [state, action, pending] = useActionState(upsertGameAction, null);

  const isEdit = Boolean(game);
  const cancelHref = game ? `/games/${game.slug}` : "/";

  return (
    <GameFormShell
      breadcrumbs={
        isEdit
          ? [
              { label: game!.name, href: `/games/${game!.slug}` },
              { label: "Edit game" },
            ]
          : [{ label: "Discover", href: "/" }, { label: "Add game" }]
      }
      backHref={isEdit ? `/games/${game!.slug}` : "/"}
      cancelHref={cancelHref}
      submitLabel={isEdit ? "Save game" : "Create game"}
      submitDisabled={!logoUrl}
      pending={pending}
      error={state?.error}
      formAction={action}
      left={<MediaPicker items={draftMedia} onChange={setDraftMedia} />}
      right={
        <div className="flex h-full min-h-0 flex-col gap-3">
          <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl card-ring bg-graphite">
                <RocketIcon className="size-4 text-ice-signal" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-medium text-paper-white">
                  {isEdit ? "Edit your game" : "Add your game"}
                </h1>
                <p className="text-sm text-fog lg:truncate">
                  {isEdit
                    ? "Update listing details, media, and store links."
                    : "Tell players what you made. Upload a logo and screenshots, then add store links."}
                </p>
              </div>
            </div>
            <div className="w-full shrink-0 lg:w-[16rem]">
              <LogoPicker value={logoUrl} onChange={setLogoUrl} />
            </div>
          </div>

          <FieldGroup className="min-h-0 flex-1 gap-3 lg:overflow-hidden">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="name">Game name</FieldLabel>
                <Input
                  id="name"
                  name="name"
                  required
                  maxLength={120}
                  defaultValue={game?.name}
                  placeholder="Add game name"
                  className="h-9 rounded-lg border-iron bg-graphite"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="developerName">Developer name</FieldLabel>
                <Input
                  id="developerName"
                  name="developerName"
                  required
                  maxLength={120}
                  defaultValue={game?.developerName}
                  placeholder="Studio or maker name"
                  className="h-9 rounded-lg border-iron bg-graphite"
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="tagline">Tagline</FieldLabel>
                <Input
                  id="tagline"
                  name="tagline"
                  required
                  maxLength={160}
                  defaultValue={game?.tagline}
                  placeholder="One short line for the board"
                  className="h-9 rounded-lg border-iron bg-graphite"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="status">Status</FieldLabel>
                <NativeSelect
                  id="status"
                  name="status"
                  defaultValue={game?.status ?? "upcoming"}
                  className="w-full"
                >
                  {GAME_STATUSES.map((status) => (
                    <NativeSelectOption key={status} value={status}>
                      {GAME_STATUS_LABELS[status]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>

            <Field className="min-h-0 lg:flex-1">
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                id="description"
                name="description"
                required
                maxLength={4000}
                className="min-h-[4.5rem] resize-none rounded-lg border-iron bg-graphite field-sizing-fixed lg:h-full lg:max-h-none"
                defaultValue={game?.description}
                placeholder="What should players know?"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="tags">Tags (comma, up to 3)</FieldLabel>
                <Input
                  id="tags"
                  name="tags"
                  required
                  defaultValue={game?.tags?.join(", ")}
                  placeholder="action, indie"
                  className="h-9 rounded-lg border-iron bg-graphite"
                />
              </Field>
              <Field>
                <FieldLabel>Platforms</FieldLabel>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {PLATFORMS.map((platform) => (
                    <label key={platform} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        name="platforms"
                        value={platform}
                        checked={platforms.includes(platform)}
                        onChange={(event) => {
                          setPlatforms((current) =>
                            event.target.checked
                              ? [...current, platform]
                              : current.filter((item) => item !== platform),
                          );
                        }}
                        className="size-4 rounded border-iron"
                      />
                      {platform}
                    </label>
                  ))}
                </div>
              </Field>
            </div>

            <Field>
              <FieldLabel>Links and stores</FieldLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {GAME_LINK_FIELDS.map((field) => {
                  const Icon = LINK_ICONS[field.kind];
                  return (
                    <div key={field.kind} className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-paper-white">{field.label}</span>
                      <InputGroup className="h-9 rounded-lg border-iron bg-graphite">
                        <InputGroupAddon>
                          <Icon className="size-4 text-fog" />
                        </InputGroupAddon>
                        <InputGroupInput
                          name={`link_${field.kind}`}
                          type="url"
                          inputMode="url"
                          placeholder={field.placeholder}
                          defaultValue={field.kind === "web" ? (game?.primaryUrl ?? "") : ""}
                        />
                      </InputGroup>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-fog">Add at least one website or store URL.</p>
            </Field>
          </FieldGroup>
        </div>
      }
    >
      {game ? <input type="hidden" name="id" value={game.id} /> : null}
      {game ? <input type="hidden" name="slug" value={game.slug} /> : null}
      <input type="hidden" name="logoUrl" value={logoUrl} />
      <input
        type="hidden"
        name="media"
        value={JSON.stringify(draftMedia.map(({ kind, url }) => ({ kind, url })))}
      />
    </GameFormShell>
  );
}
