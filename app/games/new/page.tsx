import { redirect } from "next/navigation";

import { GameEditor } from "@/components/game/game-editor";
import { getCurrentUserId } from "@/lib/auth-admin";
import { listActivePlatforms } from "@/lib/queries";

export default async function NewGamePage() {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/");

  const catalog = await listActivePlatforms();
  return <GameEditor catalog={catalog} />;
}
