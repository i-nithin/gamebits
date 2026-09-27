"use client";

import { useEffect, useState, useTransition } from "react";

import { useNotifications } from "@/components/notifications/notification-provider";
import { NotificationRow } from "@/components/notifications/notification-row";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { NotificationFilter, NotificationItem } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

const FILTERS: { id: NotificationFilter; label: string }[] = [
  { id: "unread", label: "Unread" },
  { id: "read", label: "Read" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "earlier", label: "Earlier" },
  { id: "all", label: "All" },
];

export function NotificationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { loadNotifications, markRead, markUnread, markAllRead, unreadCount } =
    useNotifications();
  const [filter, setFilter] = useState<NotificationFilter>("unread");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!open) return;
    startTransition(() => {
      void loadNotifications({ filter }).then((result) => {
        setItems(result.items);
        setCursor(result.nextCursor);
      });
    });
  }, [open, filter, loadNotifications]);

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await loadNotifications({ filter, cursor });
      setItems((current) => [...current, ...result.items]);
      setCursor(result.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }

  function handleToggleRead(item: NotificationItem) {
    if (item.readAt) {
      void markUnread([item.id]);
      if (filter === "read") {
        setItems((current) => current.filter((row) => row.id !== item.id));
      } else {
        setItems((current) =>
          current.map((row) =>
            row.id === item.id ? { ...row, readAt: null } : row,
          ),
        );
      }
      return;
    }

    void markRead([item.id]);
    if (filter === "unread") {
      setItems((current) => current.filter((row) => row.id !== item.id));
    } else {
      setItems((current) =>
        current.map((row) =>
          row.id === item.id
            ? { ...row, readAt: new Date().toISOString() }
            : row,
        ),
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-[min(80vh,640px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden bg-obsidian p-0 text-paper-white ring-iron sm:max-w-3xl"
      >
        <DialogHeader className="flex-row items-center justify-between gap-3 border-b border-iron px-4 py-3 pr-12 sm:px-5">
          <div>
            <DialogTitle className="text-paper-white">Notifications</DialogTitle>
            <DialogDescription className="sr-only">
              Browse and filter your notifications
            </DialogDescription>
          </div>
          {unreadCount > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-fog hover:bg-slate hover:text-paper-white"
              onClick={() => {
                void markAllRead().then(() => {
                  if (filter === "unread") setItems([]);
                  else {
                    setItems((current) =>
                      current.map((item) =>
                        item.readAt
                          ? item
                          : { ...item, readAt: new Date().toISOString() },
                      ),
                    );
                  }
                });
              }}
            >
              Mark all as read
            </Button>
          ) : null}
        </DialogHeader>

        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-40 shrink-0 border-r border-iron p-2 sm:block">
            <nav className="flex flex-col gap-0.5">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-left text-sm",
                    filter === item.id
                      ? "bg-graphite text-paper-white"
                      : "text-fog hover:bg-slate hover:text-paper-white",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex gap-1 overflow-x-auto border-b border-iron px-2 py-2 sm:hidden">
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilter(item.id)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs",
                    filter === item.id
                      ? "bg-graphite text-paper-white"
                      : "text-fog hover:bg-slate",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {pending && items.length === 0 ? (
                <p className="px-4 py-12 text-center text-sm text-fog">Loading…</p>
              ) : items.length === 0 ? (
                <p className="px-4 py-12 text-center text-sm text-fog">
                  No notifications here
                </p>
              ) : (
                items.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    onToggleRead={handleToggleRead}
                    onSelect={(selected) => {
                      onOpenChange(false);
                      if (!selected.readAt) void markRead([selected.id]);
                    }}
                  />
                ))
              )}
            </div>

            {cursor ? (
              <div className="border-t border-iron p-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full hover:bg-slate"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
