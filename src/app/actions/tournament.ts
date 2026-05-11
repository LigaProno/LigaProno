"use server";

import { auth } from "@clerk/nextjs/server";
import { getFootballDataCompetitionPickerOptions } from "@/lib/football-data";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { COMPETITION_LIGA1_2025 } from "@/lib/competition";

async function resolveValidatedCompetition(
  token: string | null | undefined,
): Promise<string | null> {
  if (token == null || token === "" || token === "__none__") return null;
  const t = token.trim();
  // Hardcoded competitions that bypass the football-data.org API check
  if (t === COMPETITION_LIGA1_2025) return t;
  const opts = await getFootballDataCompetitionPickerOptions();
  if (!opts.some((o) => o.storageKey === t)) {
    throw new Error("Invalid competition selection.");
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
  if (!clerkId) throw new Error("Not authenticated");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  let inviteCode = customCode?.trim().toUpperCase() || generateInviteCode();

  const taken = await prisma.tournament.findUnique({ where: { inviteCode } });
  if (taken) throw new Error("That invite code is already taken, try another");

  const competition = await resolveValidatedCompetition(competitionStorage);

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

  revalidatePath("/party");
  return { inviteCode };
}

export async function joinTournament(code: string): Promise<void> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Not authenticated");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  const tournament = await prisma.tournament.findUnique({
    where: { inviteCode: code.trim().toUpperCase() },
  });
  if (!tournament) throw new Error("Invalid invite code");

  const existing = await prisma.tournamentMember.findUnique({
    where: { tournamentId_userId: { tournamentId: tournament.id, userId: user.id } },
  });
  if (existing) throw new Error("You are already in this tournament");

  await prisma.tournamentMember.create({
    data: { tournamentId: tournament.id, userId: user.id },
  });

  revalidatePath("/party");
}
