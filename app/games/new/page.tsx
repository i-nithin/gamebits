import { redirect } from "next/navigation";

import { GameEditor } from "@/components/game/game-editor";
import { getCurrentUserId } from "@/lib/auth-admin";
import { listActiveCategories, listActivePlatforms } from "@/lib/queries";

export default async function NewGamePage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/");

  const [catalog, categories] = await Promise.all([
    listActivePlatforms(),
    listActiveCategories(),
  ]);
  return <GameEditor catalog={catalog} categories={categories} />;
}
