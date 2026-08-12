import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { canManagePublicTournaments, isAdminEmail } from "@/lib/admin";
import { COMPETITION_PICKER_OPTIONS } from "@/lib/competition";
import { tournamentCompetitionLabel } from "@/lib/tournament-matches";
import CreatePublicTournamentForm from "../admin/CreatePublicTournamentForm";
import CreateMixedPublicTournamentForm from "../admin/CreateMixedPublicTournamentForm";
import DeletePublicTournamentButton from "./DeletePublicTournamentButton";
import { parsePrizes, placeLabel } from "@/lib/tournament-prizes";

export default async function ModeratorPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const { create } = await searchParams;
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user || !canManagePublicTournaments(user.email)) redirect("/dashboard");

  const isAdmin = isAdminEmail(user.email);
  const createMode = create === "mix" ? "mix" : "classic";

  // Doar turneele create de acest cont (adminii folosesc /admin pentru overview global).
  const publicTournaments = await prisma.tournament.findMany({
    where: {
      isPublic: true,
      creatorId: user.id,
    },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="w-full p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-80 transition-opacity"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Dashboard
      </Link>

      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Moderator</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            Creează și monitorizează doar turneele publice create de tine.
          </p>
          {isAdmin ? (
            <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.35)" }}>
              Overview-ul tuturor turneelor publice e pe{" "}
              <Link href="/admin" className="underline" style={{ color: "#60A5FA" }}>
                Admin
              </Link>
              .
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_min(100%,24rem)] gap-6 items-start">
          <section className="flex flex-col gap-4 min-w-0">
            <h2 className="text-lg font-semibold text-white">Turneele tale publice</h2>
            {publicTournaments.length === 0 ? (
              <div
                className="rounded-xl border p-10 text-center"
                style={{ borderColor: "rgba(255,255,255,0.06)", borderStyle: "dashed" }}
              >
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
                  Nu ai creat încă niciun turneu public.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {publicTournaments.map((tournament) => {
                  const isMix = (tournament.selectedMatchIds?.length ?? 0) > 0;
                  return (
                    <div
                      key={tournament.id}
                      className="rounded-xl border px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.06)",
                        borderColor: "rgba(255,255,255,0.08)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                      }}
                    >
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-semibold">{tournament.name}</span>
                          {isMix ? (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: "rgba(96,165,250,0.15)", color: "#60A5FA" }}
                            >
                              MIX
                            </span>
                          ) : null}
                        </div>
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                          {tournamentCompetitionLabel(tournament)}
                          {" · "}
                          {tournament._count.members} membri
                          {isMix ? ` · ${tournament.selectedMatchIds.length} meciuri` : null}
                        </span>
                        {parsePrizes(tournament.prizes).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {parsePrizes(tournament.prizes).map((p) => (
                              <span
                                key={p.place}
                                className="text-xs px-2 py-0.5 rounded-md font-medium"
                                style={{ backgroundColor: "rgba(96,165,250,0.1)", color: "#60A5FA" }}
                              >
                                {placeLabel(p.place)}: {p.prize}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap shrink-0">
                        <Link
                          href={`/turnee/${tournament.id}`}
                          className="px-4 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-90"
                          style={{ backgroundColor: "#3B82F6", color: "#0A0B1E" }}
                        >
                          Deschide
                        </Link>
                        <DeletePublicTournamentButton tournamentId={tournament.id} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside
            className="rounded-xl border p-5 flex flex-col gap-4 min-w-0"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              borderColor: "rgba(255,255,255,0.08)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            <div>
              <h2 className="text-white font-bold text-base">Creează turneu public</h2>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                Va apărea doar în lista ta de turnee.
              </p>
            </div>

            <div className="flex gap-1.5">
              <Link
                href="/moderator"
                className="flex-1 text-center px-3 py-2 rounded-lg text-xs font-semibold"
                style={
                  createMode === "classic"
                    ? { backgroundColor: "#3B82F6", color: "#0A0B1E" }
                    : { backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }
                }
              >
                Un campionat
              </Link>
              <Link
                href="/moderator?create=mix"
                className="flex-1 text-center px-3 py-2 rounded-lg text-xs font-semibold"
                style={
                  createMode === "mix"
                    ? { backgroundColor: "#3B82F6", color: "#0A0B1E" }
                    : { backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }
                }
              >
                Mix meciuri
              </Link>
            </div>

            {createMode === "mix" ? (
              <CreateMixedPublicTournamentForm competitionPickerOptions={COMPETITION_PICKER_OPTIONS} />
            ) : (
              <CreatePublicTournamentForm competitionPickerOptions={COMPETITION_PICKER_OPTIONS} />
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
