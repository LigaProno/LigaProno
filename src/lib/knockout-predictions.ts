import type { FootballDataMatch, FootballDataTeam } from "@/lib/football-data";
import { areAllGroupStageMatchesFinished } from "@/lib/wc-scoring";

const PLACEHOLDER_PATTERNS = [
  /\bwinner\b/i,
  /\brunner[\s-]?up\b/i,
  /\bloser\b/i,
  /\btbd\b/i,
  /^\d[A-L]$/i,
  /^[12](?:st|nd)\s/i,
  /^w\s*\//i,
  /^l\s*\//i,
];

export type PredictionLockedReason =
  | "finished"
  | "competition"
  | "ko_pending"
  | "kickoff";

/** Echipă placeholder din API (Winner Group A, TBD, 1A, etc.). */
export function isPlaceholderTeam(team: FootballDataTeam): boolean {
  if (team.id === undefined || team.id === null) return true;
  const names = [team.name, team.shortName, team.tla].filter(Boolean) as string[];
  if (names.length === 0) return true;
  for (const n of names) {
    const trimmed = n.trim();
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (pattern.test(trimmed)) return true;
    }
  }
  return false;
}

export function isKnockoutStage(stage: string | undefined): boolean {
  return !!stage && stage !== "GROUP_STAGE";
}

/** Ambele echipe reale, nu placeholder. */
export function isKnockoutMatchTeamsKnown(match: FootballDataMatch): boolean {
  return (
    !isPlaceholderTeam(match.homeTeam) && !isPlaceholderTeam(match.awayTeam)
  );
}

export function isMatchKickoffPassed(
  match: FootballDataMatch,
  now = new Date(),
): boolean {
  const st = match.status;
  if (
    st === "IN_PLAY" ||
    st === "PAUSED" ||
    st === "FINISHED" ||
    st === "AWARDED"
  ) {
    return true;
  }
  const kick = Date.parse(match.utcDate);
  return !Number.isNaN(kick) && kick <= now.getTime();
}

function collectLast32TeamIds(matches: FootballDataMatch[]): Set<number> {
  const last32 = new Set<number>();
  for (const m of matches) {
    if (m.stage !== "LAST_32") continue;
    const hid = m.homeTeam?.id;
    const aid = m.awayTeam?.id;
    if (hid !== undefined) last32.add(hid);
    if (aid !== undefined) last32.add(aid);
  }
  return last32;
}

/** Faza eliminatorie deblocată global (grupe terminate sau bracket LAST_32 complet). */
export function areKnockoutPredictionsUnlocked(
  matches: FootballDataMatch[],
): boolean {
  const last32 = collectLast32TeamIds(matches);
  if (last32.size >= 32) return true;
  return areAllGroupStageMatchesFinished(matches);
}

/** Meci KO predictibil: echipe cunoscute + meciul nu a început. */
export function isKnockoutMatchPredictable(
  match: FootballDataMatch,
  now = new Date(),
): boolean {
  if (!isKnockoutStage(match.stage)) return false;
  if (!isKnockoutMatchTeamsKnown(match)) return false;
  if (match.status === "FINISHED") return false;
  if (isMatchKickoffPassed(match, now)) return false;
  return true;
}

/** Meci de grupă predictibil sub regula globală a competiției. */
export function isGroupStageMatchPredictable(
  match: FootballDataMatch,
  competitionUnderway: boolean,
  allowChanges: boolean,
  now = new Date(),
): boolean {
  if (match.stage && match.stage !== "GROUP_STAGE") return false;
  if (match.status === "FINISHED") return false;
  if (isMatchKickoffPassed(match, now)) return false;
  if (competitionUnderway && !allowChanges) return false;
  return true;
}

export function getMatchPredictionLockReason(
  match: FootballDataMatch,
  competitionUnderway: boolean,
  allowChanges: boolean,
  now = new Date(),
): PredictionLockedReason | null {
  if (match.status === "FINISHED") return "finished";

  if (isKnockoutStage(match.stage)) {
    if (!isKnockoutMatchTeamsKnown(match)) return "ko_pending";
    if (isMatchKickoffPassed(match, now)) return "kickoff";
    return null;
  }

  if (isMatchKickoffPassed(match, now)) return "kickoff";
  if (competitionUnderway && !allowChanges) return "competition";
  return null;
}

export function getPredictionLockMessage(
  reason: PredictionLockedReason,
): string {
  switch (reason) {
    case "finished":
      return "Meciul s-a încheiat — pronosticul nu mai poate fi modificat.";
    case "competition":
      return "Pronosticurile sunt blocate după startul competiției.";
    case "ko_pending":
      return "Echipele se vor stabili după încheierea fazei grupelor sau a rundei anterioare.";
    case "kickoff":
      return "Meciul a început — pronosticul nu mai poate fi modificat.";
  }
}

/** Număr meciuri KO predictibile dintr-o listă. */
export function countPredictableKnockoutMatches(
  matches: FootballDataMatch[],
  now = new Date(),
): { predictable: number; total: number } {
  const ko = matches.filter((m) => isKnockoutStage(m.stage));
  const predictable = ko.filter((m) => isKnockoutMatchPredictable(m, now)).length;
  return { predictable, total: ko.length };
}
