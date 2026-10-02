"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { ADMIN_PAGE_SIZES, adminListHref, type CatalogView } from "@/lib/admin/params";
import { cn } from "@/lib/utils";

const SEARCH_DELAY_MS = 300;

const AdminNavigateContext = createContext<((href: string) => void) | null>(null);

export function AdminListShell({
  query,
  pageSize,
  placeholder,
  view,
  children,
}: {
  query: string;
  pageSize: number;
  placeholder: string;
  view?: CatalogView;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(query);
  const [syncedQuery, setSyncedQuery] = useState(query);
  const [waiting, setWaiting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (query !== syncedQuery) {
    setSyncedQuery(query);
    setValue(query);
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function replace(updates: Record<string, string | null>) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, next] of Object.entries(updates)) {
      if (next === null || next === "") params.delete(key);
      else params.set(key, next);
    }
    const search = params.toString();
    const href = search ? `${pathname}?${search}` : pathname;
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  function navigate(href: string) {
    startTransition(() => {
      router.push(href, { scroll: false });
    });
  }

  function onQueryChange(next: string) {
    setValue(next);
    setWaiting(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setWaiting(false);
      const trimmed = next.trim();
      if (trimmed === query) return;
      replace({ q: trimmed || null, page: null });
    }, SEARCH_DELAY_MS);
  }

  const showSpinner = waiting || isPending;
  const views = view
    ? ([
        { id: "all", label: "All" },
        { id: "live", label: "Live" },
        { id: "archived", label: "Archived" },
      ] as const)
    : [];

  return (
    <AdminNavigateContext.Provider value={navigate}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-sm">
            <Input
              value={value}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={placeholder}
              autoComplete="off"
              aria-busy={showSpinner}
              className="pr-8"
            />
            {showSpinner ? (
              <Spinner className="absolute top-1/2 right-2.5 -translate-y-1/2" />
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-sm text-fog">
            Rows
            <NativeSelect
              name="pageSize"
              value={String(pageSize)}
              size="sm"
              onChange={(event) => {
                replace({ pageSize: event.target.value, page: null });
              }}
            >
              {ADMIN_PAGE_SIZES.map((size) => (
                <NativeSelectOption key={size} value={size}>
                  {size}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
          {views.length > 0 ? (
            <div className="flex items-center gap-2">
              {views.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  size="sm"
                  variant={view === item.id ? "secondary" : "outline"}
                  onClick={() => replace({ view: item.id === "all" ? null : item.id, page: null })}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
        <div className={cn("relative", isPending && "pointer-events-none opacity-60")} aria-busy={isPending}>
          {isPending ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <Spinner />
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </AdminNavigateContext.Provider>
  );
}

export function DirectoryPager({
  pathname,
  query,
  page,
  pageSize,
  total,
  view = "all",
}: {
  pathname: string;
  query: string;
  page: number;
  pageSize: number;
  total: number;
  view?: CatalogView;
}) {
  const navigate = useContext(AdminNavigateContext);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  function go(nextPage: number) {
    navigate?.(adminListHref(pathname, { query, pageSize, page: nextPage, view }));
  }

  return (
    <div className="flex flex-col gap-3 text-sm text-fog sm:flex-row sm:items-center sm:justify-between">
      <p className="stat-mono">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => go(page - 1)}>
          Previous
        </Button>
        <span className="stat-mono">
          {page} / {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => go(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
