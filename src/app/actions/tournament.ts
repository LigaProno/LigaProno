"use server";

import { auth } from "@clerk/nextjs/server";
import { COMPETITION_PICKER_OPTIONS } from "@/lib/competition";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { I18nError } from "@/lib/i18n/errors";

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
  allowPredictionChangesDuringCompetition = false,
): Promise<{ inviteCode: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new I18nError("errors.notAuthenticated");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new I18nError("errors.userNotFound");

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
      allowPredictionChangesDuringCompetition: Boolean(
        allowPredictionChangesDuringCompetition,
      ),
    },
  });

  await prisma.tournamentMember.create({
    data: { tournamentId: tournament.id, userId: user.id },
  });

  revalidatePath("/turnee");
  revalidatePath("/turnee/clasament");
  return { inviteCode };
}

export async function joinTournament(code: string): Promise<void> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new I18nError("errors.notAuthenticated");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new I18nError("errors.userNotFound");

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
