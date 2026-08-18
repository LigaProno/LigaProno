/**
 * Scorul exact (90 min) trebuie să corespundă cu 1X2 de la final,
 * dacă ambele sunt completate.
 */
export function ftOutcomeFromScore(
  homeGoals: number,
  awayGoals: number,
): "HOME" | "DRAW" | "AWAY" {
  if (homeGoals > awayGoals) return "HOME";
  if (awayGoals > homeGoals) return "AWAY";
  return "DRAW";
}

export function isFtOutcomeConsistentWithExactScore(
  ftOutcome: string | null | undefined,
  homeGoals: number | null | undefined,
  awayGoals: number | null | undefined,
): boolean {
  if (ftOutcome !== "HOME" && ftOutcome !== "DRAW" && ftOutcome !== "AWAY") {
    return true;
  }
  if (
    homeGoals == null ||
    awayGoals == null ||
    !Number.isFinite(homeGoals) ||
    !Number.isFinite(awayGoals)
  ) {
    return true;
  }
  return ftOutcomeFromScore(homeGoals, awayGoals) === ftOutcome;
}
