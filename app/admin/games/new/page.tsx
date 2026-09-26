import { redirect } from "next/navigation";

import { GameEditor } from "@/components/game/game-editor";
import { isAdminUserId, getCurrentUserId } from "@/lib/auth-admin";
import { listActiveCategories, listActivePlatforms } from "@/lib/queries";

export default async function NewAdminGamePage() {
  const userId = await getCurrentUserId();
  if (!isAdminUserId(userId)) redirect("/");

  const [catalog, categories] = await Promise.all([
    listActivePlatforms(),
    listActiveCategories(),
  ]);
  return <GameEditor catalog={catalog} categories={categories} />;
}
