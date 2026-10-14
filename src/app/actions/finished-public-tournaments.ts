"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  finishedPublicListOrder,
  toFinishedPublicCard,
  type FinishedPublicCardData,
} from "@/lib/public-tournaments";

/** Restul turneelor publice încheiate, în afară de cele deja afișate. */
export async function loadRemainingFinishedPublicTournaments(
  excludeIds: string[],
): Promise<FinishedPublicCardData[]> {
  const { userId: clerkId } = await auth();
  const hiddenIds = excludeIds.filter((id) => id.trim()).slice(0, 20);

  const [rows, user] = await Promise.all([
    prisma.tournament.findMany({
      where: {
        isPublic: true,
        closedAt: { not: null },
        ...(hiddenIds.length > 0 ? { id: { notIn: hiddenIds } } : {}),
      },
      include: { _count: { select: { members: true } } },
      orderBy: finishedPublicListOrder,
    }),
    clerkId
      ? prisma.user.findUnique({
          where: { clerkId },
          select: { memberships: { select: { tournamentId: true } } },
        })
      : Promise.resolve(null),
  ]);

  const joinedIds = new Set(user?.memberships.map((membership) => membership.tournamentId) ?? []);
  return rows.map((tournament) => toFinishedPublicCard(tournament, joinedIds));
}
