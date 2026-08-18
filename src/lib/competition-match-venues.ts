import type { FootballDataMatch } from "@/lib/football-data-types";
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

const VENUE_SOURCE = "oddsportal-v2";
/** Re-scrape periodic — programul Superliga se actualizează des. */
const DEFAULT_VENUE_TTL_MS = 6 * 60 * 60 * 1000;
const SCHEDULE_MATCH_MAX_DIFF_HOURS = 14 * 24;
/** Meciuri din fereastra apropiată fără oră/stadion → forțează refresh. */
const NEAR_WINDOW_PAST_MS = 6 * 60 * 60 * 1000;
const NEAR_WINDOW_FUTURE_MS = 21 * 24 * 60 * 60 * 1000;

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

function mergeVenueMaps(
  base: Record<string, StoredMatchVenue>,
  patch: Record<string, StoredMatchVenue>,
): Record<string, StoredMatchVenue> {
  const out: Record<string, StoredMatchVenue> = { ...base };
  for (const [id, next] of Object.entries(patch)) {
    const prev = out[id];
    if (!prev) {
      out[id] = next;
      continue;
    }
    out[id] = {
      stadium: next.stadium?.trim() || prev.stadium,
      city: next.city?.trim() || prev.city,
      utcDate: next.utcDate || prev.utcDate,
    };
  }
  return out;
}

function sortMatchesByKickoff(matches: FootballDataMatch[]): FootballDataMatch[] {
  return [...matches].sort(
    (a, b) =>
      new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime() ||
      a.id - b.id,
  );
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

function effectiveKickoffMs(
  m: FootballDataMatch,
  venueMap: Record<string, StoredMatchVenue>,
): number | null {
  const stored = venueMap[String(m.id)]?.utcDate;
  const iso = stored || m.utcDate;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/** Orice meci din fereastra apropiată fără oră OP sau stadion → re-scrape. */
function needsCoverageRefresh(
  venueMap: Record<string, StoredMatchVenue>,
  matches: FootballDataMatch[],
): boolean {
  const now = Date.now();
  const near = matches.filter((m) => {
    if (m.status !== "TIMED" && m.status !== "SCHEDULED") return false;
    const ms = effectiveKickoffMs(m, venueMap);
    if (ms == null) return true;
    return ms >= now - NEAR_WINDOW_PAST_MS && ms <= now + NEAR_WINDOW_FUTURE_MS;
  });
  if (near.length === 0) return false;

  return near.some((m) => {
    const v = venueMap[String(m.id)];
    return !v?.utcDate || !v.stadium?.trim();
  });
}

async function scrapeAndPersistVenues(
  competition: string,
  code: string,
  season: string,
  matches: FootballDataMatch[],
  existing: Record<string, StoredMatchVenue>,
): Promise<Record<string, StoredMatchVenue>> {
  const fixtures = await fetchCompetitionScheduleFixtures(code, season);
  if (fixtures.length === 0) return existing;

  const scraped = buildVenueMapFromFixtures(matches, fixtures);
  if (Object.keys(scraped).length === 0) return existing;

  // Merge: overview OP e parțial — păstrăm datele bune din cache pentru meciuri
  // care nu apar pe pagină acum; pentru fereastra apropiată fără match nou, curățăm
  // ca să nu rămână perechi greșite din matching-ul vechi.
  const venueMap = mergeVenueMaps(existing, scraped);
  const now = Date.now();
  for (const m of matches) {
    if (m.status !== "TIMED" && m.status !== "SCHEDULED") continue;
    const ms = Date.parse(m.utcDate);
    if (!Number.isFinite(ms)) continue;
    if (ms < now - NEAR_WINDOW_PAST_MS || ms > now + NEAR_WINDOW_FUTURE_MS) {
      continue;
    }
    if (!scraped[String(m.id)]) {
      delete venueMap[String(m.id)];
    }
  }

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
 * `cacheOnly: true` — doar citire DB (path interactiv; scrape rămâne pe cron).
 */
export async function ensureCompetitionMatchVenues(
  competition: string,
  matches: FootballDataMatch[],
  options?: { cacheOnly?: boolean },
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

  if (options?.cacheOnly) {
    return cached;
  }

  const stale =
    isCacheStale(existing?.fetchedAt) || existing?.source !== VENUE_SOURCE;
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
      cached,
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
  options?: { cacheOnly?: boolean },
): Promise<FootballDataMatch[]> {
  const venueMap = await ensureCompetitionMatchVenues(
    competition,
    matches,
    options,
  );
  const withVenues = sortMatchesByKickoff(
    applyCompetitionVenuesToMatches(matches, venueMap),
  );

  try {
    const { loadMatchesWithScoreOverrides } = await import(
      "@/lib/competition-match-scores"
    );
    return sortMatchesByKickoff(
      await loadMatchesWithScoreOverrides(competition, withVenues, options),
    );
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
