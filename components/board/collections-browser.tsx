"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  BadgeCheckIcon,
  BeakerIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronsUpDownIcon,
  CircleDashedIcon,
  ClockIcon,
  FlameIcon,
  FlaskConicalIcon,
  Gamepad2Icon,
  LayoutGridIcon,
  ListFilterIcon,
  SearchIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";

import { loadMoreCollectionGames, loadMoreTrendingGames } from "@/app/actions/collections";
import { WeekFilter } from "@/components/board/week-filter";
import { VoteButton } from "@/components/game/vote-button";
import { PlatformChipList } from "@/components/game/platform-chip";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
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
import {
  GAME_STATUS_LABELS,
  GAME_STATUSES,
  type CollectionSort,
  type GameStatus,
  type SortDirection,
} from "@/lib/constants";
import { buildIsoWeekRange, compareIsoWeek, type IsoWeek } from "@/lib/iso-week";
import { TREND_RANGES, trendRangeLabel, type TrendRange } from "@/lib/trending/periods";
import type { GameCategoryItem, GamePlatformItem, RankedGame, WeekBoard } from "@/lib/types";
import { notifyError } from "@/lib/notify";
import { cn } from "@/lib/utils";

const STATUS_ICONS: Record<GameStatus, LucideIcon> = {
  released: CheckIcon,
  upcoming: ClockIcon,
  early_access: FlaskConicalIcon,
  demo: Gamepad2Icon,
  playtest: BeakerIcon,
  unreleased: CircleDashedIcon,
};

export type CollectionFilters = {
  view: "all" | "weekly" | "trending";
  categories: string[];
  platforms: string[];
  statuses: GameStatus[];
  year: number;
  week: number;
  sort: CollectionSort;
  dir: SortDirection;
  range: TrendRange;
};

function isDefaultSort(filters: CollectionFilters) {
  if (filters.view === "trending") return true;
  return filters.view === "weekly"
    ? filters.sort === "votes" && filters.dir === "desc"
    : filters.sort === "newest" && filters.dir === "desc";
}

function collectionHref(filters: CollectionFilters) {
  const resolved =
    filters.view === "all" && filters.sort === "votes"
      ? { ...filters, sort: "newest" as const, dir: "desc" as const }
      : filters.view === "weekly" && filters.sort === "newest"
        ? { ...filters, sort: "votes" as const, dir: "desc" as const }
        : filters.view === "trending"
          ? { ...filters, sort: "newest" as const, dir: "desc" as const }
          : filters;
  const params = new URLSearchParams();
  if (resolved.view === "weekly") {
    params.set("view", "weekly");
    params.set("year", String(resolved.year));
    params.set("week", String(resolved.week));
  } else if (resolved.view === "trending") {
    params.set("view", "trending");
    params.set("range", resolved.range);
  }
  for (const category of resolved.categories) params.append("category", category);
  for (const platform of resolved.platforms) params.append("platform", platform);
  for (const status of resolved.statuses) params.append("status", status);
  if (resolved.view !== "trending" && !isDefaultSort(resolved)) {
    params.set("sort", resolved.sort);
    params.set("dir", resolved.dir);
  }
  const query = params.toString();
  return query ? `/collections?${query}` : "/collections";
}

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function matchesFilters(game: RankedGame, filters: CollectionFilters) {
  const categoryOk =
    filters.categories.length === 0 ||
    game.categories.some((category) => filters.categories.includes(category.slug));
  const platformOk =
    filters.platforms.length === 0 ||
    game.platforms.some((platform) => filters.platforms.includes(platform.slug));
  const statusOk = filters.statuses.length === 0 || filters.statuses.includes(game.status);
  return categoryOk && platformOk && statusOk;
}

