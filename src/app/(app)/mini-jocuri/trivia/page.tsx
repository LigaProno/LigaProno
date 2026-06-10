import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import TriviaGame from "@/components/mini-games/trivia-game";
import { prisma } from "@/lib/prisma";
import { getDailyChallenge, getTriviaQuestionsForDay } from "@/lib/mini-games/daily";
import { todayDateKeyBucharest } from "@/lib/mini-games/date";
import { getOrCreatePlay } from "@/lib/mini-games/leaderboard";
import { pageTitle } from "@/lib/site-metadata";

export const metadata = pageTitle("CM Trivia");

export default async function TriviaPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) redirect("/sign-in");

  const dateKey = todayDateKeyBucharest();
  const challenge = getDailyChallenge(dateKey);
  const questions = getTriviaQuestionsForDay(challenge);
  const play = await getOrCreatePlay(user.id, dateKey);

  const answers = [...play.triviaAnswers];
  while (answers.length < 10) answers.push(-1);

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8">
      <TriviaGame
        questions={questions}
        initialAnswers={answers}
        initialScore={play.triviaScore}
        initialCompleted={play.triviaCompleted}
      />
    </div>
  );
}
