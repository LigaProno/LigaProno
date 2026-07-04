import { Suspense } from "react";
import {
  fetchCompetitionMatchesFresh,
  fetchPartyStandings,
  partitionFootballDataMatches,
  sortKnockoutStageLabels,
  UNASSIGNED_GROUP_KEY,
  type FootballDataMatch,
  type GroupStanding,
} from "@/lib/football-data";
import { COMPETITION_PICKER_OPTIONS } from "@/lib/competition";
import { Cm2026FootballDataClient } from "./cm2026-client";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { MatchesLoading } from "@/components/matches/matches-loading";
import { createTranslator } from "@/lib/i18n";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import Link from "next/link";
import { pageTitle } from "@/lib/site-metadata";

export const metadata = pageTitle("Program și clasament");
export const dynamic = "force-dynamic";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const locale = await getLocaleFromCookies();
  const t = createTranslator(locale);
  const sp = await searchParams;
  const initialTab =
    sp.tab === "matches" ? ("matches" as const) : ("standings" as const);

  let standings: GroupStanding[] = [];
  let matches: FootballDataMatch[] = [];
  let loadError: string | null = null;

  const defaultComp = COMPETITION_PICKER_OPTIONS[0];
  try {
    matches = await fetchCompetitionMatchesFresh(defaultComp.code, defaultComp.season);
  } catch (e) {
    loadError =
      e instanceof Error ? e.message : t("matches.loadErrorDefault");
  }

  if (!loadError) {
    try {
      standings = await fetchPartyStandings(defaultComp.code, defaultComp.season, matches);
    } catch {
      standings = [];
    }
  }

  const { groups, knockoutByStageLabel } =
    partitionFootballDataMatches(matches);

  const groupKeysOrdered = [...groups.keys()].sort((a, b) => {
    if (a === UNASSIGNED_GROUP_KEY) return 1;
    if (b === UNASSIGNED_GROUP_KEY) return -1;
    return a.localeCompare(b, undefined, { numeric: true });
  });

  const groupMatches: Record<string, FootballDataMatch[]> = {};
  for (const k of groupKeysOrdered) {
    groupMatches[k] = groups.get(k) ?? [];
  }

  const knockoutKeys = sortKnockoutStageLabels([
    ...knockoutByStageLabel.keys(),
  ]);
  const knockoutBlocks = knockoutKeys.map((stageLabel) => ({
    stageLabel,
    matches: knockoutByStageLabel.get(stageLabel) ?? [],
  }));

  const finishedMatches = matches
    .filter((m) => m.status === "FINISHED")
    .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate));

  const upcomingMatches = matches
    .filter((m) => m.status !== "FINISHED" && m.status !== "CANCELLED" && m.status !== "POSTPONED")
    .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate));

  if (loadError) {
    return (
      <LocaleProvider initialLocale={locale}>
        <main
          className="min-h-screen p-6 sm:p-10 lg:p-14 flex flex-col items-center justify-center"
          style={{ backgroundColor: "#0F172A" }}
        >
          <div className="mx-auto max-w-lg w-full">
            <div
              className="rounded-2xl border p-6"
              style={{
                borderColor: "rgba(248,113,113,0.45)",
                backgroundColor: "rgba(248,113,113,0.08)",
                color: "#FECACA",
              }}
              role="alert"
            >
              <p className="font-bold mb-2">{t("matches.loadErrorTitle")}</p>
              <p className="text-sm mb-6">{loadError}</p>
              <Link
                href="/dashboard"
                className="inline-flex px-4 py-2 rounded-xl text-sm font-bold border"
                style={{ borderColor: "rgba(255,255,255,0.25)", color: "#BEF264" }}
              >
                {t("matches.backHome")}
              </Link>
            </div>
          </div>
        </main>
      </LocaleProvider>
    );
  }

  return (
    <LocaleProvider initialLocale={locale}>
      <main
        className="min-h-screen p-6 sm:p-10 lg:p-14 pb-24"
        style={{ backgroundColor: "#0F172A" }}
      >
        <Suspense fallback={<MatchesLoading />}>
          <Cm2026FootballDataClient
            initialTab={initialTab}
            standings={standings}
            groupKeysOrdered={groupKeysOrdered}
            groupMatches={groupMatches}
            knockoutBlocks={knockoutBlocks}
            finishedMatches={finishedMatches}
            upcomingMatches={upcomingMatches}
          />
        </Suspense>
      </main>
    </LocaleProvider>
  );
}
