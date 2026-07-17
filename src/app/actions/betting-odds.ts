"use server";

import { prisma } from "@/lib/prisma";
import { refreshOddsForCompetition } from "@/lib/refresh-competition-odds";
import { requireDbUser } from "@/lib/sync-clerk-user";
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
  const user = await requireDbUser();

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

  const competitionOdds = await prisma.competitionBettingOdds.findUnique({
    where: { competition: tournament.competition },
  });

  if (!canManualRefreshOddsToday(competitionOdds?.lastManualRefreshAt)) {
    throw new I18nError("errors.oddsOncePerDay");
  }

  const result = await refreshOddsForCompetition(tournament.competition);
  if (!result.ok) {
    throw new Error(result.error);
  }

  const now = new Date();
  await prisma.competitionBettingOdds.update({
    where: { competition: tournament.competition },
    data: { lastManualRefreshAt: now },
  });

  return {
    ok: true,
    matchCount: result.matchCount,
    teamCount: result.teamCount,
    oddsSource: result.oddsSource,
    usedFallback: result.usedFallback,
  };
}
