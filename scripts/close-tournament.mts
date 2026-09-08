/**
 * Recalculează punctajele din cache pentru un turneu, îl marchează închis și
 * acordă badge-ul de câștigător — aceeași logică pe care o rulează cronul, dar
 * pentru un singur turneu și fără să trimită emailuri.
 *
 * Necesar când cronul de cote a rămas fără timp înainte să ajungă la închidere.
 *
 *   npx tsx scripts/close-tournament.mts "Kitman League - Etapa 4"
 *   npx tsx scripts/close-tournament.mts "Kitman League - Etapa 4" --apply
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  computeUserWcTotals,
  type MatchPredictionInput,
} from "../src/lib/wc-scoring";
import {
  mergeBettingPayloads,
  parseBettingOddsPayload,
  payloadToOddsMaps,
  type BettingOddsPayload,
} from "../src/lib/betting-odds";
import { filterMatchesForTournament } from "../src/lib/wc-pred-display";
import { isMatchSettled, isMatchVoidForTournament } from "../src/lib/match-status";
import type { FootballDataMatch } from "../src/lib/football-data-types";

const prisma = new PrismaClient();

const name = process.argv[2];
const apply = process.argv.includes("--apply");

if (!name) {
  console.error('Lipsește numele turneului: npx tsx scripts/close-tournament.mts "<nume>"');
  process.exit(1);
}

const FD_TOKEN =
  process.env.FOOTBALL_DATA_TOKEN?.trim() || process.env.FOOTBALL_API_KEY?.trim() || "";

const tournament = await prisma.tournament.findFirst({
  where: { name },
  select: {
    id: true,
    name: true,
    isPublic: true,
    closedAt: true,
    competition: true,
    competitions: true,
    selectedMatchIds: true,
    startMatchday: true,
    endMatchday: true,
    members: {
      select: {
        id: true,
        userId: true,
        displayName: true,
        cachedTotal: true,
        user: { select: { firstName: true, lastName: true, email: true } },
      },
    },
    win: { select: { userId: true, finalTotal: true } },
  },
});

if (!tournament) {
  console.error(`Turneul „${name}” nu există.`);
  await prisma.$disconnect();
  process.exit(1);
}

const competitions = [
  ...new Set([tournament.competition, ...tournament.competitions].filter(Boolean)),
] as string[];

/** Meciuri + cote, exact ca în contextul de scoring al cronului. */
const byId = new Map<number, FootballDataMatch>();
let mergedOdds: BettingOddsPayload | null = null;

for (const competition of competitions) {
  const [code, season] = competition.split("_");
  const res = await fetch(
    `https://api.football-data.org/v4/competitions/${code}/matches?season=${season}`,
    { headers: { "X-Auth-Token": FD_TOKEN } },
  );
  if (res.ok) {
    for (const m of ((await res.json()) as { matches: FootballDataMatch[] }).matches) {
      byId.set(m.id, m);
    }
  } else {
    console.warn(`  ! ${competition}: Football-Data ${res.status}`);
  }

  const snap = await prisma.competitionBettingOdds.findUnique({ where: { competition } });
  const payload = parseBettingOddsPayload(snap?.payload ?? null);
  if (payload) {
    mergedOdds = mergedOdds ? mergeBettingPayloads(mergedOdds, payload) : payload;
  }
}

const allMatches = [...byId.values()];
const oddsMaps = payloadToOddsMaps(mergedOdds) ?? undefined;
const inWindow = filterMatchesForTournament(allMatches, tournament);
const complete =
  inWindow.length > 0 &&
  inWindow.every((m) => isMatchSettled(m) || isMatchVoidForTournament(m));

console.log(
  `${tournament.name}\n` +
    `  public=${tournament.isPublic}  închis=${tournament.closedAt?.toISOString() ?? "nu"}\n` +
    `  meciuri în fereastră: ${inWindow.length}, toate decise: ${complete}\n` +
    `  mod: ${apply ? "APLICARE" : "simulare"}\n`,
);

if (!complete) {
  console.error("Turneul nu e complet — nu se închide. Verifică meciurile nedecise.");
  await prisma.$disconnect();
  process.exit(1);
}

const predictions = await prisma.wcMatchPrediction.findMany({
  where: { tournamentId: tournament.id },
});

type Row = {
  memberId: string;
  userId: string;
  name: string;
  cached: number;
  fg: number;
  pg: number;
  sc: number;
  total: number;
};
const rows: Row[] = [];

for (const member of tournament.members) {
  const preds = new Map<number, MatchPredictionInput>();
  for (const p of predictions) {
    if (p.userId === member.userId) preds.set(p.matchId, p);
  }
  const totals = computeUserWcTotals(preds, inWindow, oddsMaps);
  const fullName = [member.user.firstName, member.user.lastName].filter(Boolean).join(" ");
  rows.push({
    memberId: member.id,
    userId: member.userId,
    name: member.displayName || fullName || member.user.email || member.userId,
    cached: member.cachedTotal,
    fg: totals.fullTimeGuessPoints,
    pg: totals.halfTimeGuessPoints,
    sc: totals.correctScorePoints,
    total: totals.total,
  });
}

rows.sort((a, b) => b.total - a.total);

console.log("loc  membru                        cache vechi   recalculat");
for (const [i, r] of rows.slice(0, 10).entries()) {
  console.log(
    `${String(i + 1).padStart(3)}  ${r.name.slice(0, 28).padEnd(28)} ` +
      `${String(r.cached).padStart(11)} ${r.total.toFixed(2).padStart(12)}`,
  );
}

const winner = rows[0];
const previousWinner = tournament.win
  ? (rows.find((r) => r.userId === tournament.win!.userId)?.name ?? tournament.win.userId)
  : null;
console.log(
  `\ncâștigător: ${winner?.name} cu ${winner?.total.toFixed(2)}` +
    (previousWinner ? `\nbadge deja acordat lui ${previousWinner} — nu se atinge` : ""),
);

if (!apply) {
  console.log("\n(simulare — nimic salvat. Rulează din nou cu --apply.)");
  await prisma.$disconnect();
  process.exit(0);
}

// `cached*` sunt Int în schema, deci punctajul zecimal se rotunjește la scriere.
for (const r of rows) {
  await prisma.tournamentMember.update({
    where: { id: r.memberId },
    data: {
      cachedFg: Math.round(r.fg),
      cachedPg: Math.round(r.pg),
      cachedSc: Math.round(r.sc),
      cachedTotal: Math.round(r.total),
      scoreUpdatedAt: new Date(),
    },
  });
}
console.log(`\npunctaje actualizate: ${rows.length} membri`);

if (!tournament.win && tournament.isPublic && winner) {
  await prisma.tournamentWin.create({
    data: {
      userId: winner.userId,
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      finalTotal: Math.round(winner.total),
    },
  });
  console.log(`badge acordat: ${winner.name}`);
}

if (!tournament.closedAt) {
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { closedAt: new Date() },
  });
  console.log("turneu marcat închis");
}

console.log(
  "\nNotă: emailul de clasament final NU a fost trimis de acest script.",
);

await prisma.$disconnect();
