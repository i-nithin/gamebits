"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { BellIcon } from "lucide-react";

import { NotificationDialog } from "@/components/notifications/notification-dialog";
import { useNotifications } from "@/components/notifications/notification-provider";
import { NotificationRow } from "@/components/notifications/notification-row";
import { Button } from "@/components/ui/button";
import type { NotificationItem } from "@/lib/notifications/types";

export function NotificationBell() {
  const {
    unreadCount,
    popupOpen,
    setPopupOpen,
    openDialog,
    dialogOpen,
    setDialogOpen,
    loadLatestUnread,
    markRead,
    markUnread,
    markAllRead,
    refreshUnreadCount,
  } = useNotifications();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!popupOpen) return;
    startTransition(() => {
      void loadLatestUnread().then(setItems);
    });
  }, [popupOpen, loadLatestUnread]);

  useEffect(() => {
    if (!popupOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setPopupOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPopupOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [popupOpen, setPopupOpen]);

  const badge =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  function handleToggleRead(item: NotificationItem) {
    if (item.readAt) {
      void markUnread([item.id]);
      setItems((current) =>
        current.map((row) =>
          row.id === item.id ? { ...row, readAt: null } : row,
        ),
      );
      return;
    }
    void markRead([item.id]);
    setItems((current) => current.filter((row) => row.id !== item.id));
  }

  return (
    <>
      <div ref={rootRef} className="relative">
        <Button
          variant="ghost"
          size="icon"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
          aria-expanded={popupOpen}
          aria-haspopup="dialog"
          className="relative rounded-full hover:bg-slate"
          onClick={() => setPopupOpen(!popupOpen)}
        >
          <BellIcon />
          {badge ? (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-semibold leading-none text-white">
              {badge}
            </span>
          ) : null}
        </Button>

        {popupOpen ? (
          <div
            role="dialog"
            aria-label="Notifications"
            className="absolute top-full right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-iron bg-obsidian text-paper-white shadow-lg sm:w-96"
          >
            <div className="flex items-center justify-between gap-2 px-4 py-3">
              <span className="text-sm font-medium">Notifications</span>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  className="text-xs text-fog hover:text-paper-white"
                  onClick={() => {
                    void markAllRead().then(() => setItems([]));
                  }}
                >
                  Mark all as read
                </button>
              ) : null}
            </div>
            <div className="mx-3 border-t border-iron" />
            <div className="max-h-80 overflow-y-auto">
              {pending && items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-fog">Loading…</p>
              ) : items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-fog">
                  You’re all caught up
                </p>
              ) : (
                items.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    compact
                    onToggleRead={handleToggleRead}
                    onSelect={(selected) => {
                      setPopupOpen(false);
                      if (!selected.readAt) void markRead([selected.id]);
                    }}
                  />
                ))
              )}
            </div>
            <div className="mx-3 border-t border-iron" />
            <button
              type="button"
              className="flex h-11 w-full items-center justify-center text-sm font-medium text-paper-white hover:bg-slate"
              onClick={() => {
                openDialog();
                void refreshUnreadCount();
              }}
            >
              View all notifications
            </button>
          </div>
        ) : null}
      </div>

      <NotificationDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
