import { GameEditor } from "@/components/game/game-editor";
import { enforceAdminPage } from "@/lib/auth-admin";
import { listActiveCategories, listActivePlatforms } from "@/lib/queries";

export default async function NewAdminGamePage() {
  await enforceAdminPage();
  const [catalog, categories] = await Promise.all([
    listActivePlatforms(),
    listActiveCategories(),
  ]);
  return <GameEditor catalog={catalog} categories={categories} />;
}
