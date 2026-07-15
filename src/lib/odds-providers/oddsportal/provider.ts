import {
  BETTING_ODDS_SCHEMA_VERSION,
  fillEstimatedQualifyOdds,
  fillEstimatedToAdvanceOdds,
  type BettingOddsPayload,
  type MatchOddsRow,
  type TeamOddsRow,
} from "@/lib/betting-odds";
import { isKnockoutStage } from "@/lib/knockout-predictions";
import { mapWithConcurrency } from "@/lib/odds-providers/concurrency";
import {
  fetchEventMeta,
  fetchFtHtCsFeeds,
  fetchOutrightWinnerFeed,
  fetchTournamentFixtures,
  type OpEventMeta,
} from "@/lib/odds-providers/oddsportal/client";
import { getOddsPortalCompetition } from "@/lib/odds-providers/oddsportal/competition-map";
import {
  mergeMatchOddsRows,
  parse1x2FromFeed,
  parseCorrectScoreFromFeed,
  parseHtFtFromFeed,
  parseOutrightWinnerFromFeed,
} from "@/lib/odds-providers/oddsportal/parse-odds";
import {
  mapFixturesToFootballDataMatches,
  matchOutrightTeamName,
} from "@/lib/odds-providers/team-matcher";
import type { OddsFetchContext, OddsFetchResult, OddsProvider } from "@/lib/odds-providers/types";

function getConcurrency(): number {
  const raw = process.env.ODDSPORTAL_CONCURRENCY?.trim();
  const n = raw ? Number(raw) : 6;
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 12) : 6;
}

function filterUpcomingMatches(ctx: OddsFetchContext) {
  return ctx.matches.filter((m) => m.status !== "FINISHED" && m.status !== "CANCELLED");
}

export class OddsPortalProvider implements OddsProvider {
  readonly name = "oddsportal";

  async fetchOdds(ctx: OddsFetchContext): Promise<OddsFetchResult> {
    const config = getOddsPortalCompetition(ctx.code, ctx.season);
    if (!config) {
      throw new Error(
        `OddsPortal: competiția ${ctx.code}_${ctx.season} nu are mapare configurată.`,
      );
    }

    const targetMatches = filterUpcomingMatches(ctx);
    const fixtures = await fetchTournamentFixtures(config);
    const fdToOp = mapFixturesToFootballDataMatches(fixtures, targetMatches);

    const matches: Record<string, MatchOddsRow> = {};
    const errors: string[] = [];
    const referer = config.tournamentPageUrl;
    const concurrency = getConcurrency();

    await mapWithConcurrency(
      [...fdToOp.entries()],
      concurrency,
      async ([fdMatchId, fx]) => {
        try {
          let meta: OpEventMeta | null = await fetchEventMeta(config, fx.matchId);
          if (!meta) {
            errors.push(`meta lipsă: ${fx.matchId}`);
            return;
          }
          meta = { ...meta, home: fx.home, away: fx.away };

          const { ft, ht, cs, htFt } = await fetchFtHtCsFeeds(meta, referer);
          const ft1x2 = parse1x2FromFeed(ft, 2);
          const ht1x2 = parse1x2FromFeed(ht, 3);
          const correctScore = parseCorrectScoreFromFeed(cs);
          const htFtOdds = parseHtFtFromFeed(htFt);
          matches[String(fdMatchId)] = mergeMatchOddsRows(
            ft1x2,
            ht1x2,
            correctScore,
            htFtOdds,
          );
        } catch (e) {
          errors.push(
            `${fx.matchId}: ${e instanceof Error ? e.message : "eroare"}`,
          );
        }
      },
    );

    const teams: Record<string, TeamOddsRow> = {};
    for (const t of ctx.teams) {
      teams[String(t.id)] = { toQualifyFromGroup: null, outrightWinner: null };
    }

    try {
      const outrightFeed = await fetchOutrightWinnerFeed(config);
      const outrightRows = parseOutrightWinnerFromFeed(outrightFeed);
      for (const row of outrightRows) {
        const teamId = matchOutrightTeamName(row.teamName, ctx.teams);
        if (teamId == null) continue;
        const key = String(teamId);
        const prev = teams[key] ?? { toQualifyFromGroup: null, outrightWinner: null };
        teams[key] = { ...prev, outrightWinner: row.odd };
      }
    } catch (e) {
      errors.push(
        `outright: ${e instanceof Error ? e.message : "eroare"}`,
      );
    }

    if (Object.keys(matches).length === 0 && errors.length > 0) {
      throw new Error(`OddsPortal: niciun meci actualizat. ${errors.slice(0, 3).join(" | ")}`);
    }

    const koMatchIds = ctx.matches
      .filter((m) => isKnockoutStage(m.stage))
      .map((m) => m.id);
    const payload: BettingOddsPayload = fillEstimatedToAdvanceOdds(
      fillEstimatedQualifyOdds({
        schemaVersion: BETTING_ODDS_SCHEMA_VERSION,
        matches,
        teams,
      }),
      koMatchIds,
    );

    return { payload, provider: this.name };
  }
}

export const oddsPortalProvider = new OddsPortalProvider();
