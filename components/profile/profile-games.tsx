"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { profileTab, type ProfileTab } from "@/lib/profile-tab";

const TABS: Array<{ id: ProfileTab; label: string }> = [
  { id: "published", label: "Published" },
  { id: "saved", label: "Bookmarks" },
  { id: "liked", label: "Liked" },
  { id: "comments", label: "Comments" },
];

export function ProfileGames({
  handle,
  tab,
  panels,
}: {
  handle: string;
  tab: ProfileTab;
  panels: Record<ProfileTab, ReactNode>;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(tab);
  const [seenTab, setSeenTab] = useState(tab);
  if (tab !== seenTab) {
    setSeenTab(tab);
    setCurrent(tab);
  }

  return (
    <Tabs
      value={current}
      onValueChange={(value) => {
        const next = profileTab(value);
        setCurrent(next);
        const href = next === "published" ? `/u/${handle}` : `/u/${handle}?tab=${next}`;
        router.replace(href, { scroll: false });
      }}
    >
      <TabsList variant="line">
        {TABS.map((item) => (
          <TabsTrigger key={item.id} value={item.id}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {TABS.map((item) => (
        <TabsContent key={item.id} value={item.id} className="pt-4">
          {panels[item.id]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
