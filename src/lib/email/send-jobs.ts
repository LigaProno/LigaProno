import { parseStoredCompetition } from "@/lib/competition";
import { payloadToOddsMaps } from "@/lib/betting-odds";
import { loadCompetitionOddsSnapshot } from "@/lib/competition-odds";
import { fetchCompetitionMatches } from "@/lib/football-data";
import type { FootballDataMatch } from "@/lib/football-data-types";
import { canSendTestEmail, isEmailTestMode, sendEmail } from "@/lib/email/mailer";
import { renderDailyDigestEmail } from "@/lib/email/templates/daily-digest";
import { renderNewPublicTournamentEmail } from "@/lib/email/templates/new-tournament";
import {
  reminderWhenShort,
  renderPredictionReminderEmail,
  type ReminderDaysAhead,
} from "@/lib/email/templates/prediction-reminder";
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
import { tournamentCompetitionLabel } from "@/lib/tournament-competition";
import { parsePrizes, placeLabel } from "@/lib/tournament-prizes";
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

function emptyEmailResult(): EmailJobResult {
  return { attempted: 0, sent: 0, skipped: 0, errors: [] };
}

function mergeEmailResult(into: EmailJobResult, partial: EmailJobResult): void {
  into.attempted += partial.attempted;
  into.sent += partial.sent;
  into.skipped += partial.skipped;
  into.errors.push(...partial.errors);
}

async function tryClaimDispatch(kind: string, key: string): Promise<boolean> {
  try {
    await prisma.emailDispatchLog.create({ data: { kind, key } });
    return true;
  } catch {
    return false;
  }
}

async function releaseDispatchClaim(kind: string, key: string): Promise<void> {
  try {
    await prisma.emailDispatchLog.deleteMany({ where: { kind, key } });
  } catch {
    // best-effort — claim-ul rămas blochează retry până la curățare manuală
  }
}

