import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { findCompetitionPickerOption } from "@/lib/competition";

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
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Turnee private</h2>
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          {tournaments.length} turnee
        </span>
      </div>

      {tournaments.length === 0 ? (
        <div
          className="rounded-xl border p-10 text-center"
          style={{ borderColor: "rgba(255,255,255,0.06)", borderStyle: "dashed" }}
        >
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.25)" }}>
            Niciun turneu privat creat încă.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tournaments.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                borderColor: "rgba(255,255,255,0.08)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}
            >
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-white font-semibold truncate">{t.name}</span>
                <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {creatorName(t.creator.firstName, t.creator.lastName, t.creator.email)} · {t._count.members} membri
                </span>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-md"
                    style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)" }}
                  >
                    {competitionLabel(t.competition)}
                  </span>
                  <span
                    className="text-[11px] px-2 py-0.5 rounded-md font-mono"
                    style={{ backgroundColor: "rgba(96,165,250,0.1)", color: "#60A5FA" }}
                  >
                    {t.inviteCode}
                  </span>
                  {t.closedAt ? (
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-md"
                      style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
                    >
                      Închis
                    </span>
                  ) : null}
                </div>
              </div>
              <Link
                href={`/turnee/${t.id}`}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-90 shrink-0 self-start sm:self-auto"
                style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#FFFFFF" }}
              >
                Deschide
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
