import type { FootballDataMatch } from "@/lib/football-data";
import type { BettingOddsPayload } from "@/lib/betting-odds";

export type OddsFetchContext = {
  competitionLabel: string;
  code: string;
  season: string;
  matches: FootballDataMatch[];
  teams: { id: number; name: string }[];
  /**
   * Meciuri (inclusiv terminate) care trebuie re-cerute pe OddsPortal —
   * de obicei cele cu 1X2 dar fără tabel de scor corect.
   */
  matchIdsNeedingOddsRefresh?: number[];
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