export function CollectionsBrowser({
  games,
  nextCursor,
  weekBoard,
  currentWeek,
  categories,
  platforms,
  filters,
}: {
  games: RankedGame[];
  nextCursor: string | null;
  weekBoard: WeekBoard | null;
  currentWeek: IsoWeek;
  categories: GameCategoryItem[];
  platforms: GamePlatformItem[];
  filters: CollectionFilters;
}) {
  const filtering =
    filters.categories.length > 0 || filters.platforms.length > 0 || filters.statuses.length > 0;
  const weeklyGames = weekBoard
    ? sortGames(
        weekBoard.games.filter((game) => matchesFilters(game, filters)),
        filters.sort === "newest" ? "votes" : filters.sort,
        filters.dir,
      )
    : [];
  const catalogKey = [
    filters.view,
    filters.categories.join(","),
    filters.platforms.join(","),
    filters.statuses.join(","),
    filters.sort,
    filters.dir,
    filters.range,
  ].join("|");
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col lg:flex-row lg:items-start">
      <FilterRail
        filters={filters}
        categories={categories}
        platforms={platforms}
        className="sticky top-14 hidden h-[calc(100dvh-3.5rem-2.5rem)] w-80 shrink-0 flex-col gap-5 overflow-y-auto overscroll-y-contain border-r border-iron px-4 py-6 [scrollbar-width:none] lg:flex [&::-webkit-scrollbar]:hidden"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-col gap-4 px-4 pt-4 pb-4 sm:px-6 sm:pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex w-fit items-center gap-2">
              <TabLink
                href={collectionHref({ ...filters, view: "all" })}
                active={filters.view === "all"}
                icon={LayoutGridIcon}
              >
                All
              </TabLink>
              <TabLink
                href={collectionHref({ ...filters, view: "weekly" })}
                active={filters.view === "weekly"}
                icon={CalendarIcon}
              >
                Weekly
              </TabLink>
              <TabLink
                href={collectionHref({ ...filters, view: "trending" })}
                active={filters.view === "trending"}
                icon={FlameIcon}
              >
                Trending
              </TabLink>
            </div>
            <div className="flex items-center gap-2">
              {filters.view === "trending" ? <TrendRangePills filters={filters} /> : null}
              <button
                type="button"
                aria-label="Filters"
                onClick={() => setFiltersOpen(true)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-iron text-paper-white hover:bg-slate/50 lg:hidden"
              >
                <ListFilterIcon className="size-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>
          {filters.view === "weekly" ? (
            <WeeklyPicker filters={filters} currentWeek={currentWeek} />
          ) : null}
        </div>
        {filtering ? (
          <AppliedFilters filters={filters} categories={categories} platforms={platforms} />
        ) : null}
        <div className="px-4 pt-4 pb-4 sm:px-6 sm:pb-6">
        {filters.view === "weekly" ? (
          weeklyGames.length === 0 ? (
            <CollectionEmpty filtering={filtering} view="weekly" filters={filters} />
          ) : (
            <CollectionsTable
              games={weeklyGames}
              filters={filters}
              vote={
                weekBoard
                  ? { year: weekBoard.year, week: weekBoard.week, live: weekBoard.live }
                  : undefined
              }
            />
          )
        ) : games.length === 0 ? (
          <CollectionEmpty filtering={filtering} view={filters.view} filters={filters} />
        ) : (
          <CatalogList
            key={catalogKey}
            games={games}
            nextCursor={nextCursor}
            filters={filters}
          />
        )}
        </div>
      </div>
      <FilterSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        categories={categories}
        platforms={platforms}
      />
    </div>
  );
}

