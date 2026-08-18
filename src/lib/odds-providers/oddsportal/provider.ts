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
  fetchTournamentFixturesForScoreFallback,
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
import { matchesInOddsHorizon } from "@/lib/odds-horizon";
import type { OddsFetchContext, OddsFetchResult, OddsProvider } from "@/lib/odds-providers/types";
import type { FootballDataMatch } from "@/lib/football-data-types";

function getConcurrency(): number {
  const raw = process.env.ODDSPORTAL_CONCURRENCY?.trim();
  const n = raw ? Number(raw) : 6;
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 12) : 6;
}

/** Fereastra upcoming + meciuri marcate explicit (terminate fără CS). */
function resolveTargetMatches(ctx: OddsFetchContext): FootballDataMatch[] {
  const byId = new Map(ctx.matches.map((m) => [m.id, m]));
  const out = new Map<number, FootballDataMatch>();
  for (const m of matchesInOddsHorizon(ctx.matches)) out.set(m.id, m);
  for (const id of ctx.matchIdsNeedingOddsRefresh ?? []) {
    const m = byId.get(id);
    if (m && m.status !== "CANCELLED") out.set(m.id, m);
  }
  return [...out.values()];
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

    const targetMatches = resolveTargetMatches(ctx);
    // Overview + results — ca să putem re-lua CS și pe meciuri terminate.
    const fixtures = await fetchTournamentFixturesForScoreFallback(config);
    // Football-Data pune adesea toată etapa Superliga la aceeași oră placeholder
    // (ex. sâmbătă 17:00 UTC), iar OddsPortal are kick-off-urile reale vineri–luni.
    // Fereastra default de 18h pierde majoritatea meciurilor; 14 zile = aceeași
    // toleranță ca la venue-uri.
    const fdToOp = mapFixturesToFootballDataMatches(fixtures, targetMatches, {
      maxDiffHours: 14 * 24,
    });

    console.info(
      `[odds] ${ctx.competitionLabel}: ${targetMatches.length} meciuri țintă, ` +
      `${fixtures.length} fixtures OddsPortal, ${fdToOp.size} potrivite`,
    );
    
    if (fdToOp.size < targetMatches.length) {
      const unmatchedIds = targetMatches
        .filter((m) => !fdToOp.has(m.id))
        .map((m) => `${m.id}:${m.homeTeam?.name ?? "?"} vs ${m.awayTeam?.name ?? "?"}`);
      if (unmatchedIds.length > 0 && unmatchedIds.length <= 10) {
        console.warn(`[odds] Meciuri fără corespondent OddsPortal: ${unmatchedIds.join(", ")}`);
      }
    }

    const matches: Record<string, MatchOddsRow> = {};
    const errors: string[] = [];
    const referer = config.tournamentPageUrl;
    const concurrency = getConcurrency();

    await mapWithConcurrency(
      [...fdToOp.entries()],
      concurrency,
      async ([fdMatchId, fx]) => {
        try {
          let meta: OpEventMeta | null = await fetchEventMeta(config, fx.matchId, {
            eventPageUrl: fx.eventPageUrl,
          });
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
      console.warn(
        `[odds] OddsPortal fără meciuri actualizate: ${errors.slice(0, 5).join(" | ")}`,
      );
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
