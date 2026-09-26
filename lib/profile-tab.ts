export type ProfileTab = "published" | "saved" | "liked" | "comments";

export function profileTab(value: string | undefined): ProfileTab {
  if (value === "saved" || value === "liked" || value === "comments") return value;
  return "published";
}
