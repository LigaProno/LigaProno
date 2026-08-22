import DashboardHome, { type HomeTournament } from "@/components/dashboard/dashboard-home";
import { COMPETITION_PICKER_OPTIONS } from "@/lib/competition";
import { prisma } from "@/lib/prisma";
import { getVisiblePublicTournaments } from "@/lib/public-tournaments";
import { parsePrizes } from "@/lib/tournament-prizes";
import { pageTitle } from "@/lib/site-metadata";
import { redirect } from "next/navigation";
import { getOrSyncDbUser } from "@/lib/sync-clerk-user";

export const metadata = pageTitle("Acasă");

function competitionLabel(competition: string | null): string | null {
  if (!competition) return null;
  return (
    COMPETITION_PICKER_OPTIONS.find((o) => o.storageKey === competition)?.label ?? competition
  );
}

export default async function DashboardPage() {
  const user = await getOrSyncDbUser();
  if (user && user.favoriteTeamId == null) {
    redirect("/profil?onboarding=1");
  }

  const publicTournaments = await prisma.tournament.findMany({
    where: { isPublic: true },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "asc" },
  });

  // Doar turneele publice în desfășurare (nu cele încheiate).
  const ongoing = getVisiblePublicTournaments(publicTournaments).filter(
    (tt) => tt.closedAt == null,
  );

  const tournaments: HomeTournament[] = ongoing.map((tt) => ({
    id: tt.id,
    name: tt.name,
    memberCount: tt._count.members,
    prizes: parsePrizes(tt.prizes),
    competitionLabel: competitionLabel(tt.competition),
  }));

  return <DashboardHome tournaments={tournaments} />;
}
