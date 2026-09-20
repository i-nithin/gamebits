import { redirect } from "next/navigation";

import { GameEditor } from "@/components/game/game-editor";
import { isAdminUserId, getCurrentUserId } from "@/lib/auth-admin";
import { clerkEnabled } from "@/lib/clerk-enabled";

export default async function NewGamePage() {
  const userId = await getCurrentUserId();
  if (clerkEnabled && !isAdminUserId(userId)) redirect("/");

  return <GameEditor />;
}
