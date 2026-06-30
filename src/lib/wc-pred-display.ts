import type { FootballDataMatch, FootballDataTeam } from "@/lib/football-data";
import type { MatchPredictionInput } from "@/lib/wc-scoring";
import {
  formatKnockoutDeciderSuffix,
  getMatchScoreAfter90,
} from "@/lib/match-score";
import { isKnockoutStage } from "@/lib/knockout-predictions";

export function teamShort(t: FootballDataTeam | undefined): string {
  if (!t) return "?";
  return (t.tla ?? t.shortName ?? t.name ?? "?").trim() || "?";
}

export function hasAnyMatchPrediction(p: MatchPredictionInput | null | undefined): boolean {
  if (!p) return false;
  if (p.ftOutcome && p.ftOutcome !== "") return true;
  if (p.htOutcome && p.htOutcome !== "") return true;
  if (p.predHomeGoals != null && !Number.isNaN(Number(p.predHomeGoals))) return true;
  if (p.predAwayGoals != null && !Number.isNaN(Number(p.predAwayGoals))) return true;
  return false;
}

/** Rezumat pe un rând (legacy / tooltip). */
export function formatPredDetail(p: MatchPredictionInput | null | undefined): string {
  if (!p || !hasAnyMatchPrediction(p)) return "—";
  const bits: string[] = [];
  const hg = p.predHomeGoals;
  const ag = p.predAwayGoals;
  if (
    hg != null &&
    ag != null &&
    Number.isFinite(hg) &&
    Number.isFinite(ag) &&
    hg >= 0 &&
    ag >= 0
  ) {
    bits.push(`${hg}–${ag}`);
  } else if (p.ftOutcome) {
    bits.push(
      p.ftOutcome === "HOME" ? "FT home" : p.ftOutcome === "AWAY" ? "FT away" : "FT draw",
    );
  }
  if (p.htOutcome) {
    bits.push(
      p.htOutcome === "HOME" ? "HT home" : p.htOutcome === "AWAY" ? "HT away" : "HT draw",
    );
  }
  return bits.join(" · ") || "—";
}

function outcome1x2(o: string | null | undefined): string {
  if (o === "HOME") return "1";
  if (o === "DRAW") return "X";
  if (o === "AWAY") return "2";
  return "—";
}

export type MatchPredDisplay = {
  ht: string;
  ft: string;
  score: string;
};

/** Pauză: doar 1/X/2 din pronostic (nu există scor separat la pauză în app). */
export function formatPredHtPart(p: MatchPredictionInput | null | undefined): string {
  if (!p?.htOutcome) return "—";
  return outcome1x2(p.htOutcome);
}

/** Final 1X2 din pronostic (fără scor exact). */
export function formatPredFt1x2Part(p: MatchPredictionInput | null | undefined): string {
  if (!p?.ftOutcome) return "—";
  return outcome1x2(p.ftOutcome);
}

/** Scor exact din pronostic. */
export function formatPredScorePart(p: MatchPredictionInput | null | undefined): string {
  if (!p) return "—";
  const hg = p.predHomeGoals;
  const ag = p.predAwayGoals;
  if (
    hg != null &&
    ag != null &&
    Number.isFinite(hg) &&
    Number.isFinite(ag) &&
    hg >= 0 &&
    ag >= 0
  ) {
    return `${hg}–${ag}`;
  }
  return "—";
}

/** Cele trei părți ale pronosticului (pauză, final 1X2, scor exact). */
export function getMatchPredDisplay(
  p: MatchPredictionInput | null | undefined,
): MatchPredDisplay {
  if (!p || !hasAnyMatchPrediction(p)) {
    return { ht: "—", ft: "—", score: "—" };
  }
  return {
    ht: formatPredHtPart(p),
    ft: formatPredFt1x2Part(p),
    score: formatPredScorePart(p),
  };
}

