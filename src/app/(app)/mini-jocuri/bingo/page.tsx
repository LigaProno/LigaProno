import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import BingoGame from "@/components/mini-games/bingo-game";
import { prisma } from "@/lib/prisma";
import { getDailyChallenge, getBingoCriteriaForDay } from "@/lib/mini-games/daily";
import { todayDateKeyBucharest } from "@/lib/mini-games/date";
import { getOrCreatePlay } from "@/lib/mini-games/leaderboard";
import type { BingoCells } from "@/lib/mini-games/types";
import { pageTitle } from "@/lib/site-metadata";

export const metadata = pageTitle("CM Bingo");

export default async function BingoPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) redirect("/sign-in");

  const dateKey = todayDateKeyBucharest();
  const challenge = getDailyChallenge(dateKey);
  const criteria = getBingoCriteriaForDay(challenge);
  const play = await getOrCreatePlay(user.id, dateKey);
  const cells = (play.bingoCells ?? {}) as BingoCells;

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8">
      <BingoGame
        criteria={criteria}
        initialCells={cells}
        initialMoves={play.bingoMoves}
        initialScore={play.bingoScore}
        initialLineComplete={play.bingoLineComplete}
        initialFullHouse={play.bingoFullHouse}
      />
    </div>
  );
}
