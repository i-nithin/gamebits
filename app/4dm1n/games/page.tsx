import Link from "next/link";

import { AdminListShell, DirectoryPager } from "@/components/admin/directory-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listAdminGames, parseAdminListParams } from "@/lib/admin/directory";
import { enforceAdminPage } from "@/lib/auth-admin";

export default async function AdminGamesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string }>;
}) {
  await enforceAdminPage();
  const params = parseAdminListParams(await searchParams);
  const result = await listAdminGames(params);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight">Games</h1>
          <p className="max-w-xl text-sm text-fog">
            Every game on the platform. Open one to edit it or assign a week.
          </p>
        </div>
        <Link href="/4dm1n/games/new">
          <Button>New game</Button>
        </Link>
      </div>
      <AdminListShell
        query={params.query}
        pageSize={result.pageSize}
        placeholder="Search name, slug, or developer"
      >
        {result.items.length === 0 ? (
          <Empty className="border border-dashed border-iron">
            <EmptyHeader>
              <EmptyTitle>{params.query ? "No matching games" : "No games yet"}</EmptyTitle>
              <EmptyDescription>
                {params.query ? "Try another name, slug, or developer." : "Add the first game."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Developer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Clicks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((game) => (
                  <TableRow key={game.id}>
                    <TableCell>
                      <Link href={`/4dm1n/games/${game.id}`} className="text-ice-signal">
                        {game.name}
                      </Link>
                      {game.archived ? (
                        <Badge variant="outline" className="ml-2">
                          Archived
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="stat-mono">{game.slug}</TableCell>
                    <TableCell>{game.developerName}</TableCell>
                    <TableCell className="capitalize">{game.status}</TableCell>
                    <TableCell className="stat-mono">{game.outboundClicks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <DirectoryPager
          pathname="/4dm1n/games"
          query={params.query}
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
        />
      </AdminListShell>
    </div>
  );
}
