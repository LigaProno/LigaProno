import {
  BETTING_ODDS_SCHEMA_VERSION,
  fillEstimatedQualifyOdds,
  fillEstimatedToAdvanceOdds,
  isPlausible1x2,
  type BettingOddsPayload,
  type MatchOddsRow,
  type TeamOddsRow,
} from "@/lib/betting-odds";
import { isKnockoutStage } from "@/lib/knockout-predictions";
import {
  fetchOutrightWinnerFeed,
  fetchTournamentListingHtml,
  parseTournamentFixturesFromHtml,
  type OpScheduleFixture,
} from "@/lib/odds-providers/oddsportal/client";
import { getOddsPortalCompetition } from "@/lib/odds-providers/oddsportal/competition-map";
import { parseOutrightWinnerFromFeed } from "@/lib/odds-providers/oddsportal/parse-odds";
import {
  mergeListingOddsOntoFixtures,
  parseListingFt1x2FromHtml,
} from "@/lib/odds-providers/oddsportal/parse-listing";
import { fillEstimatedMatchMarkets } from "@/lib/odds-providers/estimate-from-1x2";
import {
  mapFixturesToFootballDataMatches,
  matchOutrightTeamName,
} from "@/lib/odds-providers/team-matcher";
import { matchesInOddsHorizon } from "@/lib/odds-horizon";
import type { OddsFetchContext, OddsFetchResult, OddsProvider } from "@/lib/odds-providers/types";
import type { FootballDataMatch } from "@/lib/football-data-types";

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

function listingFixtures(html: string): OpScheduleFixture[] {
  const fixtures = parseTournamentFixturesFromHtml(html);
  const listing = parseListingFt1x2FromHtml(html);
  const withOdds = mergeListingOddsOntoFixtures(fixtures, listing);

  const known = new Set(withOdds.map((f) => f.matchId));
  for (const row of listing) {
    if (known.has(row.matchId)) continue;
    known.add(row.matchId);
    withOdds.push({
      matchId: row.matchId,
      home: row.home,
      away: row.away,
      startDateIso: null,
      stadium: null,
      city: null,
      country: null,
      eventPageUrl: row.eventPageUrl,
      ft1x2: row.ft1x2,
    });
  }
  return withOdds;
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
    const html = await fetchTournamentListingHtml(config);
    const fixtures = listingFixtures(html);

    // Football-Data pune adesea toată etapa Superliga la aceeași oră placeholder.
    const fdToOp = mapFixturesToFootballDataMatches(fixtures, targetMatches, {
      maxDiffHours: 14 * 24,
    });

    const listingWithOdds = fixtures.filter((f) => f.ft1x2 && isPlausible1x2(f.ft1x2)).length;
    console.info(
      `[odds] ${ctx.competitionLabel}: ${targetMatches.length} meciuri țintă, ` +
        `${fixtures.length} fixtures OddsPortal (${listingWithOdds} cu 1X2 din listing), ` +
        `${fdToOp.size} potrivite`,
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

    for (const [fdMatchId, fx] of fdToOp.entries()) {
      const ft = fx.ft1x2 && isPlausible1x2(fx.ft1x2) ? fx.ft1x2 : null;
      if (!ft) {
        errors.push(`fără 1X2 listing: ${fx.matchId}`);
        continue;
      }
      const fallback1x2 = { HOME: 1, DRAW: 1, AWAY: 1 } as MatchOddsRow["ft1x2"];
      matches[String(fdMatchId)] = fillEstimatedMatchMarkets({
        ft1x2: ft,
        ht1x2: fallback1x2,
        htFt: {},
        correctScore: {},
      });
    }

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
      errors.push(`outright: ${e instanceof Error ? e.message : "eroare"}`);
    }

    if (Object.keys(matches).length === 0) {
      const hint = errors.slice(0, 5).join(" | ") || "listing fără 1X2 mapabil";
      console.warn(`[odds] OddsPortal fără meciuri actualizate: ${hint}`);
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
