import Link from "next/link";
import { ArchiveIcon, ArchiveRestoreIcon, PencilIcon, PlusIcon } from "lucide-react";

import { setPlatformArchivedAction } from "@/app/actions/platforms";
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
import { listAdminPlatforms, parseAdminListParams } from "@/lib/admin/directory";
import { enforceAdminPage } from "@/lib/auth-admin";

export default async function AdminPlatformsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string; view?: string }>;
}) {
  await enforceAdminPage();
  const params = parseAdminListParams(await searchParams);
  const result = await listAdminPlatforms(params);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight">Platforms</h1>
          <p className="max-w-xl text-sm text-fog">
            The marks owners pick when a game ships. Archive a platform to hide it from new
            listings without dropping it from games that already use it.
          </p>
        </div>
        <Link href="/4dm1n/platforms/new">
          <Button>
            <PlusIcon data-icon="inline-start" />
            Add platform
          </Button>
        </Link>
      </div>
      <AdminListShell
        query={params.query}
        pageSize={result.pageSize}
        placeholder="Search name or slug"
        view={params.view}
      >
        {result.items.length === 0 ? (
          <Empty className="border border-dashed border-iron">
            <EmptyHeader>
              <EmptyTitle>{params.query ? "No matching platforms" : "No platforms yet"}</EmptyTitle>
              <EmptyDescription>
                {params.query
                  ? "Try another name or slug."
                  : "Add the first store or device owners can attach to a game."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Games</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((platform) => (
                  <TableRow key={platform.id}>
                    <TableCell>
                      <Link
                        href={`/4dm1n/platforms/${platform.id}`}
                        className="flex items-center gap-2 text-ice-signal"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={platform.logoUrl}
                          alt=""
                          className="size-6 object-contain"
                        />
                        {platform.name}
                      </Link>
                    </TableCell>
                    <TableCell className="stat-mono">{platform.slug}</TableCell>
                    <TableCell className="stat-mono">{platform.sortOrder}</TableCell>
                    <TableCell className="stat-mono">{platform.gameCount}</TableCell>
                    <TableCell>
                      <Badge variant={platform.archived ? "outline" : "secondary"}>
                        {platform.archived ? "Archived" : "Live"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/4dm1n/platforms/${platform.id}`}>
                          <Button variant="ghost" size="icon" aria-label={`Edit ${platform.name}`}>
                            <PencilIcon />
                          </Button>
                        </Link>
                        <form action={setPlatformArchivedAction}>
                          <input type="hidden" name="id" value={platform.id} />
                          <input
                            type="hidden"
                            name="archived"
                            value={platform.archived ? "false" : "true"}
                          />
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon"
                            aria-label={
                              platform.archived
                                ? `Unarchive ${platform.name}`
                                : `Archive ${platform.name}`
                            }
                          >
                            {platform.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <DirectoryPager
          pathname="/4dm1n/platforms"
          query={params.query}
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          view={params.view}
        />
      </AdminListShell>
    </div>
  );
}
