"use client";

import { createContext, use, useCallback, useEffect, useState } from "react";

import type { SearchGame } from "@/lib/types";

type SearchContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  games: SearchGame[];
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function SearchProvider({
  games,
  children,
}: {
  games: SearchGame[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      event.preventDefault();
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  return (
    <SearchContext.Provider value={{ open, setOpen, games }}>
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
