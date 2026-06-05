import type { Metadata } from "next";
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
import { enrichWorldCupMatchesWithSchedule } from "@/lib/wc-match-schedule-scraper";
import { Cm2026FootballDataClient } from "./cm2026-client";

export const metadata: Metadata = {
  title: "Program CM 2026 | PronoHub",
  description:
    "Clasament grupe și program meciuri Cupa Mondială 2026 — stadion, locație, ora României.",
};

export const dynamic = "force-dynamic";

function MatchesLoading() {
  return (
    <div
      className="min-h-[40vh] flex items-center justify-center text-sm"
      style={{ color: "rgba(255,255,255,0.45)" }}
    >
      Loading…
    </div>
  );
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const initialTab =
    sp.tab === "matches" ? ("matches" as const) : ("standings" as const);

  let standings: GroupStanding[] = [];
  let matches: FootballDataMatch[] = [];
  let loadError: string | null = null;

  try {
    matches = await fetchWorldCupMatchesFootballData();
    matches = await enrichWorldCupMatchesWithSchedule(matches);
  } catch (e) {
    loadError =
      e instanceof Error ? e.message : "Nu s-au putut încărca meciurile.";
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
            <p className="font-bold mb-2">Eroare la încărcare</p>
            <p className="text-sm mb-6">{loadError}</p>
            <a
              href="/"
              className="inline-flex px-4 py-2 rounded-xl text-sm font-bold border"
              style={{ borderColor: "rgba(255,255,255,0.25)", color: "#BEF264" }}
            >
              ← Acasă
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
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
  );
}
