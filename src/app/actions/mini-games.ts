"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { I18nError } from "@/lib/i18n/errors";
import { requireDbUser } from "@/lib/sync-clerk-user";
import { todayDateKeyBucharest } from "@/lib/mini-games/date";
import { compareChampionGuess } from "@/lib/mini-games/champion-clues";
import {
  getDailyChallenge,
  getTriviaQuestionsForDay,
  findChampionByGuess,
  getChampionForDay,
  championMatchesCriterion,
  getBingoCriteriaForDay,
} from "@/lib/mini-games/daily";
import {
  scoreTrivia,
  scoreChampion,
  scoreBingo,
  computeTotalScore,
} from "@/lib/mini-games/scoring";
import type { BingoCells } from "@/lib/mini-games/types";
import { getOrCreatePlay } from "@/lib/mini-games/leaderboard";

async function requireUser() {
  return requireDbUser();
}

function parseBingoCells(raw: unknown): BingoCells {
  if (!raw || typeof raw !== "object") return {};
  return raw as BingoCells;
}

function revalidateMiniGames() {
  revalidatePath("/mini-jocuri");
  revalidatePath("/mini-jocuri/trivia");
  revalidatePath("/mini-jocuri/campion");
  revalidatePath("/mini-jocuri/bingo");
}

export async function submitTriviaAnswer(
  questionIndex: number,
  selectedIndex: number,
): Promise<{ correct: boolean; triviaScore: number; completed: boolean }> {
  const user = await requireUser();
  const dateKey = todayDateKeyBucharest();
  const challenge = getDailyChallenge(dateKey);
  const questions = getTriviaQuestionsForDay(challenge);

  if (questionIndex < 0 || questionIndex >= questions.length) {
    throw new I18nError("errors.generic");
  }
  if (selectedIndex < 0 || selectedIndex > 3) {
    throw new I18nError("errors.generic");
  }

  const play = await getOrCreatePlay(user.id, dateKey);
  const answers = [...play.triviaAnswers];
  while (answers.length < 10) answers.push(-1);

  if (answers[questionIndex] !== -1) {
    throw new I18nError("errors.generic");
  }

  const question = questions[questionIndex];
  const correct = selectedIndex === question.correctIndex;
  answers[questionIndex] = selectedIndex;

  const correctCount = answers.reduce((acc, ans, i) => {
    if (ans === -1) return acc;
    return acc + (ans === questions[i].correctIndex ? 1 : 0);
  }, 0);

  const completed = answers.every((a) => a !== -1);
  const triviaScore = completed ? scoreTrivia(correctCount) : correctCount;

  const totalScore = computeTotalScore(
    triviaScore,
    play.championScore,
    play.bingoScore,
  );

  await prisma.miniGamePlay.update({
    where: { id: play.id },
    data: {
      triviaAnswers: answers,
      triviaScore,
      triviaCompleted: completed,
      totalScore,
    },
  });

  revalidateMiniGames();
  return { correct, triviaScore, completed };
}

export async function submitChampionGuess(
  guess: string,
): Promise<{
  correct: boolean;
  solved: boolean;
  attempts: number;
  championScore: number;
  countryMatch: boolean;
  positionMatch: boolean;
}> {
  const user = await requireUser();
  const dateKey = todayDateKeyBucharest();
  const challenge = getDailyChallenge(dateKey);
  const target = getChampionForDay(challenge);

  const play = await getOrCreatePlay(user.id, dateKey);
  if (play.championSolved || play.championGuesses.length >= 6) {
    throw new I18nError("errors.generic");
  }

  const guessed = findChampionByGuess(guess);
  const guessId = guessed?.id ?? guess.trim().toLowerCase();
  const guesses = [...play.championGuesses, guessId];
  const correct = guessed?.id === target.id;
  const attempts = guesses.length;
  const solved = correct;
  const championScore = solved ? scoreChampion(attempts) : 0;
  const { countryMatch, positionMatch } = compareChampionGuess(guessed, target);

  const totalScore = computeTotalScore(
    play.triviaScore,
    solved ? championScore : play.championScore,
    play.bingoScore,
  );

  await prisma.miniGamePlay.update({
    where: { id: play.id },
    data: {
      championGuesses: guesses,
      championSolved: solved || play.championSolved,
      championScore: solved ? championScore : play.championScore,
      totalScore,
    },
  });

  revalidateMiniGames();
  return {
    correct,
    solved,
    attempts,
    championScore: solved ? championScore : play.championScore,
    countryMatch: solved ? false : countryMatch,
    positionMatch: solved ? false : positionMatch,
  };
}

export async function submitBingoCell(
  cellIndex: number,
  playerGuess: string,
): Promise<{
  valid: boolean;
  bingoScore: number;
  lineComplete: boolean;
  fullHouse: boolean;
}> {
  const user = await requireUser();
  const dateKey = todayDateKeyBucharest();
  const challenge = getDailyChallenge(dateKey);
  const criteria = getBingoCriteriaForDay(challenge);

  if (cellIndex < 0 || cellIndex >= 9) {
    throw new I18nError("errors.generic");
  }

  const play = await getOrCreatePlay(user.id, dateKey);
  const cells = parseBingoCells(play.bingoCells);

  if (cells[String(cellIndex)]) {
    throw new I18nError("errors.generic");
  }

  const player = findChampionByGuess(playerGuess);
  if (!player) {
    const moves = play.bingoMoves + 1;
    const wasted = play.bingoWastedMoves + 1;
    const { score, lineComplete, fullHouse } = scoreBingo(moves, cells, play.bingoLineComplete);
    const totalScore = computeTotalScore(play.triviaScore, play.championScore, score);

    await prisma.miniGamePlay.update({
      where: { id: play.id },
      data: {
        bingoMoves: moves,
        bingoWastedMoves: wasted,
        bingoScore: score,
        bingoLineComplete: lineComplete || play.bingoLineComplete,
        bingoFullHouse: fullHouse || play.bingoFullHouse,
        totalScore,
      },
    });

    revalidateMiniGames();
    return { valid: false, bingoScore: score, lineComplete, fullHouse };
  }

  const criterion = criteria[cellIndex];
  const valid = championMatchesCriterion(player, criterion.tag);
  const moves = play.bingoMoves + 1;
  const wasted = valid ? play.bingoWastedMoves : play.bingoWastedMoves + 1;

  if (valid) {
    cells[String(cellIndex)] = player.id;
  }

  const { score, lineComplete, fullHouse } = scoreBingo(moves, cells, play.bingoLineComplete);
  const totalScore = computeTotalScore(play.triviaScore, play.championScore, score);

  await prisma.miniGamePlay.update({
    where: { id: play.id },
    data: {
      bingoCells: cells,
      bingoMoves: moves,
      bingoWastedMoves: wasted,
      bingoScore: score,
      bingoLineComplete: lineComplete || play.bingoLineComplete,
      bingoFullHouse: fullHouse || play.bingoFullHouse,
      totalScore,
    },
  });

  revalidateMiniGames();
  return { valid, bingoScore: score, lineComplete, fullHouse };
}
