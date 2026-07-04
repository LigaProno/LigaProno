import type { FootballDataMatch } from "@/lib/football-data";
import { prisma } from "@/lib/prisma";

export type StoredMatchVenue = {
  stadium: string | null;
  city: string | null;
  utcDate: string | null;
};

function venueFromMatch(m: FootballDataMatch): StoredMatchVenue | null {
  const v = m.venue;
  if (!v) return null;
  if (typeof v === "string") {
    const s = v.trim();
    return s ? { stadium: s, city: null, utcDate: null } : null;
  }
  const stadium = v.name?.trim() || null;
  const city = v.city?.trim() || null;
  if (!stadium && !city) return null;
  return { stadium, city, utcDate: null };
}

function buildVenueMap(matches: FootballDataMatch[]): Record<string, StoredMatchVenue> {
  const out: Record<string, StoredMatchVenue> = {};
  for (const m of matches) {
    const venue = venueFromMatch(m);
    if (!venue) continue;
    out[String(m.id)] = {
      ...venue,
      utcDate: m.utcDate ?? null,
    };
  }
  return out;
}

function parseVenueMap(raw: unknown): Record<string, StoredMatchVenue> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, StoredMatchVenue> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    out[k] = {
      stadium: typeof o.stadium === "string" ? o.stadium : null,
      city: typeof o.city === "string" ? o.city : null,
      utcDate: typeof o.utcDate === "string" ? o.utcDate : null,
    };
  }
  return out;
}

function storedVenueToFdVenue(
  stored: StoredMatchVenue,
): FootballDataMatch["venue"] {
  const locality = stored.city?.trim();
  const stadium = stored.stadium?.trim();
  if (!stadium && !locality) return null;
  return {
    name: stadium ?? undefined,
    city: locality || null,
  };
}

/** Aplică stadionul/ora din cache pe lista de meciuri Football-Data. */
export function applyCompetitionVenuesToMatches(
  matches: FootballDataMatch[],
  venueMap: Record<string, StoredMatchVenue>,
): FootballDataMatch[] {
  if (Object.keys(venueMap).length === 0) return matches;

  return matches.map((m) => {
    const stored = venueMap[String(m.id)];
    if (!stored) return m;
    const venue = storedVenueToFdVenue(stored);
    return {
      ...m,
      utcDate: stored.utcDate ?? m.utcDate,
      venue: venue ?? m.venue,
    };
  });
}

/** Încarcă stadionul din DB pentru competiție (dacă există date stocate). */
export async function ensureCompetitionMatchVenues(
  competition: string,
  matches: FootballDataMatch[],
): Promise<Record<string, StoredMatchVenue>> {
  if (matches.length === 0) return {};

  const existing = await prisma.competitionMatchVenues.findUnique({
    where: { competition },
  });
  if (existing?.venues) {
    return parseVenueMap(existing.venues);
  }

  return {};
}

/** Meciuri Football-Data cu stadion din cache-ul partajat al competiției. */
export async function loadMatchesWithCompetitionVenues(
  competition: string,
  matches: FootballDataMatch[],
): Promise<FootballDataMatch[]> {
  const venueMap = await ensureCompetitionMatchVenues(competition, matches);
  return applyCompetitionVenuesToMatches(matches, venueMap);
}
