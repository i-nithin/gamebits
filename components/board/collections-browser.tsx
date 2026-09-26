"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  FlaskConicalIcon,
  Gamepad2Icon,
  LayoutGridIcon,
  SearchIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";

import { loadMoreCollectionGames } from "@/app/actions/collections";
import { WeekFilter } from "@/components/board/week-filter";
import { VoteButton } from "@/components/game/vote-button";
import { PlatformChipList } from "@/components/game/platform-chip";
import { Badge } from "@/components/ui/badge";
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
import type { GameCategoryItem, GamePlatformItem, RankedGame, WeekBoard } from "@/lib/types";
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
  view: "all" | "weekly";
  categories: string[];
  platforms: string[];
  statuses: GameStatus[];
  year: number;
  week: number;
  sort: CollectionSort;
  dir: SortDirection;
};

function isDefaultSort(filters: CollectionFilters) {
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
        : filters;
  const params = new URLSearchParams();
  if (resolved.view === "weekly") {
    params.set("view", "weekly");
    params.set("year", String(resolved.year));
    params.set("week", String(resolved.week));
  }
  for (const category of resolved.categories) params.append("category", category);
  for (const platform of resolved.platforms) params.append("platform", platform);
  for (const status of resolved.statuses) params.append("status", status);
  if (!isDefaultSort(resolved)) {
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
    filters.categories.join(","),
    filters.platforms.join(","),
    filters.statuses.join(","),
    filters.sort,
    filters.dir,
  ].join("|");

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col lg:flex-row lg:items-start">
      <FilterRail
        filters={filters}
        categories={categories}
        platforms={platforms}
        className="sticky top-14 hidden w-80 shrink-0 flex-col gap-5 border-r border-iron px-4 py-6 lg:flex"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-col gap-4 px-4 pt-4 pb-4 sm:px-6 sm:pt-6">
          <FilterRail
            filters={filters}
            categories={categories}
            platforms={platforms}
            className="flex gap-4 overflow-x-auto pb-1 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            compact
          />
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
          <CollectionEmpty filtering={filtering} view="all" filters={filters} />
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
    </div>
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
  view: "all" | "weekly";
  filters: CollectionFilters;
}) {
  return (
    <Empty className="border border-dashed border-iron">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LayoutGridIcon />
        </EmptyMedia>
        <EmptyTitle>
          {filtering ? "No matching games" : view === "weekly" ? "No games this week" : "No games yet"}
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
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (!cursor || pending) return;
    setPending(true);
    setError(null);
    try {
      const page = await loadMoreCollectionGames({
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
      setError("Couldn't load more games.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <CollectionsTable games={[...games, ...extra]} filters={filters} />
      {error ? <p className="text-sm text-fog">{error}</p> : null}
      {cursor ? (
        <button
          type="button"
          onClick={loadMore}
          disabled={pending}
          className="mx-auto inline-flex h-9 items-center rounded-full border border-iron px-4 text-sm text-paper-white hover:bg-slate/50 disabled:opacity-50"
        >
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
}: {
  filters: CollectionFilters;
  column: "name" | "status" | "votes";
  label: string;
  align?: "left" | "right";
}) {
  const active = filters.sort === column;
  const Icon = active
    ? filters.dir === "asc"
      ? ChevronUpIcon
      : ChevronDownIcon
    : ChevronsUpDownIcon;

  return (
    <TableHead
      className={cn(headClass, align === "right" && "text-right")}
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
}: {
  games: RankedGame[];
  filters: CollectionFilters;
  vote?: { year: number; week: number; live: boolean };
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <SortHead filters={filters} column="name" label="Game" />
            <TableHead className={headClass}>Categories</TableHead>
            <TableHead className={headClass}>Platforms</TableHead>
            <SortHead filters={filters} column="status" label="Status" />
            {vote ? <SortHead filters={filters} column="votes" label="Votes" align="right" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {games.map((game) => (
            <TableRow key={game.id} className="hover:bg-graphite">
              <TableCell>
                <Link href={`/games/${game.slug}`} className="flex items-center gap-3">
                  <Image
                    src={game.logoUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="size-8 rounded-lg bg-graphite object-contain p-0.5"
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
    </div>
  );
}
