import Link from "next/link";
import { notFound } from "next/navigation";

import { assignWeekAction } from "@/app/actions/mutations";
import { GameForm } from "@/components/game-form";
import { PageHeader } from "@/components/shell";
import { publicGameUrl } from "@/lib/site";
import { getIsoWeekUtc } from "@gamebits/db/iso-week";
import {
  getGameEditorData,
  listEditorCategories,
  listEditorPlatforms,
} from "@gamebits/core/queries";

export default async function EditGamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const editor = await getGameEditorData(id);
  if (!editor) notFound();
  const [platforms, categories] = await Promise.all([
    listEditorPlatforms(editor.platformIds),
    listEditorCategories(editor.categoryIds),
  ]);
  const current = getIsoWeekUtc();

  return (
    <>
      <PageHeader
        title={editor.game.name}
        description={editor.game.slug}
        action={
          <a href={publicGameUrl(editor.game.slug)} className="text-sm text-ice" target="_blank" rel="noreferrer">
            View on site
          </a>
        }
      />
      <GameForm
        game={editor.game}
        links={editor.links}
        media={editor.media}
        platformIds={editor.platformIds}
        categoryIds={editor.categoryIds}
        platforms={platforms.map((platform) => ({ id: platform.id, name: platform.name }))}
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
      />
      <form action={assignWeekAction} className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 p-4">
        <input type="hidden" name="gameId" value={editor.game.id} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-fog">ISO year</span>
          <input name="year" type="number" defaultValue={current.year} className="w-28 rounded-lg border border-white/10 bg-graphite px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-fog">ISO week</span>
          <input name="week" type="number" defaultValue={current.week} className="w-28 rounded-lg border border-white/10 bg-graphite px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="featured" />
          Featured
        </label>
        <button type="submit" className="rounded-lg border border-white/10 px-3 py-2 text-sm">
          Assign to week
        </button>
        <Link href="/games" className="text-sm text-fog">
          Back to games
        </Link>
      </form>
    </>
  );
}
