import type { FootballDataMatch } from "@/lib/football-data";

export function isKnockoutStage(stage: string | undefined): boolean {
  return !!stage && stage !== "GROUP_STAGE" && stage !== "REGULAR_SEASON";
}

export type PredictionLockedReason =
  | "finished"
  | "kickoff";

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

export function getMatchPredictionLockReason(
  match: FootballDataMatch,
  now = new Date(),
): PredictionLockedReason | null {
  if (match.status === "FINISHED") return "finished";
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
  }
}