/** Claim + send; în modul EMAIL_TEST_TO nu claim-uiește recipientii săriți de limită. */
async function claimAndSend(opts: {
  kind: string;
  dedupeKey: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  result: EmailJobResult;
}): Promise<void> {
  const { result } = opts;

  if (isEmailTestMode() && !canSendTestEmail()) {
    result.skipped++;
    return;
  }

  if (isEmailTestMode()) {
    // Fără claim: sample-ul nu trebuie să blocheze digestele/remindele reale.
    result.attempted++;
    const send = await sendEmail({
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    if (!send.ok) {
      if (send.reason.startsWith("EMAIL_TEST_LIMIT")) result.skipped++;
      else result.errors.push(`${opts.to}: ${send.reason}`);
      return;
    }
    result.sent++;
    return;
  }

  if (!(await tryClaimDispatch(opts.kind, opts.dedupeKey))) {
    result.skipped++;
    return;
  }

  result.attempted++;
  const send = await sendEmail({
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  if (send.ok) {
    result.sent++;
  } else {
    result.errors.push(`${opts.to}: ${send.reason}`);
    // Eliberează claim-ul ca cronul să poată reîncerca la următoarea rulare.
    await releaseDispatchClaim(opts.kind, opts.dedupeKey);
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
  competition: string | null;
  competitions: string[];
  selectedMatchIds: number[];
  startMatchday: number | null;
  endMatchday: number | null;
  closedAt: Date | null;
  members: {
    userId: string;
    cachedTotal: number;
    joinedAt: Date;
    user: { id: string; email: string; firstName: string | null; lastName: string | null };
  }[];
};

function competitionKeysForEmailTournament(
  t: Pick<ActiveTournament, "competition" | "competitions">,
): string[] {
  const fromList = (t.competitions ?? []).map((c) => c.trim()).filter(Boolean);
  if (fromList.length > 0) return [...new Set(fromList)];
  const single = t.competition?.trim();
  return single ? [single] : [];
}

function matchesForEmailTournament(
  tournament: ActiveTournament,
  matchesByCompetition: Map<string, FootballDataMatch[]>,
): FootballDataMatch[] {
  const keys = competitionKeysForEmailTournament(tournament);
  const byId = new Map<number, FootballDataMatch>();
  for (const key of keys) {
    for (const m of matchesByCompetition.get(key) ?? []) {
      byId.set(m.id, m);
    }
  }
  return filterMatchesForTournament([...byId.values()], tournament);
}

async function loadActiveTournaments(): Promise<ActiveTournament[]> {
  // MongoDB: `closedAt: null` în where e nesigur — filtrăm în JS (ca la digest).
  const rows = await prisma.tournament.findMany({
    select: {
      id: true,
      name: true,
      competition: true,
      competitions: true,
      selectedMatchIds: true,
      startMatchday: true,
      endMatchday: true,
      closedAt: true,
      members: {
        select: {
          userId: true,
          cachedTotal: true,
          joinedAt: true,
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  return rows.filter(
    (t) =>
      t.closedAt == null &&
      competitionKeysForEmailTournament(t).length > 0,
  );
}

function memberRanks(
  members: { userId: string; cachedTotal: number; joinedAt: Date }[],
): Map<string, { rank: number; total: number; count: number }> {
  const sorted = [...members].sort((a, b) => {
    if (b.cachedTotal !== a.cachedTotal) return b.cachedTotal - a.cachedTotal;
    return a.joinedAt.getTime() - b.joinedAt.getTime();
  });
  const map = new Map<string, { rank: number; total: number; count: number }>();
  const count = sorted.length;
  sorted.forEach((m, i) => {
    map.set(m.userId, { rank: i + 1, total: m.cachedTotal, count });
  });
  return map;
}

/** Reminder azi + D−1 + D−2: un singur mail/zi cu meciurile fără predicție. */
export async function sendPredictionReminders(
  now: Date = new Date(),
): Promise<EmailJobResult> {
  const result = emptyEmailResult();
  const todayKey = formatDateKeyBucharest(now);
  const base = appBaseUrl();

  const tournaments = await loadActiveTournaments();
  if (tournaments.length === 0) return result;

  const competitions = [
    ...new Set(tournaments.flatMap((t) => competitionKeysForEmailTournament(t))),
  ];
  const matchesByCompetition = await loadMatchesByCompetition(competitions);

  type Pending = {
    tournamentId: string;
    tournamentName: string;
    fixture: string;
    kickoff: string;
    matchId: number;
    daysAhead: ReminderDaysAhead;
    dateLabel: string;
  };

  const pendingByUser = new Map<
    string,
    { email: string; firstName: string | null; items: Pending[] }
  >();

  for (const daysAhead of [0, 1, 2] as const) {
    const targetKey = addDaysToDateKey(todayKey, daysAhead);
    const dateLabel = formatBucharestDateLabel(targetKey);

    for (const tournament of tournaments) {
      const inWindow = matchesForEmailTournament(tournament, matchesByCompetition);
      const upcoming = inWindow.filter((m) => {
        if (matchDateKeyBucharest(m.utcDate) !== targetKey) return false;
        if (Date.parse(m.utcDate) <= now.getTime()) return false;
        const status = m.status ?? "";
        return status === "SCHEDULED" || status === "TIMED" || status === "";
      });
      if (upcoming.length === 0) continue;

      const preds = await prisma.wcMatchPrediction.findMany({
        where: {
          tournamentId: tournament.id,
          matchId: { in: upcoming.map((m) => m.id) },
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
        if (!member.user.email?.includes("@")) continue;
        for (const match of upcoming) {
          const pred = predMap.get(`${member.userId}:${match.id}`);
          if (hasAnyMatchPrediction(pred)) continue;

          const entry = pendingByUser.get(member.userId) ?? {
            email: member.user.email,
            firstName: member.user.firstName,
            items: [],
          };
          if (entry.items.some((i) => i.matchId === match.id && i.tournamentId === tournament.id)) {
            continue;
          }
          entry.items.push({
            tournamentId: tournament.id,
            tournamentName: tournament.name,
            fixture: fixtureFullName(match),
            kickoff: formatKickoffBucharest(match.utcDate),
            matchId: match.id,
            daysAhead,
            dateLabel,
          });
          pendingByUser.set(member.userId, entry);
        }
      }
    }
  }

  console.info("[email] reminders pending users", pendingByUser.size, "date", todayKey);

  for (const [userId, data] of pendingByUser) {
    if (data.items.length === 0) continue;
    data.items.sort((a, b) => a.daysAhead - b.daysAhead || a.kickoff.localeCompare(b.kickoff));
    const minDays = Math.min(...data.items.map((i) => i.daysAhead)) as ReminderDaysAhead;
    const mixedDays = new Set(data.items.map((i) => i.daysAhead)).size > 1;
    const primaryTournamentId = data.items[0]!.tournamentId;
    const rendered = renderPredictionReminderEmail({
      firstName: data.firstName,
      dateLabel: data.items[0]!.dateLabel,
      daysAhead: minDays,
      matches: data.items.map((i) => ({
        tournamentName: i.tournamentName,
        fixture: i.fixture,
        kickoff: i.kickoff,
        whenLabel: mixedDays ? reminderWhenShort(i.daysAhead) : undefined,
      })),
      ctaHref: `${base}/turnee/${primaryTournamentId}`,
    });

    await claimAndSend({
      kind: "reminder",
      dedupeKey: `${userId}:${todayKey}`,
      to: data.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      result,
    });
  }

  return result;
}

/** Rezumat pentru zilele recente cu meciuri terminate (D−1, cu retry D−2). */
export async function sendDailyDigests(now: Date = new Date()): Promise<EmailJobResult> {
  const result = emptyEmailResult();
  const todayKey = formatDateKeyBucharest(now);
  const base = appBaseUrl();

  // Include și turneele recent închise — scorurile din ziua D−1 tot contează.
  const tournaments = await prisma.tournament.findMany({
    select: {
      id: true,
      name: true,
      competition: true,
      competitions: true,
      selectedMatchIds: true,
      startMatchday: true,
      endMatchday: true,
      closedAt: true,
      members: {
        select: {
          userId: true,
          cachedTotal: true,
          joinedAt: true,
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  const active = tournaments.filter(
    (t) => competitionKeysForEmailTournament(t).length > 0,
  ) as ActiveTournament[];
  if (active.length === 0) return result;

  const competitions = [
    ...new Set(active.flatMap((t) => competitionKeysForEmailTournament(t))),
  ];
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

  for (const daysAgo of [1, 2] as const) {
    const dayKey = addDaysToDateKey(todayKey, -daysAgo);
    const dateLabel = formatBucharestDateLabel(dayKey);

    const digestByUser = new Map<
      string,
      {
        email: string;
        firstName: string | null;
        items: DigestItem[];
        total: number;
        dayPointsByTournament: Map<string, number>;
      }
    >();

    const ranksByTournament = new Map<
      string,
      Map<string, { rank: number; total: number; count: number }>
    >();

    for (const tournament of active) {
      const inWindow = matchesForEmailTournament(tournament, matchesByCompetition);
      const dayFinished = inWindow.filter((m) => {
        if (matchDateKeyBucharest(m.utcDate) !== dayKey) return false;
        return m.status === "FINISHED" || m.status === "AWARDED";
      });
      if (dayFinished.length === 0) continue;

      ranksByTournament.set(tournament.id, memberRanks(tournament.members));

      const preds = await prisma.wcMatchPrediction.findMany({
        where: {
          tournamentId: tournament.id,
          matchId: { in: dayFinished.map((m) => m.id) },
        },
      });
      const predByUserMatch = new Map<string, MatchPredictionInput>();
      for (const p of preds) {
        predByUserMatch.set(`${p.userId}:${p.matchId}`, p);
      }

      const keys = competitionKeysForEmailTournament(tournament);
      const oddsLookup = (matchId: number) => {
        for (const key of keys) {
          const maps = oddsByCompetition.get(key);
          const row = maps?.matchById.get(matchId);
          if (row) return row;
        }
        return null;
      };

      for (const member of tournament.members) {
        if (!member.user.email?.includes("@")) continue;
        for (const match of dayFinished) {
          const pred = predByUserMatch.get(`${member.userId}:${match.id}`);
          const oddsRow = oddsLookup(match.id);
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
            dayPointsByTournament: new Map<string, number>(),
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
          entry.dayPointsByTournament.set(
            tournament.id,
            (entry.dayPointsByTournament.get(tournament.id) ?? 0) + points,
          );
          digestByUser.set(member.userId, entry);
        }
      }
    }

    console.info("[email] digest users", digestByUser.size, "day", dayKey);

    for (const [userId, data] of digestByUser) {
      if (data.items.length === 0) continue;
      const primaryTournamentId = data.items[0]!.tournamentId;
      const seen = new Set<string>();
      const tournamentsStatus = [];
      for (const item of data.items) {
        if (seen.has(item.tournamentId)) continue;
        seen.add(item.tournamentId);
        const rank = ranksByTournament.get(item.tournamentId)?.get(userId);
        tournamentsStatus.push({
          tournamentName: item.tournamentName,
          rank: rank?.rank ?? 0,
          memberCount: rank?.count ?? 0,
          totalPoints: rank?.total ?? 0,
          dayPoints: Math.round((data.dayPointsByTournament.get(item.tournamentId) ?? 0) * 100) / 100,
        });
      }

      const rendered = renderDailyDigestEmail({
        firstName: data.firstName,
        dateLabel,
        totalPoints: Math.round(data.total * 100) / 100,
        tournaments: tournamentsStatus,
        matches: data.items.map((i) => ({
          tournamentName: i.tournamentName,
          fixture: i.fixture,
          prediction: i.prediction,
          result: i.result,
          points: formatPoints(i.points),
        })),
        ctaHref: `${base}/turnee/${primaryTournamentId}`,
      });

      await claimAndSend({
        kind: "digest",
        dedupeKey: `${userId}:${dayKey}`,
        to: data.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        result,
      });
    }
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

  // În test mode nu claim-uim turneul — sample-ul nu trebuie să blocheze blast-ul real.
  if (!isEmailTestMode()) {
    if (!(await tryClaimDispatch(opts.kind, opts.dedupeKey))) {
      result.skipped++;
      return result;
    }
  } else if (!canSendTestEmail()) {
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
  const recipients = isEmailTestMode() ? ranked.slice(0, 1) : ranked;

  for (let i = 0; i < recipients.length; i++) {
    const member = recipients[i]!;
    const yourRank = ranked.findIndex((r) => r.userId === member.userId) + 1;
    const rowsForYou = topPreview.map((r) => ({
      ...r,
      isYou: r.rank === yourRank,
    }));
    if (yourRank > 10) {
      rowsForYou.push({
        rank: yourRank,
        displayName: displayName(member.firstName, member.lastName),
        total: member.total,
        isYou: true,
      });
    }

    if (isEmailTestMode() && !canSendTestEmail()) {
      result.skipped++;
      break;
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
    else if (send.reason.startsWith("EMAIL_TEST_LIMIT")) result.skipped++;
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

  const competitions = [
    ...new Set(tournaments.flatMap((t) => competitionKeysForEmailTournament(t))),
  ];
  const matchesByCompetition = await loadMatchesByCompetition(competitions);
  const todayKey = formatDateKeyBucharest(now);

  for (const tournament of tournaments) {
    // Mix: etapele din ligi diferite se ciocnesc — skip ranking pe etapă.
    if ((tournament.selectedMatchIds?.length ?? 0) > 0) continue;

    const inWindow = matchesForEmailTournament(tournament, matchesByCompetition);

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

function tournamentDetailLine(t: {
  selectedMatchIds: number[];
  startMatchday: number | null;
  endMatchday: number | null;
}): string | null {
  if ((t.selectedMatchIds?.length ?? 0) > 0) {
    const n = t.selectedMatchIds.length;
    return n === 1 ? "1 meci selectat" : `${n} meciuri selectate`;
  }
  if (t.startMatchday != null && t.endMatchday != null) {
    if (t.startMatchday === t.endMatchday) return `Etapa ${t.startMatchday}`;
    return `Etapele ${t.startMatchday}–${t.endMatchday}`;
  }
  return null;
}

/** Anunț turneu public nou — toți membrii (la creare = toți utilizatorii). */
export async function sendNewPublicTournamentEmails(
  tournamentId: string,
): Promise<EmailJobResult> {
  const result = emptyEmailResult();
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
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
      prizes: true,
      members: {
        select: {
          userId: true,
          user: {
            select: { email: true, firstName: true },
          },
        },
      },
    },
  });

  if (!tournament || !tournament.isPublic || tournament.closedAt != null) {
    return result;
  }

  const base = appBaseUrl();
  const ctaHref = `${base}/turnee/${tournament.id}`;
  const competitionLabel = tournamentCompetitionLabel(tournament);
  const detailLine = tournamentDetailLine(tournament);
  const prizes = parsePrizes(tournament.prizes).map((p) => ({
    place: placeLabel(p.place),
    prize: p.prize,
  }));

  console.info(
    "[email] new public tournament",
    tournament.name,
    "recipients",
    tournament.members.length,
  );

  for (const member of tournament.members) {
    const email = member.user.email?.trim();
    if (!email || !email.includes("@")) {
      result.skipped++;
      continue;
    }

    const rendered = renderNewPublicTournamentEmail({
      firstName: member.user.firstName,
      tournamentName: tournament.name,
      competitionLabel,
      detailLine,
      prizes,
      ctaHref,
    });

    await claimAndSend({
      kind: "new_public",
      dedupeKey: `${tournament.id}:${member.userId}`,
      to: email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      result,
    });
  }

  return result;
}

/** Reia anunțurile pentru turnee publice create în ultimele 7 zile (membri rămași). */
export async function retryNewPublicTournamentEmails(
  now: Date = new Date(),
): Promise<EmailJobResult> {
  const merged = emptyEmailResult();
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const rows = await prisma.tournament.findMany({
    where: { isPublic: true, createdAt: { gte: since } },
    select: { id: true, closedAt: true },
  });

  for (const t of rows) {
    if (t.closedAt != null) continue;
    mergeEmailResult(merged, await sendNewPublicTournamentEmails(t.id));
  }
  return merged;
}

/** Job-urile de dimineață: digest + reminder + clasament etapă + retry turnee noi. */
export async function runScheduledEmailJobs(
  now: Date = new Date(),
): Promise<{
  digest: EmailJobResult;
  reminder: EmailJobResult;
  stageRank: EmailJobResult;
  newPublic: EmailJobResult;
}> {
  const digest = await sendDailyDigests(now);
  const reminder = await sendPredictionReminders(now);
  const stageRank = await sendStageRankingEmails(now);
  const newPublic = await retryNewPublicTournamentEmails(now);
  return { digest, reminder, stageRank, newPublic };
}

/** Sample-uri pentru test admin — fără dedupe pe user real. */
export async function sendTestEmails(to: string): Promise<{
  reminder: Awaited<ReturnType<typeof sendEmail>>;
  digest: Awaited<ReturnType<typeof sendEmail>>;
  ranking: Awaited<ReturnType<typeof sendEmail>>;
  newTournament: Awaited<ReturnType<typeof sendEmail>>;
}> {
  const base = appBaseUrl();
  const reminder = renderPredictionReminderEmail({
    firstName: "Teodor",
    dateLabel: formatBucharestDateLabel(formatDateKeyBucharest()),
    daysAhead: 1,
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
    tournaments: [
      {
        tournamentName: "Liga Demo",
        rank: 3,
        memberCount: 42,
        totalPoints: 48,
        dayPoints: 7.5,
      },
    ],
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
  const newTournament = renderNewPublicTournamentEmail({
    firstName: "Teodor",
    tournamentName: "Liga Demo",
    competitionLabel: "SuperLiga României (2026–27)",
    detailLine: "Etapele 8–12",
    prizes: [
      { place: "Locul 1", prize: "Tricou de fotbal" },
      { place: "Locul 2", prize: "Card cadou 100 RON" },
    ],
    ctaHref: `${base}/turnee`,
  });

  // Trimite direct la `to`, ocolind EMAIL_TEST_TO rewrite pentru testul explicit.
  const prevTestTo = process.env.EMAIL_TEST_TO;
  delete process.env.EMAIL_TEST_TO;
  try {
    const [r1, r2, r3, r4] = await Promise.all([
      sendEmail({ to, subject: reminder.subject, html: reminder.html, text: reminder.text }),
      sendEmail({ to, subject: digest.subject, html: digest.html, text: digest.text }),
      sendEmail({ to, subject: ranking.subject, html: ranking.html, text: ranking.text }),
      sendEmail({
        to,
        subject: newTournament.subject,
        html: newTournament.html,
        text: newTournament.text,
      }),
    ]);
    return { reminder: r1, digest: r2, ranking: r3, newTournament: r4 };
  } finally {
    if (prevTestTo != null) process.env.EMAIL_TEST_TO = prevTestTo;
  }
}