function FilterSheet({
  open,
  onOpenChange,
  filters,
  categories,
  platforms,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: CollectionFilters;
  categories: GameCategoryItem[];
  platforms: GamePlatformItem[];
}) {
  const clearHref = collectionHref({
    ...filters,
    categories: [],
    platforms: [],
    statuses: [],
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-scrim backdrop-blur-none" />
        <DialogPrimitive.Popup className="fixed inset-x-0 bottom-0 z-50 flex max-h-[min(40rem,calc(100dvh-1rem))] flex-col overflow-hidden rounded-t-3xl border border-iron bg-obsidian text-paper-white outline-none data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-4 data-closed:animate-out data-closed:fade-out-0">
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <DialogTitle className="text-lg font-medium">Filters</DialogTitle>
            <DialogDescription className="sr-only">
              Filter games by category, platform, and status.
            </DialogDescription>
            <DialogPrimitive.Close
              aria-label="Close filters"
              className="flex size-8 items-center justify-center rounded-lg text-fog hover:bg-white/8 hover:text-paper-white"
            >
              <XIcon className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <FilterRail
              filters={filters}
              categories={categories}
              platforms={platforms}
              className="flex flex-col gap-5"
            />
          </div>
          <div className="flex gap-3 border-t border-iron px-5 py-4">
            <Link
              href={clearHref}
              onClick={() => onOpenChange(false)}
              className="flex h-11 flex-1 items-center justify-center rounded-full border border-iron text-sm font-medium text-paper-white hover:bg-slate/50"
            >
              Clear all
            </Link>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex h-11 flex-1 items-center justify-center rounded-full bg-ice-strong text-sm font-medium text-paper-white hover:bg-ice-strong/90"
            >
              Done
            </button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}

function AppliedFilters({
  filters,
  categories,
  platforms,
}: {
  filters: CollectionFilters;
  categories: GameCategoryItem[];
  platforms: GamePlatformItem[];
}) {
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const platformBySlug = new Map(platforms.map((platform) => [platform.slug, platform]));

  return (
    <div className="border-y border-iron">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6">
        {filters.categories.map((slug) => (
          <AppliedChip
            key={`category-${slug}`}
            href={collectionHref({
              ...filters,
              categories: filters.categories.filter((item) => item !== slug),
            })}
            label={categoryBySlug.get(slug)?.name ?? slug}
          />
        ))}
        {filters.platforms.map((slug) => {
          const platform = platformBySlug.get(slug);
          return (
            <AppliedChip
              key={`platform-${slug}`}
              href={collectionHref({
                ...filters,
                platforms: filters.platforms.filter((item) => item !== slug),
              })}
              label={platform?.name ?? slug}
              mark={
                platform ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={platform.logoUrl} alt="" className="size-3.5 shrink-0 object-contain" />
                ) : null
              }
            />
          );
        })}
        {filters.statuses.map((status) => {
          const Icon = STATUS_ICONS[status];
          return (
            <AppliedChip
              key={`status-${status}`}
              href={collectionHref({
                ...filters,
                statuses: filters.statuses.filter((item) => item !== status),
              })}
              label={GAME_STATUS_LABELS[status]}
              mark={<Icon className="size-3.5 shrink-0" />}
            />
          );
        })}
        <Link
          href={collectionHref({ ...filters, categories: [], platforms: [], statuses: [] })}
          className="px-1 text-sm text-fog hover:text-paper-white"
        >
          Clear
        </Link>
      </div>
    </div>
  );
}

function AppliedChip({
  href,
  label,
  mark,
}: {
  href: string;
  label: string;
  mark?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-iron pr-2 pl-3 text-sm text-paper-white hover:bg-slate/50"
    >
      {mark}
      {label}
      <XIcon className="size-3.5 text-fog" />
    </Link>
  );
}

function windowStartFor(weeks: IsoWeek[], selected: IsoWeek, current: IsoWeek) {
  const index = weeks.findIndex(
    (week) => week.year === selected.year && week.week === selected.week,
  );
  const currentIndex = weeks.findIndex(
    (week) => week.year === current.year && week.week === current.week,
  );
  const selectedIndex = index < 0 ? currentIndex : index;
  return Math.min(Math.max(0, selectedIndex - 3), Math.max(0, weeks.length - 7));
}

function WeeklyPicker({
  filters,
  currentWeek,
}: {
  filters: CollectionFilters;
  currentWeek: IsoWeek;
}) {
  const router = useRouter();
  const weeks = useMemo(
    () => buildIsoWeekRange(currentWeek, 6, 6),
    [currentWeek],
  );
  const [windowStart, setWindowStart] = useState(() =>
    windowStartFor(weeks, { year: filters.year, week: filters.week }, currentWeek),
  );
  const selectedIndex = weeks.findIndex(
    (week) => week.year === filters.year && week.week === filters.week,
  );
  if (
    selectedIndex >= 0 &&
    (selectedIndex < windowStart || selectedIndex >= windowStart + 7)
  ) {
    const next = windowStartFor(weeks, { year: filters.year, week: filters.week }, currentWeek);
    if (next !== windowStart) setWindowStart(next);
  }

  function selectWeek(week: IsoWeek) {
    if (compareIsoWeek(week, currentWeek) > 0) return;
    router.push(
      collectionHref({
        ...filters,
        view: "weekly",
        year: week.year,
        week: week.week,
      }),
    );
  }

  return (
    <WeekFilter
      weeks={weeks}
      selected={{ year: filters.year, week: filters.week }}
      current={currentWeek}
      windowStart={windowStart}
      onSelect={selectWeek}
      onWindowStartChange={setWindowStart}
    />
  );
}

function CollectionEmpty({
  filtering,
  view,
  filters,
}: {
  filtering: boolean;
  view: CollectionFilters["view"];
  filters: CollectionFilters;
}) {
  return (
    <Empty className="border border-dashed border-iron">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {view === "trending" ? <FlameIcon /> : <LayoutGridIcon />}
        </EmptyMedia>
        <EmptyTitle>
          {filtering
            ? "No matching games"
            : view === "weekly"
              ? "No games this week"
              : view === "trending"
                ? "Nothing is trending yet"
                : "No games yet"}
        </EmptyTitle>
        <EmptyDescription>
          {filtering
            ? "Clear a filter or pick another category, platform, or status."
            : view === "weekly"
              ? "Nothing is listed for this week."
              : "Published games will show up here."}
        </EmptyDescription>
      </EmptyHeader>
      {filtering ? (
        <Link
          href={collectionHref({ ...filters, categories: [], platforms: [], statuses: [] })}
          className="text-sm text-ice-signal"
        >
          Clear filters
        </Link>
      ) : null}
    </Empty>
  );
}

function CatalogList({
  games,
  nextCursor,
  filters,
}: {
  games: RankedGame[];
  nextCursor: string | null;
  filters: CollectionFilters;
}) {
  const [extra, setExtra] = useState<RankedGame[]>([]);
  const [cursor, setCursor] = useState(nextCursor);
  const [pending, setPending] = useState(false);

  async function loadMore() {
    if (!cursor || pending) return;
    setPending(true);
    try {
      const page =
        filters.view === "trending"
          ? await loadMoreTrendingGames({
              cursor,
              range: filters.range,
              categories: filters.categories,
              platforms: filters.platforms,
              statuses: filters.statuses,
            })
          : await loadMoreCollectionGames({
              cursor,
              categories: filters.categories,
              platforms: filters.platforms,
              statuses: filters.statuses,
              sort: filters.sort,
              dir: filters.dir,
            });
      setExtra((current) => [...current, ...page.games]);
      setCursor(page.nextCursor);
    } catch {
      notifyError("Couldn't load more games.", "Try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <CollectionsTable games={[...games, ...extra]} filters={filters} sortable={filters.view !== "trending"} />
      {cursor ? (
        <button
          type="button"
          onClick={loadMore}
          disabled={pending}
          className="mx-auto inline-flex h-9 items-center gap-2 rounded-full border border-iron px-4 text-sm text-paper-white hover:bg-slate/50 disabled:opacity-50"
        >
          {pending ? <Spinner /> : null}
          {pending ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </div>
  );
}

function FilterRail({
  filters,
  categories,
  platforms,
  className,
  compact = false,
}: {
  filters: CollectionFilters;
  categories: GameCategoryItem[];
  platforms: GamePlatformItem[];
  className?: string;
  compact?: boolean;
}) {
  return (
    <aside className={className}>
      {compact ? null : <p className="text-sm font-medium text-paper-white">Filter By</p>}
      <FilterGroup label="Category" compact={compact}>
        <FilterChip
          href={collectionHref({ ...filters, categories: [] })}
          active={filters.categories.length === 0}
        >
          All
        </FilterChip>
        {categories.map((category) => (
          <FilterChip
            key={category.id}
            href={collectionHref({
              ...filters,
              categories: toggleValue(filters.categories, category.slug),
            })}
            active={filters.categories.includes(category.slug)}
          >
            {category.name}
          </FilterChip>
        ))}
      </FilterGroup>
      <FilterGroup label="Platform" compact={compact}>
        <PlatformFilters filters={filters} platforms={platforms} compact={compact} />
      </FilterGroup>
      <FilterGroup label="Status" compact={compact}>
        {GAME_STATUSES.map((status) => {
          const Icon = STATUS_ICONS[status];
          return (
            <FilterChip
              key={status}
              href={collectionHref({
                ...filters,
                statuses: toggleValue(filters.statuses, status),
              })}
              active={filters.statuses.includes(status)}
            >
              <Icon className="size-3.5 shrink-0" />
              {GAME_STATUS_LABELS[status]}
            </FilterChip>
          );
        })}
      </FilterGroup>
    </aside>
  );
}

function PlatformFilters({
  filters,
  platforms,
  compact,
}: {
  filters: CollectionFilters;
  platforms: GamePlatformItem[];
  compact: boolean;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return platforms;
    return platforms.filter((platform) => platform.name.toLowerCase().includes(needle));
  }, [platforms, query]);

  return (
    <>
      {compact ? null : (
        <label className="relative mb-1 block w-full basis-full">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-fog" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search platforms"
            aria-label="Search platforms"
            className="h-8 w-full rounded-full border border-iron bg-transparent pr-3 pl-8 text-sm text-paper-white outline-none placeholder:text-fog"
          />
        </label>
      )}
      {visible.map((platform) => (
        <FilterChip
          key={platform.id}
          href={collectionHref({
            ...filters,
            platforms: toggleValue(filters.platforms, platform.slug),
          })}
          active={filters.platforms.includes(platform.slug)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={platform.logoUrl} alt="" className="size-3.5 shrink-0 object-contain" />
          {platform.name}
        </FilterChip>
      ))}
    </>
  );
}

function FilterGroup({
  label,
  compact,
  children,
}: {
  label: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  const chips = <div className={cn("flex flex-wrap gap-2", compact && "flex-nowrap")}>{children}</div>;

  if (compact) {
    return (
      <div className="flex shrink-0 flex-col gap-2">
        <p className="text-xs tracking-wide text-fog uppercase">{label}</p>
        {chips}
      </div>
    );
  }

  return (
    <details open className="group border-b border-iron pb-4">
      <summary className="flex cursor-pointer list-none items-center justify-between py-1 text-sm text-paper-white [&::-webkit-details-marker]:hidden">
        {label}
        <ChevronDownIcon className="size-4 text-fog transition-transform group-open:rotate-180" />
      </summary>
      <div className="pt-3">{chips}</div>
    </details>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-iron px-3 text-sm",
        active
          ? "border-transparent bg-ice-strong text-white"
          : "text-fog hover:bg-slate/50 hover:text-paper-white",
      )}
    >
      {children}
    </Link>
  );
}

function TrendRangePills({ filters }: { filters: CollectionFilters }) {
  return (
    <div className="flex items-center gap-1.5">
      {TREND_RANGES.map((range) => {
        const active = filters.range === range;
        return (
          <Link
            key={range}
            href={collectionHref({ ...filters, view: "trending", range })}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-8 items-center rounded-full border border-iron px-3 text-sm",
              active
                ? "border-transparent bg-graphite text-paper-white"
                : "text-fog hover:bg-slate/50 hover:text-paper-white",
            )}
          >
            {trendRangeLabel(range)}
          </Link>
        );
      })}
    </div>
  );
}

function TabLink({
  href,
  active,
  icon: Icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full border border-iron px-3.5 text-sm",
        active
          ? "border-transparent bg-graphite text-paper-white"
          : "text-fog hover:bg-slate/50 hover:text-paper-white",
      )}
    >
      <Icon className="size-4" />
      {children}
    </Link>
  );
}

const headClass = "text-[11px] tracking-wide text-fog uppercase";

function SortHead({
  filters,
  column,
  label,
  align = "left",
  className,
}: {
  filters: CollectionFilters;
  column: "name" | "status" | "votes";
  label: string;
  align?: "left" | "right";
  className?: string;
}) {
  const active = filters.sort === column;
  const Icon = active
    ? filters.dir === "asc"
      ? ChevronUpIcon
      : ChevronDownIcon
    : ChevronsUpDownIcon;

  return (
    <TableHead
      className={cn(headClass, align === "right" && "text-right", className)}
      aria-sort={active ? (filters.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <Link
        href={collectionHref({ ...filters, ...nextSort(filters, column) })}
        className={cn(
          "inline-flex items-center gap-1 hover:text-paper-white",
          align === "right" && "justify-end",
        )}
      >
        {label}
        <Icon className={cn("size-3.5", active ? "text-paper-white" : "text-fog/50")} />
      </Link>
    </TableHead>
  );
}

function sortGames(games: RankedGame[], sort: CollectionSort, dir: SortDirection) {
  const factor = dir === "asc" ? 1 : -1;
  return games.toSorted((a, b) => {
    let compared = 0;
    if (sort === "name") compared = a.name.localeCompare(b.name);
    else if (sort === "status") {
      compared = GAME_STATUSES.indexOf(a.status) - GAME_STATUSES.indexOf(b.status);
    } else compared = a.voteCount - b.voteCount;
    if (compared !== 0) return compared * factor;
    return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
  });
}

function nextSort(
  filters: CollectionFilters,
  column: "name" | "status" | "votes",
): Pick<CollectionFilters, "sort" | "dir"> {
  if (filters.sort !== column) {
    return { sort: column, dir: column === "votes" ? "desc" : "asc" };
  }
  return { sort: column, dir: filters.dir === "asc" ? "desc" : "asc" };
}

function CollectionsTable({
  games,
  filters,
  vote,
  sortable = true,
}: {
  games: RankedGame[];
  filters: CollectionFilters;
  vote?: { year: number; week: number; live: boolean };
  sortable?: boolean;
}) {
  const sticky = "sticky left-0 z-10 bg-page md:static md:bg-transparent";

  return (
    <Table className="min-w-[48rem] md:min-w-full">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {sortable ? (
              <SortHead filters={filters} column="name" label="Game" className={sticky} />
            ) : (
              <TableHead className={cn(headClass, sticky)}>Game</TableHead>
            )}
            <TableHead className={headClass}>Categories</TableHead>
            <TableHead className={headClass}>Platforms</TableHead>
            {sortable ? (
              <SortHead filters={filters} column="status" label="Status" />
            ) : (
              <TableHead className={headClass}>Status</TableHead>
            )}
            {vote ? <SortHead filters={filters} column="votes" label="Votes" align="right" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {games.map((game) => (
            <TableRow key={game.id} className="group hover:bg-graphite">
              <TableCell className={cn(sticky, "group-hover:bg-graphite")}>
                <Link href={`/games/${game.slug}`} className="flex items-center gap-3">
                  <Image
                    src={game.logoUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 rounded-lg object-cover"
                  />
                  <span className="flex items-center gap-1.5 font-medium">
                    {game.name}
                    <BadgeCheckIcon className="size-3.5 shrink-0 text-ice-strong" />
                  </span>
                </Link>
              </TableCell>
              <TableCell>
                <span className="flex flex-wrap gap-1">
                  {game.categories.map((category) => (
                    <Badge key={category.id} variant="secondary">
                      {category.name}
                    </Badge>
                  ))}
                </span>
              </TableCell>
              <TableCell>
                <PlatformChipList platforms={game.platforms} />
              </TableCell>
              <TableCell className="text-fog">{GAME_STATUS_LABELS[game.status]}</TableCell>
              {vote ? (
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <VoteButton
                      gameId={game.id}
                      year={vote.year}
                      week={vote.week}
                      voteCount={game.voteCount}
                      voted={game.voted}
                      live={vote.live}
                      compact
                    />
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
  );
}
