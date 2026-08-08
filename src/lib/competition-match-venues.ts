import type { FootballDataMatch } from "@/lib/football-data";
import { parseStoredCompetition } from "@/lib/competition";
import { prisma } from "@/lib/prisma";
import {
  enrichMatchesWithScrapedSchedule,
  fetchCompetitionScheduleFixtures,
  type OpScheduleFixture,
} from "@/lib/wc-match-schedule-scraper";
import { mapFixturesToFootballDataMatches } from "@/lib/odds-providers/team-matcher";
import { getOddsPortalCompetition } from "@/lib/odds-providers/oddsportal/competition-map";

export type StoredMatchVenue = {
  stadium: string | null;
  city: string | null;
  utcDate: string | null;
};

const VENUE_SOURCE = "oddsportal";
/** Re-scrape periodic — programul Superliga se actualizează des. */
const DEFAULT_VENUE_TTL_MS = 6 * 60 * 60 * 1000;
const SCHEDULE_MATCH_MAX_DIFF_HOURS = 48;

function getVenueTtlMs(): number {
  const raw = process.env.VENUE_CACHE_TTL_MS?.trim();
  const n = raw ? Number(raw) : DEFAULT_VENUE_TTL_MS;
  return Number.isFinite(n) && n >= 30 * 60 * 1000 ? n : DEFAULT_VENUE_TTL_MS;
}

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

function buildVenueMapFromFixtures(
  matches: FootballDataMatch[],
  fixtures: OpScheduleFixture[],
): Record<string, StoredMatchVenue> {
  const byMatchId = mapFixturesToFootballDataMatches(fixtures, matches, {
    maxDiffHours: SCHEDULE_MATCH_MAX_DIFF_HOURS,
  });
  const out: Record<string, StoredMatchVenue> = {};

  for (const m of matches) {
    const fx = byMatchId.get(m.id);
    if (!fx) {
      // Păstrăm venue-ul FD dacă există (rar pe RL1).
      const fromFd = venueFromMatch(m);
      if (fromFd) {
        out[String(m.id)] = { ...fromFd, utcDate: m.utcDate ?? null };
      }
      continue;
    }

    const stadium = fx.stadium?.trim() || null;
    const city =
      [fx.city, fx.country].filter(Boolean).join(", ").trim() || null;
    const utcDate =
      fx.startDateIso ?
        new Date(fx.startDateIso).toISOString()
      : (m.utcDate ?? null);

    if (!stadium && !city && !utcDate) continue;

    out[String(m.id)] = { stadium, city, utcDate };
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

function isCacheStale(fetchedAt: Date | null | undefined): boolean {
  if (!fetchedAt) return true;
  return Date.now() - fetchedAt.getTime() > getVenueTtlMs();
}

/** Acoperire slabă pe meciuri viitoare → forțează re-scrape. */
function needsCoverageRefresh(
  venueMap: Record<string, StoredMatchVenue>,
  matches: FootballDataMatch[],
): boolean {
  const upcoming = matches.filter(
    (m) => m.status === "TIMED" || m.status === "SCHEDULED",
  );
  if (upcoming.length === 0) return false;
  const withStadium = upcoming.filter(
    (m) => Boolean(venueMap[String(m.id)]?.stadium?.trim()),
  ).length;
  return withStadium < Math.ceil(upcoming.length * 0.4);
}

async function scrapeAndPersistVenues(
  competition: string,
  code: string,
  season: string,
  matches: FootballDataMatch[],
): Promise<Record<string, StoredMatchVenue>> {
  const fixtures = await fetchCompetitionScheduleFixtures(code, season);
  if (fixtures.length === 0) return {};

  const venueMap = buildVenueMapFromFixtures(matches, fixtures);
  if (Object.keys(venueMap).length === 0) return {};

  await prisma.competitionMatchVenues.upsert({
    where: { competition },
    create: {
      competition,
      venues: venueMap as object,
      source: VENUE_SOURCE,
    },
    update: {
      venues: venueMap as object,
      source: VENUE_SOURCE,
      fetchedAt: new Date(),
    },
  });

  return venueMap;
}

/**
 * Încarcă stadion + oră din DB; dacă lipsește / e stale / acoperire slabă,
 * scrape OddsPortal și persistă pentru toată competiția.
 */
export async function ensureCompetitionMatchVenues(
  competition: string,
  matches: FootballDataMatch[],
): Promise<Record<string, StoredMatchVenue>> {
  if (matches.length === 0) return {};

  const parsed = parseStoredCompetition(competition);
  if (!parsed) return {};

  const opConfig = getOddsPortalCompetition(parsed.code, parsed.season);
  if (!opConfig) return {};

  const existing = await prisma.competitionMatchVenues.findUnique({
    where: { competition },
  });
  const cached = existing?.venues ? parseVenueMap(existing.venues) : {};
  const hasCache = Object.keys(cached).length > 0;
  const stale = isCacheStale(existing?.fetchedAt);
  const weakCoverage = needsCoverageRefresh(cached, matches);

  if (hasCache && !stale && !weakCoverage) {
    return cached;
  }

  try {
    const scraped = await scrapeAndPersistVenues(
      competition,
      parsed.code,
      parsed.season,
      matches,
    );
    if (Object.keys(scraped).length > 0) return scraped;
    return cached;
  } catch (e) {
    console.warn("ensureCompetitionMatchVenues:", competition, e);
    return cached;
  }
}

/** Meciuri Football-Data cu stadion/oră din cache-ul partajat al competiției. */
export async function loadMatchesWithCompetitionVenues(
  competition: string,
  matches: FootballDataMatch[],
): Promise<FootballDataMatch[]> {
  const venueMap = await ensureCompetitionMatchVenues(competition, matches);
  const withVenues = applyCompetitionVenuesToMatches(matches, venueMap);

  try {
    const { loadMatchesWithScoreOverrides } = await import(
      "@/lib/competition-match-scores"
    );
    return await loadMatchesWithScoreOverrides(competition, withVenues);
  } catch (error) {
    console.error(
      "[competition-match-venues] score fallback failed",
      competition,
      error,
    );
    return withVenues;
  }
}

/** Util pentru teste / debug — aplică enrich fără persist. */
export function previewEnrichWithFixtures(
  matches: FootballDataMatch[],
  fixtures: OpScheduleFixture[],
): FootballDataMatch[] {
  return enrichMatchesWithScrapedSchedule(matches, fixtures);
}
