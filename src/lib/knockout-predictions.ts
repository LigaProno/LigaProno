import type { FootballDataMatch } from "@/lib/football-data-types";
import {
  isMatchCancelled,
  isMatchEffectivelyPostponed,
  isMatchLiveOrFinished,
  isMatchSettled,
} from "@/lib/match-status";

export function isKnockoutStage(stage: string | undefined): boolean {
  return !!stage && stage !== "GROUP_STAGE" && stage !== "REGULAR_SEASON";
}

export type PredictionLockedReason =
  | "finished"
  | "kickoff"
  | "cancelled";

/**
 * Kickoff „trecut” pentru blocarea pronosticurilor.
 * Amânat (oficial sau de facto): NU se blochează pe data veche — rămâne editabil
 * până la noul kickoff. Anulatul are lock dedicat.
 */
export function isMatchKickoffPassed(
  match: FootballDataMatch,
  now = new Date(),
): boolean {
  if (isMatchCancelled(match)) return false;
  if (isMatchEffectivelyPostponed(match, now.getTime())) return false;
  if (isMatchLiveOrFinished(match)) return true;
  const kick = Date.parse(match.utcDate);
  return !Number.isNaN(kick) && kick <= now.getTime();
}

export function getMatchPredictionLockReason(
  match: FootballDataMatch,
  now = new Date(),
): PredictionLockedReason | null {
  if (isMatchSettled(match)) return "finished";
  if (isMatchCancelled(match)) return "cancelled";
  if (isMatchKickoffPassed(match, now)) return "kickoff";
  return null;
}

export function getPredictionLockMessage(
  reason: PredictionLockedReason,
): string {
  switch (reason) {
    case "finished":
      return "Meciul s-a încheiat — pronosticul nu mai poate fi modificat.";
    case "kickoff":
      return "Meciul a început — pronosticul nu mai poate fi modificat.";
    case "cancelled":
      return "Meciul a fost anulat — pronosticul nu mai poate fi modificat.";
  }
}
