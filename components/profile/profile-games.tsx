"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useRouter } from "next/navigation";
import {
  BookmarkIcon,
  Gamepad2Icon,
  HeartIcon,
  MessageSquareIcon,
  SearchIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react";

import { ProfileComments } from "@/components/profile/profile-comments";
import { ProfileGameGrid } from "@/components/profile/profile-game-grid";
import { ProfilePeople } from "@/components/profile/profile-people";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notifyError } from "@/lib/notify";
import { profileTab, type ProfileTab } from "@/lib/profile-tab";
import type { FollowProfile, ProfileFeedKey, ProfileReview, SavedGame } from "@/lib/types";

type TabMeta = {
  id: ProfileTab;
  label: string;
  searchLabel: string;
  ownerOnly?: boolean;
};

const TABS: TabMeta[] = [
  { id: "games", label: "Games", searchLabel: "games" },
  { id: "followers", label: "Followers", searchLabel: "followers" },
  { id: "following", label: "Following", searchLabel: "following" },
  {
    id: "saved",
    label: "Bookmarks",
    searchLabel: "bookmarks",
    ownerOnly: true,
  },
  { id: "liked", label: "Liked", searchLabel: "liked games", ownerOnly: true },
  {
    id: "comments",
    label: "Comments",
    searchLabel: "comments",
    ownerOnly: true,
  },
];

type GameView = "published" | "archived" | "all";

const GAME_VIEW_LABELS: Record<GameView, string> = {
  published: "Published games",
  archived: "Archived games",
  all: "All games",
};

const EMPTY_QUERIES: Record<ProfileTab, string> = {
  games: "",
  followers: "",
  following: "",
  saved: "",
  liked: "",
  comments: "",
};

type FeedPage<T> = { items: T[]; nextCursor: string | null };

function gameKey(game: SavedGame) {
  return game.id;
}

function personKey(person: FollowProfile) {
  return person.handle;
}

function reviewKey(review: ProfileReview) {
  return review.id;
}

function feedUrl(handle: string, feed: ProfileFeedKey, cursor: string | null, query: string) {
  const params = new URLSearchParams({ feed });
  if (cursor) params.set("cursor", cursor);
  if (query) params.set("q", query);
  return `/api/profiles/${encodeURIComponent(handle)}/feed?${params}`;
}

function useDebounced(value: string) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), 200);
    return () => clearTimeout(timer);
  }, [value]);
  return debounced;
}

