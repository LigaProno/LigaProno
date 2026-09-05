import type { FootballDataMatch } from "@/lib/football-data-types";

/**
 * Suprascrieri manuale de oră de start (matchId -> utcDate ISO). Folosite când
 * Football-Data are data greșită (pe Superliga pune des 17:00Z pe ziua greșită)
 * sau meciul a fost reprogramat. Șterge intrarea după ce trece meciul.
 */
export const KICKOFF_OVERRIDES: Record<number, string> = {
  // Petrolul – Rapid: FD îl ține SCHEDULED pe 22.08 17:00Z (20:00 RO);
  // s-a jucat 21.08 20:30 RO (17:30Z).
  566734: "2026-08-21T17:30:00Z",
};

export function applyKickoffOverrides(
  matches: FootballDataMatch[],
): FootballDataMatch[] {
  return matches.map((m) => {
    const override = KICKOFF_OVERRIDES[m.id];
    return override ? { ...m, utcDate: override } : m;
  });
}
