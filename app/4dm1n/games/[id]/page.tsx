import { notFound } from "next/navigation";

import { AssignWeekForm } from "@/components/admin/game-form";
import { GameEditor } from "@/components/game/game-editor";
import { enforceAdminPage } from "@/lib/auth-admin";
import { getGameEditorData, listEditorCategories, listEditorPlatforms } from "@/lib/queries";

export default async function EditAdminGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await enforceAdminPage();
  const { id } = await params;
  const editor = await getGameEditorData(id);
  if (!editor) notFound();
  const [catalog, categories] = await Promise.all([
    listEditorPlatforms(editor.platformIds),
    listEditorCategories(editor.categoryIds),
  ]);

  return (
    <div className="flex flex-col">
      <GameEditor
        game={editor.game}
        media={editor.media}
        links={editor.links}
        catalog={catalog}
        categories={categories}
        selectedPlatformIds={editor.platformIds}
        selectedCategoryIds={editor.categoryIds}
      />
      <div className="mx-auto w-full max-w-6xl border-t border-iron px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-base font-medium">Assign to ISO week</h2>
            <p className="stat-mono text-sm text-fog">
              {editor.game.outboundClicks} outbound clicks
            </p>
          </div>
          <AssignWeekForm gameId={editor.game.id} />
        </div>
      </div>
    </div>
  );
}
