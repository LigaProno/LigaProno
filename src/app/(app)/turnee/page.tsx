import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { tournamentCompetitionLabel } from "@/lib/tournament-competition";
import { COMPETITION_PICKER_OPTIONS } from "@/lib/competition";
import { createTranslator } from "@/lib/i18n";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import { pageTitle } from "@/lib/site-metadata";
import { prisma } from "@/lib/prisma";
import {
  FINISHED_PUBLIC_PREVIEW_COUNT,
  finishedPublicListOrder,
  getVisiblePublicTournaments,
  toFinishedPublicCard,
} from "@/lib/public-tournaments";
import TournamentActionsWidget from "@/components/turnee/tournament-actions-widget";
import { FinishedPublicTournamentList } from "@/components/turnee/finished-public-tournament-list";
import { TurneePageHeader } from "@/components/turnee/turnee-page-header";
import { TurneeMyTournamentCard } from "@/components/turnee/turnee-my-tournament-card";
import { TurneePublicTournamentCard } from "@/components/turnee/turnee-public-tournament-card";
import { TurneePublicTabs } from "@/components/turnee/turnee-public-tabs";
import { TurneeEmptyState, TurneeSectionTitle } from "@/components/turnee/turnee-ui";

export const metadata = pageTitle("Turnee");

export default async function TurneePage() {
  const locale = await getLocaleFromCookies();
  const t = createTranslator(locale);
  const { userId: clerkId } = await auth();

  const finishedWhere = { isPublic: true, closedAt: { not: null } } as const;

  const [user, ongoingRaw, finishedCount, finishedPreview] = await Promise.all([
    clerkId
      ? prisma.user.findUnique({
          where: { clerkId },
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
        })
      : Promise.resolve(null),
    prisma.tournament.findMany({
      where: { isPublic: true, closedAt: null },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.tournament.count({ where: finishedWhere }),
    prisma.tournament.findMany({
      where: finishedWhere,
      include: { _count: { select: { members: true } } },
      orderBy: finishedPublicListOrder,
      take: FINISHED_PUBLIC_PREVIEW_COUNT,
    }),
  ]);

  const tournaments = user?.memberships.map((m) => m.tournament) ?? [];
  const userId = user?.id ?? null;
  const joinedIds = new Set(tournaments.map((tournament) => tournament.id));
  const privateTournaments = tournaments.filter((tournament) => !tournament.isPublic);

  const ongoingPublic = getVisiblePublicTournaments(ongoingRaw);
  const finishedCards = finishedPreview.map((tournament) => toFinishedPublicCard(tournament, joinedIds));
  const publicCount = ongoingPublic.length + finishedCount;

  function renderPublicList(list: typeof ongoingPublic, emptyText: string) {
    if (list.length === 0) {
      return (
        <div
          className="rounded-xl border p-8 text-center"
          style={{ borderColor: "rgba(255,255,255,0.08)", borderStyle: "dashed" }}
        >
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            {emptyText}
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-3">
        {list.map((pt) => (
          <TurneePublicTournamentCard
            key={pt.id}
            id={pt.id}
            name={pt.name}
            memberCount={pt._count.members}
            prizesRaw={pt.prizes}
            isJoined={joinedIds.has(pt.id)}
            openLabel={t("tournament.page.open")}
            isFinished={pt.closedAt != null}
            finishedLabel={t("tournament.page.finishedBadge")}
            prizePool={pt.prizePool}
          />
        ))}
      </div>
    );
  }

  function competitionLabelForTournament(tournament: {
    competition: string | null;
    competitions?: string[];
    selectedMatchIds?: number[];
  }) {
    return tournamentCompetitionLabel(tournament);
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
          {publicCount > 0 ?
            <div>
              <TurneeSectionTitle
                title={t("tournament.page.publicTitle")}
                badge={t("tournament.page.publicBadge")}
                count={publicCount}
                extra={
                  <Link
                    href="/regulament"
                    className="text-xs font-medium text-white/45 underline decoration-white/20 underline-offset-2 transition-colors hover:text-white"
                  >
                    {t("tournament.page.prizeEligibilityRules")}
                  </Link>
                }
              />
              <TurneePublicTabs
                ongoingCount={ongoingPublic.length}
                finishedCount={finishedCount}
                ongoingLabel={t("tournament.page.publicOngoing")}
                finishedLabel={t("tournament.page.publicFinished")}
                ongoing={renderPublicList(ongoingPublic, t("tournament.page.publicNoneOngoing"))}
                finished={
                  <FinishedPublicTournamentList
                    initial={finishedCards}
                    total={finishedCount}
                    emptyText={t("tournament.page.publicNoneFinished")}
                    openLabel={t("tournament.page.open")}
                    finishedLabel={t("tournament.page.finishedBadge")}
                  />
                }
              />
            </div>
          : null}

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
                    competitionLabel={competitionLabelForTournament(tournament)}
                    isOwner={userId === tournament.creatorId}
                    createdByText={t("tournament.page.createdBy", {
                      name:
                        `${tournament.creator.firstName ?? ""} ${tournament.creator.lastName ?? ""}`.trim() || "—",
                    })}
                    openLabel={t("tournament.page.open")}
                    prizesRaw={tournament.prizes}
                    prizeNote={tournament.prizeNote}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
