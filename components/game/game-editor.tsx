"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

import { upsertOwnedGameAction } from "@/app/actions/games";
import { LabelWithInfo } from "@/components/game/field-info";
import { IarcBadge } from "@/components/game/iarc-badge";
import { GameFormShell } from "@/components/game/game-form-shell";
import { LogoPicker, MediaPicker, type DraftMedia } from "@/components/game/media-picker";
import { PlatformChip } from "@/components/game/platform-chip";
import { StoreIcon } from "@/components/game/store-icons";
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
import type { gameLinks, gameMedia, games } from "@/db/schema";
import {
  CATEGORY_CAP,
  GAME_LINK_FIELDS,
  GAME_STATUS_LABELS,
  GAME_STATUSES,
  IARC_LABELS,
  IARC_RATINGS,
  type GameLinkKind,
  type GameStatus,
  type IarcRating,
} from "@/lib/constants";
import {
  clearGameDraft,
  emptyGameDraft,
  saveGameDraft,
  loadGameDraft,
  type GameDraft,
} from "@/lib/game-draft";
import { withVideosFirst } from "@/lib/urls";
import type { GameCategoryItem, GamePlatformItem } from "@/lib/types";

const DescriptionField = dynamic(
  () => import("@/components/game/description-editor").then((mod) => mod.DescriptionEditor),
  {
    ssr: false,
    loading: () => <div className="min-h-40 rounded-lg border border-iron bg-graphite" />,
  },
);

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
  categories,
  selectedPlatformIds = [],
  selectedCategoryIds = [],
  next,
}: {
  game?: GameRow;
  media?: MediaRow[];
  links?: LinkRow[];
  catalog: GamePlatformItem[];
  categories: GameCategoryItem[];
  selectedPlatformIds?: string[];
  selectedCategoryIds?: string[];
  next?: "carousel" | "admin-carousel";
}) {
  const isEdit = Boolean(game);
  const catalogById = useMemo(
    () => new Map(catalog.map((platform) => [platform.id, platform])),
    [catalog],
  );
  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const platformItems = catalog.map((platform) => ({
    label: platform.name,
    value: platform.id,
  }));
  const [logoUrl, setLogoUrl] = useState(game?.logoUrl ?? "");
  const [name, setName] = useState(game?.name ?? "");
  const [tagline, setTagline] = useState(game?.tagline ?? "");
  const [description, setDescription] = useState(game?.description ?? "");
  const [status, setStatus] = useState<GameStatus>(game?.status ?? "upcoming");
  const [iarcRating, setIarcRating] = useState<IarcRating | "">(game?.iarcRating ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(() => selectedCategoryIds);
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
    tagline,
    description,
    status,
    iarcRating,
    categories: categoryIds,
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
      setTagline(draft.tagline);
      setDescription(draft.description);
      setStatus(draft.status);
      setIarcRating(draft.iarcRating);
      setCategoryIds(
        draft.categories.filter((id) => categoryById.has(id)).slice(0, CATEGORY_CAP),
      );
      setPlatforms(draft.platforms.filter((id) => catalogById.has(id)));
      setLogoUrl(draft.logoUrl);
      setDraftMedia(draft.media);
      setLinkValues(draft.links);
    }
    setDraftReady(true);
  }, [isEdit, catalogById, categoryById]);

  useEffect(() => {
    if (isEdit || !draftReady) return;
    const timer = window.setTimeout(() => saveGameDraft(draftRef.current), 400);
    return () => window.clearTimeout(timer);
  }, [
    isEdit,
    draftReady,
    name,
    tagline,
    description,
    status,
    iarcRating,
    categoryIds,
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
      submitDisabled={!logoUrl || !iarcRating}
      pending={pending}
      uploading={uploading}
      error={state?.error}
      formAction={formAction}
      left={
        <MediaPicker items={draftMedia} onChange={setDraftMedia} onBusyChange={setMediaBusy} />
      }
      right={
        <div className="flex flex-col gap-6 pb-4">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-lg font-medium text-paper-white sm:text-xl">
                {isEdit ? "Edit your game" : "Add your game"}
              </h1>
              <p className="mt-1 text-sm text-fog">
                {isEdit
                  ? "Update listing details, media, and store links."
                  : "Progress is saved on this device until you create the game."}
              </p>
            </div>
            <LogoPicker value={logoUrl} onChange={setLogoUrl} onBusyChange={setLogoBusy} />
          </div>

          <FieldGroup className="gap-4">
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
                info="A longer pitch for the game page. You can add formatting, images, and short clips up to 4MB."
              >
                Description
              </LabelWithInfo>
              <DescriptionField id="description" value={description} onChange={setDescription} />
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
                <LabelWithInfo info={`Up to ${CATEGORY_CAP} categories from the shared catalog.`}>
                  Categories
                </LabelWithInfo>
                {categories.length === 0 ? (
                  <p className="text-sm text-fog">No categories are available yet.</p>
                ) : (
                  <Select
                    items={categories.map((category) => ({
                      label: category.name,
                      value: category.id,
                    }))}
                    multiple
                    value={categoryIds}
                    onValueChange={(value) => setCategoryIds(value.slice(0, CATEGORY_CAP))}
                  >
                    <SelectTrigger
                      type="button"
                      className="h-auto min-h-9 w-full flex-wrap items-center whitespace-normal rounded-lg border-iron bg-graphite py-1.5 *:data-[slot=select-value]:line-clamp-none"
                      aria-label="Categories"
                    >
                      <SelectValue>
                        {(value: string[]) => {
                          if (value.length === 0) {
                            return <span className="text-fog">Select categories</span>;
                          }
                          return (
                            <span className="flex min-w-0 flex-1 flex-wrap gap-1">
                              {value.map((id) => {
                                const category = categoryById.get(id);
                                return category ? (
                                  <span
                                    key={id}
                                    className="rounded-full bg-slate px-2 py-0.5 text-xs text-paper-white"
                                  >
                                    {category.name}
                                  </span>
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
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
                {categoryIds.map((categoryId) => (
                  <input key={categoryId} type="hidden" name="categories" value={categoryId} />
                ))}
              </Field>
            </div>
            <Field>
              <LabelWithInfo htmlFor="iarcRating" info="Required IARC age rating shown on the game and in carousel ads.">
                IARC rating
              </LabelWithInfo>
              <Select
                value={iarcRating || null}
                onValueChange={(value) => {
                  if (typeof value === "string" && IARC_RATINGS.includes(value as IarcRating)) {
                    setIarcRating(value as IarcRating);
                  }
                }}
              >
                <SelectTrigger
                  id="iarcRating"
                  type="button"
                  className="h-9 w-full rounded-lg border-iron bg-graphite"
                >
                  <SelectValue>
                    {iarcRating ? (
                      <span className="flex items-center gap-2">
                        <IarcBadge rating={iarcRating} className="h-8" />
                        {IARC_LABELS[iarcRating]}
                      </span>
                    ) : (
                      <span className="text-fog">Select an age rating</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start" className="border-iron bg-obsidian p-1 shadow-lg">
                  <SelectGroup>
                    {IARC_RATINGS.map((rating) => (
                      <SelectItem key={rating} value={rating}>
                        <span className="flex items-center gap-2">
                          <IarcBadge rating={rating} className="h-8" />
                          {IARC_LABELS[rating]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
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
              <div className="flex w-full flex-col gap-3">
                {GAME_LINK_FIELDS.map((field) => (
                  <InputGroup
                    key={field.kind}
                    className="h-10 w-full rounded-lg border-iron bg-graphite"
                  >
                    <InputGroupAddon>
                      <StoreIcon kind={field.kind} className="size-5 text-fog" />
                    </InputGroupAddon>
                    <InputGroupInput
                      name={`link_${field.kind}`}
                      type="url"
                      inputMode="url"
                      placeholder={field.placeholder}
                      value={linkValues[field.kind]}
                      onChange={(event) => {
                        const value = event.target.value;
                        setLinkValues((current) => ({ ...current, [field.kind]: value }));
                      }}
                      aria-label={field.label}
                    />
                  </InputGroup>
                ))}
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
                  info="Hidden from the board and search. You can open it from My games on your profile."
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
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <input type="hidden" name="iarcRating" value={iarcRating} />
      <input type="hidden" name="logoUrl" value={logoUrl} />
      <input
        type="hidden"
        name="media"
        value={JSON.stringify(draftMedia.map(({ kind, url }) => ({ kind, url })))}
      />
    </GameFormShell>
  );
}
