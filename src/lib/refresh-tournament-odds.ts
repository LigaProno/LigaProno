import { refreshOddsForCompetition } from "@/lib/refresh-competition-odds";
import { prisma } from "@/lib/prisma";

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

/** Delegă la snapshot-ul partajat al competiției (toate party-urile văd aceleași cote). */
export async function refreshOddsForTournament(
  tournamentId: string,
): Promise<RefreshOddsResult> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, competition: true },
  });

  if (!tournament) {
    return { ok: false, tournamentId, error: "Turneu inexistent." };
  }

  if (!tournament.competition) {
    return { ok: false, tournamentId, error: "Competiție nesetată." };
  }

  const result = await refreshOddsForCompetition(tournament.competition);
  if (!result.ok) {
    return { ok: false, tournamentId, error: result.error };
  }

  return {
    ok: true,
    tournamentId,
    matchCount: result.matchCount,
    teamCount: result.teamCount,
    oddsSource: result.oddsSource,
    usedFallback: result.usedFallback,
  };
}
