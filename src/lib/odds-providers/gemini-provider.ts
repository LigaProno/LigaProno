import { fetchBettingOddsViaGemini } from "@/lib/gemini-odds-fetch";
import {
  BETTING_ODDS_SCHEMA_VERSION,
  type BettingOddsPayload,
} from "@/lib/betting-odds";
import { matchesNeedingOddsFill } from "@/lib/odds-horizon";
import type { OddsFetchContext, OddsFetchResult, OddsProvider } from "@/lib/odds-providers/types";

export class GeminiOddsProvider implements OddsProvider {
  readonly name = "gemini";

  async fetchOdds(ctx: OddsFetchContext): Promise<OddsFetchResult> {
    // Meciurile începute au cote înghețate — nu le mai cerem, ca Gemini să nu
    // genereze de fiecare dată alte valori pentru puncte deja acordate.
    const locked = ctx.lockedMatchIds;
    const open = (ms: typeof ctx.matches) =>
      locked ? ms.filter((m) => !locked.has(String(m.id))) : ms;

    const targets = open(matchesNeedingOddsFill(ctx.matches, null));
    const fallbackTargets = open(ctx.matches);
    const { payload: rawPayload, model } = await fetchBettingOddsViaGemini(
      ctx.competitionLabel,
      targets.length > 0 ? targets : fallbackTargets,
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
