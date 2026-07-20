import { auth } from "@clerk/nextjs/server";
import { isAdminEmail } from "@/lib/admin";
import { notFound, redirect } from "next/navigation";
import MemberPredictionsView from "@/components/party/member-predictions-view";
import {
  fetchCompetitionMatches,
  type FootballDataMatch,
} from "@/lib/football-data";
import { parseStoredCompetition } from "@/lib/competition";
import { prisma } from "@/lib/prisma";
import { hasAnyMatchPrediction, filterMatchesForTournament } from "@/lib/wc-pred-display";
import { isMatchKickoffPassed } from "@/lib/knockout-predictions";
import { computeMatchPoints, type MatchPredictionInput } from "@/lib/wc-scoring";
import { loadCompetitionOddsSnapshot } from "@/lib/competition-odds";
import { payloadToOddsMaps } from "@/lib/betting-odds";

function displayName(first?: string | null, last?: string | null): string {
  const s = `${first ?? ""} ${last ?? ""}`.trim();
  return s.length > 0 ? s : "Member";
}

export default async function PartyMemberPredictionsPage({
  params,
}: {
  params: Promise<{ tournamentId: string; userId: string }>;
}) {
  const { tournamentId, userId: memberUserId } = await params;

  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) redirect("/sign-in");

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      members: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  if (!tournament) notFound();

  const isAdmin = isAdminEmail(user.email);
  const isMember = tournament.members.some((m) => m.userId === user.id);
  if (!isMember && !isAdmin) redirect("/turnee");

  // La pronosticurile ALTORA arătăm doar meciurile deja începute (live) sau încheiate;
  // cele viitoare rămân ascunse ca să nu fie copiate înainte de start. La propriile
  // pronosticuri se vede tot. Se aplică peste tot (public, privat, chiar și admin).
  const restrictToStarted = memberUserId !== user.id;

  const parsedCompetition = parseStoredCompetition(tournament.competition);
  if (!parsedCompetition) {
    redirect(`/turnee/${tournamentId}`);
  }

  const targetMembership = tournament.members.find((m) => m.userId === memberUserId);
  if (!targetMembership) notFound();

  let matches: FootballDataMatch[] = [];
  let loadError: string | null = null;
  try {
    matches = await fetchCompetitionMatches(
      parsedCompetition.code,
      parsedCompetition.season,
    );
    if (tournament.competition) {
      const { loadMatchesWithCompetitionVenues } = await import(
        "@/lib/competition-match-venues"
      );
      matches = await loadMatchesWithCompetitionVenues(
        tournament.competition,
        matches,
      );
    }
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Could not load matches.";
  }

  matches = filterMatchesForTournament(matches, tournament);

  const predsDb = await prisma.wcMatchPrediction.findMany({
    where: { tournamentId, userId: memberUserId },
  });

  const predsByMatchId = new Map<number, MatchPredictionInput>();
  for (const p of predsDb) {
    predsByMatchId.set(p.matchId, {
      htOutcome: p.htOutcome ?? null,
      ftOutcome: p.ftOutcome ?? null,
      predHomeGoals: p.predHomeGoals ?? null,
      predAwayGoals: p.predAwayGoals ?? null,
    });
  }

  // Cotele competiției — necesare pentru punctele per meci.
  const oddsSnapshot = tournament.competition
    ? await loadCompetitionOddsSnapshot(tournament.competition)
    : null;
  const oddsMaps = payloadToOddsMaps(oddsSnapshot?.payload ?? null);

  const rows = [...matches]
    .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate))
    .filter((m) => hasAnyMatchPrediction(predsByMatchId.get(m.id)))
    .filter((m) => !restrictToStarted || isMatchKickoffPassed(m))
    .map((m) => {
      const pred = predsByMatchId.get(m.id)!;
      return {
        match: m,
        pred,
        points: computeMatchPoints(pred, m, oddsMaps?.matchById.get(m.id) ?? null).total,
      };
    });

  return (
    <MemberPredictionsView
      tournamentId={tournament.id}
      tournamentName={tournament.name}
      memberDisplayName={
        targetMembership.displayName ??
        displayName(targetMembership.user.firstName, targetMembership.user.lastName)
      }
      rows={rows}
      loadError={loadError}
    />
  );
}
