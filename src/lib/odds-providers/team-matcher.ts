import type { FootballDataMatch } from "@/lib/football-data";
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

function teamsMatch(a: string, b: string): boolean {
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = new Set(na.split(" ").filter(Boolean));
  const tb = new Set(nb.split(" ").filter(Boolean));
  if (ta.size && tb.size) {
    let overlap = 0;
    for (const w of ta) if (tb.has(w)) overlap++;
    const min = Math.min(ta.size, tb.size);
    if (overlap >= min && min >= 1) return true;
  }
  return false;
}

function fdTeamNameVariants(team: FootballDataMatch["homeTeam"]): string[] {
  const names = [team.name, team.shortName, team.tla].filter(
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

export function matchFixtureToFootballData(
  fixture: OpFixture,
  fdMatch: FootballDataMatch,
): boolean {
  const homeOk =
    fixtureSideMatchesFdTeam(fixture.home, fdMatch.homeTeam) ||
    fixtureSideMatchesFdTeam(fixture.away, fdMatch.homeTeam);
  const awayOk =
    fixtureSideMatchesFdTeam(fixture.away, fdMatch.awayTeam) ||
    fixtureSideMatchesFdTeam(fixture.home, fdMatch.awayTeam);
  if (!homeOk || !awayOk) return false;

  const fdMs = parseFdMatchMs(fdMatch);
  const opMs = parseIsoMs(fixture.startDateIso);
  if (fdMs != null && opMs != null) {
    const diffH = Math.abs(fdMs - opMs) / 3_600_000;
    if (diffH > 18) return false;
  }
  return true;
}

export function mapFixturesToFootballDataMatches(
  fixtures: OpFixture[],
  fdMatches: FootballDataMatch[],
): Map<number, OpFixture> {
  const map = new Map<number, OpFixture>();
  const usedOp = new Set<string>();

  for (const fd of fdMatches) {
    let best: OpFixture | null = null;
    for (const fx of fixtures) {
      if (usedOp.has(fx.matchId)) continue;
      if (matchFixtureToFootballData(fx, fd)) {
        best = fx;
        break;
      }
    }
    if (best) {
      map.set(fd.id, best);
      usedOp.add(best.matchId);
    }
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
