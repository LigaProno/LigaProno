import {
  BETTING_ODDS_SCHEMA_VERSION,
  fillEstimatedQualifyOdds,
  fillEstimatedToAdvanceOdds,
  isPlausible1x2,
  isPlausibleCorrectScore,
  type BettingOddsPayload,
  type MatchOddsRow,
  type TeamOddsRow,
} from "@/lib/betting-odds";
import { isKnockoutStage } from "@/lib/knockout-predictions";
import {
  fetchDerivedMarketFeeds,
  fetchFtHtCsFeeds,
  fetchOutrightWinnerFeed,
  fetchTournamentListingHtml,
  fetchTournamentResultFixtures,
  mergeScheduleFixtures,
  parseTournamentFixturesFromHtml,
  type OpScheduleFixture,
} from "@/lib/odds-providers/oddsportal/client";
import { getOddsPortalCompetition } from "@/lib/odds-providers/oddsportal/competition-map";
import {
  parse1x2FromFeed,
  parseCorrectScoreFromFeed,
  parseHtFtFromFeed,
  parseOutrightWinnerFromFeed,
} from "@/lib/odds-providers/oddsportal/parse-odds";
import { mapWithConcurrency } from "@/lib/odds-providers/concurrency";
import {
  mergeListingOddsOntoFixtures,
  parseListingFt1x2FromHtml,
  parseListingOddsMapFromHtml,
} from "@/lib/odds-providers/oddsportal/parse-listing";
import {
  mapFixturesToFootballDataMatches,
  matchOutrightTeamName,
} from "@/lib/odds-providers/team-matcher";
import { matchesInOddsHorizon } from "@/lib/odds-horizon";
import type { OddsFetchContext, OddsFetchResult, OddsProvider } from "@/lib/odds-providers/types";
import type { FootballDataMatch } from "@/lib/football-data-types";

/**
 * Cât înainte de kick-off recerem piețele, ca meciul să fie înghețat pe cotele
 * de închidere și nu pe cele de acum trei săptămâni.
 */
const FEED_REFRESH_BEFORE_KICKOFF_MS = 48 * 60 * 60 * 1000;

/**
 * Câte meciuri per competiție primesc cerere de piețe reale. Cronul are un buget
 * de 5 minute pentru toate ligile, iar fiecare meci înseamnă trei cereri.
 */
function getMatchFeedLimit(): number {
  const raw = Number(process.env.ODDSPORTAL_MATCH_FEED_LIMIT?.trim());
  return Number.isFinite(raw) && raw >= 0 ? raw : 24;
}

function getFeedConcurrency(): number {
  const raw = Number(process.env.ODDSPORTAL_FEED_CONCURRENCY?.trim());
  return Number.isFinite(raw) && raw >= 1 ? raw : 5;
}

/**
 * Buget de timp per competiție pentru cererile de piețe. Ce nu apucă să intre
 * rămâne pe cotele existente și se completează la rularea următoare — meciurile
 * fiind ordonate după kick-off, cele urgente se prind primele.
 */
function getFeedBudgetMs(): number {
  const raw = Number(process.env.ODDSPORTAL_FEED_BUDGET_MS?.trim());
  return Number.isFinite(raw) && raw >= 0 ? raw : 30_000;
}

/** Fereastra upcoming + meciuri marcate explicit (terminate fără CS). */
function resolveTargetMatches(ctx: OddsFetchContext): FootballDataMatch[] {
  const byId = new Map(ctx.matches.map((m) => [m.id, m]));
  const out = new Map<number, FootballDataMatch>();
  for (const m of matchesInOddsHorizon(ctx.matches)) out.set(m.id, m);
  for (const id of ctx.lockedMatchIds ?? []) out.delete(Number(id));
  // Un meci înghețat cu piețe lipsă rămâne țintă: cotele salvate nu se schimbă
  // la unire, dar golul trebuie umplut, altfel rămâne punctat pe cotă 1.
  for (const id of ctx.matchIdsNeedingOddsRefresh ?? []) {
    const m = byId.get(id);
    if (m && m.status !== "CANCELLED") out.set(m.id, m);
  }
  return [...out.values()];
}

