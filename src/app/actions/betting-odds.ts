"use server";

import { prisma } from "@/lib/prisma";
import { refreshOddsForCompetition } from "@/lib/refresh-competition-odds";
import { requireDbUser } from "@/lib/sync-clerk-user";
import { canManualRefreshOddsToday } from "@/lib/odds-refresh-limit";
import { I18nError } from "@/lib/i18n/errors";
import { resolveTournamentCompetitionKeys } from "@/lib/tournament-matches";
import { loadTournamentOddsSnapshot } from "@/lib/competition-odds";

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

  const keys = resolveTournamentCompetitionKeys(tournament);
  if (keys.length === 0) {
    throw new I18nError("errors.competitionRequiredForOdds");
  }

  const oddsSnapshot = await loadTournamentOddsSnapshot(keys);
  if (!canManualRefreshOddsToday(oddsSnapshot?.lastManualRefreshAt ?? null)) {
    throw new I18nError("errors.oddsOncePerDay");
  }

  let matchCount = 0;
  let teamCount = 0;
  let oddsSource = "";
  let usedFallback = false;

  for (const key of keys) {
    const result = await refreshOddsForCompetition(key);
    if (!result.ok) {
      throw new Error(result.error);
    }
    matchCount += result.matchCount;
    teamCount += result.teamCount;
    oddsSource = result.oddsSource;
    usedFallback = usedFallback || result.usedFallback;
  }

  const now = new Date();
  await Promise.all(
    keys.map((competition) =>
      prisma.competitionBettingOdds.updateMany({
        where: { competition },
        data: { lastManualRefreshAt: now },
      }),
    ),
  );

  return {
    ok: true,
    matchCount,
    teamCount,
    oddsSource,
    usedFallback,
  };
}
