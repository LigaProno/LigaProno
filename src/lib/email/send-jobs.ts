import { parseStoredCompetition } from "@/lib/competition";
import { payloadToOddsMaps } from "@/lib/betting-odds";
import { loadCompetitionOddsSnapshot } from "@/lib/competition-odds";
import {
  fetchCompetitionMatches,
  type FootballDataMatch,
} from "@/lib/football-data";
import { sendEmail } from "@/lib/email/mailer";
import { renderDailyDigestEmail } from "@/lib/email/templates/daily-digest";
import { renderPredictionReminderEmail } from "@/lib/email/templates/prediction-reminder";
import { renderStageRankingEmail } from "@/lib/email/templates/stage-ranking";
import {
  addDaysToDateKey,
  appBaseUrl,
  formatBucharestDateLabel,
  formatDateKeyBucharest,
  formatKickoffBucharest,
  matchDateKeyBucharest,
} from "@/lib/email/time";
import { prisma } from "@/lib/prisma";
import {
  filterMatchesForTournament,
  formatPredShort,
  getMatchPredDisplay,
  hasAnyMatchPrediction,
  matchResultHtFt,
} from "@/lib/wc-pred-display";
import {
  computeMatchPoints,
  type MatchPredictionInput,
} from "@/lib/wc-scoring";

export type EmailJobResult = {
  attempted: number;
  sent: number;
  skipped: number;
  errors: string[];
};

async function tryClaimDispatch(kind: string, key: string): Promise<boolean> {
  try {
    await prisma.emailDispatchLog.create({ data: { kind, key } });
    return true;
  } catch {
    return false;
  }
}

function displayName(first?: string | null, last?: string | null): string {
  const s = `${first ?? ""} ${last ?? ""}`.trim();
  return s.length > 0 ? s : "Membru";
}

/** Nume complet de echipă (nu TLA / abreviere). */
function fullTeamName(
  team: FootballDataMatch["homeTeam"] | undefined,
): string {
  if (!team) return "—";
  const name = team.name?.trim();
  if (name) return name;
  const short = team.shortName?.trim();
  if (short) return short;
  return team.tla?.trim() || "—";
}

function fixtureFullName(m: FootballDataMatch): string {
  return `${fullTeamName(m.homeTeam)} – ${fullTeamName(m.awayTeam)}`;
}

