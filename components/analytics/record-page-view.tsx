"use client";

import { useEffect } from "react";

import { recordPageViewAction } from "@/app/actions/analytics";

const recentViews = new Map<string, number>();

export function RecordPageView({ gameId }: { gameId: string }) {
  useEffect(() => {
    const now = Date.now();
    const last = recentViews.get(gameId) ?? 0;
    if (now - last < 1000) return;
    recentViews.set(gameId, now);
    void recordPageViewAction(gameId);
  }, [gameId]);

  return null;
}
