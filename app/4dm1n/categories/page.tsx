import Link from "next/link";
import { ArchiveIcon, ArchiveRestoreIcon, PencilIcon, PlusIcon } from "lucide-react";

import { setCategoryArchivedAction } from "@/app/actions/categories";
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
import { listAdminCategories, parseAdminListParams } from "@/lib/admin/directory";
import { enforceAdminPage } from "@/lib/auth-admin";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; pageSize?: string; view?: string }>;
}) {
  await enforceAdminPage();
  const params = parseAdminListParams(await searchParams);
  const result = await listAdminCategories(params);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium tracking-tight">Categories</h1>
          <p className="max-w-xl text-sm text-fog">
            Shared labels for collections, the weekly board, and the game editor. A category stays
            live until every game stops using it.
          </p>
        </div>
        <Link href="/4dm1n/categories/new">
          <Button>
            <PlusIcon data-icon="inline-start" />
            Add category
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
              <EmptyTitle>{params.query ? "No matching categories" : "No categories yet"}</EmptyTitle>
              <EmptyDescription>
                {params.query
                  ? "Try another name or slug."
                  : "Add the first label owners can attach to a game."}
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
                {result.items.map((category) => {
                  const inUse = category.gameCount > 0 && !category.archived;
                  return (
                    <TableRow key={category.id}>
                      <TableCell>
                        <Link href={`/4dm1n/categories/${category.id}`} className="text-ice-signal">
                          {category.name}
                        </Link>
                      </TableCell>
                      <TableCell className="stat-mono">{category.slug}</TableCell>
                      <TableCell className="stat-mono">{category.sortOrder}</TableCell>
                      <TableCell className="stat-mono">{category.gameCount}</TableCell>
                      <TableCell>
                        <Badge variant={category.archived ? "outline" : "secondary"}>
                          {category.archived ? "Archived" : "Live"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/4dm1n/categories/${category.id}`}>
                            <Button variant="ghost" size="icon" aria-label={`Edit ${category.name}`}>
                              <PencilIcon />
                            </Button>
                          </Link>
                          {inUse ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled
                              aria-label={`${category.name} is still used by games`}
                              title="Unassign this category from games before archiving it"
                            >
                              <ArchiveIcon />
                            </Button>
                          ) : (
                            <form action={setCategoryArchivedAction}>
                              <input type="hidden" name="id" value={category.id} />
                              <input
                                type="hidden"
                                name="archived"
                                value={category.archived ? "false" : "true"}
                              />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="icon"
                                aria-label={
                                  category.archived
                                    ? `Unarchive ${category.name}`
                                    : `Archive ${category.name}`
                                }
                              >
                                {category.archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
                              </Button>
                            </form>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <DirectoryPager
          pathname="/4dm1n/categories"
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
