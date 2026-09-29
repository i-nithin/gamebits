"use client";

import Image from "next/image";
import Link from "next/link";
import { MailIcon, MailOpenIcon, UserIcon } from "lucide-react";

import { formatRelativeTime } from "@/lib/notifications/format";
import type { NotificationItem } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

export function NotificationRow({
  item,
  onSelect,
  onToggleRead,
  compact = false,
}: {
  item: NotificationItem;
  onSelect?: (item: NotificationItem) => void;
  onToggleRead?: (item: NotificationItem) => void;
  compact?: boolean;
}) {
  const unread = !item.readAt;
  const initial = item.payload.actorName.trim().charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        "flex items-stretch gap-1 px-2 transition-colors hover:bg-slate",
        compact ? "py-2" : "py-2.5",
        unread && "bg-graphite/40",
      )}
    >
      <Link
        href={item.href}
        onClick={() => onSelect?.(item)}
        className={cn(
          "flex min-w-0 flex-1 gap-3 rounded-lg px-2",
          compact ? "py-1" : "py-1.5",
        )}
      >
        <span className="relative mt-0.5 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate text-xs font-medium text-paper-white">
          {item.payload.actorImageUrl ? (
            <Image
              src={item.payload.actorImageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="36px"
            />
          ) : initial ? (
            initial
          ) : (
            <UserIcon className="size-4" />
          )}
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-sm leading-snug text-paper-white">
            {item.message}
          </span>
          <span className="mt-1 block text-xs text-fog">
            {formatRelativeTime(item.createdAt)}
          </span>
        </span>
        {unread ? (
          <span
            aria-hidden
            className="mt-2 size-2 shrink-0 rounded-full bg-error"
          />
        ) : null}
      </Link>

      {onToggleRead ? (
        <button
          type="button"
          aria-label={unread ? "Mark as read" : "Mark as unread"}
          title={unread ? "Mark as read" : "Mark as unread"}
          className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full text-fog hover:bg-graphite hover:text-paper-white"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleRead(item);
          }}
        >
          {unread ? (
            <MailOpenIcon className="size-4" strokeWidth={1.5} />
          ) : (
            <MailIcon className="size-4" strokeWidth={1.5} />
          )}
        </button>
      ) : null}
    </div>
  );
}