/** Final: scor exact dacă e setat, altfel 1/X/2. */
export function formatPredFtPart(p: MatchPredictionInput | null | undefined): string {
  if (!p) return "—";
  const hg = p.predHomeGoals;
  const ag = p.predAwayGoals;
  if (
    hg != null &&
    ag != null &&
    Number.isFinite(hg) &&
    Number.isFinite(ag) &&
    hg >= 0 &&
    ag >= 0
  ) {
    return `${hg}–${ag}`;
  }
  if (p.ftOutcome) return outcome1x2(p.ftOutcome);
  return "—";
}

/** Scoruri oficiale din API (pauză / final după 90 de minute). */
export function matchResultHtFt(m: FootballDataMatch): { ht: string | null; ft: string | null } {
  const ht = m.score?.halfTime;
  const ft90 = getMatchScoreAfter90(m);
  const htStr =
    ht?.home != null && ht?.away != null ? `${ht.home}–${ht.away}` : null;
  const ftStr = ft90 ? `${ft90.home}–${ft90.away}` : null;
  return { ht: htStr, ft: ftStr };
}

/** Scor final 90' + eventual sufix prelungiri / penalty-uri. */
export function matchResultFtWithSuffix(
  m: FootballDataMatch,
  locale: "ro" | "en" = "ro",
): string | null {
  const ft90 = getMatchScoreAfter90(m);
  if (!ft90) return null;
  const base = `${ft90.home}–${ft90.away}`;
  const suffix = formatKnockoutDeciderSuffix(m, locale);
  return suffix ? `${base} (${suffix})` : base;
}

/** Rezumat scurt pentru leaderboard (scor sau 1/X/2). */
export function formatPredShort(p: MatchPredictionInput | null | undefined): string {
  if (!p || !hasAnyMatchPrediction(p)) return "—";
  const hg = p.predHomeGoals;
  const ag = p.predAwayGoals;
  if (
    hg != null &&
    ag != null &&
    Number.isFinite(hg) &&
    Number.isFinite(ag) &&
    hg >= 0 &&
    ag >= 0
  ) {
    return `${hg}-${ag}`;
  }
  if (p.ftOutcome === "HOME") return "1";
  if (p.ftOutcome === "DRAW") return "X";
  if (p.ftOutcome === "AWAY") return "2";
  if (p.htOutcome === "HOME") return "HT 1";
  if (p.htOutcome === "DRAW") return "HT X";
  if (p.htOutcome === "AWAY") return "HT 2";
  return "—";
}

export function formatActualFt(m: FootballDataMatch): string | null {
  const ft90 = getMatchScoreAfter90(m);
  if (!ft90) return null;
  return `${ft90.home}-${ft90.away}`;
}

export function formatPredAdvancingTeam(
  predAdvancingTeamId: number | null | undefined,
  m: FootballDataMatch,
): string | null {
  if (predAdvancingTeamId == null || !isKnockoutStage(m.stage)) return null;
  if (predAdvancingTeamId === m.homeTeam.id) {
    return teamShort(m.homeTeam);
  }
  if (predAdvancingTeamId === m.awayTeam.id) {
    return teamShort(m.awayTeam);
  }
  return `#${predAdvancingTeamId}`;
}

export function fixtureTlaPair(m: FootballDataMatch): string {
  return `${teamShort(m.homeTeam)}–${teamShort(m.awayTeam)}`;
}

export function championLabelFromTeams(
  championTeamId: number | null | undefined,
  teams: FootballDataTeam[],
): string | null {
  if (championTeamId == null || championTeamId <= 0) return null;
  const t = teams.find((x) => x.id === championTeamId);
  if (!t) return `#${championTeamId}`;
  return teamShort(t);
}

/** Ultimul meci terminat (cronologic) și următoarele 3 meciuri încă nedecise. */
export function lastFinishedAndNextThree(matches: FootballDataMatch[]): {
  lastFinished: FootballDataMatch | null;
  nextThree: FootballDataMatch[];
} {
  const finished = matches
    .filter((m) => m.status === "FINISHED")
    .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate));
  const lastFinished = finished[finished.length - 1] ?? null;

  const upcoming = matches
    .filter((m) => m.status !== "FINISHED")
    .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate))
    .slice(0, 3);

  return { lastFinished, nextThree: upcoming };
}
