import type { FootballDataMatch, FootballDataTeam } from "@/lib/football-data";
import type { MatchPredictionInput } from "@/lib/wc-scoring";
import { getMatchScoreAfter90 } from "@/lib/match-score";
import { formatTeamDisplayName } from "@/lib/team-display";

function isKnockoutStageLocal(stage: string | undefined): boolean {
  return !!stage && stage !== "GROUP_STAGE" && stage !== "REGULAR_SEASON";
}

function formatKnockoutDeciderSuffix(
  m: FootballDataMatch,
  locale: "ro" | "en" = "ro",
): string | null {
  if (!isKnockoutStageLocal(m.stage) || m.status !== "FINISHED") return null;
  const duration = m.score?.duration;
  if (duration === "PENALTY_SHOOTOUT") {
    const p = m.score?.penalties;
    if (p?.home != null && p?.away != null) {
      return locale === "ro" ? `a.p. ${p.home}–${p.away}` : `pens. ${p.home}–${p.away}`;
    }
    return locale === "ro" ? "a.p." : "pens.";
  }
  if (duration === "EXTRA_TIME") {
    return locale === "ro" ? "prel." : "a.e.t.";
  }
  return null;
}

export function matchResultFtWithSuffix(
  m: FootballDataMatch,
  locale: "ro" | "en" = "ro",
): string | null {
  const ft90 = getMatchScoreAfter90(m);
  if (!ft90) return null;
  const suffix = formatKnockoutDeciderSuffix(m, locale);
  const base = `${ft90.home}–${ft90.away}`;
  return suffix ? `${base} (${suffix})` : base;
}

export function teamShort(t: FootballDataTeam | undefined): string {
  return formatTeamDisplayName(t);
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

export function fixtureTlaPair(m: FootballDataMatch): string {
  return `${teamShort(m.homeTeam)}–${teamShort(m.awayTeam)}`;
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

/**
 * Fereastră glisantă în jurul „acum": ultimele `prev` meciuri terminate +
 * următoarele `next` meciuri nedecise, în ordine cronologică. Folosită pentru
 * panoul cu pronosticurile tuturor, ca să nu arate toată etapa deodată.
 */
export function recentAndUpcomingMatches(
  matches: FootballDataMatch[],
  prev: number,
  next: number,
): FootballDataMatch[] {
  const isDone = (m: FootballDataMatch) => m.status === "FINISHED" || m.status === "AWARDED";

  const finished = matches
    .filter(isDone)
    .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate))
    .slice(-prev);

  const upcoming = matches
    .filter((m) => !isDone(m))
    .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate))
    .slice(0, next);

  return [...finished, ...upcoming];
}

/** Etapa curentă: prima etapă cu meciuri nedecise; altfel ultima etapă. */
export function resolveCurrentMatchday(matches: FootballDataMatch[]): number {
  const byMatchday = new Map<number, FootballDataMatch[]>();
  for (const m of matches) {
    const md = m.matchday ?? 0;
    if (md > 0) {
      if (!byMatchday.has(md)) byMatchday.set(md, []);
      byMatchday.get(md)!.push(m);
    }
  }
  const sorted = [...byMatchday.keys()].sort((a, b) => a - b);
  for (const md of sorted) {
    const mdMatches = byMatchday.get(md)!;
    if (mdMatches.some((m) => m.status !== "FINISHED" && m.status !== "AWARDED")) {
      return md;
    }
  }
  return sorted[sorted.length - 1] ?? 1;
}

export function matchesForMatchday(
  matches: FootballDataMatch[],
  matchday: number,
): FootballDataMatch[] {
  return matches
    .filter((m) => (m.matchday ?? 0) === matchday)
    .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate));
}

export type TournamentMatchdayWindow = {
  startMatchday: number;
  endMatchday: number;
};

export type TournamentMatchdayFields = {
  startMatchday: number | null;
  endMatchday: number | null;
};

/** Prima etapă cu meciuri nedecise (folosită ca start la crearea turneului). */
export function resolveFirstUpcomingMatchday(matches: FootballDataMatch[]): number {
  return resolveCurrentMatchday(matches);
}

/**
 * Fereastra de etape a turneului.
 * null = întreg sezonul. Suportă date vechi unde endMatchday era salvat ca număr de etape.
 */
export function resolveTournamentMatchdayWindow(
  tournament: TournamentMatchdayFields,
  matches: FootballDataMatch[],
): TournamentMatchdayWindow | null {
  const { startMatchday, endMatchday } = tournament;

  if (startMatchday == null && endMatchday == null) return null;

  if (startMatchday != null && endMatchday != null) {
    return { startMatchday, endMatchday };
  }

  // Legacy: endMatchday = număr de etape, startMatchday nesetat
  if (startMatchday == null && endMatchday != null && endMatchday > 0) {
    const start = resolveFirstUpcomingMatchday(matches);
    return { startMatchday: start, endMatchday: start + endMatchday - 1 };
  }

  if (startMatchday != null) {
    const maxMd = Math.max(
      startMatchday,
      ...matches.map((m) => m.matchday ?? 0).filter((md) => md > 0),
    );
    return { startMatchday, endMatchday: maxMd };
  }

  return null;
}

export function filterMatchesForTournament(
  matches: FootballDataMatch[],
  tournament: TournamentMatchdayFields,
): FootballDataMatch[] {
  const window = resolveTournamentMatchdayWindow(tournament, matches);
  if (!window) return matches;
  return matches.filter((m) => {
    const md = m.matchday ?? 0;
    return md >= window.startMatchday && md <= window.endMatchday;
  });
}

export function isMatchInTournamentWindow(
  match: FootballDataMatch,
  tournament: TournamentMatchdayFields,
  allMatches: FootballDataMatch[],
): boolean {
  const window = resolveTournamentMatchdayWindow(tournament, allMatches);
  if (!window) return true;
  const md = match.matchday ?? 0;
  return md >= window.startMatchday && md <= window.endMatchday;
}
