import type { FootballDataMatch, FootballDataScore } from "@/lib/football-data";

type ScorePair = { home: number; away: number };

export function getScoreAfter90Minutes(
  score: FootballDataScore | null | undefined,
): ScorePair | null {
  if (!score) return null;
  const rt = score.regularTime;
  if (rt?.home != null && rt?.away != null) {
    return { home: rt.home, away: rt.away };
  }
  const ft = score.fullTime;
  if (ft?.home != null && ft?.away != null) {
    return { home: ft.home, away: ft.away };
  }
  return null;
}

export function getMatchScoreAfter90(m: FootballDataMatch): ScorePair | null {
  return getScoreAfter90Minutes(m.score);
}

/** Echipa care avansează în fazele eliminatorii (după prelungiri / penalty-uri). */
export function getMatchAdvancingTeamId(m: FootballDataMatch): number | null {
  const w = m.score?.winner;
  if (w === "HOME_TEAM" && m.homeTeam.id != null) return m.homeTeam.id;
  if (w === "AWAY_TEAM" && m.awayTeam.id != null) return m.awayTeam.id;

  const ft90 = getMatchScoreAfter90(m);
  if (!ft90) return null;
  if (ft90.home > ft90.away && m.homeTeam.id != null) return m.homeTeam.id;
  if (ft90.away > ft90.home && m.awayTeam.id != null) return m.awayTeam.id;
  return null;
}
