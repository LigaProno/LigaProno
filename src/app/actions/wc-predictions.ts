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
} from "@/lib/football-data";
import { parseStoredCompetition, COMPETITION_PICKER_OPTIONS } from "@/lib/competition";
import {
  getMatchPredictionLockReason,
  getPredictionLockMessage,
  isGroupStageMatchPredictable,
  isKnockoutMatchPredictable,
  isKnockoutStage,
} from "@/lib/knockout-predictions";
import {
  isCompetitionUnderway,
  isMidCompetitionPredictionChangesAllowed,
  shouldApplyMidCompetitionChangePenalty,
} from "@/lib/prediction-window";
import {
  inferAdvancingTeamIdFromPredictedScore,
} from "@/lib/match-score";
import {
  outcomeFromScores,
  validateWcAdvancingTeamIds,
  type WcQualifierValidationError,
} from "@/lib/wc-scoring";
import { I18nError } from "@/lib/i18n/errors";

export type WcExtraSaveScope = "qualifiers" | "champion";

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

function throwWcQualifierError(code: WcQualifierValidationError): never {
  switch (code) {
    case "max_per_group":
      throw new Error("You can save at most 3 teams from the same group.");
    case "min_per_group":
      throw new Error("You must pick at least 2 teams from each group.");
    case "max_total":
      throw new Error("You can pick at most 32 teams in total.");
    case "exact_total":
      throw new Error("You must pick exactly 32 teams in total.");
  }
}

function assertMaxThreePerGroup(
  teamIds: number[],
  teamToGroup: Map<number, string>,
): void {
  const perGroup = new Map<string, number>();
  for (const id of teamIds) {
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
    predAdvancingTeamId?: number | null;
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

  const tournamentAllowChanges =
    tournament.allowPredictionChangesDuringCompetition ?? false;
  const allowChanges = isMidCompetitionPredictionChangesAllowed(
    tournamentAllowChanges,
  );
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

  let predAdvancingTeamId =
    input.predAdvancingTeamId !== undefined && input.predAdvancingTeamId !== null ?
      Number(input.predAdvancingTeamId)
    : null;
  if (predAdvancingTeamId != null && Number.isNaN(predAdvancingTeamId)) {
    predAdvancingTeamId = null;
  }

  if (isKO) {
    const inferred = inferAdvancingTeamIdFromPredictedScore(
      predHomeGoals,
      predAwayGoals,
      match.homeTeam.id,
      match.awayTeam.id,
    );
    if (inferred != null) {
      predAdvancingTeamId = inferred;
    }
    const homeId = match.homeTeam.id;
    const awayId = match.awayTeam.id;
    if (
      predAdvancingTeamId != null &&
      predAdvancingTeamId !== homeId &&
      predAdvancingTeamId !== awayId
    ) {
      throw new Error("Echipa aleasă să avanseze nu face parte din acest meci.");
    }
  } else {
    predAdvancingTeamId = null;
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
      existing.predAwayGoals !== predAwayGoals ||
      existing.predAdvancingTeamId !== predAdvancingTeamId);

  const firstTimeAdvancingPick =
    !!existing &&
    existing.predAdvancingTeamId == null &&
    predAdvancingTeamId != null &&
    existing.htOutcome === ht &&
    existing.ftOutcome === ft &&
    existing.predHomeGoals === predHomeGoals &&
    existing.predAwayGoals === predAwayGoals;

  const applyChangePenalty =
    underway &&
    shouldApplyMidCompetitionChangePenalty(tournamentAllowChanges) &&
    changed &&
    !firstTimeAdvancingPick;

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
        predAdvancingTeamId,
      },
      update: {
        htOutcome: ht,
        ftOutcome: ft,
        predHomeGoals,
        predAwayGoals,
        predAdvancingTeamId,
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
  saveScope: WcExtraSaveScope = "qualifiers",
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
  const tournamentAllowChanges =
    tournament.allowPredictionChangesDuringCompetition ?? false;
  if (underway && !isMidCompetitionPredictionChangesAllowed(tournamentAllowChanges)) {
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

  const existingExtra = await prisma.wcExtraPrediction.findUnique({
    where: {
      tournamentId_userId: { tournamentId, userId: user.id },
    },
  });

  let teamToGroup = new Map<number, string>();
  let groupKeys: string[] = [];
  try {
    const matches = await fetchCompetitionMatches(parsed.code, parsed.season);
    const standings = await fetchPartyStandings(
      parsed.code,
      parsed.season,
      matches,
    );
    teamToGroup = buildTeamIdToGroupKeyFromStandings(standings);
    groupKeys = standings.map((g) => g.groupKey);
  } catch {
    /* If fixture data is unavailable, skip server-side per-group cap. */
  }

  let advancingToSave = clean;
  if (teamToGroup.size > 0) {
    if (saveScope === "qualifiers") {
      assertMaxThreePerGroup(clean, teamToGroup);
    } else {
      const cleanValid = clean.length > 0;

      if (cleanValid && clean.length > 0) {
        assertMaxThreePerGroup(clean, teamToGroup);
        advancingToSave = clean;
      } else if (existingExtra?.advancingTeamIds?.length) {
        advancingToSave = existingExtra.advancingTeamIds;
      } else {
        advancingToSave = [];
      }
    }
  }

  const champ =
    championTeamId != null &&
    Number.isInteger(championTeamId) &&
    championTeamId > 0 ?
      championTeamId
    : null;

  const nextExtra = { advancingTeamIds: advancingToSave, championTeamId: champ };
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
    shouldApplyMidCompetitionChangePenalty(tournamentAllowChanges) &&
    changed;

  await prisma.$transaction(async (tx) => {
    await tx.wcExtraPrediction.upsert({
      where: {
        tournamentId_userId: { tournamentId, userId: user.id },
      },
      create: {
        tournamentId,
        userId: user.id,
        advancingTeamIds: advancingToSave,
        championTeamId: champ,
      },
      update: {
        advancingTeamIds: advancingToSave,
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
    const homeId = m.homeTeam.id;
    const awayId = m.awayTeam.id;
    let predAdvancingTeamId =
      inferAdvancingTeamIdFromPredictedScore(
        predHomeGoals,
        predAwayGoals,
        homeId,
        awayId,
      );
    if (predAdvancingTeamId == null && homeId != null && awayId != null) {
      predAdvancingTeamId = Math.random() < 0.5 ? homeId : awayId;
    }

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
        predAdvancingTeamId,
      },
      update: {
        htOutcome: ht,
        ftOutcome: ft,
        predHomeGoals,
        predAwayGoals,
        predAdvancingTeamId,
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
