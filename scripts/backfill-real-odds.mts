/**
 * Înlocuiește cotele estimate / inventate din snapshot cu cele reale de pe
 * OddsPortal, pentru meciurile unui turneu. Meciurile jucate își păstrează
 * cotele de închidere, pe care OddsPortal le publică pe pagina de rezultate.
 *
 * Implicit rulează în gol și doar raportează. Scrie în DB doar cu --apply.
 *
 *   npx tsx scripts/backfill-real-odds.mts --tournament "Kitman League - Etapa 4"
 *   npx tsx scripts/backfill-real-odds.mts --tournament "Kitman League - Etapa 4" --apply
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  computeUserWcTotals,
  type MatchPredictionInput,
} from "../src/lib/wc-scoring";
import {
  isPlausible1x2,
  isPlausibleCorrectScore,
  parseBettingOddsPayload,
  payloadToOddsMaps,
  sanitizeBettingPayload,
  type BettingOddsPayload,
  type MatchOddsRow,
} from "../src/lib/betting-odds";
import {
  fetchFtHtCsFeeds,
  fetchTournamentListingHtml,
  fetchTournamentResultFixtures,
  mergeScheduleFixtures,
  parseTournamentFixturesFromHtml,
} from "../src/lib/odds-providers/oddsportal/client";
import { getOddsPortalCompetition } from "../src/lib/odds-providers/oddsportal/competition-map";
import {
  mergeListingOddsOntoFixtures,
  parseListingFt1x2FromHtml,
  parseListingOddsMapFromHtml,
} from "../src/lib/odds-providers/oddsportal/parse-listing";
import {
  parse1x2FromFeed,
  parseCorrectScoreFromFeed,
  parseHtFtFromFeed,
} from "../src/lib/odds-providers/oddsportal/parse-odds";
import { mapFixturesToFootballDataMatches } from "../src/lib/odds-providers/team-matcher";
import { mapWithConcurrency } from "../src/lib/odds-providers/concurrency";
import type { FootballDataMatch } from "../src/lib/football-data-types";

const prisma = new PrismaClient();

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
}

const tournamentName = arg("tournament");
const apply = process.argv.includes("--apply");

if (!tournamentName) {
  console.error('Lipsește --tournament "<nume>"');
  process.exit(1);
}

const FD_TOKEN =
  process.env.FOOTBALL_DATA_TOKEN?.trim() || process.env.FOOTBALL_API_KEY?.trim() || "";

async function fetchMatches(code: string, season: string): Promise<FootballDataMatch[]> {
  const res = await fetch(
    `https://api.football-data.org/v4/competitions/${code}/matches?season=${season}`,
    { headers: { "X-Auth-Token": FD_TOKEN } },
  );
  if (!res.ok) throw new Error(`Football-Data ${res.status} pentru ${code}`);
  return ((await res.json()) as { matches: FootballDataMatch[] }).matches;
}

const margin = (o: Record<string, number>) =>
  Object.values(o).reduce((s, v) => s + (v >= 1 ? 1 / v : 0), 0);

const tournament = await prisma.tournament.findFirst({
  where: { name: tournamentName },
  select: {
    id: true,
    name: true,
    competition: true,
    competitions: true,
    selectedMatchIds: true,
  },
});

if (!tournament) {
  console.error(`Turneul „${tournamentName}” nu există.`);
  await prisma.$disconnect();
  process.exit(1);
}

const competitions = [
  ...new Set([tournament.competition, ...tournament.competitions].filter(Boolean)),
] as string[];
const selectedIds = new Set(tournament.selectedMatchIds);

console.log(
  `${tournament.name}: ${selectedIds.size} meciuri, competiții ${competitions.join(", ")}` +
    `\nmod: ${apply ? "APLICARE (scrie în DB)" : "simulare (nu scrie nimic)"}\n`,
);

/** Cotele înainte/după, pe id de meci, ca să putem compara punctajele. */
const allMatches: FootballDataMatch[] = [];
const beforeRows = new Map<string, MatchOddsRow>();
const afterRows = new Map<string, MatchOddsRow>();

