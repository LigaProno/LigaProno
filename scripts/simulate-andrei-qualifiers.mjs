/**
 * Simulează calificările din grupe pentru un membru (Cupa betivilor)
 * pe baza pronosticurilor sale la meciurile de grupă.
 *
 * Usage: node scripts/simulate-user-qualifiers.mjs [firstName] [lastName]
 * Ex:    node scripts/simulate-user-qualifiers.mjs catalin buhus
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FOOTBALL_BASE = "https://api.football-data.org/v4";
const WC_GROUP_LETTERS = "ABCDEFGHIJKL".split("");
const WC_BEST_THIRD_PLACES_COUNT = 8;

function getToken() {
  return (
    process.env.FOOTBALL_DATA_TOKEN?.trim() ||
    process.env.FOOTBALL_API_KEY?.trim()
  );
}

async function fetchMatches(code, season) {
  const token = getToken();
  if (!token) throw new Error("Missing FOOTBALL_DATA_TOKEN");
  const collected = [];
  let offset = 0;
  while (true) {
    const url = new URL(`${FOOTBALL_BASE}/competitions/${code}/matches`);
    url.searchParams.set("season", season);
    url.searchParams.set("limit", "100");
    url.searchParams.set("offset", String(offset));
    const res = await fetch(url, {
      headers: { "X-Auth-Token": token, Accept: "application/json" },
    });
    const data = await res.json();
    const batch = data.matches ?? [];
    collected.push(...batch);
    if (batch.length < 100) break;
    offset += 100;
  }
  return collected;
}

function matchGroupToGroupKey(groupRaw) {
  if (!groupRaw?.trim()) return null;
  const gu = groupRaw.trim().toUpperCase();
  let m = gu.match(/^GROUP_([A-Z])$/);
  if (m) return `Group ${m[1]}`;
  m = gu.match(/^([A-Z])$/);
  if (m) return `Group ${m[1]}`;
  return null;
}

function buildTeamIdToGroupKeyFromMatches(matches) {
  const map = new Map();
  for (const m of matches) {
    if ((m.stage ?? "") !== "GROUP_STAGE") continue;
    const gk = matchGroupToGroupKey(m.group);
    if (!gk) continue;
    if (m.homeTeam?.id != null) map.set(m.homeTeam.id, gk);
    if (m.awayTeam?.id != null) map.set(m.awayTeam.id, gk);
  }
  return map;
}

function predictedScore(pred) {
  if (pred.predHomeGoals != null && pred.predAwayGoals != null) {
    return { home: pred.predHomeGoals, away: pred.predAwayGoals };
  }
  if (pred.ftOutcome === "HOME") return { home: 1, away: 0 };
  if (pred.ftOutcome === "AWAY") return { home: 0, away: 1 };
  if (pred.ftOutcome === "DRAW") return { home: 1, away: 1 };
  return null;
}

function compareRows(a, b) {
  if (b.points !== a.points) return b.points - a.points;
  const gdA = a.goalsFor - a.goalsAgainst;
  const gdB = b.goalsFor - b.goalsAgainst;
  if (gdB !== gdA) return gdB - gdA;
  return b.goalsFor - a.goalsFor;
}

function deriveAdvancingTeamIds(matches, predsByMatchId) {
  const teamToGroup = buildTeamIdToGroupKeyFromMatches(matches);
  const statsByTeamId = new Map();

  for (const m of matches) {
    if ((m.stage ?? "") !== "GROUP_STAGE") continue;
    for (const t of [m.homeTeam, m.awayTeam]) {
      if (t?.id == null || statsByTeamId.has(t.id)) continue;
      statsByTeamId.set(t.id, {
        team: t,
        played: 0,
        won: 0,
        draw: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
      });
    }
  }

  let groupPredCount = 0;
  for (const m of matches) {
    if ((m.stage ?? "") !== "GROUP_STAGE") continue;
    const pred = predsByMatchId.get(m.id);
    if (!pred) continue;
    const score = predictedScore(pred);
    if (!score) continue;
    groupPredCount++;

    const hid = m.homeTeam?.id;
    const aid = m.awayTeam?.id;
    if (hid == null || aid == null) continue;
    const hs = statsByTeamId.get(hid);
    const as = statsByTeamId.get(aid);
    if (!hs || !as) continue;

    hs.played++;
    as.played++;
    hs.goalsFor += score.home;
    hs.goalsAgainst += score.away;
    as.goalsFor += score.away;
    as.goalsAgainst += score.home;

    if (score.home > score.away) {
      hs.won++;
      hs.points += 3;
      as.lost++;
    } else if (score.away > score.home) {
      as.won++;
      as.points += 3;
      hs.lost++;
    } else {
      hs.draw++;
      as.draw++;
      hs.points += 1;
      as.points += 1;
    }
  }

  const byGroup = new Map();
  for (const letter of WC_GROUP_LETTERS) {
    byGroup.set(`Group ${letter}`, []);
  }
  for (const [teamId, st] of statsByTeamId) {
    const gk = teamToGroup.get(teamId);
    if (!gk || !byGroup.has(gk)) continue;
    byGroup.get(gk).push({
      team: st.team,
      points: st.points,
      goalsFor: st.goalsFor,
      goalsAgainst: st.goalsAgainst,
      goalDifference: st.goalsFor - st.goalsAgainst,
    });
  }

  const qualified = new Set();
  const thirdPlaces = [];

  for (const [, rows] of byGroup) {
    rows.sort(compareRows);
    for (let i = 0; i < Math.min(2, rows.length); i++) {
      const id = rows[i]?.team?.id;
      if (id != null) qualified.add(id);
    }
    if (rows.length >= 3) thirdPlaces.push(rows[2]);
  }

  thirdPlaces.sort(compareRows);
  for (const row of thirdPlaces.slice(0, WC_BEST_THIRD_PLACES_COUNT)) {
    const id = row.team?.id;
    if (id != null) qualified.add(id);
  }

  return { ids: [...qualified], groupPredCount };
}

function parseCompetition(s) {
  const m = /^([A-Z0-9]+)_(\d{4})$/i.exec(s?.trim() ?? "");
  if (!m) return null;
  return { code: m[1].toUpperCase(), season: m[2] };
}

function normalizeName(s) {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function findMember(members, firstNameNeedle, lastNameNeedle) {
  const fn = normalizeName(firstNameNeedle);
  const ln = normalizeName(lastNameNeedle);
  return members.find((m) => {
    const mfn = normalizeName(m.user.firstName);
    const mln = normalizeName(m.user.lastName);
    return mfn.includes(fn) && mln.includes(ln);
  });
}

async function main() {
  const firstNameNeedle = process.argv[2]?.trim() || "andrei";
  const lastNameNeedle = process.argv[3]?.trim() || "baesu";

  const tournament = await prisma.tournament.findFirst({
    where: { name: { contains: "betivilor", mode: "insensitive" } },
    include: { members: { include: { user: true } } },
  });
  if (!tournament) throw new Error("Turneul Cupa betivilor nu a fost găsit.");

  const member = findMember(tournament.members, firstNameNeedle, lastNameNeedle);
  if (!member) {
    throw new Error(
      `Membrul „${firstNameNeedle} ${lastNameNeedle}” nu e în turneu.`,
    );
  }

  const parsed = parseCompetition(tournament.competition);
  if (!parsed) throw new Error("Competiție invalidă pe turneu.");

  const matches = await fetchMatches(parsed.code, parsed.season);
  const preds = await prisma.wcMatchPrediction.findMany({
    where: { tournamentId: tournament.id, userId: member.userId },
  });

  const predsByMatchId = new Map(
    preds.map((p) => [
      p.matchId,
      {
        htOutcome: p.htOutcome,
        ftOutcome: p.ftOutcome,
        predHomeGoals: p.predHomeGoals,
        predAwayGoals: p.predAwayGoals,
      },
    ]),
  );

  const { ids, groupPredCount } = deriveAdvancingTeamIds(matches, predsByMatchId);
  console.log(`Pronosticuri grupă folosite: ${groupPredCount}`);
  console.log(`Echipe calificate simulate: ${ids.length}`);

  const existing = await prisma.wcExtraPrediction.findUnique({
    where: {
      tournamentId_userId: {
        tournamentId: tournament.id,
        userId: member.userId,
      },
    },
  });

  await prisma.wcExtraPrediction.upsert({
    where: {
      tournamentId_userId: {
        tournamentId: tournament.id,
        userId: member.userId,
      },
    },
    create: {
      tournamentId: tournament.id,
      userId: member.userId,
      advancingTeamIds: ids,
      championTeamId: existing?.championTeamId ?? null,
    },
    update: {
      advancingTeamIds: ids,
    },
  });

  console.log(
    `Salvat wcExtraPrediction pentru ${member.user.firstName} ${member.user.lastName} (${ids.length} echipe).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
