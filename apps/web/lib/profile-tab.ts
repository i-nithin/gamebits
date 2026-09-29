export type ProfileTab = "games" | "saved" | "liked" | "comments" | "followers" | "following";

const PUBLIC_TABS = new Set<ProfileTab>(["followers", "following"]);

export function profileTab(value: string | undefined, isOwner = false): ProfileTab {
  if (value === "saved" || value === "liked" || value === "comments") {
    return isOwner ? value : "games";
  }
  if (value === "games" || value === "published" || value === "archived") return "games";
  if (value && PUBLIC_TABS.has(value as ProfileTab)) return value as ProfileTab;
  return "games";
}
