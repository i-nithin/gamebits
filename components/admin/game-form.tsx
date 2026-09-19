import { assignWeekAction, upsertGameAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { GAME_STATUS_LABELS, GAME_STATUSES, PLATFORMS } from "@/lib/constants";
import { getIsoWeekUtc } from "@/lib/iso-week";
import type { games } from "@/db/schema";

type GameRow = typeof games.$inferSelect;

export function GameForm({ game }: { game?: GameRow }) {
  return (
    <form action={upsertGameAction} className="max-w-2xl">
      {game ? <input type="hidden" name="id" value={game.id} /> : null}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" name="name" required defaultValue={game?.name} />
        </Field>
        <Field>
          <FieldLabel htmlFor="slug">Slug</FieldLabel>
          <Input id="slug" name="slug" defaultValue={game?.slug} placeholder="auto-from-name" />
        </Field>
        <Field>
          <FieldLabel htmlFor="tagline">Tagline</FieldLabel>
          <Input id="tagline" name="tagline" required defaultValue={game?.tagline} />
        </Field>
        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            name="description"
            required
            defaultValue={game?.description}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="coverUrl">Cover URL</FieldLabel>
          <Input id="coverUrl" name="coverUrl" required defaultValue={game?.coverUrl} />
        </Field>
        <Field>
          <FieldLabel htmlFor="trailerUrl">Trailer URL</FieldLabel>
          <Input id="trailerUrl" name="trailerUrl" defaultValue={game?.trailerUrl ?? ""} />
        </Field>
        <Field>
          <FieldLabel htmlFor="developerName">Developer</FieldLabel>
          <Input
            id="developerName"
            name="developerName"
            required
            defaultValue={game?.developerName}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="primaryUrl">Primary URL</FieldLabel>
          <Input
            id="primaryUrl"
            name="primaryUrl"
            required
            defaultValue={game?.primaryUrl}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="status">Status</FieldLabel>
          <NativeSelect id="status" name="status" defaultValue={game?.status ?? "upcoming"}>
            {GAME_STATUSES.map((status) => (
              <NativeSelectOption key={status} value={status}>
                {GAME_STATUS_LABELS[status]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field>
          <FieldLabel htmlFor="tags">Tags (comma, 1–3)</FieldLabel>
          <Input
            id="tags"
            name="tags"
            required
            defaultValue={game?.tags?.join(", ")}
            placeholder="action, indie"
          />
        </Field>
        <Field>
          <FieldLabel>Platforms</FieldLabel>
          <div className="flex flex-wrap gap-3">
            {PLATFORMS.map((platform) => (
              <label key={platform} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="platforms"
                  value={platform}
                  defaultChecked={game?.platforms?.includes(platform)}
                  className="size-4 rounded border-iron"
                />
                {platform}
              </label>
            ))}
          </div>
        </Field>
        <Button type="submit">{game ? "Save game" : "Create game"}</Button>
      </FieldGroup>
    </form>
  );
}

export function AssignWeekForm({ gameId }: { gameId: string }) {
  const current = getIsoWeekUtc();
  return (
    <form action={assignWeekAction} className="max-w-md">
      <input type="hidden" name="gameId" value={gameId} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="year">ISO year</FieldLabel>
          <Input id="year" name="year" type="number" required defaultValue={current.year} />
        </Field>
        <Field>
          <FieldLabel htmlFor="week">ISO week</FieldLabel>
          <Input id="week" name="week" type="number" required defaultValue={current.week} />
        </Field>
        <Field orientation="horizontal">
          <input id="featured" name="featured" type="checkbox" className="size-4 rounded border-iron" />
          <FieldLabel htmlFor="featured">Featured in carousel</FieldLabel>
        </Field>
        <Button type="submit">Assign to week</Button>
      </FieldGroup>
    </form>
  );
}
