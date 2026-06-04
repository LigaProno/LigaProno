"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { refreshOddsForTournament } from "@/lib/refresh-tournament-odds";

export async function refreshTournamentBettingOdds(
  tournamentId: string,
): Promise<{
  ok: true;
  matchCount: number;
  teamCount: number;
  model: string;
  usedGoogleSearch: boolean;
}> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Nu ești autentificat.");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("Utilizator inexistent.");

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Party inexistent.");
  if (tournament.creatorId !== user.id) {
    throw new Error("Doar creatorul party-ului poate actualiza cotele.");
  }

  if (!tournament.competition) {
    throw new Error("Setează mai întâi o competiție pentru acest party.");
  }

  const result = await refreshOddsForTournament(tournamentId);
  if (!result.ok) {
    throw new Error(result.error);
  }

  return {
    ok: true,
    matchCount: result.matchCount,
    teamCount: result.teamCount,
    model: result.model,
    usedGoogleSearch: result.usedGoogleSearch,
  };
}
