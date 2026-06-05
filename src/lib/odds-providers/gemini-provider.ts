import { fetchBettingOddsViaGemini } from "@/lib/gemini-odds-fetch";
import {
  BETTING_ODDS_SCHEMA_VERSION,
  type BettingOddsPayload,
} from "@/lib/betting-odds";
import type { OddsFetchContext, OddsFetchResult, OddsProvider } from "@/lib/odds-providers/types";

export class GeminiOddsProvider implements OddsProvider {
  readonly name = "gemini";

  async fetchOdds(ctx: OddsFetchContext): Promise<OddsFetchResult> {
    const { payload: rawPayload, model } = await fetchBettingOddsViaGemini(
      ctx.competitionLabel,
      ctx.matches,
      ctx.teams,
    );
    const payload: BettingOddsPayload = {
      schemaVersion: BETTING_ODDS_SCHEMA_VERSION,
      matches: rawPayload.matches,
      teams: rawPayload.teams,
    };
    return { payload, provider: `${this.name}:${model}` };
  }
}

export const geminiOddsProvider = new GeminiOddsProvider();
