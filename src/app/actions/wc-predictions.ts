"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  buildTeamIdToGroupKeyFromStandings,
  collectTeamsFromMatches,
  fetchCompetitionMatches,
  fetchCompetitionMatchesFresh,
  fetchPartyStandings,
  getWorldCupCompetitionPickerOptions,
} from "@/lib/football-data";
import { parseStoredCompetition } from "@/lib/competition";
import {
  getMatchPredictionLockReason,
  getPredictionLockMessage,
  isGroupStageMatchPredictable,
  isKnockoutMatchPredictable,
  isKnockoutStage,
} from "@/lib/knockout-predictions";
import { isCompetitionUnderway } from "@/lib/prediction-window";
import { outcomeFromScores } from "@/lib/wc-scoring";
import { I18nError } from "@/lib/i18n/errors";

function validOutcome(v: unknown): v is "HOME" | "AWAY" | "DRAW" | "" {
  return v === "HOME" || v === "AWAY" || v === "DRAW" || v === "";
}

async function assertWorldCupPickerValue(storageKey: string): Promise<string> {
  const t = storageKey.trim();
  const opts = await getWorldCupCompetitionPickerOptions();
  if (opts.length === 0) {
    throw new I18nError("errors.worldCupNotAvailable");
  }
  if (!opts.some((o) => o.storageKey === t)) {
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
    : await assertWorldCupPickerValue(competition);

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

async function isCompetitionUnderwayForStorage(
  competitionStorage: string | null,
): Promise<boolean> {
  const parsed = parseStoredCompetition(competitionStorage);
  if (!parsed) return false;
  try {
    const matches = await fetchCompetitionMatches(parsed.code, parsed.season);
    return isCompetitionUnderway(matches);
  } catch {
    return false;
  }
}

function sortedTeamIds(ids: number[]): number[] {
  return [...ids].sort((a, b) => a - b);
}

function wcExtraPredictionChanged(
  prev: {
    advancingTeamIds: number[];
    championTeamId: number | null;
  },
  next: {
    advancingTeamIds: number[];
    championTeamId: number | null;
  },
): boolean {
  const a = sortedTeamIds(prev.advancingTeamIds);
  const b = sortedTeamIds(next.advancingTeamIds);
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return true;
  }
  return prev.championTeamId !== next.championTeamId;
}

export async function saveWcMatchPrediction(
  tournamentId: string,
  matchId: number,
  input: {
    htOutcome?: string | null;
    ftOutcome?: string | null;
    predHomeGoals?: number | null;
    predAwayGoals?: number | null;
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

  const allowChanges = tournament.allowPredictionChangesDuringCompetition ?? false;
  const underway = isCompetitionUnderway(matches);
  const isKO = isKnockoutStage(match.stage);

  if (isKO) {
    if (!isKnockoutMatchPredictable(match)) {
      const reason = getMatchPredictionLockReason(match, underway, allowChanges);
      throw new Error(
        getPredictionLockMessage(reason ?? "ko_pending"),
      );
    }
  } else {
    if (underway && !allowChanges) {
      throw new Error(
        "Competiția a început. În acest turneu pronosticurile nu mai pot fi modificate.",
      );
    }
    if (!isGroupStageMatchPredictable(match, underway, allowChanges)) {
      const reason = getMatchPredictionLockReason(match, underway, allowChanges);
      throw new Error(
        getPredictionLockMessage(reason ?? "competition"),
      );
    }
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

  const existing = await prisma.wcMatchPrediction.findUnique({
    where: {
      tournamentId_userId_matchId: {
        tournamentId,
        userId: user.id,
        matchId,
      },
    },
  });

  const changed =
    !!existing &&
    (existing.htOutcome !== ht ||
      existing.ftOutcome !== ft ||
      existing.predHomeGoals !== predHomeGoals ||
      existing.predAwayGoals !== predAwayGoals);

  const applyChangePenalty =
    underway &&
    (tournament.allowPredictionChangesDuringCompetition ?? false) &&
    changed;

  await prisma.$transaction(async (tx) => {
    await tx.wcMatchPrediction.upsert({
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
      },
      update: {
        htOutcome: ht,
        ftOutcome: ft,
        predHomeGoals,
        predAwayGoals,
      },
    });
    if (applyChangePenalty) {
      await tx.tournamentMember.update({
        where: {
          tournamentId_userId: { tournamentId, userId: user.id },
        },
        data: {
          midCompetitionPredictionChangeCount: { increment: 1 },
        },
      });
    }
  });

}

export async function saveWcExtraPrediction(
  tournamentId: string,
  advancingTeamIds: number[],
  championTeamId: number | null,
): Promise<void> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Not authenticated.");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found.");

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament) throw new Error("Turneu negăsit.");
  const parsed = parseStoredCompetition(tournament.competition ?? null);
  if (!parsed) {
    throw new Error("Acest turneu nu are competiție activă pentru pronosticuri.");
  }

  await assertMember(tournamentId, user.id);

  const underway = await isCompetitionUnderwayForStorage(tournament.competition);
  if (underway && !(tournament.allowPredictionChangesDuringCompetition ?? false)) {
    throw new Error(
      "Competiția a început. În acest turneu pronosticurile nu mai pot fi modificate.",
    );
  }

  const seen = new Set<number>();
  const clean: number[] = [];
  for (const id of advancingTeamIds) {
    const n = Number(id);
    if (!Number.isInteger(n) || n <= 0 || seen.has(n)) continue;
    seen.add(n);
    clean.push(n);
  }

  let teamToGroup = new Map<number, string>();
  try {
    const matches = await fetchCompetitionMatches(parsed.code, parsed.season);
    const standings = await fetchPartyStandings(
      parsed.code,
      parsed.season,
      matches,
    );
    teamToGroup = buildTeamIdToGroupKeyFromStandings(standings);
  } catch {
    /* If fixture data is unavailable, skip server-side per-group cap. */
  }
  if (teamToGroup.size > 0) {
    const perGroup = new Map<string, number>();
    for (const id of clean) {
      const gk = teamToGroup.get(id);
      if (!gk) continue;
      perGroup.set(gk, (perGroup.get(gk) ?? 0) + 1);
    }
    for (const c of perGroup.values()) {
      if (c > 3) {
        throw new Error("You can save at most 3 teams from the same group.");
      }
    }
  }

  const champ =
    championTeamId != null &&
    Number.isInteger(championTeamId) &&
    championTeamId > 0 ?
      championTeamId
    : null;

  const existingExtra = await prisma.wcExtraPrediction.findUnique({
    where: {
      tournamentId_userId: { tournamentId, userId: user.id },
    },
  });

  const nextExtra = { advancingTeamIds: clean, championTeamId: champ };
  const changed =
    !!existingExtra &&
    wcExtraPredictionChanged(
      {
        advancingTeamIds: existingExtra.advancingTeamIds,
        championTeamId: existingExtra.championTeamId,
      },
      nextExtra,
    );

  const applyChangePenalty =
    underway &&
    (tournament.allowPredictionChangesDuringCompetition ?? false) &&
    changed;

  await prisma.$transaction(async (tx) => {
    await tx.wcExtraPrediction.upsert({
      where: {
        tournamentId_userId: { tournamentId, userId: user.id },
      },
      create: {
        tournamentId,
        userId: user.id,
        advancingTeamIds: clean,
        championTeamId: champ,
      },
      update: {
        advancingTeamIds: clean,
        championTeamId: champ,
      },
    });
    if (applyChangePenalty) {
      await tx.tournamentMember.update({
        where: {
          tournamentId_userId: { tournamentId, userId: user.id },
        },
        data: {
          midCompetitionPredictionChangeCount: { increment: 1 },
        },
      });
    }
  });

}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