for (const competition of competitions) {
  const [code, season] = competition.split("_") as [string, string];
  const config = getOddsPortalCompetition(code, season);
  if (!config) {
    console.log(`[${competition}] fără mapare OddsPortal — sărit`);
    continue;
  }

  const snapRow = await prisma.competitionBettingOdds.findUnique({
    where: { competition },
  });
  const snapshot = parseBettingOddsPayload(snapRow?.payload ?? null);
  if (!snapshot) {
    console.log(`[${competition}] fără snapshot — sărit`);
    continue;
  }

  const fdMatches = await fetchMatches(code, season);
  allMatches.push(...fdMatches);
  const targets = fdMatches.filter((m) => selectedIds.has(m.id));
  if (!targets.length) continue;

  for (const m of targets) {
    const row = snapshot.matches[String(m.id)];
    if (row) beforeRows.set(String(m.id), row);
  }

  const [listingHtml, resultFixtures] = await Promise.all([
    fetchTournamentListingHtml(config),
    fetchTournamentResultFixtures(config).catch(() => []),
  ]);
  const listing = mergeListingOddsOntoFixtures(
    parseTournamentFixturesFromHtml(listingHtml),
    parseListingFt1x2FromHtml(listingHtml),
    parseListingOddsMapFromHtml(listingHtml),
  );
  const fixtures = mergeScheduleFixtures(listing, resultFixtures);
  const fdToOp = mapFixturesToFootballDataMatches(fixtures, targets, {
    maxDiffHours: 14 * 24,
  });

  console.log(`[${competition}] ${targets.length} meciuri țintă, ${fdToOp.size} potrivite`);

  const nameById = new Map(
    targets.map((m) => [m.id, `${m.homeTeam?.name ?? "?"} - ${m.awayTeam?.name ?? "?"}`]),
  );

  const fetched = await mapWithConcurrency([...fdToOp.entries()], 4, async ([fdId, fx]) => {
    try {
      const feeds = await fetchFtHtCsFeeds({ matchId: fx.matchId }, config.tournamentPageUrl);
      return {
        fdId,
        ft1x2: parse1x2FromFeed(feeds.ft, 2),
        ht1x2: parse1x2FromFeed(feeds.ht, 3),
        correctScore: parseCorrectScoreFromFeed(feeds.cs),
        htFt: parseHtFtFromFeed(feeds.htFt),
      };
    } catch (e) {
      console.warn(`  ! ${nameById.get(fdId)}: ${e instanceof Error ? e.message : e}`);
      return null;
    }
  });

  const updated: Record<string, MatchOddsRow> = {};

  for (const f of fetched) {
    if (!f) continue;
    const key = String(f.fdId);
    const prev = snapshot.matches[key];
    const label = nameById.get(f.fdId) ?? key;

    if (!f.ft1x2 || !isPlausible1x2(f.ft1x2) || !isPlausibleCorrectScore(f.correctScore)) {
      console.log(`  - ${label}: OddsPortal n-a dat piață completă, se păstrează ce era`);
      continue;
    }

    const row: MatchOddsRow = {
      ft1x2: f.ft1x2,
      ht1x2: f.ht1x2 ?? prev?.ht1x2 ?? { HOME: 1, DRAW: 1, AWAY: 1 },
      htFt: Object.keys(f.htFt).length >= 6 ? f.htFt : prev?.htFt,
      correctScore: f.correctScore,
      toAdvance: prev?.toAdvance ?? null,
    };
    updated[key] = row;
    afterRows.set(key, row);

    const prevCs = prev?.correctScore ?? {};
    console.log(
      `  ✓ ${label}\n` +
        `      CS  ${Object.keys(prevCs).length} linii (marjă ${margin(prevCs).toFixed(3)})` +
        ` -> ${Object.keys(row.correctScore).length} linii (marjă ${margin(row.correctScore).toFixed(3)})\n` +
        `      FT  ${JSON.stringify(prev?.ft1x2 ?? null)} -> ${JSON.stringify(row.ft1x2)}\n` +
        `      HT  ${JSON.stringify(prev?.ht1x2 ?? null)} -> ${JSON.stringify(row.ht1x2)}`,
    );
  }

  if (apply && Object.keys(updated).length > 0) {
    const next: BettingOddsPayload = sanitizeBettingPayload({
      ...snapshot,
      matches: { ...snapshot.matches, ...updated },
    });
    await prisma.competitionBettingOdds.update({
      where: { competition },
      data: {
        payload: next as object,
        oddsSource: "oddsportal",
        geminiModel: null,
        fetchedAt: new Date(),
      },
    });
    console.log(`  → salvat: ${Object.keys(updated).length} meciuri în ${competition}`);
  }
}

// --- Impactul asupra clasamentului -----------------------------------------

const members = await prisma.tournamentMember.findMany({
  where: { tournamentId: tournament.id },
  select: {
    userId: true,
    displayName: true,
    user: { select: { firstName: true, lastName: true, email: true } },
  },
});
const predictions = await prisma.wcMatchPrediction.findMany({
  where: { tournamentId: tournament.id },
});

const scoredMatches = allMatches.filter((m) => selectedIds.has(m.id));

function mapsFrom(rows: Map<string, MatchOddsRow>, fallback: Map<string, MatchOddsRow>) {
  const matches: Record<string, MatchOddsRow> = {};
  for (const [k, v] of fallback) matches[k] = v;
  for (const [k, v] of rows) matches[k] = v;
  return payloadToOddsMaps({ schemaVersion: 1, matches, teams: {} });
}

const before = mapsFrom(new Map(), beforeRows);
const after = mapsFrom(afterRows, beforeRows);

type Line = { name: string; before: number; after: number };
const lines: Line[] = [];

for (const member of members) {
  const preds = new Map<number, MatchPredictionInput>();
  for (const p of predictions) {
    if (p.userId !== member.userId) continue;
    preds.set(p.matchId, p);
  }
  if (!preds.size) continue;
  const name =
    member.displayName ??
    [member.user.firstName, member.user.lastName].filter(Boolean).join(" ") ??
    member.user.email;
  lines.push({
    name: name || member.userId,
    before: computeUserWcTotals(preds, scoredMatches, before).total,
    after: computeUserWcTotals(preds, scoredMatches, after).total,
  });
}

lines.sort((a, b) => b.after - a.after);
const rankBefore = new Map(
  [...lines].sort((a, b) => b.before - a.before).map((l, i) => [l.name, i + 1]),
);

console.log("\n=== Clasament: acum -> cu cotele reale ===");
console.log("loc  membru                        acum      corectat   diferență");
for (const [i, l] of lines.entries()) {
  const was = rankBefore.get(l.name) ?? 0;
  const move = was === i + 1 ? "  " : was > i + 1 ? `+${was - i - 1}` : `${was - i - 1}`;
  console.log(
    `${String(i + 1).padStart(3)}  ${l.name.slice(0, 28).padEnd(28)} ` +
      `${l.before.toFixed(2).padStart(9)} ${l.after.toFixed(2).padStart(10)} ` +
      `${(l.after - l.before).toFixed(2).padStart(10)}  ${move}`,
  );
}

if (!apply) {
  console.log("\n(simulare — nimic salvat. Rulează din nou cu --apply ca să scrii în DB.)");
}

await prisma.$disconnect();
