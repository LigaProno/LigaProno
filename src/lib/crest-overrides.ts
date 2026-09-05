import type {
  FootballDataMatch,
  FootballDataTeam,
  GroupStanding,
} from "@/lib/football-data-types";

/** Logo local — Football-Data încă servește stema veche. */
export const DINAMO_BUCURESTI_CREST = "/crests/dinamo-bucuresti.png";

/** ID-uri Football-Data cunoscute, dacă apar. Numele rămâne fallback-ul principal. */
const CREST_BY_TEAM_ID: Record<number, string> = {};

function foldDiacritics(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function teamHaystack(team: {
  name?: string | null;
  shortName?: string | null;
}): string {
  return foldDiacritics(`${team.name ?? ""} ${team.shortName ?? ""}`);
}

export function isDinamoBucuresti(team: {
  id?: number | null;
  name?: string | null;
  shortName?: string | null;
}): boolean {
  if (team.id != null && CREST_BY_TEAM_ID[team.id]) return true;
  const hay = teamHaystack(team);
  if (!hay.includes("dinamo")) return false;
  return /bucure|bukarest|bucharest/.test(hay);
}

export function resolveTeamCrest(team: {
  id?: number | null;
  name?: string | null;
  shortName?: string | null;
  crest?: string | null;
}): string | undefined {
  if (team.id != null && CREST_BY_TEAM_ID[team.id]) {
    return CREST_BY_TEAM_ID[team.id];
  }
  if (isDinamoBucuresti(team)) return DINAMO_BUCURESTI_CREST;
  return team.crest ?? undefined;
}

export function applyCrestOverrideToTeam<T extends FootballDataTeam>(team: T): T {
  const crest = resolveTeamCrest(team);
  if (!crest || crest === team.crest) return team;
  return { ...team, crest };
}

export function applyCrestOverridesToTeams(
  teams: FootballDataTeam[],
): FootballDataTeam[] {
  return teams.map(applyCrestOverrideToTeam);
}

export function applyCrestOverridesToMatches(
  matches: FootballDataMatch[],
): FootballDataMatch[] {
  return matches.map((m) => {
    const homeTeam = applyCrestOverrideToTeam(m.homeTeam);
    const awayTeam = applyCrestOverrideToTeam(m.awayTeam);
    if (homeTeam === m.homeTeam && awayTeam === m.awayTeam) return m;
    return { ...m, homeTeam, awayTeam };
  });
}

export function applyCrestOverridesToStandings(
  standings: GroupStanding[],
): GroupStanding[] {
  return standings.map((g) => ({
    ...g,
    rows: g.rows.map((row) => ({
      ...row,
      team: applyCrestOverrideToTeam(row.team),
    })),
  }));
}
