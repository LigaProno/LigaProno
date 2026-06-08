import { geminiOddsProvider } from "@/lib/odds-providers/gemini-provider";
import { oddsPortalProvider } from "@/lib/odds-providers/oddsportal/provider";
import type { OddsProvider } from "@/lib/odds-providers/types";

export type OddsProviderName = "oddsportal" | "gemini";

export function resolveOddsProviderName(): OddsProviderName {
  const v = (process.env.ODDS_PROVIDER ?? "oddsportal").trim().toLowerCase();
  if (v === "gemini") return "gemini";
  return "oddsportal";
}

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
