import type { BingoCells } from "./types";

const BINGO_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function scoreTrivia(correctCount: number, total = 10): number {
  let score = correctCount;
  if (correctCount === total) score += 2;
  return score;
}

export function scoreChampion(attemptNumber: number): number {
  if (attemptNumber < 1 || attemptNumber > 6) return 0;
  return 7 - attemptNumber;
}

export function bingoLineComplete(cells: BingoCells): boolean {
  const filled = new Set(
    Object.keys(cells)
      .map(Number)
      .filter((i) => cells[String(i)]),
  );
  return BINGO_LINES.some((line) => line.every((i) => filled.has(i)));
}

export function bingoFullHouse(cells: BingoCells): boolean {
  for (let i = 0; i < 9; i++) {
    if (!cells[String(i)]) return false;
  }
  return true;
}

export function scoreBingo(
  moves: number,
  cells: BingoCells,
  lineAlreadyComplete: boolean,
): { score: number; lineComplete: boolean; fullHouse: boolean } {
  const lineComplete = bingoLineComplete(cells);
  const fullHouse = bingoFullHouse(cells);
  let score = Math.max(0, 20 - moves);
  if (fullHouse) score += 5;
  return { score, lineComplete, fullHouse };
}

export function computeTotalScore(
  triviaScore: number,
  championScore: number,
  bingoScore: number,
): number {
  return triviaScore + championScore + bingoScore;
}

export function triviaStreakQualifies(correctCount: number): boolean {
  return correctCount >= 7;
}