function randInt(maxInclusive: number): number {
  return Math.floor(Math.random() * (maxInclusive + 1));
}

/**
 * Doar în development: umple pronosticuri aleatoare (meciuri + extras) pentru
 * utilizatorul curent, când party-ul e pe Champions League (cod API `CL`).
 */
export async function simulateRandomClPredictionsForMe(
  tournamentId: string,
): Promise<{ matchCount: number; advancingCount: number }> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Simulator is only available in development.");
  }

  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Not authenticated.");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found.");

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  const parsed = parseStoredCompetition(tournament?.competition ?? null);
  if (!parsed) {
    throw new Error("Acest turneu nu are competiție activă.");
  }
  if (parsed.code !== "CL") {
    throw new Error(
      "Simulatorul funcționează doar când competiția turneului e Champions League (CL).",
    );
  }

  await assertMember(tournamentId, user.id);

  const matches = await fetchCompetitionMatches(parsed.code, parsed.season);
  if (matches.length === 0) {
    throw new Error("No matches returned for this Champions League season.");
  }

  const standings = await fetchPartyStandings(
    parsed.code,
    parsed.season,
    matches,
  );

  for (const m of matches) {
    const predHomeGoals = randInt(4);
    const predAwayGoals = randInt(4);
    const htH = randInt(3);
    const htA = randInt(3);
    const ft = outcomeFromScores(predHomeGoals, predAwayGoals);
    const ht = outcomeFromScores(htH, htA);

    await prisma.wcMatchPrediction.upsert({
      where: {
        tournamentId_userId_matchId: {
          tournamentId,
          userId: user.id,
          matchId: m.id,
        },
      },
      create: {
        tournamentId,
        userId: user.id,
        matchId: m.id,
        htOutcome: ht,
        ftOutcome: ft,
        predHomeGoals,
        predAwayGoals,
      },
      update: {
        htOutcome: ht,
        ftOutcome: ft,
        predHomeGoals,
        predAwayGoals,
      },
    });
  }

  const advancing: number[] = [];
  const seen = new Set<number>();
  for (const g of standings) {
    const ids = g.rows
      .map((r) => r.team?.id)
      .filter((id): id is number => id != null);
    shuffleInPlace(ids);
    const cap = Math.min(3, Math.max(1, ids.length));
    const n = ids.length === 0 ? 0 : 1 + randInt(cap - 1);
    for (let i = 0; i < n && i < ids.length; i++) {
      const id = ids[i]!;
      if (!seen.has(id)) {
        seen.add(id);
        advancing.push(id);
      }
    }
  }

  const teams = collectTeamsFromMatches(matches).filter((t) => t.id != null);
  const championTeamId =
    teams.length > 0 ? teams[randInt(teams.length - 1)]!.id! : null;

  await prisma.wcExtraPrediction.upsert({
    where: {
      tournamentId_userId: { tournamentId, userId: user.id },
    },
    create: {
      tournamentId,
      userId: user.id,
      advancingTeamIds: advancing,
      championTeamId,
    },
    update: {
      advancingTeamIds: advancing,
      championTeamId,
    },
  });

  revalidatePath("/turnee");
  revalidatePath("/turnee/clasament");
  revalidatePath(`/turnee/${tournamentId}`);
  revalidatePath(`/turnee/${tournamentId}/member/${user.id}`);

  return { matchCount: matches.length, advancingCount: advancing.length };
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
