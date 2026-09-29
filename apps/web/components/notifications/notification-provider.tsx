"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import {
  getNotificationUnreadCountAction,
  listLatestUnreadNotificationsAction,
  listNotificationsAction,
  markNotificationsReadAction,
  markNotificationsUnreadAction,
} from "@/app/actions/notifications";
import type {
  NotificationFilter,
  NotificationItem,
} from "@/lib/notifications/types";

const POLL_MS = 30_000;

type NotificationContextValue = {
  unreadCount: number;
  popupOpen: boolean;
  dialogOpen: boolean;
  setPopupOpen: (open: boolean) => void;
  setDialogOpen: (open: boolean) => void;
  openDialog: () => void;
  refreshUnreadCount: () => Promise<void>;
  loadLatestUnread: () => Promise<NotificationItem[]>;
  loadNotifications: (opts: {
    filter: NotificationFilter;
    cursor?: string | null;
  }) => Promise<{ items: NotificationItem[]; nextCursor: string | null }>;
  markRead: (ids: string[]) => Promise<void>;
  markUnread: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [popupOpen, setPopupOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, startTransition] = useTransition();

  const refreshUnreadCount = useCallback(async () => {
    try {
      const result = await getNotificationUnreadCountAction();
      if (result.ok) {
        startTransition(() => setUnreadCount(result.unreadCount));
      }
    } catch (error) {
      console.error("[notifications] unread poll failed", error);
    }
  }, [startTransition]);

  const onVisiblePoll = useEffectEvent(() => {
    void refreshUnreadCount();
  });

  useEffect(() => {
    const initial = window.setTimeout(() => onVisiblePoll(), 0);

    function tick() {
      if (document.visibilityState === "visible") onVisiblePoll();
    }

    const id = window.setInterval(tick, POLL_MS);
    function onVisibility() {
      if (document.visibilityState === "visible") onVisiblePoll();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const loadLatestUnread = useCallback(async () => {
    const result = await listLatestUnreadNotificationsAction();
    if (!result.ok) return [];
    return result.items;
  }, []);

  const loadNotifications = useCallback(
    async (opts: { filter: NotificationFilter; cursor?: string | null }) => {
      const result = await listNotificationsAction(opts);
      if (!result.ok) return { items: [], nextCursor: null };
      return { items: result.items, nextCursor: result.nextCursor };
    },
    [],
  );

  const markRead = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      setUnreadCount((current) => Math.max(0, current - ids.length));
      const result = await markNotificationsReadAction({ ids });
      if (result.ok) setUnreadCount(result.unreadCount);
      else void refreshUnreadCount();
    },
    [refreshUnreadCount],
  );

  const markUnread = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      setUnreadCount((current) => current + ids.length);
      const result = await markNotificationsUnreadAction({ ids });
      if (result.ok) setUnreadCount(result.unreadCount);
      else void refreshUnreadCount();
    },
    [refreshUnreadCount],
  );

  const markAllRead = useCallback(async () => {
    setUnreadCount(0);
    const result = await markNotificationsReadAction({ all: true });
    if (result.ok) setUnreadCount(result.unreadCount);
    else void refreshUnreadCount();
  }, [refreshUnreadCount]);

  const openDialog = useCallback(() => {
    setPopupOpen(false);
    setDialogOpen(true);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        popupOpen,
        dialogOpen,
        setPopupOpen,
        setDialogOpen,
        openDialog,
        refreshUnreadCount,
        loadLatestUnread,
        loadNotifications,
        markRead,
        markUnread,
        markAllRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}

export function useNotificationsOptional() {
  return useContext(NotificationContext);
}
