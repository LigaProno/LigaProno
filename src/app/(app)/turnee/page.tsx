import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  type FootballDataCompetitionPickerOption,
} from "@/lib/competition";
import { getFootballDataCompetitionPickerOptions } from "@/lib/football-data";
import { prisma } from "@/lib/prisma";
import CreateTournamentForm from "@/components/CreateTournamentForm";
import JoinTournamentForm from "@/components/JoinTournamentForm";

export default async function TurneePage() {
  const { userId: clerkId } = await auth();

  let competitionPickerOptions: FootballDataCompetitionPickerOption[] = [];
  let competitionsLoadError: string | null = null;
  try {
    competitionPickerOptions =
      await getFootballDataCompetitionPickerOptions();
  } catch (e) {
    competitionsLoadError =
      e instanceof Error ? e.message : "Nu s-a putut încărca lista de competiții.";
  }

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

  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Turnee</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            Creează sau alătură-te unui turneu cu prietenii
          </p>
        </div>
        <Link
          href="/turnee/clasament"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold shrink-0 transition-opacity hover:opacity-90"
          style={{
            backgroundColor: "rgba(190,242,100,0.12)",
            color: "#BEF264",
            border: "1px solid rgba(190,242,100,0.35)",
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Clasament global
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <CreateTournamentForm
          competitionPickerOptions={competitionPickerOptions}
          competitionsLoadError={competitionsLoadError}
        />
        <JoinTournamentForm />
      </div>

      <div>
        <h2 className="text-white font-semibold mb-4">Turneele tale</h2>

        {tournaments.length === 0 ? (
          <div
            className="rounded-2xl border p-10 text-center"
            style={{ borderColor: "rgba(255,255,255,0.06)", borderStyle: "dashed" }}
          >
            <p style={{ color: "rgba(255,255,255,0.25)" }} className="text-sm">
              Niciun turneu încă. Creează unul sau intră cu un cod de invitație.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {tournaments.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                style={{ backgroundColor: "#1E293B", borderColor: "rgba(255,255,255,0.08)" }}
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-white font-semibold">{t.name}</span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                    Creat de {t.creator.firstName} {t.creator.lastName}
                  </span>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                    <span className="text-sm">{t._count.members}</span>
                  </div>

                  <div
                    className="px-3 py-1 rounded-lg text-xs font-bold tracking-widest"
                    style={{ backgroundColor: "rgba(34,211,238,0.1)", color: "#22D3EE" }}
                  >
                    {t.inviteCode}
                  </div>

                  <Link
                    href={`/turnee/${t.id}`}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-90 shrink-0"
                    style={{ backgroundColor: "#22D3EE", color: "#0F172A" }}
                  >
                    Deschide
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
