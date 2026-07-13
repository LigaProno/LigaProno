import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { COMPETITION_PICKER_OPTIONS } from "@/lib/competition";
import { createTranslator } from "@/lib/i18n";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import { pageTitle } from "@/lib/site-metadata";
import { prisma } from "@/lib/prisma";
import TournamentActionsWidget from "@/components/turnee/tournament-actions-widget";
import DeleteTournamentButton from "@/components/turnee/delete-tournament-button";
import JoinPublicTournamentButton from "@/components/turnee/join-public-tournament-button";
import { parsePrizes, placeLabel } from "@/lib/tournament-prizes";

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
  const joinedIds = new Set(tournaments.map((t) => t.id));

  const publicTournaments = await prisma.tournament.findMany({
    where: { isPublic: true },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "desc" },
  });

  const unjoinedPublic = publicTournaments.filter((t) => !joinedIds.has(t.id));

  function competitionLabel(competition: string | null) {
    if (!competition) return null;
    return COMPETITION_PICKER_OPTIONS.find((o) => o.storageKey === competition)?.label ?? competition;
  }

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_min(100%,22rem)] gap-6 lg:gap-8 items-start">
        <header className="flex flex-col gap-4 min-w-0 lg:col-start-1 lg:row-start-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{t("tournament.page.myTournaments")}</h1>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
              {t("tournament.page.subtitle")}
            </p>
          </div>
          <Link
            href="/turnee/clasament"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold w-fit transition-opacity hover:opacity-90"
            style={{
              backgroundColor: "rgba(190,242,100,0.12)",
              color: "#BEF264",
              border: "1px solid rgba(190,242,100,0.35)",
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {t("tournament.page.globalLeaderboard")}
          </Link>
        </header>

        <section className="min-w-0 flex flex-col gap-6 lg:col-start-1 lg:row-start-2">
          {/* My tournaments */}
          <div className="flex flex-col gap-3">
            {tournaments.length === 0 ? (
              <div
                className="rounded-xl border p-10 text-center"
                style={{ borderColor: "rgba(255,255,255,0.06)", borderStyle: "dashed" }}
              >
                <p style={{ color: "rgba(255,255,255,0.25)" }} className="text-sm">
                  {t("tournament.page.noTournaments")}
                </p>
              </div>
            ) : (
              tournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="rounded-xl border px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  style={{ backgroundColor: "#0D1422", borderColor: "rgba(255,255,255,0.08)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-white font-semibold">{tournament.name}</span>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {t("tournament.page.createdBy", {
                        name: `${tournament.creator.firstName ?? ""} ${tournament.creator.lastName ?? ""}`.trim() || "—",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                      </svg>
                      <span className="text-sm">{tournament._count.members}</span>
                    </div>

                    <div
                      className="px-3 py-1 rounded-lg text-xs font-bold tracking-widest"
                      style={{ backgroundColor: "rgba(34,211,238,0.1)", color: "#22D3EE" }}
                    >
                      {tournament.inviteCode}
                    </div>

                    <Link
                      href={`/turnee/${tournament.id}`}
                      className="px-4 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-90 shrink-0"
                      style={{ backgroundColor: "#22D3EE", color: "#0F172A" }}
                    >
                      {t("tournament.page.open")}
                    </Link>

                    {userId === tournament.creatorId && (
                      <DeleteTournamentButton tournamentId={tournament.id} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Public tournaments not yet joined */}
          {unjoinedPublic.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 mt-2">
                <h2 className="text-base font-semibold text-white">Turnee publice</h2>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: "rgba(190,242,100,0.12)", color: "#BEF264" }}
                >
                  Deschise tuturor
                </span>
              </div>
              {unjoinedPublic.map((pt) => {
                const prizes = parsePrizes(pt.prizes);
                const hasPrizes = prizes.length > 0;
                return (
                  <div
                    key={pt.id}
                    className="rounded-xl border overflow-hidden"
                    style={{
                      backgroundColor: "#0D1422",
                      borderColor: hasPrizes ? "rgba(190,242,100,0.3)" : "rgba(190,242,100,0.18)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                    }}
                  >
                    {hasPrizes && (
                      <div
                        className="flex items-center gap-2 px-4 py-2 border-b"
                        style={{
                          background: "linear-gradient(90deg, rgba(190,242,100,0.12) 0%, rgba(190,242,100,0.04) 100%)",
                          borderColor: "rgba(190,242,100,0.2)",
                        }}
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="#BEF264" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8M12 17v4M17 3H7l1 7a4 4 0 008 0l1-7zM5 3H3v4c0 1.657 1.343 3 3 3M19 3h2v4c0 1.657-1.343 3-3 3" />
                        </svg>
                        <span className="text-xs font-semibold tracking-wide" style={{ color: "#BEF264" }}>
                          Turneu cu premii
                        </span>
                        <div className="flex items-center gap-1.5 ml-1">
                          {prizes.map((p, i) => (
                            <span
                              key={p.place}
                              className="text-xs font-medium px-2 py-0.5 rounded-md"
                              style={{
                                backgroundColor: i === 0 ? "rgba(190,242,100,0.18)" : i === 1 ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.07)",
                                color: i === 0 ? "#BEF264" : i === 1 ? "#22D3EE" : "rgba(255,255,255,0.5)",
                              }}
                            >
                              {placeLabel(p.place)} — {p.prize}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-white font-semibold">{pt.name}</span>
                        {competitionLabel(pt.competition) && (
                          <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                            {competitionLabel(pt.competition)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                          </svg>
                          <span className="text-sm">{pt._count.members}</span>
                        </div>
                        <JoinPublicTournamentButton tournamentId={pt.id} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="w-full lg:max-w-[22rem] lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:justify-self-end lg:sticky lg:top-6">
          <TournamentActionsWidget
            competitionPickerOptions={COMPETITION_PICKER_OPTIONS}
            competitionsLoadError={null}
          />
        </aside>
      </div>
    </div>
  );
}
