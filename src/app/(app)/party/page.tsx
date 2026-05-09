import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  type FootballDataCompetitionPickerOption,
} from "@/lib/competition";
import { getFootballDataCompetitionPickerOptions } from "@/lib/football-data";
import { prisma } from "@/lib/prisma";
import CreateTournamentForm from "@/components/CreateTournamentForm";
import JoinTournamentForm from "@/components/JoinTournamentForm";

export default async function PartyPage() {
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Party</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
          Create or join a tournament with friends
        </p>
      </div>

      {/* Create / Join cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        <CreateTournamentForm
          competitionPickerOptions={competitionPickerOptions}
          competitionsLoadError={competitionsLoadError}
        />
        <JoinTournamentForm />
      </div>

      {/* Tournament list */}
      <div>
        <h2 className="text-white font-semibold mb-4">Your Tournaments</h2>

        {tournaments.length === 0 ? (
          <div
            className="rounded-2xl border p-10 text-center"
            style={{ borderColor: "rgba(255,255,255,0.06)", borderStyle: "dashed" }}
          >
            <p style={{ color: "rgba(255,255,255,0.25)" }} className="text-sm">
              No tournaments yet. Create one or join with an invite code.
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
                    Created by {t.creator.firstName} {t.creator.lastName}
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
                    href={`/party/${t.id}`}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-opacity hover:opacity-90 shrink-0"
                    style={{ backgroundColor: "#22D3EE", color: "#0F172A" }}
                  >
                    Open
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
