import { revalidatePath } from "next/cache";
import { parseStoredCompetition } from "@/lib/competition";
import { collectTeamsFromMatches, fetchCompetitionMatches } from "@/lib/football-data";
import {
  sanitizeBettingPayload,
  type BettingOddsPayload,
} from "@/lib/betting-odds";
import {
  getOddsProvider,
  isOddsFallbackGeminiEnabled,
  resolveOddsProviderName,
} from "@/lib/odds-providers";
import { geminiOddsProvider } from "@/lib/odds-providers/gemini-provider";
import { prisma } from "@/lib/prisma";

export type RefreshOddsResult =
  | {
      ok: true;
      tournamentId: string;
      matchCount: number;
      teamCount: number;
      oddsSource: string;
      usedFallback: boolean;
    }
  | { ok: false; tournamentId: string; error: string };

/** Actualizează cotele pentru un party Football-Data (fără verificare creator). */
export async function refreshOddsForTournament(
  tournamentId: string,
): Promise<RefreshOddsResult> {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) {
      return { ok: false, tournamentId, error: "Turneu inexistent." };
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
    const ctx = {
      competitionLabel,
      code: parsed.code,
      season: parsed.season,
      matches,
      teams,
    };

    const primary = getOddsProvider();
    let oddsSource = primary.name;
    let usedFallback = false;
    let rawPayload: BettingOddsPayload;

    try {
      const result = await primary.fetchOdds(ctx);
      rawPayload = result.payload;
      oddsSource = result.provider;
    } catch (primaryErr) {
      const msg = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
      const canFallback =
        isOddsFallbackGeminiEnabled() &&
        resolveOddsProviderName() === "oddsportal";

      if (!canFallback) {
        throw primaryErr;
      }

      const fallback = await geminiOddsProvider.fetchOdds(ctx);
      rawPayload = fallback.payload;
      oddsSource = `gemini-fallback:${fallback.provider}`;
      usedFallback = true;
      console.warn(
        `[odds] OddsPortal eșuat (${msg}); folosit fallback Gemini.`,
      );
    }

    const payload: BettingOddsPayload = sanitizeBettingPayload(rawPayload);

    await prisma.tournamentBettingOdds.upsert({
      where: { tournamentId },
      create: {
        tournamentId,
        payload: payload as object,
        oddsSource,
        geminiModel: oddsSource.startsWith("gemini") ? oddsSource : null,
      },
      update: {
        payload: payload as object,
        oddsSource,
        geminiModel: oddsSource.startsWith("gemini") ? oddsSource : null,
        fetchedAt: new Date(),
      },
    });

    revalidatePath("/turnee");
    revalidatePath("/turnee/clasament");
    revalidatePath(`/turnee/${tournamentId}`);

    return {
      ok: true,
      tournamentId,
      matchCount: Object.keys(payload.matches).length,
      teamCount: Object.keys(payload.teams).length,
      oddsSource,
      usedFallback,
    };
  } catch (e) {
    return {
      ok: false,
      tournamentId,
      error: e instanceof Error ? e.message : "Eroare necunoscută",
    };
  }
}
