import type { FootballDataMatch } from "@/lib/football-data";
import type { BettingOddsPayload } from "@/lib/betting-odds";

export type OddsFetchContext = {
  competitionLabel: string;
  code: string;
  season: string;
  matches: FootballDataMatch[];
  teams: { id: number; name: string }[];
};

export type OddsFetchResult = {
  payload: BettingOddsPayload;
  provider: string;
  usedFallback?: boolean;
};

export interface OddsProvider {
  readonly name: string;
  fetchOdds(ctx: OddsFetchContext): Promise<OddsFetchResult>;
}
