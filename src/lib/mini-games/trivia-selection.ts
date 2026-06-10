import { TRIVIA_QUESTIONS } from "@/data/mini-games/trivia-questions";
import type { TriviaQuestion } from "./types";

export const TRIVIA_QUESTIONS_PER_DAY = 10;

/** Ancoră rotație — aceeași zi = același set pentru toți utilizatorii. */
export const TRIVIA_ROTATION_ANCHOR = "2026-03-01";

const MASTER_ORDER_SEED = "pronohub-trivia-master-v1";

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function daysSinceAnchor(dateKey: string, anchorKey: string): number {
  const parse = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const diff = parse(dateKey) - parse(anchorKey);
  return Math.floor(diff / 86_400_000);
}

let masterOrderCache: TriviaQuestion[] | null = null;

function getMasterOrderedQuestions(): TriviaQuestion[] {
  if (!masterOrderCache) {
    masterOrderCache = seededShuffle(
      [...TRIVIA_QUESTIONS],
      hashString(MASTER_ORDER_SEED),
    );
  }
  return masterOrderCache;
}

/**
 * 10 întrebări distincte pe zi, fără suprapunere între zile consecutive din același ciclu.
 * Cu un pool de N întrebări (N ÷ 10 blocuri întregi), fiecare întrebare reapare doar după
 * `floor(N / 10)` zile.
 */
export function getTriviaQuestionIdsForDate(dateKey: string): string[] {
  const ordered = getMasterOrderedQuestions();
  const perDay = TRIVIA_QUESTIONS_PER_DAY;
  const fullBlocks = Math.floor(ordered.length / perDay);

  if (fullBlocks < 1) {
    throw new Error(
      `Trivia pool needs at least ${perDay} questions (has ${ordered.length})`,
    );
  }

  const dayIndex = daysSinceAnchor(dateKey, TRIVIA_ROTATION_ANCHOR);
  const blockIndex = ((dayIndex % fullBlocks) + fullBlocks) % fullBlocks;
  const start = blockIndex * perDay;

  const ids = ordered.slice(start, start + perDay).map((q) => q.id);

  if (ids.length !== perDay || new Set(ids).size !== perDay) {
    throw new Error("Daily trivia selection produced duplicates or incomplete set");
  }

  return ids;
}

export function getTriviaCycleDays(): number {
  return Math.floor(TRIVIA_QUESTIONS.length / TRIVIA_QUESTIONS_PER_DAY);
}
