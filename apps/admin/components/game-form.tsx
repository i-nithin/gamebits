"use client";

import { useActionState, useState } from "react";

import { saveGameAction } from "@/app/actions/mutations";
import { UploadField } from "@/components/upload-field";
import {
  GAME_LINK_FIELDS,
  GAME_STATUS_LABELS,
  GAME_STATUSES,
  type GameLinkKind,
  type GameStatus,
} from "@gamebits/core/constants";

type Option = { id: string; name: string };

export function GameForm({
  game,
  links,
  media = [],
  platformIds,
  categoryIds,
  platforms,
  categories,
}: {
  game?: {
    id: string;
    name: string;
    slug: string;
    tagline: string;
    description: string;
    developerName: string;
    logoUrl: string;
    status: GameStatus;
    archivedAt: Date | null;
  };
  links: Array<{ kind: GameLinkKind; url: string }>;
  media?: Array<{ kind: "image" | "video"; url: string }>;
  platformIds: string[];
  categoryIds: string[];
  platforms: Option[];
  categories: Option[];
}) {
  const [state, action, pending] = useActionState(saveGameAction, null);
  const [logoUrl, setLogoUrl] = useState(game?.logoUrl ?? "");
  const linkMap = Object.fromEntries(links.map((link) => [link.kind, link.url])) as Partial<
    Record<GameLinkKind, string>
  >;

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-2">
      {game ? <input type="hidden" name="id" value={game.id} /> : null}
      <div className="flex flex-col gap-4">
        <UploadField name="logoUrl" label="Logo" purpose="logo" value={logoUrl} onChange={setLogoUrl} />
        <Field name="name" label="Name" defaultValue={game?.name} required />
        <Field name="slug" label="Slug" defaultValue={game?.slug} />
        <Field name="developerName" label="Developer" defaultValue={game?.developerName} required />
        <Field name="tagline" label="Tagline" defaultValue={game?.tagline} required />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-fog">Description</span>
          <textarea
            name="description"
            required
            defaultValue={game?.description}
            rows={5}
            className="rounded-lg border border-white/10 bg-graphite px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-fog">Status</span>
          <select
            name="status"
            defaultValue={game?.status ?? "upcoming"}
            className="rounded-lg border border-white/10 bg-graphite px-3 py-2"
          >
            {GAME_STATUSES.map((status) => (
              <option key={status} value={status}>
                {GAME_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="archived" defaultChecked={Boolean(game?.archivedAt)} />
          Archived
        </label>
      </div>
      <div className="flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm text-fog">Platforms</legend>
          {platforms.map((platform) => (
            <label key={platform.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="platforms"
                value={platform.id}
                defaultChecked={platformIds.includes(platform.id)}
              />
              {platform.name}
            </label>
          ))}
        </fieldset>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm text-fog">Categories</legend>
          {categories.map((category) => (
            <label key={category.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="categories"
                value={category.id}
                defaultChecked={categoryIds.includes(category.id)}
              />
              {category.name}
            </label>
          ))}
        </fieldset>
        {GAME_LINK_FIELDS.map((field) => (
          <Field
            key={field.kind}
            name={`link_${field.kind}`}
            label={field.label}
            defaultValue={linkMap[field.kind] ?? ""}
            placeholder={field.placeholder}
          />
        ))}
        <input
          type="hidden"
          name="media"
          value={JSON.stringify(media.map((item) => ({ kind: item.kind, url: item.url })))}
        />
        {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
        <button
          type="submit"
          disabled={pending || !logoUrl}
          className="rounded-lg bg-paper px-4 py-2 text-sm font-medium text-void disabled:opacity-50"
        >
          {pending ? "Saving…" : game ? "Save game" : "Create game"}
        </button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  required,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-fog">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="rounded-lg border border-white/10 bg-graphite px-3 py-2"
      />
    </label>
  );
}
