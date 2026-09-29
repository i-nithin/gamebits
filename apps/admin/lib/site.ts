export function publicWebUrl() {
  return (process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function publicGameUrl(slug: string) {
  return `${publicWebUrl()}/games/${slug}`;
}
