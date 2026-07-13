"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";
import { COMPETITION_PICKER_OPTIONS } from "@/lib/competition";
import { I18nError } from "@/lib/i18n/errors";
import type { TournamentPrize } from "@/lib/tournament-prizes";

async function assertAdmin() {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new I18nError("errors.notAuthenticated");
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user || !isAdminEmail(user.email)) throw new Error("Acces interzis.");
  return user;
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function createPublicTournament(
  name: string,
  competitionStorage: string,
  prizes: TournamentPrize[],
  matchdayCount?: number,
): Promise<{ inviteCode: string }> {
  const user = await assertAdmin();

  const t = competitionStorage.trim();
  if (!COMPETITION_PICKER_OPTIONS.some((o) => o.storageKey === t)) {
    throw new I18nError("errors.invalidCompetition");
  }

  let inviteCode = generateInviteCode();
  while (await prisma.tournament.findUnique({ where: { inviteCode } })) {
    inviteCode = generateInviteCode();
  }

  const tournament = await prisma.tournament.create({
    data: {
      name: name.trim(),
      inviteCode,
      creatorId: user.id,
      competition: t,
      isPublic: true,
      prizes: prizes.length > 0 ? prizes : undefined,
      endMatchday: matchdayCount ?? null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/turnee");
  return { inviteCode };
}

export async function deletePublicTournament(tournamentId: string): Promise<void> {
  await assertAdmin();

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament || !tournament.isPublic) throw new Error("Turneu public negăsit.");

  await prisma.wcMatchPrediction.deleteMany({ where: { tournamentId } });
  await prisma.wcExtraPrediction.deleteMany({ where: { tournamentId } });
  await prisma.tournamentMember.deleteMany({ where: { tournamentId } });
  await prisma.tournament.delete({ where: { id: tournamentId } });

  revalidatePath("/admin");
  revalidatePath("/turnee");
}
