import { redirect } from "next/navigation";

import { GameEditor } from "@/components/game/game-editor";
import { isAdminUserId, getCurrentUserId } from "@/lib/auth-admin";
import { listActivePlatforms } from "@/lib/queries";

export default async function NewAdminGamePage() {
  const userId = await getCurrentUserId();
  if (!isAdminUserId(userId)) redirect("/");

  const catalog = await listActivePlatforms();
  return <GameEditor catalog={catalog} />;
}
