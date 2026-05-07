"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function createTournament(
  name: string,
  customCode?: string
): Promise<{ inviteCode: string }> {
  const { userId: clerkId } = await auth();
  if (!clerkId) throw new Error("Not authenticated");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) throw new Error("User not found");

  let inviteCode = customCode?.trim().toUpperCase() || generateInviteCode();

  const taken = await prisma.tournament.findUnique({ where: { inviteCode } });
  if (taken) throw new Error("That invite code is already taken, try another");

  const tournament = await prisma.tournament.create({
    data: { name, inviteCode, creatorId: user.id },
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
