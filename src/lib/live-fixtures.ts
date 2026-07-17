import {
  fetchCompetitionLiveMatches,
  type FootballDataMatch,
} from "@/lib/football-data";
import { parseStoredCompetition } from "@/lib/competition";
import { formatTeamDisplayName } from "@/lib/team-display";
import { filterMatchesForTournament } from "@/lib/wc-pred-display";

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

type TournamentWindow = {
  competition: string | null;
  startMatchday: number | null;
  endMatchday: number | null;
};

function toFixture(m: FootballDataMatch): LiveFixture {
  const ft = m.score?.fullTime;
  return {
    matchId: m.id,
    home: formatTeamDisplayName(m.homeTeam),
    away: formatTeamDisplayName(m.awayTeam),
    homeCrest: m.homeTeam?.crest ?? null,
    awayCrest: m.awayTeam?.crest ?? null,
    homeScore: ft?.home ?? 0,
    awayScore: ft?.away ?? 0,
    status: m.status === "PAUSED" ? "PAUSED" : "IN_PLAY",
  };
}

/**
 * Meciurile în desfășurare din fereastra turneului, gata de afișat.
 * Gol dacă turneul n-are competiție, dacă API-ul pică sau dacă nu e nimic live.
 */
export async function loadTournamentLiveFixtures(
  tournament: TournamentWindow,
): Promise<LiveFixture[]> {
  const parsed = parseStoredCompetition(tournament.competition);
  if (!parsed) return [];

  let live: FootballDataMatch[] = [];
  try {
    live = await fetchCompetitionLiveMatches(parsed.code, parsed.season);
  } catch {
    return []; // API indisponibil — pur și simplu nu arătăm banner-ul
  }

  const inWindow = filterMatchesForTournament(live, tournament);
  return inWindow
    .filter((m) => m.status === "IN_PLAY" || m.status === "PAUSED")
    .map(toFixture);
}
