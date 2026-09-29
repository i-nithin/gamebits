"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { CheckIcon, Gamepad2Icon, SearchIcon, UserIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { useSearch, type RecentSearch } from "@/components/search/search-provider";
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import type { SearchGameHit, SearchPersonHit, SearchScope } from "@/lib/types";
import { cn } from "@/lib/utils";

const SCOPES: Array<{ id: SearchScope; label: string }> = [
  { id: "all", label: "All" },
  { id: "games", label: "Games" },
  { id: "people", label: "People" },
];

type SearchResults = {
  games: SearchGameHit[];
  people: SearchPersonHit[];
};

const emptyResults: SearchResults = { games: [], people: [] };

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function isGame(value: unknown): value is SearchGameHit {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.slug === "string" &&
    typeof row.name === "string" &&
    typeof row.tagline === "string" &&
    typeof row.logoUrl === "string"
  );
}

function isPerson(value: unknown): value is SearchPersonHit {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.handle === "string" &&
    typeof row.name === "string" &&
    (typeof row.imageUrl === "string" || row.imageUrl === null) &&
    (typeof row.headline === "string" || row.headline === null)
  );
}

function normalizeResults(payload: unknown): SearchResults {
  if (!payload || typeof payload !== "object") return emptyResults;
  const row = payload as { games?: unknown; people?: unknown };
  return {
    games: Array.isArray(row.games) ? row.games.filter(isGame) : [],
    people: Array.isArray(row.people) ? row.people.filter(isPerson) : [],
  };
}

function ScopeIcon({ id, active }: { id: SearchScope; active: boolean }) {
  if (id === "all") {
    return <CheckIcon className={cn("size-4", active ? "text-paper-white" : "text-fog")} />;
  }
  if (id === "games") return <Gamepad2Icon className="size-4" />;
  return <UserIcon className="size-4" />;
}

function ScopeNav({
  scope,
  onChange,
}: {
  scope: SearchScope;
  onChange: (scope: SearchScope) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-iron p-2 sm:w-44 sm:shrink-0 sm:flex-col sm:overflow-visible sm:border-r sm:border-b-0">
      {SCOPES.map((item) => {
        const active = scope === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "flex h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm text-paper-white",
              active ? "bg-graphite" : "hover:bg-slate",
            )}
          >
            <ScopeIcon id={item.id} active={active} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function HitThumb({ src, name, cover }: { src: string | null; name: string; cover: boolean }) {
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate text-sm font-medium text-paper-white">
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes="40px"
          className={cover ? "object-cover" : "object-contain p-1"}
        />
      ) : (
        initial
      )}
    </span>
  );
}

function HitRow({
  hit,
  selected,
  onHover,
  onChoose,
}: {
  hit: RecentSearch;
  selected: boolean;
  onHover: () => void;
  onChoose: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onMouseEnter={onHover}
      onClick={onChoose}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border border-iron px-3 py-2 text-left",
        selected ? "bg-graphite" : "hover:bg-graphite",
      )}
    >
      <HitThumb src={hit.imageUrl} name={hit.name} cover={hit.kind === "person"} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-paper-white">{hit.name}</span>
        <span className="block truncate text-xs text-fog">{hit.subtitle}</span>
      </span>
    </button>
  );
}

