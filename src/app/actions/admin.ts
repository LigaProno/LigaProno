"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { canManagePublicTournaments, isAdminEmail } from "@/lib/admin";
import { requireDbUser } from "@/lib/sync-clerk-user";
import { COMPETITION_PICKER_OPTIONS, parseStoredCompetition } from "@/lib/competition";
import { fetchCompetitionMatches } from "@/lib/football-data";
import { resolveFirstUpcomingMatchday } from "@/lib/wc-pred-display";
import { I18nError } from "@/lib/i18n/errors";
import type { TournamentPrize } from "@/lib/tournament-prizes";
import { formatTeamDisplayName } from "@/lib/team-display";
import { fetchMatchesForCompetitionKeys } from "@/lib/tournament-matches";

async function assertPublicTournamentManager() {
  const user = await requireDbUser();
  if (!canManagePublicTournaments(user.email)) throw new Error("Acces interzis.");
  return user;
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

async function enrollAllUsers(tournamentId: string) {
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  await prisma.tournamentMember.createMany({
    data: allUsers.map((u) => ({ tournamentId, userId: u.id, prizePreference: [] })),
  });
}

export async function createPublicTournament(
  name: string,
  competitionStorage: string,
  prizes: TournamentPrize[],
  matchdayCount?: number,
): Promise<{ inviteCode: string }> {
  const user = await assertPublicTournamentManager();

  const t = competitionStorage.trim();
  if (!COMPETITION_PICKER_OPTIONS.some((o) => o.storageKey === t)) {
    throw new I18nError("errors.invalidCompetition");
  }

  let inviteCode = generateInviteCode();
  while (await prisma.tournament.findUnique({ where: { inviteCode } })) {
    inviteCode = generateInviteCode();
  }

  let startMatchday: number | null = null;
  let endMatchday: number | null = null;

  if (matchdayCount != null && matchdayCount > 0) {
    const parsed = parseStoredCompetition(t);
    if (!parsed) throw new I18nError("errors.invalidCompetition");

    const matches = await fetchCompetitionMatches(parsed.code, parsed.season);
    startMatchday = resolveFirstUpcomingMatchday(matches);
    endMatchday = startMatchday + matchdayCount - 1;
  }

  const tournament = await prisma.tournament.create({
    data: {
      name: name.trim(),
      inviteCode,
      creatorId: user.id,
      competition: t,
      competitions: [],
      selectedMatchIds: [],
      isPublic: true,
      prizes: prizes.length > 0 ? prizes : undefined,
      startMatchday,
      endMatchday,
    },
  });

  await enrollAllUsers(tournament.id);

  revalidatePath("/moderator");
  revalidatePath("/admin");
  revalidatePath("/turnee");
  return { inviteCode };
}

export type MixedMatchPickerRow = {
  matchId: number;
  competitionKey: string;
  competitionLabel: string;
  matchday: number | null;
  utcDate: string;
  home: string;
  away: string;
  homeCrest: string | null;
  awayCrest: string | null;
  status: string;
};

/** Meciuri viitoare pentru picker-ul de turneu mix. */
export async function fetchMixedTournamentMatchOptions(
  competitionKeys: string[],
): Promise<MixedMatchPickerRow[]> {
  await assertPublicTournamentManager();

  const keys = [
    ...new Set(
      competitionKeys
        .map((k) => k.trim())
        .filter((k) => COMPETITION_PICKER_OPTIONS.some((o) => o.storageKey === k)),
    ),
  ];
  if (keys.length === 0) return [];

  const rows: MixedMatchPickerRow[] = [];

  for (const key of keys) {
    const opt = COMPETITION_PICKER_OPTIONS.find((o) => o.storageKey === key)!;
    const parsed = parseStoredCompetition(key);
    if (!parsed) continue;
    const matches = await fetchCompetitionMatches(parsed.code, parsed.season);
    for (const m of matches) {
      const status = m.status ?? "";
      // Păstrăm tot ce nu e terminat/anulat — inclusiv amânări și etape viitoare.
      if (status === "FINISHED" || status === "AWARDED" || status === "CANCELLED") continue;
      // Meciuri live/paused: rămân vizibile (pot fi bifate doar dacă vrei, dar de obicei sunt blocate la save).
      rows.push({
        matchId: m.id,
        competitionKey: key,
        competitionLabel: opt.label.replace(/\s*\([^)]*\)\s*$/, "").trim(),
        matchday: m.matchday ?? null,
        utcDate: m.utcDate,
        home: formatTeamDisplayName(m.homeTeam),
        away: formatTeamDisplayName(m.awayTeam),
        homeCrest: m.homeTeam?.crest ?? null,
        awayCrest: m.awayTeam?.crest ?? null,
        status,
      });
    }
  }

  return rows.sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate));
}

