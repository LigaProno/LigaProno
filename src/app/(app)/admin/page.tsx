import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";
import { COMPETITION_PICKER_OPTIONS } from "@/lib/competition";
import CreatePublicTournamentForm from "./CreatePublicTournamentForm";
import DeletePublicTournamentButton from "./DeletePublicTournamentButton";
import SupportMessagesSection from "./SupportMessagesSection";
import PrivateTournamentsSection from "./PrivateTournamentsSection";
import { parsePrizes, placeLabel } from "@/lib/tournament-prizes";
import { createTranslator } from "@/lib/i18n";
import { getLocaleFromCookies } from "@/lib/i18n/server";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string; category?: string }>;
}) {
  const { tab, status, category } = await searchParams;
  const locale = await getLocaleFromCookies();
  const t = createTranslator(locale);
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user || !isAdminEmail(user.email)) redirect("/dashboard");

  const activeTab =
    tab === "support" ? "support" : tab === "private" ? "private" : "tournaments";

  const [publicTournaments, openSupportCount] = await Promise.all([
    prisma.tournament.findMany({
      where: { isPublic: true },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.supportMessage.count({ where: { status: "OPEN" } }),
  ]);

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full">
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            {activeTab === "support"
              ? "Mesajele trimise de utilizatori din formularul de support."
              : activeTab === "private"
                ? "Toate turneele private, doar pentru inspecție. Nu ești membru — le poți deschide fără să te alături."
                : "Gestionează turneele publice vizibile tuturor utilizatorilor."}
          </p>
        </div>

        <div className="flex gap-1.5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <Link
            href="/admin"
            className="px-4 py-2 text-sm font-semibold transition-colors -mb-px border-b-2"
            style={
              activeTab === "tournaments"
                ? { color: "#FFFFFF", borderColor: "#3B82F6" }
                : { color: "rgba(255,255,255,0.45)", borderColor: "transparent" }
            }
          >
            Turnee publice
          </Link>
          <Link
            href="/admin?tab=private"
            className="px-4 py-2 text-sm font-semibold transition-colors -mb-px border-b-2"
            style={
              activeTab === "private"
                ? { color: "#FFFFFF", borderColor: "#3B82F6" }
                : { color: "rgba(255,255,255,0.45)", borderColor: "transparent" }
            }
          >
            Turnee private
          </Link>
          <Link
            href="/admin?tab=support"
            className="px-4 py-2 text-sm font-semibold transition-colors -mb-px border-b-2 flex items-center gap-2"
            style={
              activeTab === "support"
                ? { color: "#FFFFFF", borderColor: "#3B82F6" }
                : { color: "rgba(255,255,255,0.45)", borderColor: "transparent" }
            }
          >
            Mesaje support
            {openSupportCount > 0 ? (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: "#F87171", color: "#0A0B1E" }}
              >
                {openSupportCount}
              </span>
            ) : null}
          </Link>
        </div>

        {activeTab === "support" ? (
          <SupportMessagesSection status={status} category={category} />
        ) : activeTab === "private" ? (
          <PrivateTournamentsSection />
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_min(100%,22rem)] gap-6 items-start">
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-white">Turnee publice</h2>
            {publicTournaments.length === 0 ? (
              <div
                className="rounded-xl border p-10 text-center"
                style={{ borderColor: "rgba(255,255,255,0.06)", borderStyle: "dashed" }}
              >
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
                  Niciun turneu public creat încă.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {publicTournaments.map((tournament) => (
                  <div
                    key={tournament.id}
                    className="rounded-xl border px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    style={{ backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.08)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="text-white font-semibold">{tournament.name}</span>
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {tournament._count.members} membri
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
                    <div className="flex items-center gap-3 flex-wrap">
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
                ))}
              </div>
            )}
          </section>

          <aside
            className="rounded-xl border p-5 flex flex-col gap-4"
            style={{ backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.08)", boxShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
          >
            <div>
              <h2 className="text-white font-bold text-base">Creează turneu public</h2>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                Toți utilizatorii vor putea vedea și intra în acest turneu.
              </p>
            </div>
            <CreatePublicTournamentForm competitionPickerOptions={COMPETITION_PICKER_OPTIONS} />
          </aside>
        </div>
        )}
      </div>
    </div>
  );
}
