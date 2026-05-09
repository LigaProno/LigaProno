"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { parseStoredCompetition } from "@/lib/competition";
import { collectTeamsFromMatches, fetchCompetitionMatches } from "@/lib/football-data";
import {
  sanitizeBettingPayload,
  type BettingOddsPayload,
} from "@/lib/betting-odds";
import { fetchBettingOddsViaGemini } from "@/lib/gemini-odds-fetch";
import { prisma } from "@/lib/prisma";

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

  const parsed = parseStoredCompetition(tournament.competition);
  if (!parsed) {
    throw new Error("Setează mai întâi o competiție pentru acest party.");
  }

  const matches = await fetchCompetitionMatches(parsed.code, parsed.season);
  const allTeams = collectTeamsFromMatches(matches);
  const teams = allTeams
    .filter((t) => t.id != null)
    .map((t) => ({
      id: t.id!,
      name: t.name ?? t.shortName ?? `Team ${t.id}`,
    }));

  const competitionLabel = `${parsed.code} ${parsed.season}`;

  const { payload: rawPayload, model, usedGoogleSearch } =
    await fetchBettingOddsViaGemini(competitionLabel, matches, teams);
  const payload: BettingOddsPayload = sanitizeBettingPayload(rawPayload);

  await prisma.tournamentBettingOdds.upsert({
    where: { tournamentId },
    create: {
      tournamentId,
      payload: payload as object,
      geminiModel: model,
    },
    update: {
      payload: payload as object,
      geminiModel: model,
      fetchedAt: new Date(),
    },
  });

  revalidatePath("/party");
  revalidatePath(`/party/${tournamentId}`);

  return {
    ok: true,
    matchCount: Object.keys(payload.matches).length,
    teamCount: Object.keys(payload.teams).length,
    model,
    usedGoogleSearch,
  };
}
