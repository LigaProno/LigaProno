import { prisma } from "@/lib/prisma";
import { findCompetitionPickerOption } from "@/lib/competition";
import { PrivateTournamentsList } from "./PrivateTournamentsList";

function creatorName(first?: string | null, last?: string | null, email?: string): string {
  const s = `${first ?? ""} ${last ?? ""}`.trim();
  return s.length > 0 ? s : (email ?? "—");
}

function competitionLabel(competition: string | null): string {
  if (!competition) return "Fără competiție";
  return findCompetitionPickerOption(competition).label;
}

/** Doar-citire pentru admin: toate turneele private, ca să le poată inspecta la nevoie. */
export default async function PrivateTournamentsSection() {
  const tournaments = await prisma.tournament.findMany({
    where: { isPublic: false },
    include: {
      creator: { select: { firstName: true, lastName: true, email: true } },
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <PrivateTournamentsList
      tournaments={tournaments.map((t) => ({
        id: t.id,
        name: t.name,
        inviteCode: t.inviteCode,
        closed: t.closedAt != null,
        competitionLabel: competitionLabel(t.competition),
        memberCount: t._count.members,
        creatorLabel: creatorName(t.creator.firstName, t.creator.lastName, t.creator.email),
      }))}
    />
  );
}
