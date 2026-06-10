import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import MiniGamesHub from "@/components/mini-games/mini-games-hub";
import { prisma } from "@/lib/prisma";
import { todayDateKeyBucharest, msUntilNextReset } from "@/lib/mini-games/date";
import {
  buildMiniGameLeaderboard,
  computeTriviaStreak,
  getOrCreatePlay,
} from "@/lib/mini-games/leaderboard";
import type { BingoCells, MiniGameLeaderboardPeriod } from "@/lib/mini-games/types";
import { pageTitle } from "@/lib/site-metadata";
import { createTranslator } from "@/lib/i18n";
import { getLocaleFromCookies } from "@/lib/i18n/server";

export const metadata = pageTitle("Mini jocuri");

export default async function MiniGamesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const locale = await getLocaleFromCookies();
  const t = createTranslator(locale);
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) redirect("/sign-in");

  const sp = await searchParams;
  const period: MiniGameLeaderboardPeriod =
    sp.period === "week" || sp.period === "all" ? sp.period : "today";

  const dateKey = todayDateKeyBucharest();
  const play = await getOrCreatePlay(user.id, dateKey);
  const streak = await computeTriviaStreak(user.id, dateKey);
  const leaderboardRows = await buildMiniGameLeaderboard(period, dateKey);

  const triviaAnswered = play.triviaAnswers.filter((a) => a !== -1).length;
  const bingoCells = (play.bingoCells ?? {}) as BingoCells;
  const bingoFilled = Object.keys(bingoCells).filter((k) => bingoCells[k]).length;

  const championProgress = play.championSolved
    ? t("miniGames.progress.done")
    : `${play.championGuesses.length}/6`;

  const cards = [
    {
      href: "/mini-jocuri/trivia",
      titleKey: "miniGames.card.trivia" as const,
      descKey: "miniGames.card.triviaDesc" as const,
      progress: play.triviaCompleted
        ? `${play.triviaScore} ${t("miniGames.points")}`
        : `${triviaAnswered}/10`,
      done: play.triviaCompleted,
    },
    {
      href: "/mini-jocuri/campion",
      titleKey: "miniGames.card.champion" as const,
      descKey: "miniGames.card.championDesc" as const,
      progress: play.championSolved
        ? `${play.championScore} ${t("miniGames.points")}`
        : championProgress,
      done: play.championSolved || play.championGuesses.length >= 6,
    },
    {
      href: "/mini-jocuri/bingo",
      titleKey: "miniGames.card.bingo" as const,
      descKey: "miniGames.card.bingoDesc" as const,
      progress: play.bingoFullHouse
        ? `${play.bingoScore} ${t("miniGames.points")}`
        : `${bingoFilled}/9`,
      done: play.bingoFullHouse,
    },
  ];

  return (
    <MiniGamesHub
      resetMs={msUntilNextReset()}
      streak={streak}
      cards={cards}
      leaderboardRows={leaderboardRows}
      leaderboardPeriod={period}
      currentUserId={user.id}
    />
  );
}
