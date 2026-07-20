"use server";

import { COMPETITION_PICKER_OPTIONS } from "@/lib/competition";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { I18nError } from "@/lib/i18n/errors";
import { requireDbUser } from "@/lib/sync-clerk-user";

function resolveValidatedCompetition(token: string | null | undefined): string {
  if (token == null || token === "" || token === "__none__") {
    throw new I18nError("errors.competitionRequired");
  }
  const t = token.trim();
  if (!COMPETITION_PICKER_OPTIONS.some((o) => o.storageKey === t)) {
    throw new I18nError("errors.invalidCompetition");
  }
  return t;
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function createTournament(
  name: string,
  customCode?: string,
  competitionStorage?: string | null,
): Promise<{ inviteCode: string }> {
  const user = await requireDbUser();

  let inviteCode = customCode?.trim().toUpperCase() || generateInviteCode();

  const taken = await prisma.tournament.findUnique({ where: { inviteCode } });
  if (taken) throw new I18nError("errors.inviteCodeTaken");

  const competition = resolveValidatedCompetition(competitionStorage);

  const tournament = await prisma.tournament.create({
    data: {
      name,
      inviteCode,
      creatorId: user.id,
      competition,
    },
  });

  await prisma.tournamentMember.create({
    data: { tournamentId: tournament.id, userId: user.id },
  });

  revalidatePath("/turnee");
  revalidatePath("/turnee/clasament");
  return { inviteCode };
}

export async function deleteTournament(tournamentId: string): Promise<void> {
  const user = await requireDbUser();

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw new I18nError("errors.tournamentNotFound");
  if (tournament.creatorId !== user.id) throw new Error("Only the creator can delete this tournament");

  await prisma.wcMatchPrediction.deleteMany({ where: { tournamentId } });
  await prisma.wcExtraPrediction.deleteMany({ where: { tournamentId } });
  await prisma.tournamentMember.deleteMany({ where: { tournamentId } });
  await prisma.tournament.delete({ where: { id: tournamentId } });

  revalidatePath("/turnee");
  revalidatePath("/turnee/clasament");
}

/**
 * Ieși dintr-un turneu în care ești membru. Creatorul nu poate pleca (poate doar
 * șterge turneul). Pronosticurile NU se șterg — dacă revii, îți regăsești istoricul.
 */
export async function leaveTournament(tournamentId: string): Promise<void> {
  const user = await requireDbUser();

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw new I18nError("errors.tournamentNotFound");
  if (tournament.creatorId === user.id) {
    throw new Error("Creatorul nu poate părăsi turneul — îl poate doar șterge.");
  }

  const membership = await prisma.tournamentMember.findUnique({
    where: { tournamentId_userId: { tournamentId, userId: user.id } },
  });
  if (!membership) throw new Error("Nu ești membru al acestui turneu.");

  await prisma.tournamentMember.delete({ where: { id: membership.id } });

  revalidatePath("/turnee");
  revalidatePath("/turnee/clasament");
  revalidatePath(`/turnee/${tournamentId}`);
}

export async function joinPublicTournament(tournamentId: string): Promise<void> {
  const user = await requireDbUser();

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament || !tournament.isPublic) throw new I18nError("errors.tournamentNotFound");

  const existing = await prisma.tournamentMember.findUnique({
    where: { tournamentId_userId: { tournamentId: tournament.id, userId: user.id } },
  });
  if (existing) throw new I18nError("errors.alreadyInTournament");

  await prisma.tournamentMember.create({
    data: { tournamentId: tournament.id, userId: user.id },
  });

  revalidatePath("/turnee");
  revalidatePath("/turnee/clasament");
}

export async function joinTournament(code: string): Promise<void> {
  const user = await requireDbUser();

  const tournament = await prisma.tournament.findUnique({
    where: { inviteCode: code.trim().toUpperCase() },
  });
  if (!tournament) throw new I18nError("errors.invalidInviteCode");

  const existing = await prisma.tournamentMember.findUnique({
    where: { tournamentId_userId: { tournamentId: tournament.id, userId: user.id } },
  });
  if (existing) throw new I18nError("errors.alreadyInTournament");

  await prisma.tournamentMember.create({
    data: { tournamentId: tournament.id, userId: user.id },
  });

  revalidatePath("/turnee");
  revalidatePath("/turnee/clasament");
}
