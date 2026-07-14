import type { FootballDataMatch } from "@/lib/football-data";
import { formatTeamDisplayName } from "@/lib/team-display";
import { getMatchScoreAfter90 } from "@/lib/match-score";

export type FormResult = "W" | "D" | "L";

export type RecentMatchRow = {
  date: string;
  opponent: string;
  score: string;
  result: FormResult;
  isHome: boolean;
};

export type H2HRow = {
  date: string;
  home: string;
  away: string;
  score: string;
};

function teamId(m: FootballDataMatch, side: "home" | "away"): number | undefined {
  return side === "home" ? m.homeTeam.id : m.awayTeam.id;
}

function resultForTeam(m: FootballDataMatch, teamIdVal: number): FormResult | null {
  if (m.status !== "FINISHED" && m.status !== "AWARDED") return null;
  const score = getMatchScoreAfter90(m);
  if (!score) return null;

  const isHome = m.homeTeam.id === teamIdVal;
  const gf = isHome ? score.home : score.away;
  const ga = isHome ? score.away : score.home;
  if (gf == null || ga == null) return null;
  if (gf > ga) return "W";
  if (gf < ga) return "L";
  return "D";
}

export function getTeamRecentMatches(
  teamIdVal: number,
  allMatches: FootballDataMatch[],
  limit = 5,
): RecentMatchRow[] {
  const finished = allMatches
    .filter(
      (m) =>
        (m.status === "FINISHED" || m.status === "AWARDED") &&
        (m.homeTeam.id === teamIdVal || m.awayTeam.id === teamIdVal),
    )
    .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime())
    .slice(0, limit);

  return finished.map((m) => {
    const isHome = m.homeTeam.id === teamIdVal;
    const opponent = isHome ? m.awayTeam : m.homeTeam;
    const score = getMatchScoreAfter90(m);
    const result = resultForTeam(m, teamIdVal) ?? "D";
    return {
      date: new Date(m.utcDate).toLocaleDateString("ro-RO", {
        day: "numeric",
        month: "short",
      }),
      opponent: formatTeamDisplayName(opponent),
      score: score ? `${score.home}–${score.away}` : "—",
      result,
      isHome,
    };
  });
}

export function getTeamFormString(
  teamIdVal: number,
  allMatches: FootballDataMatch[],
  limit = 5,
): FormResult[] {
  return getTeamRecentMatches(teamIdVal, allMatches, limit).map((r) => r.result);
}

export function getHeadToHeadMatches(
  homeId: number,
  awayId: number,
  allMatches: FootballDataMatch[],
  limit = 5,
): H2HRow[] {
  const rows = allMatches
    .filter(
      (m) =>
        (m.status === "FINISHED" || m.status === "AWARDED") &&
        ((m.homeTeam.id === homeId && m.awayTeam.id === awayId) ||
          (m.homeTeam.id === awayId && m.awayTeam.id === homeId)),
    )
    .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime())
    .slice(0, limit);

  return rows.map((m) => {
    const score = getMatchScoreAfter90(m);
    return {
      date: new Date(m.utcDate).toLocaleDateString("ro-RO", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      home: formatTeamDisplayName(m.homeTeam),
      away: formatTeamDisplayName(m.awayTeam),
      score: score ? `${score.home}–${score.away}` : "—",
    };
  });
}