function listingFixtures(html: string): OpScheduleFixture[] {
  const fixtures = parseTournamentFixturesFromHtml(html);
  // Tabelul randat pe server a dispărut; cotele vin acum din payload-ul JSON.
  // Îl păstrăm pe cel vechi ca sursă preferată, dacă OddsPortal îl mai trimite.
  const listing = parseListingFt1x2FromHtml(html);
  const oddsMap = parseListingOddsMapFromHtml(html);
  const withOdds = mergeListingOddsOntoFixtures(fixtures, listing, oddsMap);

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
      ft1x2: row.ft1x2 ?? oddsMap.get(row.matchId) ?? null,
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
    let fixtures = listingFixtures(html);

    // Meciurile jucate dispar din listing, dar OddsPortal le păstrează cotele de
    // închidere pe pagina de rezultate. Fără ele n-am putea completa niciodată o
    // piață lipsă la un meci deja disputat.
    if (targetMatches.some((m) => Date.parse(m.utcDate) <= Date.now())) {
      try {
        fixtures = mergeScheduleFixtures(fixtures, await fetchTournamentResultFixtures(config));
      } catch (e) {
        console.warn(
          `[odds] ${ctx.competitionLabel}: pagina de rezultate indisponibilă ` +
            `(${e instanceof Error ? e.message : e}).`,
        );
      }
    }

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

    const mapped = [...fdToOp.entries()];

    // Piețele reale (pauză, scor corect, pauză/final) se cer per meci, deci sunt
    // scumpe. Le cerem doar unde lipsesc și încă o dată înainte de kick-off, ca
    // punctajul înghețat să folosească cotele de închidere.
    const kickoffById = new Map(targetMatches.map((m) => [m.id, Date.parse(m.utcDate)]));
    const missingOdds = new Set(ctx.matchIdsNeedingOddsRefresh ?? []);
    const now = Date.now();

    const feedTargets = mapped
      .filter(([fdMatchId, fx]) => {
        if (missingOdds.has(fdMatchId)) return true;
        // Fără 1X2 în listing (meci jucat) singura sursă rămâne feed-ul.
        if (!fx.ft1x2 || !isPlausible1x2(fx.ft1x2)) return true;
        const kick = kickoffById.get(fdMatchId);
        return kick != null && kick - now <= FEED_REFRESH_BEFORE_KICKOFF_MS;
      })
      .sort(
        (a, b) =>
          (kickoffById.get(a[0]) ?? Infinity) - (kickoffById.get(b[0]) ?? Infinity),
      )
      .slice(0, getMatchFeedLimit());

    const feedDeadline = Date.now() + getFeedBudgetMs();
    let skippedForBudget = 0;

    const derived = await mapWithConcurrency(
      feedTargets,
      getFeedConcurrency(),
      async ([fdMatchId, fx]) => {
        type Derived = {
          fdMatchId: number;
          ft1x2: MatchOddsRow["ft1x2"] | null;
          ht1x2: MatchOddsRow["ht1x2"] | null;
          correctScore: Record<string, number>;
          htFt: Record<string, number>;
        };
        const empty: Derived = {
          fdMatchId,
          ft1x2: null,
          ht1x2: null,
          correctScore: {},
          htFt: {},
        };
        if (Date.now() > feedDeadline) {
          skippedForBudget++;
          return empty;
        }
        // Doar meciurile fără 1X2 în listing plătesc cererea în plus pentru FT.
        const needFt = !fx.ft1x2 || !isPlausible1x2(fx.ft1x2);
        try {
          const target = { matchId: fx.matchId };
          const feeds =
            needFt ?
              await fetchFtHtCsFeeds(target, config.tournamentPageUrl)
            : { ft: null, ...(await fetchDerivedMarketFeeds(target, config.tournamentPageUrl)) };
          return {
            fdMatchId,
            ft1x2: needFt ? parse1x2FromFeed(feeds.ft, 2) : null,
            ht1x2: parse1x2FromFeed(feeds.ht, 3),
            correctScore: parseCorrectScoreFromFeed(feeds.cs),
            htFt: parseHtFtFromFeed(feeds.htFt),
          };
        } catch (e) {
          errors.push(
            `piețe ${fx.matchId}: ${e instanceof Error ? e.message : "eroare"}`,
          );
          return empty;
        }
      },
    );
    const derivedById = new Map(derived.map((d) => [d.fdMatchId, d]));
    if (skippedForBudget > 0) {
      console.warn(
        `[odds] ${ctx.competitionLabel}: ${skippedForBudget} meciuri amânate ` +
          `(buget de timp depășit); se reiau la rularea următoare.`,
      );
    }

    let realMarketCount = 0;
    /** Meciuri cerute, dar rămase fără scor corect real — golul de raportat. */
    const missingCorrectScore: string[] = [];
    const requestedIds = new Set(feedTargets.map(([fdMatchId]) => fdMatchId));
    const fallback1x2 = { HOME: 1, DRAW: 1, AWAY: 1 } as MatchOddsRow["ft1x2"];

    for (const [fdMatchId, fx] of mapped) {
      const d = derivedById.get(fdMatchId);
      const ft = fx.ft1x2 && isPlausible1x2(fx.ft1x2) ? fx.ft1x2 : d?.ft1x2;
      if (!ft) {
        errors.push(`fără 1X2: ${fx.matchId}`);
        continue;
      }
      // Piețele necerute rămân goale intenționat: la unire, un rând gol lasă pe
      // loc cotele reale salvate anterior, în loc să le suprascrie cu nimic.
      matches[String(fdMatchId)] = {
        ft1x2: ft,
        ht1x2: d?.ht1x2 ?? fallback1x2,
        htFt: d?.htFt ?? {},
        correctScore: d?.correctScore ?? {},
      };
      if (isPlausibleCorrectScore(d?.correctScore)) realMarketCount++;
      else if (requestedIds.has(fdMatchId)) missingCorrectScore.push(fx.matchId);
    }

    console.info(
      `[odds] ${ctx.competitionLabel}: piețe reale cerute pentru ` +
        `${feedTargets.length}/${mapped.length} meciuri, ` +
        `${realMarketCount} cu scor corect obținut`,
    );

    // Fără cote inventate în locul lor, un gol aici înseamnă meciuri punctate pe
    // cotă implicită. Îl semnalăm tare, ca să nu-l descoperim din reclamații.
    if (missingCorrectScore.length > 0) {
      console.warn(
        `[odds] ${ctx.competitionLabel}: ${missingCorrectScore.length} meciuri cerute au ` +
          `rămas fără scor corect real (${missingCorrectScore.slice(0, 8).join(", ")}` +
          `${missingCorrectScore.length > 8 ? ", …" : ""}). ` +
          `Se reiau la rularea următoare, inclusiv după kick-off de pe pagina de rezultate.`,
      );
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