function useProfileFeed<T>({
  handle,
  feed,
  initial,
  query,
  active,
  itemKey,
}: {
  handle: string;
  feed: ProfileFeedKey;
  initial: FeedPage<T>;
  query: string;
  active: boolean;
  itemKey: (item: T) => string;
}) {
  const [items, setItems] = useState(initial.items);
  const [cursor, setCursor] = useState(initial.nextCursor);
  const [loadedQuery, setLoadedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [seenKey, setSeenKey] = useState(`${handle}:${feed}`);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef(initial.nextCursor);
  const queryRef = useRef(query);
  const loadingRef = useRef(false);
  const generation = useRef(0);
  const profileKey = `${handle}:${feed}`;

  if (seenKey !== profileKey) {
    setSeenKey(profileKey);
    setItems(initial.items);
    setCursor(initial.nextCursor);
    setLoadedQuery("");
  }

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    if (!active || query === loadedQuery) return;
    const request = ++generation.current;
    loadingRef.current = true;
    void fetch(feedUrl(handle, feed, null, query))
      .then(async (response) => {
        if (!response.ok) throw new Error("feed");
        return response.json() as Promise<FeedPage<T>>;
      })
      .then((page) => {
        if (request !== generation.current) return;
        setItems(page.items);
        setCursor(page.nextCursor);
        setLoadedQuery(query);
      })
      .catch(() => {
        if (request !== generation.current) return;
        setItems([]);
        setCursor(null);
        setLoadedQuery(query);
        notifyError("Couldn't load this list.", "Try again in a moment.");
      })
      .finally(() => {
        if (request !== generation.current) return;
        loadingRef.current = false;
      });
  }, [active, feed, handle, loadedQuery, query]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !active) return;
    const observer = new IntersectionObserver((entries) => {
      const next = cursorRef.current;
      const requestQuery = queryRef.current;
      if (!entries[0]?.isIntersecting || loadingRef.current || !next || requestQuery !== loadedQuery) {
        return;
      }
      const request = ++generation.current;
      loadingRef.current = true;
      setLoading(true);
      void fetch(feedUrl(handle, feed, next, requestQuery))
        .then(async (response) => {
          if (!response.ok) throw new Error("feed");
          return response.json() as Promise<FeedPage<T>>;
        })
        .then((page) => {
          if (request !== generation.current) return;
          setItems((current) => {
            const seen = new Set(current.map(itemKey));
            return [...current, ...page.items.filter((item) => !seen.has(itemKey(item)))];
          });
          setCursor(page.nextCursor);
        })
        .catch(() => {
          if (request !== generation.current) return;
          notifyError("Couldn't load more.", "Try again in a moment.");
        })
        .finally(() => {
          if (request !== generation.current) return;
          loadingRef.current = false;
          setLoading(false);
        });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [active, cursor, feed, handle, itemKey, items.length, loadedQuery]);

  const updateItem = useCallback(
    (next: T) => {
      setItems((current) =>
        current.map((item) => (itemKey(item) === itemKey(next) ? next : item)),
      );
    },
    [itemKey],
  );

  const removeItem = useCallback(
    (key: string) => {
      setItems((current) => current.filter((item) => itemKey(item) !== key));
    },
    [itemKey],
  );

  return {
    items,
    cursor,
    loading,
    pending: active && query !== loadedQuery,
    sentinelRef,
    updateItem,
    removeItem,
  };
}

function FeedTail({
  cursor,
  loading,
  sentinelRef,
}: {
  cursor: string | null;
  loading: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
}) {
  if (!cursor) return null;
  return (
    <div ref={sentinelRef} className="flex h-12 items-center justify-center">
      {loading ? <Spinner /> : null}
    </div>
  );
}

type FeedState<T> = {
  items: T[];
  cursor: string | null;
  loading: boolean;
  pending: boolean;
  sentinelRef: RefObject<HTMLDivElement | null>;
  updateItem: (next: T) => void;
  removeItem: (key: string) => void;
};

function FeedPending() {
  return (
    <div className="flex justify-center py-10">
      <Spinner />
    </div>
  );
}

function GamePanel({
  feed,
  query,
  noResults,
  empty,
}: {
  feed: FeedState<SavedGame>;
  query: string;
  noResults: ReactNode;
  empty: ReactNode;
}) {
  if (feed.pending) return <FeedPending />;
  if (feed.items.length === 0) return query ? noResults : empty;
  return (
    <>
      <ProfileGameGrid games={feed.items} />
      <FeedTail cursor={feed.cursor} loading={feed.loading} sentinelRef={feed.sentinelRef} />
    </>
  );
}

function PeoplePanel({
  feed,
  query,
  noResults,
  empty,
}: {
  feed: FeedState<FollowProfile>;
  query: string;
  noResults: ReactNode;
  empty: ReactNode;
}) {
  if (feed.pending) return <FeedPending />;
  if (feed.items.length === 0) return query ? noResults : empty;
  return (
    <>
      <ProfilePeople people={feed.items} />
      <FeedTail cursor={feed.cursor} loading={feed.loading} sentinelRef={feed.sentinelRef} />
    </>
  );
}

function CommentPanel({
  feed,
  query,
  noResults,
  empty,
}: {
  feed: FeedState<ProfileReview>;
  query: string;
  noResults: ReactNode;
  empty: ReactNode;
}) {
  if (feed.pending) return <FeedPending />;
  if (feed.items.length === 0) return query ? noResults : empty;
  return (
    <>
      <ProfileComments
        reviews={feed.items}
        onUpdated={feed.updateItem}
        onRemoved={feed.removeItem}
      />
      <FeedTail cursor={feed.cursor} loading={feed.loading} sentinelRef={feed.sentinelRef} />
    </>
  );
}

