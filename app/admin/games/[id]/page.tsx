import { notFound, redirect } from "next/navigation";

import { AssignWeekForm } from "@/components/admin/game-form";
import { GameEditor } from "@/components/game/game-editor";
import { isAdminUserId, getCurrentUserId } from "@/lib/auth-admin";
import { clerkEnabled } from "@/lib/clerk-enabled";
import { getGameById } from "@/lib/queries";

export default async function EditGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getCurrentUserId();
  if (clerkEnabled && !isAdminUserId(userId)) redirect("/");

  const { id } = await params;
  const game = await getGameById(id);
  if (!game) notFound();

  return (
    <>
      <GameEditor game={game} />
      <div className="border-t border-iron px-4 py-6 sm:px-6 lg:px-8">
        <h2 className="mb-3 text-base font-medium">Assign to ISO week</h2>
        <p className="mb-4 stat-mono text-sm text-fog">{game.outboundClicks} outbound clicks</p>
        <AssignWeekForm gameId={game.id} />
      </div>
    </>
  );
}
