"use client";

import { useEffect } from "react";

import { recordPageViewAction } from "@/app/actions/analytics";

const SESSION_KEY = "gb:pv:";

export function RecordPageView({ gameId }: { gameId: string }) {
  useEffect(() => {
    try {
      const key = `${SESSION_KEY}${gameId}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage unavailable — still record once this mount
    }
    void recordPageViewAction(gameId);
  }, [gameId]);

  return null;
}
