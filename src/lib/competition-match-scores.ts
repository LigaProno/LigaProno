import type { FootballDataMatch } from "@/lib/football-data";
import { parseStoredCompetition } from "@/lib/competition";
import { mapWithConcurrency } from "@/lib/odds-providers/concurrency";
import {
  fetchEventResult,
  fetchTournamentFixturesForScoreFallback,
} from "@/lib/odds-providers/oddsportal/client";
import { getOddsPortalCompetition } from "@/lib/odds-providers/oddsportal/competition-map";
import { mapFixturesToFootballDataMatches } from "@/lib/odds-providers/team-matcher";
import { prisma } from "@/lib/prisma";

export const SCORE_OVERRIDE_SOURCE = "oddsportal";

/** După kick-off, dacă FD nu e FINISHED, încercăm OddsPortal. Default 2.5h. */
function getStaleAfterMs(): number {
  const raw = process.env.SCORE_FALLBACK_STALE_MS?.trim();
  const n = raw ? Number(raw) : 2.5 * 60 * 60 * 1000;
  return Number.isFinite(n) && n >= 30 * 60 * 1000 ? n : 2.5 * 60 * 60 * 1000;
}

function getScoreFetchConcurrency(): number {
  const raw = process.env.ODDSPORTAL_SCORE_CONCURRENCY?.trim();
  const n = raw ? Number(raw) : 4;
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 8) : 4;
}

export type StoredMatchScoreOverride = {
  htHome: number;
  htAway: number;
  ftHome: number;
  ftAway: number;
  source: string;
  opMatchId?: string | null;
  fetchedAt: string;
};

function isCompleteOverride(v: unknown): v is StoredMatchScoreOverride {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.htHome === "number" &&
    typeof o.htAway === "number" &&
    typeof o.ftHome === "number" &&
    typeof o.ftAway === "number" &&
    Number.isInteger(o.htHome) &&
    Number.isInteger(o.htAway) &&
    Number.isInteger(o.ftHome) &&
    Number.isInteger(o.ftAway) &&
    o.htHome >= 0 &&
    o.htAway >= 0 &&
    o.ftHome >= 0 &&
    o.ftAway >= 0
  );
}

export function parseScoreOverrideMap(
  raw: unknown,
): Record<string, StoredMatchScoreOverride> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, StoredMatchScoreOverride> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!isCompleteOverride(v)) continue;
    out[k] = {
      htHome: v.htHome,
      htAway: v.htAway,
      ftHome: v.ftHome,
      ftAway: v.ftAway,
      source: typeof v.source === "string" ? v.source : SCORE_OVERRIDE_SOURCE,
      opMatchId:
        typeof v.opMatchId === "string" ? v.opMatchId
        : v.opMatchId == null ? null
        : null,
      fetchedAt:
        typeof v.fetchedAt === "string" ? v.fetchedAt : new Date().toISOString(),
    };
  }
  return out;
}

function fdHasOfficialFinishedScore(m: FootballDataMatch): boolean {
  if (m.status !== "FINISHED" && m.status !== "AWARDED") return false;
  const ft = m.score?.fullTime;
  const ht = m.score?.halfTime;
  return (
    ft?.home != null &&
    ft?.away != null &&
    ht?.home != null &&
    ht?.away != null
  );
}

/** Meci candidat pentru fallback: kick-off trecut + stale window, fără scor FD final. */
export function isMatchStaleForScoreFallback(
  m: FootballDataMatch,
  nowMs = Date.now(),
): boolean {
  if (
    m.status === "FINISHED" ||
    m.status === "AWARDED" ||
    m.status === "CANCELLED" ||
    m.status === "POSTPONED"
  ) {
    return false;
  }
  const kickoff = Date.parse(m.utcDate);
  if (!Number.isFinite(kickoff)) return false;
  if (nowMs < kickoff + getStaleAfterMs()) return false;
  return true;
}

function winnerFromScores(
  home: number,
  away: number,
): "HOME_TEAM" | "AWAY_TEAM" | "DRAW" {
  if (home > away) return "HOME_TEAM";
  if (away > home) return "AWAY_TEAM";
  return "DRAW";
}

/** Aplică override-urile pe lista FD — FD official FINISHED câștigă mereu. */
export function applyScoreOverridesToMatches(
  matches: FootballDataMatch[],
  overrideMap: Record<string, StoredMatchScoreOverride>,
): FootballDataMatch[] {
  if (Object.keys(overrideMap).length === 0) return matches;

  return matches.map((m) => {
    if (fdHasOfficialFinishedScore(m)) return m;
    const ov = overrideMap[String(m.id)];
    if (!ov) return m;
    return {
      ...m,
      status: "FINISHED",
      score: {
        winner: winnerFromScores(ov.ftHome, ov.ftAway),
        duration: "REGULAR",
        fullTime: { home: ov.ftHome, away: ov.ftAway },
        halfTime: { home: ov.htHome, away: ov.htAway },
      },
    };
  });
}

function pruneResolvedOverrides(
  matches: FootballDataMatch[],
  map: Record<string, StoredMatchScoreOverride>,
): Record<string, StoredMatchScoreOverride> {
  const next = { ...map };
  let changed = false;
  for (const m of matches) {
    if (!fdHasOfficialFinishedScore(m)) continue;
    const key = String(m.id);
    if (key in next) {
      delete next[key];
      changed = true;
    }
  }
  return changed ? next : map;
}

