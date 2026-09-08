import { geminiOddsProvider } from "@/lib/odds-providers/gemini-provider";
import { getOddsPortalCompetition } from "@/lib/odds-providers/oddsportal/competition-map";
import { oddsPortalProvider } from "@/lib/odds-providers/oddsportal/provider";
import type { OddsProvider } from "@/lib/odds-providers/types";

export type OddsProviderName = "oddsportal" | "gemini";

/**
 * True dacă OddsPortal are mapare pentru competiție. Acolo unde are, el e
 * singura sursă: cotele trebuie să fie cele de pe piață, nu unele inventate de
 * un model. Gemini rămâne doar pentru competițiile neacoperite.
 */
export function hasOddsPortalCoverage(code: string, season: string): boolean {
  return getOddsPortalCompetition(code, season) != null;
}

export function resolveOddsProviderName(): OddsProviderName {
  const v = (process.env.ODDS_PROVIDER ?? "oddsportal").trim().toLowerCase();
  if (v === "gemini") return "gemini";
  return "oddsportal";
}

/** Fallback Gemini, permis doar pe competițiile fără mapare OddsPortal. */
export function isOddsFallbackGeminiEnabled(): boolean {
  const v = (process.env.ODDS_FALLBACK_GEMINI ?? "true").trim().toLowerCase();
  return v !== "0" && v !== "false" && v !== "no" && v !== "off";
}

/** Completează cu Gemini cotele lipsă după OddsPortal (calificări, meciuri nemapate). */
export function isOddsSupplementGeminiEnabled(): boolean {
  const v = (process.env.ODDS_SUPPLEMENT_GEMINI ?? "true").trim().toLowerCase();
  return v !== "0" && v !== "false" && v !== "no" && v !== "off";
}

export function getOddsProvider(name?: OddsProviderName): OddsProvider {
  const n = name ?? resolveOddsProviderName();
  return n === "gemini" ? geminiOddsProvider : oddsPortalProvider;
}

export { geminiOddsProvider, oddsPortalProvider };
