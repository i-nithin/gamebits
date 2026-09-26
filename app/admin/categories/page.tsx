import Link from "next/link";
import { ArchiveIcon, ArchiveRestoreIcon, PencilIcon, PlusIcon, TagsIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { setCategoryArchivedAction } from "@/app/actions/categories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { isAdminUserId, getCurrentUserId } from "@/lib/auth-admin";
import { listCategoryCatalog } from "@/lib/queries";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All", href: "/admin/categories" },
  { id: "live", label: "Live", href: "/admin/categories?view=live" },
  { id: "archived", label: "Archived", href: "/admin/categories?view=archived" },
] as const;

type CatalogView = (typeof FILTERS)[number]["id"];

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!isAdminUserId(userId)) redirect("/");

  const { view: rawView } = await searchParams;
  const view: CatalogView = rawView === "live" || rawView === "archived" ? rawView : "all";
  const catalog = await listCategoryCatalog();
  const liveCount = catalog.filter((category) => !category.archivedAt).length;
  const archivedCount = catalog.length - liveCount;
  const visible = catalog.filter((category) => {
    if (view === "live") return !category.archivedAt;
    if (view === "archived") return Boolean(category.archivedAt);
    return true;
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs tracking-wide text-fog uppercase">
            <Link href="/admin" className="hover:text-paper-white">
              Admin
            </Link>
            <span className="px-1.5">/</span>
            Categories
          </p>
          <h1 className="text-2xl font-medium tracking-tight">Category catalog</h1>
          <p className="max-w-xl text-sm text-fog">
            Shared labels for collections, the weekly board, and the game editor. A category stays
            live until every game stops using it.
          </p>
        </div>
        <Link href="/admin/categories/new">
          <Button>
            <PlusIcon data-icon="inline-start" />
            Add category
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="In catalog" value={catalog.length} />
        <Stat label="Live" value={liveCount} />
        <Stat label="Archived" value={archivedCount} className="col-span-2 sm:col-span-1" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((filter) => (
          <Link key={filter.id} href={filter.href}>
            <Button variant={view === filter.id ? "secondary" : "outline"} size="sm">
              {filter.label}
            </Button>
          </Link>
        ))}
      </div>

      {visible.length === 0 ? (
        <Empty className="border border-dashed border-iron">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TagsIcon />
            </EmptyMedia>
            <EmptyTitle>
              {catalog.length === 0 ? "No categories yet" : "Nothing in this view"}
            </EmptyTitle>
            <EmptyDescription>
              {catalog.length === 0
                ? "Add the first label owners can attach to a game."
                : "Switch filters or add a category to fill this list."}
            </EmptyDescription>
          </EmptyHeader>
          {catalog.length === 0 ? (
            <Link href="/admin/categories/new">
              <Button>
                <PlusIcon data-icon="inline-start" />
                Add category
              </Button>
            </Link>
          ) : null}
        </Empty>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((category) => {
            const inUse = category.gameCount > 0 && !category.archivedAt;
            return (
              <li key={category.id}>
                <article className="flex h-full flex-col gap-4 rounded-2xl bg-obsidian p-4 card-ring">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/admin/categories/${category.id}`} className="min-w-0">
                      <h2 className="truncate text-base font-medium">{category.name}</h2>
                      <p className="stat-mono truncate text-xs text-fog">{category.slug}</p>
                    </Link>
                    <Badge variant={category.archivedAt ? "outline" : "secondary"}>
                      {category.archivedAt ? "Archived" : "Live"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Order {category.sortOrder}</Badge>
                    <Badge variant="outline">
                      {category.gameCount} {category.gameCount === 1 ? "game" : "games"}
                    </Badge>
                  </div>
                  <div className="mt-auto flex items-center gap-2">
                    <Link href={`/admin/categories/${category.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        <PencilIcon data-icon="inline-start" />
                        Edit
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
                          value={category.archivedAt ? "false" : "true"}
                        />
                        <Button
                          type="submit"
                          variant={category.archivedAt ? "secondary" : "ghost"}
                          size="icon"
                          aria-label={
                            category.archivedAt
                              ? `Unarchive ${category.name}`
                              : `Archive ${category.name}`
                          }
                        >
                          {category.archivedAt ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
                        </Button>
                      </form>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-2xl bg-obsidian px-4 py-3 card-ring", className)}>
      <p className="text-xs tracking-wide text-fog uppercase">{label}</p>
      <p className="stat-mono text-2xl">{value}</p>
    </div>
  );
}
