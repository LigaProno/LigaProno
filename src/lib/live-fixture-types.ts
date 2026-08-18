export type LiveFixture = {
  matchId: number;
  home: string;
  away: string;
  homeCrest: string | null;
  awayCrest: string | null;
  homeScore: number;
  awayScore: number;
  /** IN_PLAY = live, PAUSED = pauză. */
  status: "IN_PLAY" | "PAUSED";
};
