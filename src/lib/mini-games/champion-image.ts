import { unstable_cache } from "next/cache";
import type { ChampionPlayer } from "./types";

const WIKI_SUMMARY = "https://en.wikipedia.org/api/rest_v1/page/summary";

async function fetchWikiThumbnail(title: string): Promise<string | null> {
  try {
    const res = await fetch(`${WIKI_SUMMARY}/${encodeURIComponent(title)}`, {
      headers: { accept: "application/json" },
      next: { revalidate: 86_400 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { thumbnail?: { source?: string } };
    return data.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

function wikiTitlesForPlayer(name: string): string[] {
  const base = name.trim().replace(/ /g, "_");
  return [
    base,
    `${base}_(footballer)`,
    `${base}_(football)`,
    `${base}_(soccer)`,
  ];
}

async function resolveFromWikipedia(name: string): Promise<string | null> {
  for (const title of wikiTitlesForPlayer(name)) {
    const url = await fetchWikiThumbnail(title);
    if (url) return url;
  }
  return null;
}

async function resolveForPlayer(
  playerName: string,
  fallbackUrl: string,
): Promise<string> {
  const fromWiki = await resolveFromWikipedia(playerName);
  return fromWiki ?? fallbackUrl;
}

export async function resolveChampionImageUrl(player: ChampionPlayer): Promise<string> {
  return unstable_cache(
    () => resolveForPlayer(player.name, player.imageUrl),
    ["champion-image", player.id],
    { revalidate: 86_400 },
  )();
}
