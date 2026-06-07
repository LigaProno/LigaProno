"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { refreshOddsForTournament } from "@/lib/refresh-tournament-odds";
import { canManualRefreshOddsToday } from "@/lib/odds-refresh-limit";
import { I18nError } from "@/lib/i18n/errors";

export async function refreshTournamentBettingOdds(
  tournamentId: string,
): Promise<{
  ok: true;
  matchCount: number;
  teamCount: number;
  oddsSource: string;
  usedFallback: boolean;
}> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new I18nError("errors.notAuthenticated");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new I18nError("errors.userNotFound");

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new I18nError("errors.tournamentNotFound");
  if (tournament.creatorId !== user.id) {
    throw new I18nError("errors.onlyCreatorOdds");
  }

  if (!tournament.competition) {
    throw new I18nError("errors.competitionRequiredForOdds");
  }

  if (!canManualRefreshOddsToday(tournament.lastManualOddsRefreshAt)) {
    throw new I18nError("errors.oddsOncePerDay");
  }

  const result = await refreshOddsForTournament(tournamentId);
  if (!result.ok) {
    throw new Error(result.error);
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { lastManualOddsRefreshAt: new Date() },
  });

  return {
    ok: true,
    matchCount: result.matchCount,
    teamCount: result.teamCount,
    oddsSource: result.oddsSource,
    usedFallback: result.usedFallback,
  };
}
