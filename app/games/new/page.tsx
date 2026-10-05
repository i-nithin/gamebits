import { redirect } from "next/navigation";

import { GameEditor } from "@/components/game/game-editor";
import { getCurrentUserId } from "@/lib/auth-admin";
import { listActiveCategories, listActivePlatforms } from "@/lib/queries";

export default async function NewGamePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/");

  const { next } = await searchParams;
  const [catalog, categories] = await Promise.all([
    listActivePlatforms(),
    listActiveCategories(),
  ]);
  return (
    <GameEditor
      catalog={catalog}
      categories={categories}
      next={next === "carousel" ? "carousel" : undefined}
    />
  );
}
