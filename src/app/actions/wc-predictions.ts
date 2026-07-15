"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  fetchCompetitionMatches,
  fetchCompetitionMatchesFresh,
} from "@/lib/football-data";
import { parseStoredCompetition, COMPETITION_PICKER_OPTIONS } from "@/lib/competition";
import {
  getMatchPredictionLockReason,
  getPredictionLockMessage,
} from "@/lib/knockout-predictions";
import { isMatchInTournamentWindow } from "@/lib/wc-pred-display";
import { I18nError } from "@/lib/i18n/errors";

function validOutcome(v: unknown): v is "HOME" | "AWAY" | "DRAW" | "" {
  return v === "HOME" || v === "AWAY" || v === "DRAW" || v === "";
}

function assertPickerValue(storageKey: string): string {
  const t = storageKey.trim();
  if (!COMPETITION_PICKER_OPTIONS.some((o) => o.storageKey === t)) {
    throw new I18nError("errors.invalidCompetition");
  }
  return t;
}

export async function setTournamentCompetition(
  tournamentId: string,
  competition: string | null,
): Promise<void> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new I18nError("errors.notAuthenticated");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new I18nError("errors.userNotFound");

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new I18nError("errors.tournamentNotFound");
  if (tournament.creatorId !== user.id) {
    throw new I18nError("errors.onlyCreatorCompetition");
  }

  if (tournament.competition != null && tournament.competition.trim() !== "") {
    throw new I18nError("errors.competitionImmutable");
  }

  const next =
    competition == null || competition.trim() === "" ?
      null
    : assertPickerValue(competition);

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { competition: next },
  });

  revalidatePath("/turnee");
  revalidatePath("/turnee/clasament");
  revalidatePath(`/turnee/${tournamentId}`);
}

async function assertMember(tournamentId: string, userId: string) {
  const m = await prisma.tournamentMember.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
  });
  if (!m) throw new Error("Nu ești membru al acestui turneu.");
}

export async function saveWcMatchPrediction(
  tournamentId: string,
  matchId: number,
  input: {
    htOutcome?: string | null;
    ftOutcome?: string | null;
    predHomeGoals?: number | null;
    predAwayGoals?: number | null;
    predAdvancingTeamId?: null;
  },
): Promise<void> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Not authenticated.");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found.");

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Turneu negăsit.");
  if (!parseStoredCompetition(tournament.competition ?? null)) {
    throw new Error("Acest turneu nu are competiție activă pentru pronosticuri.");
  }

  await assertMember(tournamentId, user.id);

  const parsed = parseStoredCompetition(tournament.competition ?? null);
  if (!parsed) {
    throw new Error("Acest turneu nu are competiție activă pentru pronosticuri.");
  }

  const matches = await fetchCompetitionMatches(parsed.code, parsed.season);
  const match = matches.find((m) => m.id === matchId);
  if (!match) {
    throw new Error("Meciul nu a fost găsit în programul competiției.");
  }

  if (!isMatchInTournamentWindow(match, tournament, matches)) {
    throw new Error("Acest meci nu face parte din etapele turneului.");
  }

  const reason = getMatchPredictionLockReason(match);
  if (reason) {
    throw new Error(getPredictionLockMessage(reason));
  }

  const ht =
    input.htOutcome != null && input.htOutcome !== "" ?
      input.htOutcome
    : null;
  const ft =
    input.ftOutcome != null && input.ftOutcome !== "" ?
      input.ftOutcome
    : null;

  if (ht !== null && !validOutcome(ht)) throw new Error("Invalid half-time outcome.");
  if (ft !== null && !validOutcome(ft)) throw new Error("Invalid full-time outcome.");

  let predHomeGoals =
    input.predHomeGoals !== undefined && input.predHomeGoals !== null ?
      Number(input.predHomeGoals)
    : null;
  let predAwayGoals =
    input.predAwayGoals !== undefined && input.predAwayGoals !== null ?
      Number(input.predAwayGoals)
    : null;

  if (predHomeGoals !== null && (Number.isNaN(predHomeGoals) || predHomeGoals < 0)) {
    predHomeGoals = null;
  }
  if (predAwayGoals !== null && (Number.isNaN(predAwayGoals) || predAwayGoals < 0)) {
    predAwayGoals = null;
  }

  await prisma.wcMatchPrediction.upsert({
    where: {
      tournamentId_userId_matchId: {
        tournamentId,
        userId: user.id,
        matchId,
      },
    },
    create: {
      tournamentId,
      userId: user.id,
      matchId,
      htOutcome: ht,
      ftOutcome: ft,
      predHomeGoals,
      predAwayGoals,
      predAdvancingTeamId: null,
    },
    update: {
      htOutcome: ht,
      ftOutcome: ft,
      predHomeGoals,
      predAwayGoals,
      predAdvancingTeamId: null,
    },
  });
}

/** Reîncarcă meciurile din API (fără cache) și invalidează pagina turneului. */
export async function refreshTournamentMatches(
  tournamentId: string,
): Promise<{ matchCount: number }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Not authenticated.");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found.");

  await assertMember(tournamentId, user.id);

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Turneu negăsit.");

  const parsed = parseStoredCompetition(tournament.competition ?? null);
  if (!parsed) {
    throw new Error("Acest turneu nu are competiție activă.");
  }

  const matches = await fetchCompetitionMatchesFresh(parsed.code, parsed.season);

  revalidatePath(`/turnee/${tournamentId}`);
  revalidatePath(`/turnee/${tournamentId}/member/${user.id}`);

  return { matchCount: matches.length };
}
