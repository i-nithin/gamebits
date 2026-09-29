"use client";

import { createContext, use, useCallback, useEffect, useState, useSyncExternalStore } from "react";

import type { GamePlatformItem } from "@/lib/types";

const RECENT_KEY = "gamebits:recent-search:v1";
const RECENT_LIMIT = 5;

export type RecentSearch = {
  kind: "game" | "person";
  name: string;
  subtitle: string;
  imageUrl: string | null;
  href: string;
};

type SearchContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  platforms: GamePlatformItem[];
  recents: RecentSearch[];
  remember: (item: RecentSearch) => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);
const SERVER_RECENTS: RecentSearch[] = [];
let recentsCache: RecentSearch[] | null = null;
const recentListeners = new Set<() => void>();

function currentRecents() {
  if (recentsCache === null) recentsCache = readRecents();
  return recentsCache;
}

function subscribeRecents(listener: () => void) {
  recentListeners.add(listener);
  return () => {
    recentListeners.delete(listener);
  };
}

function publishRecents(next: RecentSearch[]) {
  recentsCache = next;
  writeRecents(next);
  for (const listener of recentListeners) listener();
}

function isRecent(value: unknown): value is RecentSearch {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    (row.kind === "game" || row.kind === "person") &&
    typeof row.name === "string" &&
    typeof row.subtitle === "string" &&
    (typeof row.imageUrl === "string" || row.imageUrl === null) &&
    typeof row.href === "string" &&
    row.href.startsWith("/") &&
    !row.href.startsWith("//")
  );
}

function readRecents(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return SERVER_RECENTS;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return SERVER_RECENTS;
    const items = parsed.filter(isRecent).slice(0, RECENT_LIMIT);
    return items.length === 0 ? SERVER_RECENTS : items;
  } catch {
    return SERVER_RECENTS;
  }
}

function writeRecents(items: RecentSearch[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(items));
  } catch {
    // Private browsing and full storage should not break search.
  }
}

export function SearchProvider({
  platforms,
  children,
}: {
  platforms: GamePlatformItem[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const recents = useSyncExternalStore(subscribeRecents, currentRecents, () => SERVER_RECENTS);

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (target?.isContentEditable) return;
      event.preventDefault();
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  const remember = useCallback((item: RecentSearch) => {
    const next = [item, ...currentRecents().filter((recent) => recent.href !== item.href)].slice(
      0,
      RECENT_LIMIT,
    );
    publishRecents(next);
  }, []);

  return (
    <SearchContext.Provider value={{ open, setOpen, platforms, recents, remember }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const value = use(SearchContext);
  if (!value) {
    throw new Error("useSearch must be used within SearchProvider");
  }
  return value;
}
