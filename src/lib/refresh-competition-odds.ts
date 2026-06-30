import { revalidatePath } from "next/cache";
import { parseStoredCompetition } from "@/lib/competition";
import { collectTeamsFromMatches, fetchCompetitionMatches } from "@/lib/football-data";
import {
  fillEstimatedQualifyOdds,
  fillEstimatedToAdvanceOdds,
  mergeBettingPayloads,
  parseBettingOddsPayload,
  sanitizeBettingPayload,
  type BettingOddsPayload,
} from "@/lib/betting-odds";
import { isKnockoutStage } from "@/lib/knockout-predictions";
import { bestLegacyTournamentOddsPayload } from "@/lib/competition-odds";
import {
  getOddsProvider,
  isOddsFallbackGeminiEnabled,
  isOddsSupplementGeminiEnabled,
  resolveOddsProviderName,
} from "@/lib/odds-providers";
import { geminiOddsProvider } from "@/lib/odds-providers/gemini-provider";
import { supplementOddsWithGemini } from "@/lib/odds-supplement";
import { isGeminiApiKeyConfigured } from "@/lib/gemini-odds-fetch";
import { prisma } from "@/lib/prisma";

export type RefreshCompetitionOddsResult =
  | {
      ok: true;
      competition: string;
      matchCount: number;
      teamCount: number;
      oddsSource: string;
      usedFallback: boolean;
    }
  | { ok: false; competition: string; error: string };

/** Actualizează cotele partajate pentru o competiție (ex. WC_2026). */
export async function refreshOddsForCompetition(
  competition: string,
): Promise<RefreshCompetitionOddsResult> {
  const competitionKey = competition.trim();
  if (!competitionKey) {
    return { ok: false, competition: competitionKey, error: "Competiție nesetată." };
  }

  const parsed = parseStoredCompetition(competitionKey);
  if (!parsed) {
    return {
      ok: false,
      competition: competitionKey,
      error: `Competiție invalidă: ${competitionKey}`,
    };
  }

  try {
    const existingRow = await prisma.competitionBettingOdds.findUnique({
      where: { competition: competitionKey },
    });
    const existingPayload =
      parseBettingOddsPayload(existingRow?.payload ?? null) ??
      (await bestLegacyTournamentOddsPayload(competitionKey));

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

    let payload: BettingOddsPayload = sanitizeBettingPayload(rawPayload);

    if (isGeminiApiKeyConfigured() && isOddsSupplementGeminiEnabled()) {
      try {
        const supplement = await supplementOddsWithGemini(payload, ctx);
        if (supplement.supplementedTeams || supplement.supplementedMatchCount > 0) {
          payload = supplement.payload;
          oddsSource =
            oddsSource.includes("gemini-supplement") ?
              oddsSource
            : `${oddsSource}+gemini-supplement`;
          console.info(
            `[odds] Completare Gemini: calificări=${supplement.supplementedTeams}, meciuri=${supplement.supplementedMatchCount}`,
          );
        }
      } catch (supplementErr) {
        const msg =
          supplementErr instanceof Error ? supplementErr.message : String(supplementErr);
        console.warn(
          `[odds] Completare Gemini eșuată (${msg}); se păstrează cotele existente.`,
        );
      }
    }

    if (existingPayload) {
      payload = mergeBettingPayloads(payload, existingPayload);
    }

    payload = fillEstimatedQualifyOdds(payload);
    const koMatchIds = matches
      .filter((m) => isKnockoutStage(m.stage))
      .map((m) => m.id);
    payload = fillEstimatedToAdvanceOdds(payload, koMatchIds);

    await prisma.competitionBettingOdds.upsert({
      where: { competition: competitionKey },
      create: {
        competition: competitionKey,
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

    const tournamentIds = await prisma.tournament.findMany({
      where: { competition: competitionKey },
      select: { id: true },
    });
    for (const t of tournamentIds) {
      revalidatePath(`/turnee/${t.id}`);
    }

    return {
      ok: true,
      competition: competitionKey,
      matchCount: Object.keys(payload.matches).length,
      teamCount: Object.keys(payload.teams).length,
      oddsSource,
      usedFallback,
    };
  } catch (e) {
    return {
      ok: false,
      competition: competitionKey,
      error: e instanceof Error ? e.message : "Eroare necunoscută",
    };
  }
}
