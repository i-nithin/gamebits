"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  Gamepad2Icon,
  GlobeIcon,
  JoystickIcon,
  MessageCircleIcon,
  SmartphoneIcon,
  StoreIcon,
} from "lucide-react";

import { upsertOwnedGameAction } from "@/app/actions/games";
import { LabelWithInfo } from "@/components/game/field-info";
import { GameFormShell } from "@/components/game/game-form-shell";
import { LogoPicker, MediaPicker, type DraftMedia } from "@/components/game/media-picker";
import { PlatformChip } from "@/components/game/platform-chip";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { gameLinks, gameMedia, games } from "@/db/schema";
import {
  GAME_LINK_FIELDS,
  GAME_STATUS_LABELS,
  GAME_STATUSES,
  type GameLinkKind,
  type GameStatus,
} from "@/lib/constants";
import {
  clearGameDraft,
  emptyGameDraft,
  saveGameDraft,
  loadGameDraft,
  type GameDraft,
} from "@/lib/game-draft";
import { withVideosFirst } from "@/lib/urls";
import type { GamePlatformItem } from "@/lib/types";

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
type MediaRow = typeof gameMedia.$inferSelect;
type LinkRow = typeof gameLinks.$inferSelect;

function linksFromRows(links: LinkRow[]): Record<GameLinkKind, string> {
  const next = emptyGameDraft().links;
  for (const link of links) {
    next[link.kind] = link.url;
  }
  return next;
}

