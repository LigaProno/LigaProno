import { auth } from "@clerk/nextjs/server";
import { canMonitorTournaments } from "@/lib/admin";
import { notFound, redirect } from "next/navigation";
import MemberPredictionsView from "@/components/party/member-predictions-view";
import { prisma } from "@/lib/prisma";
import { hasAnyMatchPrediction } from "@/lib/wc-pred-display";
import { isMatchKickoffPassed } from "@/lib/knockout-predictions";
import { computeMatchPoints, type MatchPredictionInput } from "@/lib/wc-scoring";
import { loadTournamentOddsSnapshot } from "@/lib/competition-odds";
import { payloadToOddsMaps } from "@/lib/betting-odds";
import {
  loadTournamentMatches,
  resolveTournamentCompetitionKeys,
} from "@/lib/tournament-matches";

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

  const canMonitor = canMonitorTournaments(user.email);
  const isMember = tournament.members.some((m) => m.userId === user.id);
  if (!isMember && !canMonitor) redirect("/turnee");

  const restrictToStarted = memberUserId !== user.id;

  const competitionKeys = resolveTournamentCompetitionKeys(tournament);
  if (competitionKeys.length === 0) {
    redirect(`/turnee/${tournamentId}`);
  }

  const targetMembership = tournament.members.find((m) => m.userId === memberUserId);
  if (!targetMembership) notFound();

  const { matches, loadError } = await loadTournamentMatches(tournament, {
    cacheOnly: true,
  });

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

  const oddsSnapshot = await loadTournamentOddsSnapshot(competitionKeys);
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
      tournamentId={tournamentId}
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