export async function createMixedPublicTournament(
  name: string,
  competitionKeys: string[],
  matchIds: number[],
  prizes: TournamentPrize[],
): Promise<{ inviteCode: string }> {
  const user = await assertPublicTournamentManager();

  const keys = [
    ...new Set(
      competitionKeys
        .map((k) => k.trim())
        .filter((k) => COMPETITION_PICKER_OPTIONS.some((o) => o.storageKey === k)),
    ),
  ];
  if (keys.length === 0) {
    throw new I18nError("errors.invalidCompetition");
  }

  const uniqueMatchIds = [...new Set(matchIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (uniqueMatchIds.length === 0) {
    throw new Error("Selectează cel puțin un meci.");
  }

  const available = await fetchMatchesForCompetitionKeys(keys);
  const availableIds = new Set(available.map((m) => m.id));
  const invalid = uniqueMatchIds.filter((id) => !availableIds.has(id));
  if (invalid.length > 0) {
    throw new Error("Unele meciuri selectate nu aparțin competițiilor alese.");
  }

  let inviteCode = generateInviteCode();
  while (await prisma.tournament.findUnique({ where: { inviteCode } })) {
    inviteCode = generateInviteCode();
  }

  const tournament = await prisma.tournament.create({
    data: {
      name: name.trim(),
      inviteCode,
      creatorId: user.id,
      competition: null,
      competitions: keys,
      selectedMatchIds: uniqueMatchIds,
      isPublic: true,
      prizes: prizes.length > 0 ? prizes : undefined,
      startMatchday: null,
      endMatchday: null,
    },
  });

  await enrollAllUsers(tournament.id);

  revalidatePath("/moderator");
  revalidatePath("/admin");
  revalidatePath("/turnee");
  return { inviteCode };
}

export async function deletePublicTournament(tournamentId: string): Promise<void> {
  const user = await assertPublicTournamentManager();

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament || !tournament.isPublic) throw new Error("Turneu public negăsit.");

  // Moderatorii pot șterge doar turneele create de ei; adminii pot șterge orice.
  if (!isAdminEmail(user.email) && tournament.creatorId !== user.id) {
    throw new Error("Poți gestiona doar turneele create de tine.");
  }

  await prisma.wcMatchPrediction.deleteMany({ where: { tournamentId } });
  await prisma.wcExtraPrediction.deleteMany({ where: { tournamentId } });
  await prisma.tournamentMember.deleteMany({ where: { tournamentId } });
  await prisma.tournament.delete({ where: { id: tournamentId } });

  revalidatePath("/moderator");
  revalidatePath("/admin");
  revalidatePath("/turnee");
}

export async function addCustomPrizeOption(rawLabel: string): Promise<string> {
  const user = await assertPublicTournamentManager();
  const label = rawLabel.trim().slice(0, 80);
  if (!label) throw new Error("Premiul nu poate fi gol.");

  const rows = await prisma.customPrizeOption.findMany({ select: { label: true } });
  const existing = rows.find((r) => r.label.toLowerCase() === label.toLowerCase());
  if (existing) return existing.label;

  try {
    const created = await prisma.customPrizeOption.create({
      data: { label, createdBy: user.email },
    });
    revalidatePath("/admin");
    revalidatePath("/moderator");
    return created.label;
  } catch {
    // Race pe unique: returnează varianta deja salvată.
    const again = await prisma.customPrizeOption.findUnique({ where: { label } });
    if (again) return again.label;
    throw new Error("Nu am putut salva premiul.");
  }
}