export function GameEditor({
  game,
  media = [],
  links = [],
  catalog,
  selectedPlatformIds = [],
}: {
  game?: GameRow;
  media?: MediaRow[];
  links?: LinkRow[];
  catalog: GamePlatformItem[];
  selectedPlatformIds?: string[];
}) {
  const isEdit = Boolean(game);
  const catalogById = new Map(catalog.map((platform) => [platform.id, platform]));
  const platformItems = catalog.map((platform) => ({
    label: platform.name,
    value: platform.id,
  }));
  const [logoUrl, setLogoUrl] = useState(game?.logoUrl ?? "");
  const [name, setName] = useState(game?.name ?? "");
  const [developerName, setDeveloperName] = useState(game?.developerName ?? "");
  const [tagline, setTagline] = useState(game?.tagline ?? "");
  const [description, setDescription] = useState(game?.description ?? "");
  const [status, setStatus] = useState<GameStatus>(game?.status ?? "upcoming");
  const [tags, setTags] = useState(game?.tags?.join(", ") ?? "");
  const [platforms, setPlatforms] = useState<string[]>(() => selectedPlatformIds);
  const [linkValues, setLinkValues] = useState<Record<GameLinkKind, string>>(() =>
    linksFromRows(links),
  );
  const [draftMedia, setDraftMedia] = useState<DraftMedia[]>(() =>
    withVideosFirst(
      media.map((item) => ({
        key: item.id,
        kind: item.kind,
        url: item.url,
      })),
    ),
  );
  const [logoBusy, setLogoBusy] = useState(false);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [draftReady, setDraftReady] = useState(isEdit);
  const [state, action, pending] = useActionState(upsertOwnedGameAction, null);
  const draftRef = useRef<GameDraft>(emptyGameDraft());

  const currentDraft: GameDraft = {
    name,
    developerName,
    tagline,
    description,
    status,
    tags,
    platforms,
    logoUrl,
    media: draftMedia,
    links: linkValues,
  };
  draftRef.current = currentDraft;

  useEffect(() => {
    if (isEdit) return;
    const draft = loadGameDraft();
    if (draft) {
      setName(draft.name);
      setDeveloperName(draft.developerName);
      setTagline(draft.tagline);
      setDescription(draft.description);
      setStatus(draft.status);
      setTags(draft.tags);
      setPlatforms(draft.platforms.filter((id) => catalogById.has(id)));
      setLogoUrl(draft.logoUrl);
      setDraftMedia(draft.media);
      setLinkValues(draft.links);
    }
    setDraftReady(true);
  }, [isEdit]);

  useEffect(() => {
    if (isEdit || !draftReady) return;
    const timer = window.setTimeout(() => saveGameDraft(draftRef.current), 400);
    return () => window.clearTimeout(timer);
  }, [
    isEdit,
    draftReady,
    name,
    developerName,
    tagline,
    description,
    status,
    tags,
    platforms,
    logoUrl,
    draftMedia,
    linkValues,
  ]);

  useEffect(() => {
    if (isEdit) return;
    function persist() {
      saveGameDraft(draftRef.current);
    }
    window.addEventListener("pagehide", persist);
    document.addEventListener("visibilitychange", persist);
    return () => {
      window.removeEventListener("pagehide", persist);
      document.removeEventListener("visibilitychange", persist);
    };
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit && state?.error) {
      saveGameDraft(draftRef.current);
    }
  }, [isEdit, state]);

  function formAction(formData: FormData) {
    if (!isEdit) clearGameDraft();
    action(formData);
  }

  const cancelHref = game ? `/games/${game.slug}` : "/";
  const uploading = logoBusy || mediaBusy;

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
      backHref={cancelHref}
      cancelHref={cancelHref}
      submitLabel={isEdit ? "Save game" : "Create game"}
      submitDisabled={!logoUrl}
      pending={pending}
      uploading={uploading}
      error={state?.error}
      formAction={formAction}
      left={
        <MediaPicker items={draftMedia} onChange={setDraftMedia} onBusyChange={setMediaBusy} />
      }
      right={
        <div className="flex flex-col gap-6 pb-4">
          <div className="flex items-center gap-4">
            <LogoPicker value={logoUrl} onChange={setLogoUrl} onBusyChange={setLogoBusy} />
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-medium text-paper-white sm:text-xl">
                {isEdit ? "Edit your game" : "Add your game"}
              </h1>
              <p className="mt-1 text-sm text-fog">
                {isEdit
                  ? "Update listing details, media, and store links."
                  : "Progress is saved on this device until you create the game."}
              </p>
            </div>
          </div>

          <FieldGroup className="gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <LabelWithInfo htmlFor="name" info="The title shown on the board and game page.">
                  Game name
                </LabelWithInfo>
                <Input
                  id="name"
                  name="name"
                  required
                  maxLength={120}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Add game name"
                  className="h-9 rounded-lg border-iron bg-graphite"
                />
              </Field>
              <Field>
                <LabelWithInfo
                  htmlFor="developerName"
                  info="Studio or maker credited on the listing."
                >
                  Developer
                </LabelWithInfo>
                <Input
                  id="developerName"
                  name="developerName"
                  required
                  maxLength={120}
                  value={developerName}
                  onChange={(event) => setDeveloperName(event.target.value)}
                  placeholder="Studio or maker name"
                  className="h-9 rounded-lg border-iron bg-graphite"
                />
              </Field>
            </div>
            <Field>
              <LabelWithInfo
                htmlFor="tagline"
                info="One short line shown under the name on the weekly board."
              >
                Tagline
              </LabelWithInfo>
              <Input
                id="tagline"
                name="tagline"
                required
                maxLength={160}
                value={tagline}
                onChange={(event) => setTagline(event.target.value)}
                placeholder="One short line for the board"
                className="h-9 rounded-lg border-iron bg-graphite"
              />
            </Field>
            <Field>
              <LabelWithInfo
                htmlFor="description"
                info="A longer pitch for the game page. Keep it readable and player-facing."
              >
                Description
              </LabelWithInfo>
              <Textarea
                id="description"
                name="description"
                required
                maxLength={4000}
                className="min-h-32 rounded-lg border-iron bg-graphite"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What should players know?"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field>
                <LabelWithInfo htmlFor="status" info="How far along the game is for players.">
                  Status
                </LabelWithInfo>
                <NativeSelect
                  id="status"
                  name="status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as GameStatus)}
                  className="h-9 w-full"
                >
                  {GAME_STATUSES.map((item) => (
                    <NativeSelectOption key={item} value={item}>
                      {GAME_STATUS_LABELS[item]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <LabelWithInfo
                  htmlFor="tags"
                  info="Up to 3 labels, comma-separated. Example: action, indie."
                >
                  Tags
                </LabelWithInfo>
                <Input
                  id="tags"
                  name="tags"
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="action, indie"
                  className="h-9 rounded-lg border-iron bg-graphite"
                />
              </Field>
            </div>
            <Field>
              <LabelWithInfo info="Select every platform where players can play this game.">
                Platforms
              </LabelWithInfo>
              {catalog.length === 0 ? (
                <p className="text-sm text-fog">No platforms are available yet.</p>
              ) : (
                <Select
                  items={platformItems}
                  multiple
                  value={platforms}
                  onValueChange={(value) => setPlatforms(value)}
                >
                  <SelectTrigger
                    type="button"
                    className="h-auto min-h-9 w-full flex-wrap items-center whitespace-normal rounded-lg border-iron bg-graphite py-1.5 *:data-[slot=select-value]:line-clamp-none"
                    aria-label="Platforms"
                  >
                    <SelectValue>
                      {(value: string[]) => {
                        if (value.length === 0) {
                          return <span className="text-fog">Select platforms</span>;
                        }
                        return (
                          <span className="flex min-w-0 flex-1 flex-wrap gap-1">
                            {value.map((id) => {
                              const platform = catalogById.get(id);
                              return platform ? (
                                <PlatformChip key={id} platform={platform} />
                              ) : null;
                            })}
                          </span>
                        );
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent
                    align="start"
                    alignItemWithTrigger={false}
                    side="bottom"
                    className="border-iron bg-obsidian p-1 shadow-lg"
                  >
                    <SelectGroup>
                      {catalog.map((platform) => (
                        <SelectItem key={platform.id} value={platform.id}>
                          <span className="flex items-center gap-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={platform.logoUrl}
                              alt=""
                              className="size-4 object-contain"
                            />
                            {platform.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
              {platforms.map((platform) => (
                <input key={platform} type="hidden" name="platforms" value={platform} />
              ))}
            </Field>
            <Field>
              <LabelWithInfo info="Optional store and social URLs. Only matching hostnames are saved.">
                Links and stores
              </LabelWithInfo>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {GAME_LINK_FIELDS.map((field) => {
                  const Icon = LINK_ICONS[field.kind];
                  return (
                    <InputGroup key={field.kind} className="h-9 rounded-lg border-iron bg-graphite">
                      <InputGroupAddon>
                        <Icon className="size-4 text-fog" />
                      </InputGroupAddon>
                      <InputGroupInput
                        name={`link_${field.kind}`}
                        type="url"
                        inputMode="url"
                        placeholder={field.label}
                        value={linkValues[field.kind]}
                        onChange={(event) => {
                          const value = event.target.value;
                          setLinkValues((current) => ({ ...current, [field.kind]: value }));
                        }}
                        aria-label={field.label}
                      />
                    </InputGroup>
                  );
                })}
              </div>
            </Field>
            {game ? (
              <Field orientation="horizontal">
                <input
                  id="archived"
                  name="archived"
                  type="checkbox"
                  defaultChecked={Boolean(game.archivedAt)}
                  className="size-4 rounded border-iron"
                />
                <LabelWithInfo
                  htmlFor="archived"
                  info="Hidden from the board and search. You can still open it from your listing."
                >
                  Archive this game
                </LabelWithInfo>
              </Field>
            ) : null}
          </FieldGroup>
        </div>
      }
    >
      {game ? <input type="hidden" name="id" value={game.id} /> : null}
      <input type="hidden" name="logoUrl" value={logoUrl} />
      <input
        type="hidden"
        name="media"
        value={JSON.stringify(draftMedia.map(({ kind, url }) => ({ kind, url })))}
      />
    </GameFormShell>
  );
}
