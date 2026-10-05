import { GameEditor } from "@/components/game/game-editor";
import { enforceAdminPage } from "@/lib/auth-admin";
import { listActiveCategories, listActivePlatforms } from "@/lib/queries";

export default async function NewAdminGamePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await enforceAdminPage();
  const { next } = await searchParams;
  const [catalog, categories] = await Promise.all([
    listActivePlatforms(),
    listActiveCategories(),
  ]);
  return (
    <GameEditor
      catalog={catalog}
      categories={categories}
      next={next === "admin-carousel" ? "admin-carousel" : undefined}
    />
  );
}