function formatPoints(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

async function loadMatchesByCompetition(
  competitions: string[],
): Promise<Map<string, FootballDataMatch[]>> {
  const map = new Map<string, FootballDataMatch[]>();
  await Promise.all(
    competitions.map(async (competition) => {
      const parsed = parseStoredCompetition(competition);
      if (!parsed) return;
      try {
        const matches = await fetchCompetitionMatches(parsed.code, parsed.season);
        map.set(competition, matches);
      } catch (error) {
        console.error("[email] fetch matches failed", competition, error);
      }
    }),
  );
  return map;
}

async function loadOddsMapsByCompetition(competitions: string[]) {
  const map = new Map<string, ReturnType<typeof payloadToOddsMaps>>();
  await Promise.all(
    competitions.map(async (competition) => {
      const snap = await loadCompetitionOddsSnapshot(competition);
      map.set(competition, payloadToOddsMaps(snap.payload));
    }),
  );
  return map;
}

type ActiveTournament = {
  id: string;
  name: string;
  competition: string;
  startMatchday: number | null;
  endMatchday: number | null;
  closedAt: Date | null;
  members: { userId: string; user: { id: string; email: string; firstName: string | null; lastName: string | null } }[];
};

async function loadActiveTournaments(): Promise<ActiveTournament[]> {
  const rows = await prisma.tournament.findMany({
    where: {
      competition: { not: null },
      closedAt: null,
    },
    select: {
      id: true,
      name: true,
      competition: true,
      startMatchday: true,
      endMatchday: true,
      closedAt: true,
      members: {
        select: {
          userId: true,
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  return rows.filter(
    (t): t is ActiveTournament => typeof t.competition === "string" && t.competition.length > 0,
  );
}

/** Reminder: meciuri azi (Bucharest) fără predicție, kickoff încă în viitor. */
export async function sendPredictionReminders(
  now: Date = new Date(),
): Promise<EmailJobResult> {
  const result: EmailJobResult = { attempted: 0, sent: 0, skipped: 0, errors: [] };
  const todayKey = formatDateKeyBucharest(now);
  const dateLabel = formatBucharestDateLabel(todayKey);
  const base = appBaseUrl();

  const tournaments = await loadActiveTournaments();
  if (tournaments.length === 0) return result;

  const competitions = [...new Set(tournaments.map((t) => t.competition))];
  const matchesByCompetition = await loadMatchesByCompetition(competitions);

  type Pending = {
    tournamentId: string;
    tournamentName: string;
    fixture: string;
    kickoff: string;
    matchId: number;
  };

  const pendingByUser = new Map<
    string,
    { email: string; firstName: string | null; items: Pending[] }
  >();

  for (const tournament of tournaments) {
    const allMatches = matchesByCompetition.get(tournament.competition) ?? [];
    const inWindow = filterMatchesForTournament(allMatches, tournament);
    const todayUpcoming = inWindow.filter((m) => {
      if (matchDateKeyBucharest(m.utcDate) !== todayKey) return false;
      if (Date.parse(m.utcDate) <= now.getTime()) return false;
      const status = m.status ?? "";
      return status === "SCHEDULED" || status === "TIMED" || status === "";
    });
    if (todayUpcoming.length === 0) continue;

    const preds = await prisma.wcMatchPrediction.findMany({
      where: {
        tournamentId: tournament.id,
        matchId: { in: todayUpcoming.map((m) => m.id) },
      },
      select: {
        userId: true,
        matchId: true,
        htOutcome: true,
        ftOutcome: true,
        predHomeGoals: true,
        predAwayGoals: true,
      },
    });

    const predMap = new Map<string, MatchPredictionInput>();
    for (const p of preds) {
      predMap.set(`${p.userId}:${p.matchId}`, p);
    }

    for (const member of tournament.members) {
      for (const match of todayUpcoming) {
        const pred = predMap.get(`${member.userId}:${match.id}`);
        if (hasAnyMatchPrediction(pred)) continue;

        const entry = pendingByUser.get(member.userId) ?? {
          email: member.user.email,
          firstName: member.user.firstName,
          items: [],
        };
        entry.items.push({
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          fixture: fixtureFullName(match),
          kickoff: formatKickoffBucharest(match.utcDate),
          matchId: match.id,
        });
        pendingByUser.set(member.userId, entry);
      }
    }
  }

  for (const [userId, data] of pendingByUser) {
    if (data.items.length === 0) continue;
    const dedupeKey = `${userId}:${todayKey}`;
    if (!(await tryClaimDispatch("reminder", dedupeKey))) {
      result.skipped++;
      continue;
    }

    result.attempted++;
    const primaryTournamentId = data.items[0]!.tournamentId;
    const rendered = renderPredictionReminderEmail({
      firstName: data.firstName,
      dateLabel,
      matches: data.items.map((i) => ({
        tournamentName: i.tournamentName,
        fixture: i.fixture,
        kickoff: i.kickoff,
      })),
      ctaHref: `${base}/turnee/${primaryTournamentId}`,
    });

    const send = await sendEmail({
      to: data.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    if (send.ok) result.sent++;
    else result.errors.push(`${data.email}: ${send.reason}`);
  }

  return result;
}

/** Rezumat pentru ziua anterioară (Bucharest). */
export async function sendDailyDigests(now: Date = new Date()): Promise<EmailJobResult> {
  const result: EmailJobResult = { attempted: 0, sent: 0, skipped: 0, errors: [] };
  const todayKey = formatDateKeyBucharest(now);
  const yesterdayKey = addDaysToDateKey(todayKey, -1);
  const dateLabel = formatBucharestDateLabel(yesterdayKey);
  const base = appBaseUrl();

  // Include și turneele recent închise — scorurile din ziua D−1 tot contează.
  const tournaments = await prisma.tournament.findMany({
    where: { competition: { not: null } },
    select: {
      id: true,
      name: true,
      competition: true,
      startMatchday: true,
      endMatchday: true,
      members: {
        select: {
          userId: true,
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  const active = tournaments.filter(
    (t): t is typeof t & { competition: string } =>
      typeof t.competition === "string" && t.competition.length > 0,
  );
  if (active.length === 0) return result;

  const competitions = [...new Set(active.map((t) => t.competition))];
  const [matchesByCompetition, oddsByCompetition] = await Promise.all([
    loadMatchesByCompetition(competitions),
    loadOddsMapsByCompetition(competitions),
  ]);

  type DigestItem = {
    tournamentId: string;
    tournamentName: string;
    fixture: string;
    prediction: string;
    result: string;
    points: number;
  };

  const digestByUser = new Map<
    string,
    { email: string; firstName: string | null; items: DigestItem[]; total: number }
  >();

  for (const tournament of active) {
    const allMatches = matchesByCompetition.get(tournament.competition) ?? [];
    const inWindow = filterMatchesForTournament(allMatches, tournament);
    const yesterdayFinished = inWindow.filter((m) => {
      if (matchDateKeyBucharest(m.utcDate) !== yesterdayKey) return false;
      return m.status === "FINISHED" || m.status === "AWARDED";
    });
    if (yesterdayFinished.length === 0) continue;

    const preds = await prisma.wcMatchPrediction.findMany({
      where: {
        tournamentId: tournament.id,
        matchId: { in: yesterdayFinished.map((m) => m.id) },
      },
    });
    const predByUserMatch = new Map<string, MatchPredictionInput>();
    for (const p of preds) {
      predByUserMatch.set(`${p.userId}:${p.matchId}`, p);
    }

    const oddsMaps = oddsByCompetition.get(tournament.competition);

    for (const member of tournament.members) {
      for (const match of yesterdayFinished) {
        const pred = predByUserMatch.get(`${member.userId}:${match.id}`);
        const oddsRow = oddsMaps?.matchById.get(match.id) ?? null;
        const points = pred
          ? computeMatchPoints(pred, match, oddsRow).total
          : 0;
        const predDisp = getMatchPredDisplay(pred);
        const actual = matchResultHtFt(match);
        const predictionLabel = pred
          ? [predDisp.ht !== "—" ? `HT ${predDisp.ht}` : null, predDisp.score !== "—" ? predDisp.score : predDisp.ft !== "—" ? `FT ${predDisp.ft}` : null]
              .filter(Boolean)
              .join(" · ") || formatPredShort(pred)
          : "—";
        const resultLabel = [actual.ht ? `HT ${actual.ht}` : null, actual.ft ? `FT ${actual.ft}` : null]
          .filter(Boolean)
          .join(" · ") || "—";

        const entry = digestByUser.get(member.userId) ?? {
          email: member.user.email,
          firstName: member.user.firstName,
          items: [],
          total: 0,
        };
        entry.items.push({
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          fixture: fixtureFullName(match),
          prediction: predictionLabel,
          result: resultLabel,
          points,
        });
        entry.total += points;
        digestByUser.set(member.userId, entry);
      }
    }
  }

  for (const [userId, data] of digestByUser) {
    if (data.items.length === 0) continue;
    const dedupeKey = `${userId}:${yesterdayKey}`;
    if (!(await tryClaimDispatch("digest", dedupeKey))) {
      result.skipped++;
      continue;
    }

    result.attempted++;
    const primaryTournamentId = data.items[0]!.tournamentId;
    const rendered = renderDailyDigestEmail({
      firstName: data.firstName,
      dateLabel,
      totalPoints: Math.round(data.total * 100) / 100,
      matches: data.items.map((i) => ({
        tournamentName: i.tournamentName,
        fixture: i.fixture,
        prediction: i.prediction,
        result: i.result,
        points: formatPoints(i.points),
      })),
      ctaHref: `${base}/turnee/${primaryTournamentId}`,
    });

    const send = await sendEmail({
      to: data.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    if (send.ok) result.sent++;
    else result.errors.push(`${data.email}: ${send.reason}`);
  }

  return result;
}

type RankMember = {
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  total: number;
};

async function sendRankingEmailsForTournament(opts: {
  tournamentId: string;
  tournamentName: string;
  mode: "stage" | "final";
  matchday?: number | null;
  kind: "stage_rank" | "final_rank";
  dedupeKey: string;
}): Promise<EmailJobResult> {
  const result: EmailJobResult = { attempted: 0, sent: 0, skipped: 0, errors: [] };

  if (!(await tryClaimDispatch(opts.kind, opts.dedupeKey))) {
    result.skipped++;
    return result;
  }

  const members = await prisma.tournamentMember.findMany({
    where: { tournamentId: opts.tournamentId },
    include: {
      user: { select: { email: true, firstName: true, lastName: true } },
    },
    orderBy: [{ cachedTotal: "desc" }, { joinedAt: "asc" }],
  });

  if (members.length === 0) return result;

  const ranked: RankMember[] = members.map((m) => ({
    userId: m.userId,
    email: m.user.email,
    firstName: m.user.firstName,
    lastName: m.user.lastName,
    total: m.cachedTotal,
  }));

  const topPreview = ranked.slice(0, 10).map((m, i) => ({
    rank: i + 1,
    displayName: displayName(m.firstName, m.lastName),
    total: m.total,
  }));

  const base = appBaseUrl();
  const ctaHref = `${base}/turnee/${opts.tournamentId}`;

  for (let i = 0; i < ranked.length; i++) {
    const member = ranked[i]!;
    const yourRank = i + 1;
    const rowsForYou = topPreview.map((r) => ({
      ...r,
      isYou: r.rank === yourRank,
    }));
    // Dacă userul nu e în top 10, adaugă rândul lui.
    if (yourRank > 10) {
      rowsForYou.push({
        rank: yourRank,
        displayName: displayName(member.firstName, member.lastName),
        total: member.total,
        isYou: true,
      });
    }

    result.attempted++;
    const rendered = renderStageRankingEmail({
      firstName: member.firstName,
      tournamentName: opts.tournamentName,
      mode: opts.mode,
      matchday: opts.matchday,
      yourRank,
      yourTotal: member.total,
      rows: rowsForYou,
      ctaHref,
    });

    const send = await sendEmail({
      to: member.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
    if (send.ok) result.sent++;
    else result.errors.push(`${member.email}: ${send.reason}`);
  }

  return result;
}

/** Clasamente etapă: matchday complet finished, încă netrimis. */
export async function sendStageRankingEmails(
  now: Date = new Date(),
): Promise<EmailJobResult> {
  const merged: EmailJobResult = { attempted: 0, sent: 0, skipped: 0, errors: [] };
  const tournaments = await loadActiveTournaments();
  if (tournaments.length === 0) return merged;

  const competitions = [...new Set(tournaments.map((t) => t.competition))];
  const matchesByCompetition = await loadMatchesByCompetition(competitions);
  const todayKey = formatDateKeyBucharest(now);

  for (const tournament of tournaments) {
    const allMatches = matchesByCompetition.get(tournament.competition) ?? [];
    const inWindow = filterMatchesForTournament(allMatches, tournament);

    const byMatchday = new Map<number, FootballDataMatch[]>();
    for (const m of inWindow) {
      const md = m.matchday;
      if (md == null) continue;
      const list = byMatchday.get(md) ?? [];
      list.push(m);
      byMatchday.set(md, list);
    }

    for (const [matchday, matches] of byMatchday) {
      if (matches.length === 0) continue;
      const allSettled = matches.every(
        (m) => m.status === "FINISHED" || m.status === "AWARDED",
      );
      if (!allSettled) continue;

      // Trimite doar după ce ultima zi din etapă a trecut (sau e azi dimineața după ce s-au terminat).
      const lastKickoff = Math.max(...matches.map((m) => Date.parse(m.utcDate)));
      const lastDayKey = matchDateKeyBucharest(new Date(lastKickoff).toISOString());
      // Trimitem în dimineața de după ultima zi a etapei (sau aceeași dimineață dacă etapa s-a terminat ieri).
      if (lastDayKey >= todayKey) continue;

      const partial = await sendRankingEmailsForTournament({
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        mode: "stage",
        matchday,
        kind: "stage_rank",
        dedupeKey: `${tournament.id}:${matchday}`,
      });
      merged.attempted += partial.attempted;
      merged.sent += partial.sent;
      merged.skipped += partial.skipped;
      merged.errors.push(...partial.errors);
    }
  }

  return merged;
}

/** Clasament final pentru turneele tocmai închise. */
export async function sendFinalRankingEmails(
  tournamentIds: string[],
): Promise<EmailJobResult> {
  const merged: EmailJobResult = { attempted: 0, sent: 0, skipped: 0, errors: [] };
  if (tournamentIds.length === 0) return merged;

  const tournaments = await prisma.tournament.findMany({
    where: { id: { in: tournamentIds } },
    select: { id: true, name: true },
  });

  for (const tournament of tournaments) {
    const partial = await sendRankingEmailsForTournament({
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      mode: "final",
      kind: "final_rank",
      dedupeKey: tournament.id,
    });
    merged.attempted += partial.attempted;
    merged.sent += partial.sent;
    merged.skipped += partial.skipped;
    merged.errors.push(...partial.errors);
  }

  return merged;
}

/** Sample-uri pentru test admin — fără dedupe pe user real. */
export async function sendTestEmails(to: string): Promise<{
  reminder: Awaited<ReturnType<typeof sendEmail>>;
  digest: Awaited<ReturnType<typeof sendEmail>>;
  ranking: Awaited<ReturnType<typeof sendEmail>>;
}> {
  const base = appBaseUrl();
  const reminder = renderPredictionReminderEmail({
    firstName: "Teodor",
    dateLabel: formatBucharestDateLabel(formatDateKeyBucharest()),
    matches: [
      {
        tournamentName: "Liga Demo",
        fixture: "FCSB – CFR 1907 Cluj",
        kickoff: "20:30",
      },
      {
        tournamentName: "Liga Demo",
        fixture: "Universitatea Craiova – FC Rapid București",
        kickoff: "21:00",
      },
    ],
    ctaHref: `${base}/turnee`,
  });
  const digest = renderDailyDigestEmail({
    firstName: "Teodor",
    dateLabel: formatBucharestDateLabel(addDaysToDateKey(formatDateKeyBucharest(), -1)),
    totalPoints: 7.5,
    matches: [
      {
        tournamentName: "Liga Demo",
        fixture: "FCSB – CFR 1907 Cluj",
        prediction: "HT 1 · 2–1",
        result: "HT 1–0 · FT 2–1",
        points: "5.5",
      },
      {
        tournamentName: "Liga Demo",
        fixture: "Universitatea Craiova – FC Rapid București",
        prediction: "FT X",
        result: "HT 0–0 · FT 1–0",
        points: "0",
      },
    ],
    ctaHref: `${base}/turnee/clasament`,
  });
  const ranking = renderStageRankingEmail({
    firstName: "Teodor",
    tournamentName: "Liga Demo",
    mode: "stage",
    matchday: 12,
    yourRank: 3,
    yourTotal: 42,
    rows: [
      { rank: 1, displayName: "Alex", total: 55 },
      { rank: 2, displayName: "Maria", total: 48 },
      { rank: 3, displayName: "Teodor", total: 42, isYou: true },
      { rank: 4, displayName: "Ioana", total: 39 },
    ],
    ctaHref: `${base}/turnee`,
  });

  // Trimite direct la `to`, ocolind EMAIL_TEST_TO rewrite pentru testul explicit.
  const prevTestTo = process.env.EMAIL_TEST_TO;
  delete process.env.EMAIL_TEST_TO;
  try {
    const [r1, r2, r3] = await Promise.all([
      sendEmail({ to, subject: reminder.subject, html: reminder.html, text: reminder.text }),
      sendEmail({ to, subject: digest.subject, html: digest.html, text: digest.text }),
      sendEmail({ to, subject: ranking.subject, html: ranking.html, text: ranking.text }),
    ]);
    return { reminder: r1, digest: r2, ranking: r3 };
  } finally {
    if (prevTestTo != null) process.env.EMAIL_TEST_TO = prevTestTo;
  }
}
