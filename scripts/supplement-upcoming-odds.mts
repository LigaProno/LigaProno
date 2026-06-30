/**
 * Completează cotele lipsă pentru meciuri viitoare fără re-fetch OddsPortal.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { fetchCompetitionMatches, collectTeamsFromMatches } from "../src/lib/football-data.ts";
import {
  fillEstimatedQualifyOdds,
  fillEstimatedToAdvanceOdds,
  mergeBettingPayloads,
  parseBettingOddsPayload,
} from "../src/lib/betting-odds.ts";
import { parseStoredCompetition } from "../src/lib/competition.ts";
import { isKnockoutStage } from "../src/lib/knockout-predictions.ts";
import { supplementOddsWithGemini } from "../src/lib/odds-supplement.ts";

const prisma = new PrismaClient();
const competition = process.argv[2]?.trim() || "WC_2026";

const parsed = parseStoredCompetition(competition);
if (!parsed) throw new Error(`Competiție invalidă: ${competition}`);

const row = await prisma.competitionBettingOdds.findUnique({
  where: { competition },
});
let payload = parseBettingOddsPayload(row?.payload ?? null);
if (!payload) {
  payload = { schemaVersion: 1, matches: {}, teams: {} };
}

console.log("Încărcare meciuri Football-Data...");
const matches = await fetchCompetitionMatches(parsed.code, parsed.season);
const teams = collectTeamsFromMatches(matches)
  .filter((t) => t.id != null)
  .map((t) => ({
    id: t.id!,
    name: t.name ?? t.shortName ?? `Team ${t.id}`,
  }));

const ctx = {
  competitionLabel: `${parsed.code} ${parsed.season}`,
  code: parsed.code,
  season: parsed.season,
  matches,
  teams,
};

console.log("Completare cote via Gemini...");
const supplement = await supplementOddsWithGemini(payload, ctx);
payload = supplement.payload;
payload = fillEstimatedQualifyOdds(payload);
const koMatchIds = matches.filter((m) => isKnockoutStage(m.stage)).map((m) => m.id);
payload = fillEstimatedToAdvanceOdds(payload, koMatchIds);

await prisma.competitionBettingOdds.upsert({
  where: { competition },
  create: {
    competition,
    payload: payload as object,
    oddsSource: `${row?.oddsSource ?? "unknown"}+gemini-backfill`,
  },
  update: {
    payload: payload as object,
    oddsSource: `${row?.oddsSource ?? "unknown"}+gemini-backfill`,
    fetchedAt: new Date(),
  },
});

console.log(
  JSON.stringify(
    {
      ok: true,
      supplementedTeams: supplement.supplementedTeams,
      supplementedMatchCount: supplement.supplementedMatchCount,
      totalMatchesInPayload: Object.keys(payload.matches).length,
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
