import { TRIVIA_QUESTIONS } from "@/data/mini-games/trivia-questions";
import { CHAMPION_PLAYERS, getChampionById } from "@/data/mini-games/champions";
import { getChampionIdForDate } from "./champion-selection";
import { getBingoCriterionIdsForDate } from "./bingo-selection";
import { BINGO_CRITERIA } from "@/data/mini-games/bingo-criteria";
import { todayDateKeyBucharest } from "./date";
import { getTriviaQuestionIdsForDate } from "./trivia-selection";
import type { DailyChallenge, TriviaQuestion, ChampionPlayer, BingoCriterion } from "./types";

export function getDailyChallenge(dateKey: string = todayDateKeyBucharest()): DailyChallenge {
  const triviaQuestionIds = getTriviaQuestionIdsForDate(dateKey);

  const championPlayerId = getChampionIdForDate(dateKey);
  const bingoCriterionIds = getBingoCriterionIdsForDate(dateKey);

  return {
    dateKey,
    triviaQuestionIds,
    championPlayerId,
    bingoCriterionIds,
  };
}

export function getTriviaQuestionsForDay(
  challenge: DailyChallenge,
): TriviaQuestion[] {
  const byId = new Map(TRIVIA_QUESTIONS.map((q) => [q.id, q]));
  return challenge.triviaQuestionIds
    .map((id) => byId.get(id))
    .filter((q): q is TriviaQuestion => q != null);
}

export function getChampionForDay(challenge: DailyChallenge): ChampionPlayer {
  const player = getChampionById(challenge.championPlayerId);
  if (!player) throw new Error("Champion player not found for daily challenge");
  return player;
}

export function getBingoCriteriaForDay(challenge: DailyChallenge): BingoCriterion[] {
  const byId = new Map(BINGO_CRITERIA.map((c) => [c.id, c]));
  return challenge.bingoCriterionIds
    .map((id) => byId.get(id))
    .filter((c): c is BingoCriterion => c != null);
}

export function findChampionByGuess(guess: string): ChampionPlayer | null {
  const normalized = guess.trim().toLowerCase();
  if (!normalized) return null;
  return (
    CHAMPION_PLAYERS.find(
      (p) =>
        p.name.toLowerCase() === normalized ||
        p.id === normalized ||
        p.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "") ===
          normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
    ) ?? null
  );
}

export function championMatchesCriterion(player: ChampionPlayer, tag: string): boolean {
  return player.tags.includes(tag);
}

export function searchChampions(query: string, limit = 8): ChampionPlayer[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return CHAMPION_PLAYERS.filter((p) => p.name.toLowerCase().includes(q)).slice(0, limit);
}
