import { auth } from "@clerk/nextjs/server";
import { COMPETITION_PICKER_OPTIONS } from "@/lib/competition";
import { createTranslator } from "@/lib/i18n";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import { pageTitle } from "@/lib/site-metadata";
import { prisma } from "@/lib/prisma";
import { getVisiblePublicTournaments } from "@/lib/public-tournaments";
import TournamentActionsWidget from "@/components/turnee/tournament-actions-widget";
import { TurneePageHeader } from "@/components/turnee/turnee-page-header";
import { TurneeMyTournamentCard } from "@/components/turnee/turnee-my-tournament-card";
import { TurneePublicTournamentCard } from "@/components/turnee/turnee-public-tournament-card";
import { TurneeEmptyState, TurneeSectionTitle } from "@/components/turnee/turnee-ui";

export const metadata = pageTitle("Turnee");

export default async function TurneePage() {
  const locale = await getLocaleFromCookies();
  const t = createTranslator(locale);
  const { userId: clerkId } = await auth();

  const user = await prisma.user.findUnique({
    where: { clerkId: clerkId! },
    include: {
      memberships: {
        include: {
          tournament: {
            include: {
              _count: { select: { members: true } },
              creator: { select: { firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { joinedAt: "desc" },
      },
    },
  });

  const tournaments = user?.memberships.map((m) => m.tournament) ?? [];
  const userId = user?.id ?? null;
  const joinedIds = new Set(tournaments.map((tournament) => tournament.id));
  const privateTournaments = tournaments.filter((tournament) => !tournament.isPublic);

  const publicTournaments = await prisma.tournament.findMany({
    where: { isPublic: true },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "asc" },
  });

  const visiblePublicTournaments = getVisiblePublicTournaments(publicTournaments);

  function competitionLabel(competition: string | null) {
    if (!competition) return null;
    return COMPETITION_PICKER_OPTIONS.find((o) => o.storageKey === competition)?.label ?? competition;
  }

  const stepLabels = [
    { title: t("tournament.page.step1Title"), desc: t("tournament.page.step1Desc") },
    { title: t("tournament.page.step2Title"), desc: t("tournament.page.step2Desc") },
    { title: t("tournament.page.step3Title"), desc: t("tournament.page.step3Desc") },
  ];

  return (
    <div className="turnee-page flex-1 px-4 py-6 sm:px-6 md:px-8 pb-12 max-w-6xl mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-x-10 gap-y-8 items-start">
        <TurneePageHeader
          title={t("tournament.page.myTournaments")}
          subtitle={t("tournament.page.subtitle")}
          stepsLabel={t("tournament.page.stepsKicker")}
          stepLabels={stepLabels}
        />

        <aside className="order-1 lg:order-none lg:col-start-2 lg:row-start-2 lg:sticky lg:top-6">
          <TournamentActionsWidget
            competitionPickerOptions={COMPETITION_PICKER_OPTIONS}
            competitionsLoadError={null}
          />
        </aside>

        <section className="order-2 lg:order-none lg:col-start-1 lg:row-start-2 min-w-0 flex flex-col gap-8">
          <div>
            <TurneeSectionTitle
              title={t("tournament.page.yourTournaments")}
              count={privateTournaments.length}
            />
            {privateTournaments.length === 0 ?
              <TurneeEmptyState message={t("tournament.page.noTournaments")} />
            : (
              <div className="flex flex-col gap-3">
                {privateTournaments.map((tournament) => (
                  <TurneeMyTournamentCard
                    key={tournament.id}
                    id={tournament.id}
                    name={tournament.name}
                    memberCount={tournament._count.members}
                    inviteCode={tournament.inviteCode}
                    competitionLabel={competitionLabel(tournament.competition)}
                    isOwner={userId === tournament.creatorId}
                    createdByText={t("tournament.page.createdBy", {
                      name:
                        `${tournament.creator.firstName ?? ""} ${tournament.creator.lastName ?? ""}`.trim() || "—",
                    })}
                    openLabel={t("tournament.page.open")}
                  />
                ))}
              </div>
            )}
          </div>

          {visiblePublicTournaments.length > 0 ?
            <div>
              <TurneeSectionTitle
                title={t("tournament.page.publicTitle")}
                badge={t("tournament.page.publicBadge")}
                count={visiblePublicTournaments.length}
              />
              <div className="flex flex-col gap-3">
                {visiblePublicTournaments.map((pt) => (
                  <TurneePublicTournamentCard
                    key={pt.id}
                    id={pt.id}
                    name={pt.name}
                    memberCount={pt._count.members}
                    prizesRaw={pt.prizes}
                    isJoined={joinedIds.has(pt.id)}
                    openLabel={t("tournament.page.open")}
                  />
                ))}
              </div>
            </div>
          : null}
        </section>
      </div>
    </div>
  );
}
