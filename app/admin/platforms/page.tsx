import Link from "next/link";
import { ArchiveIcon, ArchiveRestoreIcon, LayersIcon, PencilIcon, PlusIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { setPlatformArchivedAction } from "@/app/actions/platforms";
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
import { listPlatformCatalog } from "@/lib/queries";
import { cn } from "@/lib/utils";

const FILTERS = [
  { id: "all", label: "All", href: "/admin/platforms" },
  { id: "live", label: "Live", href: "/admin/platforms?view=live" },
  { id: "archived", label: "Archived", href: "/admin/platforms?view=archived" },
] as const;

type CatalogView = (typeof FILTERS)[number]["id"];

export default async function AdminPlatformsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const userId = await getCurrentUserId();
  if (!isAdminUserId(userId)) {
    redirect("/");
  }

  const { view: rawView } = await searchParams;
  const view: CatalogView =
    rawView === "live" || rawView === "archived" ? rawView : "all";
  const catalog = await listPlatformCatalog();
  const liveCount = catalog.filter((platform) => !platform.archivedAt).length;
  const archivedCount = catalog.length - liveCount;
  const visible = catalog.filter((platform) => {
    if (view === "live") return !platform.archivedAt;
    if (view === "archived") return Boolean(platform.archivedAt);
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
            Platforms
          </p>
          <h1 className="text-2xl font-medium tracking-tight">Platform catalog</h1>
          <p className="max-w-xl text-sm text-fog">
            The marks owners pick when a game ships. Archive a platform to hide it from new
            listings without dropping it from games that already use it.
          </p>
        </div>
        <Link href="/admin/platforms/new">
          <Button>
            <PlusIcon data-icon="inline-start" />
            Add platform
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
              <LayersIcon />
            </EmptyMedia>
            <EmptyTitle>
              {catalog.length === 0 ? "No platforms yet" : "Nothing in this view"}
            </EmptyTitle>
            <EmptyDescription>
              {catalog.length === 0
                ? "Add the first store or device owners can attach to a game."
                : "Switch filters or add a platform to fill this list."}
            </EmptyDescription>
          </EmptyHeader>
          {catalog.length === 0 ? (
            <Link href="/admin/platforms/new">
              <Button>
                <PlusIcon data-icon="inline-start" />
                Add platform
              </Button>
            </Link>
          ) : null}
        </Empty>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((platform) => (
            <li key={platform.id}>
              <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-obsidian card-ring">
                <Link
                  href={`/admin/platforms/${platform.id}`}
                  aria-label={`Edit ${platform.name}`}
                  className="relative flex h-36 items-center justify-center bg-graphite"
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,var(--gb-ice-soft),transparent_70%)]"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={platform.logoUrl}
                    alt=""
                    className="relative size-16 object-contain"
                  />
                  <Badge
                    variant={platform.archivedAt ? "outline" : "secondary"}
                    className="absolute top-3 right-3"
                  >
                    {platform.archivedAt ? "Archived" : "Live"}
                  </Badge>
                </Link>
                <div className="flex flex-1 flex-col gap-4 p-4">
                  <Link href={`/admin/platforms/${platform.id}`} className="flex flex-col gap-1">
                    <h2 className="truncate text-base font-medium">{platform.name}</h2>
                    <p className="stat-mono truncate text-xs text-fog">{platform.slug}</p>
                  </Link>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Order {platform.sortOrder}</Badge>
                    <Badge variant="outline">
                      {platform.gameCount} {platform.gameCount === 1 ? "game" : "games"}
                    </Badge>
                  </div>
                  <div className="mt-auto flex items-center gap-2">
                    <Link href={`/admin/platforms/${platform.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        <PencilIcon data-icon="inline-start" />
                        Edit
                      </Button>
                    </Link>
                    <form action={setPlatformArchivedAction}>
                      <input type="hidden" name="id" value={platform.id} />
                      <input
                        type="hidden"
                        name="archived"
                        value={platform.archivedAt ? "false" : "true"}
                      />
                      <Button
                        type="submit"
                        variant={platform.archivedAt ? "secondary" : "ghost"}
                        size="icon"
                        aria-label={platform.archivedAt ? `Unarchive ${platform.name}` : `Archive ${platform.name}`}
                      >
                        {platform.archivedAt ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
                      </Button>
                    </form>
                  </div>
                </div>
              </article>
            </li>
          ))}
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
