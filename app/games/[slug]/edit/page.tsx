import { notFound, redirect } from "next/navigation";

import { GameEditor } from "@/components/game/game-editor";
import { canManageGame, getCurrentUserId } from "@/lib/auth-admin";
import { getGameBySlug, getGameEditorData, listEditorCategories, listEditorPlatforms } from "@/lib/queries";

export default async function EditGamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/");
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) notFound();
  if (!canManageGame(userId, game.ownerClerkUserId)) {
    redirect(`/games/${slug}`);
  }

  const editor = await getGameEditorData(game.id);
  if (!editor) notFound();
  const [catalog, categories] = await Promise.all([
    listEditorPlatforms(editor.platformIds),
    listEditorCategories(editor.categoryIds),
  ]);

  return (
    <GameEditor
      game={editor.game}
      media={editor.media}
      links={editor.links}
      catalog={catalog}
      categories={categories}
      selectedPlatformIds={editor.platformIds}
      selectedCategoryIds={editor.categoryIds}
    />
  );
}
