import { notFound, redirect } from "next/navigation";

import { AssignWeekForm } from "@/components/admin/game-form";
import { GameEditor } from "@/components/game/game-editor";
import { isAdminUserId, getCurrentUserId } from "@/lib/auth-admin";
import { getGameEditorData, listEditorPlatforms } from "@/lib/queries";

export default async function EditAdminGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!isAdminUserId(userId)) redirect("/");

  const { id } = await params;
  const editor = await getGameEditorData(id);
  if (!editor) notFound();
  const catalog = await listEditorPlatforms(editor.platformIds);

  return (
    <div className="flex flex-col">
      <GameEditor
        game={editor.game}
        media={editor.media}
        links={editor.links}
        catalog={catalog}
        selectedPlatformIds={editor.platformIds}
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
