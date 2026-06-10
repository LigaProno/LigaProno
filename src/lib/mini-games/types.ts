import type { Locale } from "@/lib/i18n";

export type LocalizedText = Record<Locale, string>;

export type TriviaCategory =
  | "winners"
  | "moments"
  | "fun_facts"
  | "records";

export type TriviaQuestion = {
  id: string;
  category: TriviaCategory;
  question: LocalizedText;
  options: Record<Locale, string[]>;
  correctIndex: number;
  story: LocalizedText;
};

export type ChampionPosition = "GK" | "DEF" | "MID" | "FWD";

export type ChampionPlayer = {
  id: string;
  name: string;
  nationality: string;
  nationalityCode: string;
  position: ChampionPosition;
  wcWins: number[];
  tags: string[];
  imageUrl: string;
  fact: LocalizedText;
};

export type BingoCriterion = {
  id: string;
  label: LocalizedText;
  tag: string;
};

export type DailyChallenge = {
  dateKey: string;
  triviaQuestionIds: string[];
  championPlayerId: string;
  bingoCriterionIds: string[];
};

export type BingoCells = Record<string, string>;

export type MiniGameLeaderboardPeriod = "today" | "week" | "all";

export type MiniGameLeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  triviaScore: number;
  championScore: number;
  bingoScore: number;
  totalScore: number;
};
