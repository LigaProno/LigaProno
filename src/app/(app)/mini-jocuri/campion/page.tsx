import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ChampionGame from "@/components/mini-games/champion-game";
import { prisma } from "@/lib/prisma";
import { getDailyChallenge, getChampionForDay } from "@/lib/mini-games/daily";
import { todayDateKeyBucharest } from "@/lib/mini-games/date";
import { championRevealsForAttempts } from "@/lib/mini-games/champion-clues";
import { resolveChampionImageUrl } from "@/lib/mini-games/champion-image";
import { getOrCreatePlay } from "@/lib/mini-games/leaderboard";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import { pageTitle } from "@/lib/site-metadata";

export const metadata = pageTitle("Campionul ascuns");

export default async function ChampionPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) redirect("/sign-in");

  const locale = await getLocaleFromCookies();
  const dateKey = todayDateKeyBucharest();
  const challenge = getDailyChallenge(dateKey);
  const target = getChampionForDay(challenge);
  const playerImageUrl = await resolveChampionImageUrl(target);
  const play = await getOrCreatePlay(user.id, dateKey);
  const reveal = play.championSolved || play.championGuesses.length >= 6;
  const attempts = play.championGuesses.length;

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8">
      <ChampionGame
        playerImageUrl={playerImageUrl}
        reveals={championRevealsForAttempts(target, attempts, locale)}
        revealedPlayer={reveal ? target : null}
        initialGuesses={play.championGuesses}
        initialSolved={play.championSolved}
        initialScore={play.championScore}
      />
    </div>
  );
}
