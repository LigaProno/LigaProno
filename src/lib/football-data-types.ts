/** Tipuri Football-Data — sigure în client (fără Prisma / fetch). */

export type FootballDataTeam = {
  id?: number;
  name?: string;
  shortName?: string;
  tla?: string;
  crest?: string;
};

/** Scor din API (meciuri terminate / în desfășurare). */
export type FootballDataScore = {
  winner?: string | null;
  duration?: string | null;
  fullTime?: { home?: number | null; away?: number | null };
  halfTime?: { home?: number | null; away?: number | null };
  /** Scor după 90 de minute — prezent la meciuri eliminatorii cu prelungiri / penalty-uri. */
  regularTime?: { home?: number | null; away?: number | null };
  extraTime?: { home?: number | null; away?: number | null };
  penalties?: { home?: number | null; away?: number | null };
};

/** Formă minimală din răspunsul la `/competitions/{code}/matches`. */
export type FootballDataMatch = {
  id: number;
  utcDate: string;
  status?: string;
  stage?: string;
  group?: string | null;
  matchday?: number | null;
  /** Cheie stocată (ex. RL1_2026) — setată la load pe turnee multi-campionat. */
  competitionKey?: string;
  homeTeam: FootballDataTeam;
  awayTeam: FootballDataTeam;
  venue?: string | { name?: string; city?: string | null } | null;
  score?: FootballDataScore | null;
};

/** Rând clasament (grupă). */
export type StandingTableRow = {
  position: number;
  team: FootballDataTeam;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

export type GroupStanding = {
  /** Literă grupă A–L */
  letter: string;
  /** ex. „Group A” */
  groupKey: string;
  rows: StandingTableRow[];
};
