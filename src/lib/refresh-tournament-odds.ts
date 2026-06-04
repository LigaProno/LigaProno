import { revalidatePath } from "next/cache";
import { parseStoredCompetition } from "@/lib/competition";
import { collectTeamsFromMatches, fetchCompetitionMatches } from "@/lib/football-data";
import {
  sanitizeBettingPayload,
  type BettingOddsPayload,
} from "@/lib/betting-odds";
import { fetchBettingOddsViaGemini } from "@/lib/gemini-odds-fetch";
import { prisma } from "@/lib/prisma";

export type RefreshOddsResult =
  | {
      ok: true;
      tournamentId: string;
      matchCount: number;
      teamCount: number;
      model: string;
      usedGoogleSearch: boolean;
    }
  | { ok: false; tournamentId: string; error: string };

/** Actualizează cotele Gemini pentru un party Football-Data (fără verificare creator). */
export async function refreshOddsForTournament(
  tournamentId: string,
): Promise<RefreshOddsResult> {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) {
      return { ok: false, tournamentId, error: "Party inexistent." };
    }

    const parsed = parseStoredCompetition(tournament.competition);
    if (!parsed) {
      return { ok: false, tournamentId, error: "Competiție nesetată." };
    }

    const matches = await fetchCompetitionMatches(parsed.code, parsed.season);
    const allTeams = collectTeamsFromMatches(matches);
    const teams = allTeams
      .filter((t) => t.id != null)
      .map((t) => ({
        id: t.id!,
        name: t.name ?? t.shortName ?? `Team ${t.id}`,
      }));

    const competitionLabel = `${parsed.code} ${parsed.season}`;

    const { payload: rawPayload, model, usedGoogleSearch } =
      await fetchBettingOddsViaGemini(competitionLabel, matches, teams);
    const payload: BettingOddsPayload = sanitizeBettingPayload(rawPayload);

    await prisma.tournamentBettingOdds.upsert({
      where: { tournamentId },
      create: {
        tournamentId,
        payload: payload as object,
        geminiModel: model,
      },
      update: {
        payload: payload as object,
        geminiModel: model,
        fetchedAt: new Date(),
      },
    });

    revalidatePath("/party");
    revalidatePath(`/party/${tournamentId}`);

    return {
      ok: true,
      tournamentId,
      matchCount: Object.keys(payload.matches).length,
      teamCount: Object.keys(payload.teams).length,
      model,
      usedGoogleSearch,
    };
  } catch (e) {
    return {
      ok: false,
      tournamentId,
      error: e instanceof Error ? e.message : "Eroare necunoscută",
    };
  }
}
