import { refreshOddsForCompetition } from "@/lib/refresh-competition-odds";
import { prisma } from "@/lib/prisma";
import { resolveTournamentCompetitionKeys } from "@/lib/tournament-competition";

export type RefreshOddsResult =
  | {
      ok: true;
      tournamentId: string;
      matchCount: number;
      teamCount: number;
      oddsSource: string;
      usedFallback: boolean;
    }
  | { ok: false; tournamentId: string; error: string };

/** Delegă la snapshot-urile partajate ale competițiilor turneului. */
export async function refreshOddsForTournament(
  tournamentId: string,
): Promise<RefreshOddsResult> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, competition: true, competitions: true },
  });

  if (!tournament) {
    return { ok: false, tournamentId, error: "Turneu inexistent." };
  }

  const keys = resolveTournamentCompetitionKeys(tournament);
  if (keys.length === 0) {
    return { ok: false, tournamentId, error: "Competiție nesetată." };
  }

  let matchCount = 0;
  let teamCount = 0;
  let oddsSource = "";
  let usedFallback = false;
  const errors: string[] = [];

  for (const key of keys) {
    const result = await refreshOddsForCompetition(key);
    if (!result.ok) {
      errors.push(`${key}: ${result.error}`);
      continue;
    }
    matchCount += result.matchCount;
    teamCount += result.teamCount;
    oddsSource = result.oddsSource;
    usedFallback = usedFallback || result.usedFallback;
  }

  if (errors.length > 0 && matchCount === 0) {
    return { ok: false, tournamentId, error: errors.join("; ") };
  }

  return {
    ok: true,
    tournamentId,
    matchCount,
    teamCount,
    oddsSource,
    usedFallback,
  };
}
