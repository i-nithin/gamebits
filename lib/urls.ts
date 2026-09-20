export type VideoEmbed = {
  watchUrl: string;
  provider: "youtube" | "vimeo";
  id: string;
};

function youtubeWatchUrl(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function parseVideoEmbed(raw: string): VideoEmbed | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:") return null;
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      if (!id) return null;
      return { watchUrl: youtubeWatchUrl(id), provider: "youtube", id };
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const fromQuery = url.searchParams.get("v");
      const parts = url.pathname.split("/").filter(Boolean);
      const fromPath =
        parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live" ? parts[1] : null;
      const id = fromQuery || fromPath;
      if (!id) return null;
      return { watchUrl: youtubeWatchUrl(id), provider: "youtube", id };
    }

    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      const id = host === "player.vimeo.com" && parts[0] === "video" ? parts[1] : parts[0];
      if (!id || !/^\d+$/.test(id)) return null;
      return { watchUrl: `https://vimeo.com/${id}`, provider: "vimeo", id };
    }
  } catch {
    return null;
  }

  return null;
}

export function withVideosFirst<T extends { kind: string }>(items: T[]) {
  return [...items.filter((item) => item.kind === "video"), ...items.filter((item) => item.kind !== "video")];
}
