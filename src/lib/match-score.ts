import type { FootballDataMatch, FootballDataScore } from "@/lib/football-data";
import { isKnockoutStage } from "@/lib/knockout-predictions";

type ScorePair = { home: number; away: number };

/** Scor după 90 de minute (regularTime); fallback la fullTime pentru faza grupelor. */
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

/** Text scurt pentru prelungiri / penalty-uri (ex. „a.p.”, „prel.”). */
export function formatKnockoutDeciderSuffix(
  m: FootballDataMatch,
  locale: "ro" | "en" = "ro",
): string | null {
  if (!isKnockoutStage(m.stage) || m.status !== "FINISHED") return null;
  const duration = m.score?.duration;
  if (duration === "PENALTY_SHOOTOUT") {
    const p = m.score?.penalties;
    if (p?.home != null && p?.away != null) {
      return locale === "ro" ?
          `a.p. ${p.home}–${p.away}`
        : `pens. ${p.home}–${p.away}`;
    }
    return locale === "ro" ? "a.p." : "pens.";
  }
  if (duration === "EXTRA_TIME") {
    return locale === "ro" ? "prel." : "a.e.t.";
  }
  return null;
}

/** Deduce echipa calificată din scorul pronosticat la 90 de minute. */
export function inferAdvancingTeamIdFromPredictedScore(
  predHomeGoals: number | null | undefined,
  predAwayGoals: number | null | undefined,
  homeTeamId: number | null | undefined,
  awayTeamId: number | null | undefined,
): number | null {
  if (
    predHomeGoals == null ||
    predAwayGoals == null ||
    homeTeamId == null ||
    awayTeamId == null
  ) {
    return null;
  }
  if (predHomeGoals > predAwayGoals) return homeTeamId;
  if (predAwayGoals > predHomeGoals) return awayTeamId;
  return null;
}