export function SearchModal() {
  const { open, setOpen, platforms, recents, remember } = useSearch();
  const router = useRouter();
  const mounted = useIsClient();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [scope, setScope] = useState<SearchScope>("all");
  const [platform, setPlatform] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResults>(emptyResults);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [sessionOpen, setSessionOpen] = useState(open);
  const [activeKey, setActiveKey] = useState("");

  if (open !== sessionOpen) {
    setSessionOpen(open);
    if (!open) {
      setQuery("");
      setDebounced("");
      setScope("all");
      setPlatform(null);
      setResults(emptyResults);
      setLoading(false);
    }
  }

  const trimmed = query.trim();
  const listKey = `${trimmed}|${scope}|${platform ?? ""}`;
  if (listKey !== activeKey) {
    setActiveKey(listKey);
    setActive(0);
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(query.trim()), 150);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    if (!open || debounced.length === 0) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ q: debounced, scope });
    if (scope !== "people" && platform && !debounced.startsWith("@")) {
      params.set("platform", platform);
    }

    fetch(`/api/search?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Search failed");
        return response.json() as Promise<unknown>;
      })
      .then((payload) => {
        if (controller.signal.aborted) return;
        setResults(normalizeResults(payload));
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (controller.signal.aborted) return;
        setResults(emptyResults);
        setLoading(false);
      });

    return () => controller.abort();
  }, [open, debounced, scope, platform]);

  const showRecents = trimmed.length === 0;
  const showChips = scope !== "people" && platforms.length > 0;
  const settled = trimmed.length > 0 && trimmed === debounced && !loading;

  const hits: RecentSearch[] = showRecents
    ? recents
    : settled
      ? [
        ...results.games.map((game) => ({
          kind: "game" as const,
          name: game.name,
          subtitle: game.tagline,
          imageUrl: game.logoUrl,
          href: `/games/${game.slug}`,
        })),
        ...results.people.map((person) => ({
          kind: "person" as const,
          name: person.name,
          subtitle: `@${person.handle}`,
          imageUrl: person.imageUrl,
          href: `/u/${person.handle}`,
        })),
      ]
      : [];

  const selected = hits.length === 0 ? 0 : Math.min(active, hits.length - 1);

  function choose(hit: RecentSearch) {
    remember(hit);
    setOpen(false);
    router.push(hit.href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive(hits.length === 0 ? 0 : Math.min(selected + 1, hits.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive(Math.max(selected - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      const hit = hits[selected];
      if (!hit) return;
      event.preventDefault();
      choose(hit);
    }
  }

  if (!mounted) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay className="bg-scrim backdrop-blur-none" />
        <DialogPrimitive.Popup
          className="fixed top-[10%] left-1/2 z-50 flex h-[min(32rem,calc(100dvh-4rem))] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-iron bg-obsidian text-paper-white outline-none sm:max-w-3xl data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
          onKeyDown={onKeyDown}
        >
          <DialogTitle className="sr-only">Search GameBits</DialogTitle>
          <DialogDescription className="sr-only">Find games and people</DialogDescription>
          <div className="flex h-14 shrink-0 items-center gap-3 border-b border-iron px-4">
            <SearchIcon className="size-4 shrink-0 text-fog" />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                const next = event.target.value;
                setQuery(next);
                if (next.trim().length > 0) setLoading(true);
              }}
              placeholder="Search GameBits"
              aria-label="Search GameBits"
              role="combobox"
              aria-expanded={open}
              aria-controls="search-results"
              aria-activedescendant={hits[selected] ? `search-hit-${selected}` : undefined}
              autoComplete="off"
              spellCheck={false}
              className="h-full min-w-0 flex-1 bg-transparent text-base text-paper-white outline-none placeholder:text-fog"
            />
          </div>
          <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
            <ScopeNav
              scope={scope}
              onChange={(next) => {
                setScope(next);
                if (trimmed.length > 0) setLoading(true);
              }}
            />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              {showChips ? (
                <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-iron px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPlatform(null);
                      if (trimmed.length > 0) setLoading(true);
                    }}
                    className={cn(
                      "h-8 shrink-0 rounded-full border border-iron px-3 text-sm",
                      platform === null
                        ? "bg-graphite text-paper-white"
                        : "text-fog hover:bg-slate",
                    )}
                  >
                    All
                  </button>
                  {platforms.map((item) => {
                    const selectedPlatform = platform === item.slug;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        title={item.name}
                        aria-label={item.name}
                        aria-pressed={selectedPlatform}
                        onClick={() => {
                          setPlatform(selectedPlatform ? null : item.slug);
                          if (trimmed.length > 0) setLoading(true);
                        }}
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-full border",
                          selectedPlatform
                            ? "border-paper-white bg-graphite"
                            : "border-iron hover:bg-slate",
                        )}
                      >
                        <span className="relative size-5 overflow-hidden">
                          <Image
                            src={item.logoUrl}
                            alt=""
                            fill
                            sizes="20px"
                            className="object-contain"
                          />
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <div id="search-results" role="listbox" className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
                {showRecents && hits.length > 0 ? (
                  <p className="px-1 text-xs text-fog">Recent</p>
                ) : null}
                {!showRecents && !settled ? (
                  <div className="flex flex-col gap-2" aria-hidden="true">
                    {Array.from({ length: 3 }, (_, index) => (
                      <div key={index} className="h-14 animate-pulse rounded-lg border border-iron bg-graphite/60" />
                    ))}
                  </div>
                ) : null}
                {hits.map((hit, index) => (
                  <div key={hit.href} id={`search-hit-${index}`}>
                    <HitRow
                      hit={hit}
                      selected={index === selected}
                      onHover={() => setActive(index)}
                      onChoose={() => choose(hit)}
                    />
                  </div>
                ))}
                {showRecents && hits.length === 0 ? (
                  <p className="px-1 py-6 text-center text-sm text-fog">Search games and people</p>
                ) : null}
                {settled && hits.length === 0 ? (
                  <p className="px-1 py-6 text-center text-sm text-fog">No results for “{trimmed}”</p>
                ) : null}
              </div>
            </div>
          </div>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
