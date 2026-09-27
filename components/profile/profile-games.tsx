"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { profileTab, type ProfileTab } from "@/lib/profile-tab";

const TABS: Array<{ id: ProfileTab; label: string; ownerOnly?: boolean }> = [
  { id: "games", label: "Games" },
  { id: "saved", label: "Bookmarks", ownerOnly: true },
  { id: "liked", label: "Liked", ownerOnly: true },
  { id: "comments", label: "Comments", ownerOnly: true },
  { id: "followers", label: "Followers" },
  { id: "following", label: "Following" },
];

export function ProfileGames({
  handle,
  tab,
  isOwner,
  panels,
}: {
  handle: string;
  tab: ProfileTab;
  isOwner: boolean;
  panels: Record<ProfileTab, ReactNode>;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState(tab);
  const [seenTab, setSeenTab] = useState(tab);
  if (tab !== seenTab) {
    setSeenTab(tab);
    setCurrent(tab);
  }

  const tabs = TABS.filter((item) => !item.ownerOnly || isOwner);

  return (
    <Tabs
      value={current}
      onValueChange={(value) => {
        const next = profileTab(value, isOwner);
        setCurrent(next);
        const href = next === "games" ? `/u/${handle}` : `/u/${handle}?tab=${next}`;
        router.replace(href, { scroll: false });
      }}
    >
      <TabsList variant="line">
        {tabs.map((item) => (
          <TabsTrigger key={item.id} value={item.id}>
            {item.id === "games" && isOwner ? "My games" : item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((item) => (
        <TabsContent key={item.id} value={item.id} className="pt-4">
          {panels[item.id]}
        </TabsContent>
      ))}
    </Tabs>
  );
}
