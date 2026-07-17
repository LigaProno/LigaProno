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
import { findCompetitionPickerOption } from "@/lib/competition";
import { Cm2026FootballDataClient } from "./cm2026-client";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { MatchesLoading } from "@/components/matches/matches-loading";
import { createTranslator } from "@/lib/i18n";
import { getLocaleFromCookies } from "@/lib/i18n/server";
import Link from "next/link";
import { publicPage } from "@/lib/site-metadata";

// Publică (vezi `proxy.ts`) — suprascrie noindex-ul din layout-ul `(app)`.
export const metadata = publicPage(
  "Program și clasament",
  "Program complet de meciuri, rezultate live și clasamente pe grupe — Premier League, La Liga, Serie A, Bundesliga, Ligue 1 și Cupa Mondială.",
  "/matches",
);
export const dynamic = "force-dynamic";

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; competition?: string }>;
}) {
  const locale = await getLocaleFromCookies();
  const t = createTranslator(locale);
  const sp = await searchParams;
  const initialTab =
    sp.tab === "matches" ? ("matches" as const) : ("standings" as const);

  const selectedComp = findCompetitionPickerOption(sp.competition);

  let standings: GroupStanding[] = [];
  let matches: FootballDataMatch[] = [];
  let loadError: string | null = null;

  try {
    matches = await fetchCompetitionMatchesFresh(selectedComp.code, selectedComp.season);
  } catch (e) {
    loadError =
      e instanceof Error ? e.message : t("matches.loadErrorDefault");
  }

  if (!loadError) {
    try {
      standings = await fetchPartyStandings(selectedComp.code, selectedComp.season, matches);
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
          style={{ backgroundColor: "transparent" }}
        >
          <div className="mx-auto max-w-lg w-full">
            <div
              className="rounded-xl border p-6"
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
                style={{ borderColor: "rgba(255,255,255,0.25)", color: "#60A5FA" }}
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
        style={{ backgroundColor: "transparent" }}
      >
        <Suspense fallback={<MatchesLoading />}>
          <Cm2026FootballDataClient
            initialTab={initialTab}
            competitionKey={selectedComp.storageKey}
            competitionLabel={selectedComp.label}
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
