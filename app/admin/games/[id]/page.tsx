import { notFound, redirect } from "next/navigation";

import { AssignWeekForm, GameForm } from "@/components/admin/game-form";
import { isAdminUserId, getCurrentUserId } from "@/lib/auth-admin";
import { getGameById } from "@/lib/queries";

export default async function EditGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!isAdminUserId(userId)) redirect("/");

  const { id } = await params;
  const game = await getGameById(id);
  if (!game) notFound();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-medium">Edit {game.name}</h1>
        <p className="stat-mono text-sm text-fog">{game.outboundClicks} outbound clicks</p>
      </div>
      <GameForm game={game} />
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-medium">Assign to ISO week</h2>
        <AssignWeekForm gameId={game.id} />
      </div>
    </div>
  );
}
