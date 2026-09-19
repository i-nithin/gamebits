import { redirect } from "next/navigation";

import { GameForm } from "@/components/admin/game-form";
import { isAdminUserId, getCurrentUserId } from "@/lib/auth-admin";

export default async function NewGamePage() {
  const userId = await getCurrentUserId();
  if (!isAdminUserId(userId)) redirect("/");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="text-xl font-medium">New game</h1>
      <GameForm />
    </div>
  );
}