function GamesPanel({
  view,
  isOwner,
  query,
  publishedFeed,
  archivedFeed,
  noResults,
}: {
  view: GameView;
  isOwner: boolean;
  query: string;
  publishedFeed: FeedState<SavedGame>;
  archivedFeed: FeedState<SavedGame>;
  noResults: ReactNode;
}) {
  if (view === "all") {
    if (publishedFeed.pending || archivedFeed.pending) return <FeedPending />;
    if (publishedFeed.items.length === 0 && archivedFeed.items.length === 0) {
      return query ? (
        noResults
      ) : (
        <EmptyState
          icon={Gamepad2Icon}
          title={isOwner ? "No published games yet" : "No games"}
          description={
            isOwner
              ? "Games you publish will show up here."
              : "Games this person publishes will show up here."
          }
        />
      );
    }
    return (
      <div className="flex flex-col gap-8">
        {publishedFeed.items.length > 0 ? (
          <GameSection
            title="Published"
            games={publishedFeed.items}
            emptyDescription="Games you publish will show up here."
            tail={
              <FeedTail
                cursor={publishedFeed.cursor}
                loading={publishedFeed.loading}
                sentinelRef={publishedFeed.sentinelRef}
              />
            }
          />
        ) : null}
        {archivedFeed.items.length > 0 ? (
          <GameSection
            title="Archived"
            games={archivedFeed.items}
            emptyDescription="Games you archive will show up here."
            tail={
              <FeedTail
                cursor={archivedFeed.cursor}
                loading={archivedFeed.loading}
                sentinelRef={archivedFeed.sentinelRef}
              />
            }
          />
        ) : null}
      </div>
    );
  }

  const selected = view === "archived" ? archivedFeed : publishedFeed;
  if (selected.pending) return <FeedPending />;
  if (selected.items.length === 0) {
    return query ? (
      noResults
    ) : (
      <EmptyState
        icon={Gamepad2Icon}
        title={view === "archived" ? "No archived games" : isOwner ? "No published games yet" : "No games"}
        description={
          view === "archived"
            ? "Games you archive will show up here."
            : isOwner
              ? "Games you publish will show up here."
              : "Games this person publishes will show up here."
        }
      />
    );
  }
  return (
    <>
      <ProfileGameGrid games={selected.items} />
      <FeedTail cursor={selected.cursor} loading={selected.loading} sentinelRef={selected.sentinelRef} />
    </>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-4 py-12 text-center">
      <span className="mb-4 flex size-10 items-center justify-center rounded-full bg-graphite/70 text-fog ring-1 ring-white/10">
        <Icon className="size-4" />
      </span>
      <p className="text-sm font-medium text-paper-white">{title}</p>
      <p className="mt-1 max-w-sm text-sm leading-6 text-fog">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function GameSection({
  title,
  games,
  emptyDescription,
  tail,
}: {
  title: string;
  games: SavedGame[];
  emptyDescription: string;
  tail?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="flex items-center gap-2 text-xs font-medium tracking-wide text-fog uppercase">
        {title}
        <span className="tabular-nums">{games.length}</span>
      </h3>
      {games.length > 0 ? (
        <ProfileGameGrid games={games} />
      ) : (
        <p className="py-8 text-sm text-fog">{emptyDescription}</p>
      )}
      {tail}
    </section>
  );
}

export function ProfileGames({
  handle,
  tab,
  isOwner,
  published,
  archived,
  saved,
  liked,
  comments,
  followers,
  following,
}: {
  handle: string;
  tab: ProfileTab;
  isOwner: boolean;
  published: FeedPage<SavedGame>;
  archived: FeedPage<SavedGame>;
  saved: FeedPage<SavedGame>;
  liked: FeedPage<SavedGame>;
  comments: FeedPage<ProfileReview>;
  followers: FeedPage<FollowProfile>;
  following: FeedPage<FollowProfile>;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(tab);
  const [gameView, setGameView] = useState<GameView>("published");
  const [queries, setQueries] = useState<Record<ProfileTab, string>>(EMPTY_QUERIES);
  const [seenTab, setSeenTab] = useState(tab);
  const gamesQuery = useDebounced(queries.games.trim());
  const followersQuery = useDebounced(queries.followers.trim());
  const followingQuery = useDebounced(queries.following.trim());
  const savedQuery = useDebounced(queries.saved.trim());
  const likedQuery = useDebounced(queries.liked.trim());
  const commentsQuery = useDebounced(queries.comments.trim());
  if (tab !== seenTab) {
    setSeenTab(tab);
    setCurrent(tab);
  }

  const publishedFeed = useProfileFeed({
    handle,
    feed: "games:published",
    initial: published,
    query: gamesQuery,
    active: current === "games" && gameView !== "archived",
    itemKey: gameKey,
  });
  const archivedFeed = useProfileFeed({
    handle,
    feed: "games:archived",
    initial: archived,
    query: gamesQuery,
    active: isOwner && current === "games" && gameView !== "published",
    itemKey: gameKey,
  });
  const savedFeed = useProfileFeed({
    handle,
    feed: "saved",
    initial: saved,
    query: savedQuery,
    active: isOwner && current === "saved",
    itemKey: gameKey,
  });
  const likedFeed = useProfileFeed({
    handle,
    feed: "liked",
    initial: liked,
    query: likedQuery,
    active: isOwner && current === "liked",
    itemKey: gameKey,
  });
  const commentsFeed = useProfileFeed({
    handle,
    feed: "comments",
    initial: comments,
    query: commentsQuery,
    active: isOwner && current === "comments",
    itemKey: reviewKey,
  });
  const followersFeed = useProfileFeed({
    handle,
    feed: "followers",
    initial: followers,
    query: followersQuery,
    active: current === "followers",
    itemKey: personKey,
  });
  const followingFeed = useProfileFeed({
    handle,
    feed: "following",
    initial: following,
    query: followingQuery,
    active: current === "following",
    itemKey: personKey,
  });

  const tabs = TABS.filter((item) => !item.ownerOnly || isOwner);
  const currentMeta = tabs.find((item) => item.id === current) ?? tabs[0];
  const query = queries[current];

  function clearSearch() {
    setQueries((previous) => ({ ...previous, [current]: "" }));
  }

  const noResults = (
    <EmptyState
      icon={SearchIcon}
      title="No matches found"
      description={`Try another search in ${currentMeta.searchLabel}.`}
      action={
        <Button variant="outline" className="rounded-full" onClick={clearSearch}>
          Clear search
        </Button>
      }
    />
  );

  return (
    <Tabs
      value={current}
      onValueChange={(value) => {
        const next = profileTab(value, isOwner);
        setCurrent(next);
        const href = next === "games" ? `/u/${handle}` : `/u/${handle}?tab=${next}`;
        router.replace(href, { scroll: false });
      }}
      className="gap-0!"
    >
      <TabsList
        variant="line"
        className="sticky top-14 z-20 h-12! w-full! justify-start gap-2 overflow-x-auto border-b border-white/10 bg-page/95 p-0! backdrop-blur-md lg:gap-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((item) => (
          <TabsTrigger
            key={item.id}
            value={item.id}
            className="h-full! w-auto! flex-none! rounded-none border-0 px-0 py-0 text-[13px] font-normal text-fog shadow-none! after:-bottom-px! after:h-0.5! hover:text-paper-white data-active:bg-transparent! data-active:font-semibold data-active:text-paper-white! data-active:shadow-none! data-active:after:bg-paper-white! dark:data-active:border-transparent! dark:data-active:bg-transparent!"
          >
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-start">
        <InputGroup className="h-10 w-full rounded-full border-white/15 bg-obsidian/30 px-1 sm:w-48 sm:flex-none">
          <InputGroupAddon className="pl-3">
            <SearchIcon className="size-5 text-paper-white" />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(event) =>
              setQueries((previous) => ({ ...previous, [current]: event.target.value }))
            }
            placeholder="Search"
            aria-label={`Search ${currentMeta.searchLabel}`}
            className="text-sm placeholder:text-fog"
          />
          {query ? (
            <InputGroupButton
              size="icon-xs"
              aria-label={`Clear ${currentMeta.searchLabel} search`}
              onClick={clearSearch}
            >
              <XIcon />
            </InputGroupButton>
          ) : null}
        </InputGroup>

        {current === "games" && isOwner ? (
          <Select
            value={gameView}
            onValueChange={(value) => {
              if (typeof value === "string") setGameView(value as GameView);
            }}
          >
            <SelectTrigger
              type="button"
              aria-label="Choose which games to show"
              className="h-10! w-full rounded-full border-white/15 bg-obsidian/30 px-4 text-sm text-paper-white hover:bg-obsidian/55 data-popup-open:[&_svg]:rotate-180 sm:w-44 sm:flex-none [&_svg]:transition-transform"
            >
              <SelectValue>{GAME_VIEW_LABELS[gameView]}</SelectValue>
            </SelectTrigger>
            <SelectContent
              align="start"
              alignItemWithTrigger={false}
              sideOffset={8}
              className="w-(--anchor-width) rounded-sm bg-obsidian p-2 shadow-2xl ring-1 ring-white/15 [&_[data-slot=select-item]>span:last-child]:hidden"
            >
              <SelectItem
                value="published"
                className="h-10 rounded-lg px-3 pr-3 text-sm data-selected:bg-graphite focus:bg-graphite"
              >
                Published games
              </SelectItem>
              <SelectItem
                value="archived"
                className="h-10 rounded-sm  px-3 pr-3 text-sm data-selected:bg-graphite focus:bg-graphite"
              >
                Archived games
              </SelectItem>
              <SelectItem
                value="all"
                className="h-10 rounded-sm px-3 pr-3 text-sm data-selected:bg-graphite focus:bg-graphite"
              >
                All games
              </SelectItem>
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <TabsContent value="games" className="py-6">
        <GamesPanel
          view={gameView}
          isOwner={isOwner}
          query={gamesQuery}
          publishedFeed={publishedFeed}
          archivedFeed={archivedFeed}
          noResults={noResults}
        />
      </TabsContent>

      <TabsContent value="followers" className="py-6">
        <PeoplePanel
          feed={followersFeed}
          query={followersQuery}
          noResults={noResults}
          empty={
            <EmptyState
              icon={UsersIcon}
              title="No followers"
              description={
                isOwner ? "People who follow you will show up here." : "Followers will show up here."
              }
            />
          }
        />
      </TabsContent>

      <TabsContent value="following" className="py-6">
        <PeoplePanel
          feed={followingFeed}
          query={followingQuery}
          noResults={noResults}
          empty={
            <EmptyState
              icon={UserPlusIcon}
              title="Not following anyone"
              description={
                isOwner
                  ? "People you follow will show up here."
                  : "People this person follows will show up here."
              }
            />
          }
        />
      </TabsContent>

      {isOwner ? (
        <>
          <TabsContent value="saved" className="py-6">
            <GamePanel
              feed={savedFeed}
              query={savedQuery}
              noResults={noResults}
              empty={
                <EmptyState
                  icon={BookmarkIcon}
                  title="No bookmarks"
                  description="Games you save will show up here."
                />
              }
            />
          </TabsContent>

          <TabsContent value="liked" className="py-6">
            <GamePanel
              feed={likedFeed}
              query={likedQuery}
              noResults={noResults}
              empty={
                <EmptyState
                  icon={HeartIcon}
                  title="No liked games"
                  description="Games you like will show up here."
                />
              }
            />
          </TabsContent>

          <TabsContent value="comments" className="py-6">
            <CommentPanel
              feed={commentsFeed}
              query={commentsQuery}
              noResults={noResults}
              empty={
                <EmptyState
                  icon={MessageSquareIcon}
                  title="No comments"
                  description="Reviews you post on games will show up here."
                />
              }
            />
          </TabsContent>
        </>
      ) : null}
    </Tabs>
  );
}
