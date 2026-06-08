import { Suspense } from "react";
import {
  createEmptyWcGroupStandings,
  fetchWorldCupGroupStandings,
  fetchWorldCupMatchesFootballData,
  partitionFootballDataMatches,
  sortKnockoutStageLabels,
  WC_GROUP_ORDER,
  WC_UNASSIGNED_GROUP_KEY,
  type FootballDataMatch,
  type GroupStanding,
} from "@/lib/football-data";
import { COMPETITION_WC_2026 } from "@/lib/competition";
import { loadMatchesWithCompetitionVenues } from "@/lib/competition-match-venues";
import { Cm2026FootballDataClient } from "./cm2026-client";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { MatchesLoading } from "@/components/matches/matches-loading";
import { createTranslator } from "@/lib/i18n";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import Link from "next/link";
import { pageTitle } from "@/lib/site-metadata";

export const metadata = pageTitle("Program și clasament");

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

  try {
    matches = await fetchWorldCupMatchesFootballData();
    matches = await loadMatchesWithCompetitionVenues(COMPETITION_WC_2026, matches);
  } catch (e) {
    loadError =
      e instanceof Error ? e.message : t("matches.loadErrorDefault");
  }

  if (!loadError) {
    try {
      standings = await fetchWorldCupGroupStandings(matches);
    } catch {
      standings = createEmptyWcGroupStandings();
    }
  }

  const { groups, knockoutByStageLabel } =
    partitionFootballDataMatches(matches);

  const groupKeysOrdered = [...WC_GROUP_ORDER];
  if ((groups.get(WC_UNASSIGNED_GROUP_KEY)?.length ?? 0) > 0) {
    groupKeysOrdered.push(WC_UNASSIGNED_GROUP_KEY);
  }

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
          />
        </Suspense>
      </main>
    </LocaleProvider>
  );
}