async function persistOverrideMap(
  competition: string,
  map: Record<string, StoredMatchScoreOverride>,
): Promise<void> {
  await prisma.competitionMatchScoreOverrides.upsert({
    where: { competition },
    create: {
      competition,
      overrides: map,
      source: SCORE_OVERRIDE_SOURCE,
      fetchedAt: new Date(),
    },
    update: {
      overrides: map,
      source: SCORE_OVERRIDE_SOURCE,
      fetchedAt: new Date(),
    },
  });
}

/**
 * Încarcă override-urile din DB; dacă există meciuri stale fără override,
 * scrapează scorul de pe OddsPortal și persistă.
 */
export async function ensureCompetitionMatchScoreOverrides(
  competition: string,
  matches: FootballDataMatch[],
): Promise<{
  overrides: Record<string, StoredMatchScoreOverride>;
  scraped: number;
  errors: string[];
}> {
  const errors: string[] = [];
  if (matches.length === 0) {
    return { overrides: {}, scraped: 0, errors };
  }

  const existingRow = await prisma.competitionMatchScoreOverrides.findUnique({
    where: { competition },
  });
  let map = pruneResolvedOverrides(
    matches,
    parseScoreOverrideMap(existingRow?.overrides),
  );

  const staleNeedingFetch = matches.filter((m) => {
    if (!isMatchStaleForScoreFallback(m)) return false;
    return !map[String(m.id)];
  });

  if (staleNeedingFetch.length === 0) {
    if (
      existingRow &&
      Object.keys(map).length !==
        Object.keys(parseScoreOverrideMap(existingRow.overrides)).length
    ) {
      await persistOverrideMap(competition, map);
    }
    return { overrides: map, scraped: 0, errors };
  }

  const parsed = parseStoredCompetition(competition);
  if (!parsed) {
    return { overrides: map, scraped: 0, errors: [`competiție invalidă: ${competition}`] };
  }

  const config = getOddsPortalCompetition(parsed.code, parsed.season);
  if (!config) {
    return {
      overrides: map,
      scraped: 0,
      errors: [`OddsPortal fără mapare pentru ${competition}`],
    };
  }

  let fixtures;
  try {
    fixtures = await fetchTournamentFixturesForScoreFallback(config);
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "fixtures OddsPortal eșuat");
    return { overrides: map, scraped: 0, errors };
  }

  const fdToOp = mapFixturesToFootballDataMatches(fixtures, staleNeedingFetch);
  const entries = [...fdToOp.entries()];
  if (entries.length === 0) {
    errors.push(
      `niciun meci stale mapat pe OddsPortal (${staleNeedingFetch.length} candidați)`,
    );
    return { overrides: map, scraped: 0, errors };
  }

  let scraped = 0;
  const fetchedAt = new Date().toISOString();
  await mapWithConcurrency(entries, getScoreFetchConcurrency(), async ([fdId, fx]) => {
    try {
      const result = await fetchEventResult(config, fx.matchId);
      if (!result?.isFinished) {
        errors.push(`${fx.matchId}: încă neterminat pe OddsPortal`);
        return;
      }
      map[String(fdId)] = {
        htHome: result.htHome,
        htAway: result.htAway,
        ftHome: result.ftHome,
        ftAway: result.ftAway,
        source: SCORE_OVERRIDE_SOURCE,
        opMatchId: result.matchId,
        fetchedAt,
      };
      scraped++;
    } catch (e) {
      errors.push(
        `${fx.matchId}: ${e instanceof Error ? e.message : "eroare scor"}`,
      );
    }
  });

  if (scraped > 0 || existingRow) {
    await persistOverrideMap(competition, map);
  }

  return { overrides: map, scraped, errors };
}

/** Meciuri cu override OddsPortal aplicat (fără scrape dacă nu e nevoie). */
export async function loadMatchesWithScoreOverrides(
  competition: string,
  matches: FootballDataMatch[],
): Promise<FootballDataMatch[]> {
  const { overrides } = await ensureCompetitionMatchScoreOverrides(
    competition,
    matches,
  );
  return applyScoreOverridesToMatches(matches, overrides);
}

/** Sync pentru toate competițiile cu turnee active — folosit de cron. */
export async function refreshStaleScoresFromOddsPortal(): Promise<{
  competitions: number;
  scraped: number;
  errors: string[];
}> {
  const tournaments = await prisma.tournament.findMany({
    where: { competition: { not: null } },
    select: { competition: true },
  });
  const competitions = [
    ...new Set(
      tournaments
        .map((t) => t.competition)
        .filter((c): c is string => typeof c === "string" && c.length > 0),
    ),
  ];

  let scraped = 0;
  const errors: string[] = [];

  for (const competition of competitions) {
    const parsed = parseStoredCompetition(competition);
    if (!parsed) continue;
    if (!getOddsPortalCompetition(parsed.code, parsed.season)) continue;

    try {
      const { fetchCompetitionMatchesFresh } = await import("@/lib/football-data");
      const matches = await fetchCompetitionMatchesFresh(
        parsed.code,
        parsed.season,
      );
      const result = await ensureCompetitionMatchScoreOverrides(
        competition,
        matches,
      );
      scraped += result.scraped;
      for (const err of result.errors) {
        errors.push(`${competition}: ${err}`);
      }
    } catch (e) {
      errors.push(
        `${competition}: ${e instanceof Error ? e.message : "eroare"}`,
      );
    }
  }

  return { competitions: competitions.length, scraped, errors };
}
