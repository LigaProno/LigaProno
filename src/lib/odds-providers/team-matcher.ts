import type { FootballDataMatch } from "@/lib/football-data-types";
import { TEAM_NAME_ALIASES } from "@/lib/odds-providers/oddsportal/competition-map";
import type { OpScheduleFixture } from "@/lib/odds-providers/oddsportal/client";

export type OpFixture = OpScheduleFixture;

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "");
}

export function normalizeTeamName(name: string): string {
  let s = stripDiacritics(name.trim().toLowerCase());
  s = s.replace(/&/g, " and ");
  s = s.replace(/[^a-z0-9\s]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  s = TEAM_NAME_ALIASES[s] ?? s;
  // Alias values may still contain punctuation (e.g. "d.r. congo" from Football-Data).
  s = s.replace(/[^a-z0-9\s]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function parseIsoMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function parseFdMatchMs(m: FootballDataMatch): number | null {
  const ms = Date.parse(m.utcDate);
  return Number.isFinite(ms) ? ms : null;
}

const TEAM_NAME_STOPWORDS = new Set([
  "fc",
  "cf",
  "cs",
  "as",
  "afc",
  "scf",
  "acs",
  "fk",
  "sf",
  "osk",
  "osf",
  "univ",
  "club",
  "football",
  "fotbal",
  "the",
  "and",
  "de",
  "la",
]);

/** Tokeni geografici ambigui — nu sunt suficienți singuri pentru match. */
const WEAK_GEO_TOKENS = new Set([
  "bucuresti",
  "bucharest",
  "bukarest",
  "cluj",
  "constanta",
  "ploiesti",
  "galati",
  "pitesti",
  "arad",
  "sibiu",
  "gheorghe",
  "sfantu",
]);

function significantTokens(normalized: string): string[] {
  return normalized.split(" ").filter((w) => w && !TEAM_NAME_STOPWORDS.has(w));
}

function teamsMatch(a: string, b: string): boolean {
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) {
    // Evită match pe tokeni scurți tip „u" / „fc".
    if (Math.min(na.length, nb.length) >= 4) return true;
  }
  const ta = new Set(significantTokens(na));
  const tb = new Set(significantTokens(nb));
  if (ta.size === 0 || tb.size === 0) return false;
  let overlap = 0;
  const shared: string[] = [];
  for (const w of ta) {
    if (tb.has(w)) {
      overlap++;
      shared.push(w);
    }
  }
  const min = Math.min(ta.size, tb.size);
  // Cel puțin un token semnificativ comun, și acoperire completă pe partea mai scurtă.
  if (overlap >= min && min >= 1) return true;
  // Club distinct (ex. craiova, sepsi) chiar dacă OP scurtează numele.
  if (
    shared.some((w) => w.length >= 5 && !WEAK_GEO_TOKENS.has(w))
  ) {
    return true;
  }
  return false;
}

function fdTeamNameVariants(team: FootballDataMatch["homeTeam"]): string[] {
  // Nu includem TLA — pe Superliga e nesigur (Rapid=BUK, Petrolul=P52) și produce false match.
  const names = [team.name, team.shortName].filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
  return [...new Set(names)];
}

function fixtureSideMatchesFdTeam(
  fixtureSide: string,
  fdTeam: FootballDataMatch["homeTeam"],
): boolean {
  return fdTeamNameVariants(fdTeam).some((name) => teamsMatch(fixtureSide, name));
}

export type MatchFixtureOpts = {
  /** Toleranță oră FD↔OddsPortal. Default 18h; `null` = fără filtru dur (doar scor). */
  maxDiffHours?: number | null;
  /** Dacă true, preferă home↔home / away↔away față de swap. Default true. */
  preferHomeAwayOrientation?: boolean;
};

function scoreFixtureAgainstMatch(
  fixture: OpFixture,
  fdMatch: FootballDataMatch,
  opts?: MatchFixtureOpts,
): number | null {
  const homeHome = fixtureSideMatchesFdTeam(fixture.home, fdMatch.homeTeam);
  const awayAway = fixtureSideMatchesFdTeam(fixture.away, fdMatch.awayTeam);
  const homeAway = fixtureSideMatchesFdTeam(fixture.home, fdMatch.awayTeam);
  const awayHome = fixtureSideMatchesFdTeam(fixture.away, fdMatch.homeTeam);

  const orientedOk = homeHome && awayAway;
  const swappedOk = homeAway && awayHome;
  if (!orientedOk && !swappedOk) return null;

  let score = orientedOk ? 100 : 40;

  // Bonus pentru egalitate exactă pe nume normalizate.
  for (const [side, team] of [
    [fixture.home, fdMatch.homeTeam],
    [fixture.away, fdMatch.awayTeam],
  ] as const) {
    const variants = fdTeamNameVariants(team).map(normalizeTeamName);
    const n = normalizeTeamName(side);
    if (variants.includes(n)) score += 15;
  }

  const maxDiffHours = opts?.maxDiffHours === undefined ? 18 : opts.maxDiffHours;
  const fdMs = parseFdMatchMs(fdMatch);
  const opMs = parseIsoMs(fixture.startDateIso);
  if (fdMs != null && opMs != null) {
    const diffH = Math.abs(fdMs - opMs) / 3_600_000;
    if (maxDiffHours != null && diffH > maxDiffHours) return null;
    // Mai aproape în timp = mai bun (soft).
    score -= Math.min(diffH, 72) * 0.5;
  }

  return score;
}

export function matchFixtureToFootballData(
  fixture: OpFixture,
  fdMatch: FootballDataMatch,
  opts?: MatchFixtureOpts,
): boolean {
  return scoreFixtureAgainstMatch(fixture, fdMatch, opts) != null;
}

export function mapFixturesToFootballDataMatches(
  fixtures: OpFixture[],
  fdMatches: FootballDataMatch[],
  opts?: MatchFixtureOpts,
): Map<number, OpFixture> {
  const map = new Map<number, OpFixture>();
  type Edge = { fdId: number; fx: OpFixture; score: number };
  const edges: Edge[] = [];

  for (const fd of fdMatches) {
    for (const fx of fixtures) {
      const score = scoreFixtureAgainstMatch(fx, fd, opts);
      if (score == null) continue;
      edges.push({ fdId: fd.id, fx, score });
    }
  }

  edges.sort((a, b) => b.score - a.score);

  const usedFd = new Set<number>();
  const usedOp = new Set<string>();
  for (const e of edges) {
    if (usedFd.has(e.fdId) || usedOp.has(e.fx.matchId)) continue;
    usedFd.add(e.fdId);
    usedOp.add(e.fx.matchId);
    map.set(e.fdId, e.fx);
  }

  return map;
}

export function matchOutrightTeamName(
  outrightName: string,
  teamNames: { id: number; name: string }[],
): number | null {
  const target = normalizeTeamName(outrightName);
  for (const t of teamNames) {
    if (normalizeTeamName(t.name) === target) return t.id;
  }
  for (const t of teamNames) {
    const n = normalizeTeamName(t.name);
    if (n.includes(target) || target.includes(n)) return t.id;
  }
  return null;
}
