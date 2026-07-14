"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  DASHBOARD_NEWS_LEAGUE_IDS,
  type DashboardNewsLeagueId,
} from "@/lib/dashboard-news-leagues";
import { useLocale } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n";

const LEAGUE_LABEL_KEYS: Record<DashboardNewsLeagueId, MessageKey> = {
  RO: "dashboard.news.leagues.ro",
  PL: "dashboard.news.leagues.pl",
  ES: "dashboard.news.leagues.es",
  DE: "dashboard.news.leagues.de",
  IT: "dashboard.news.leagues.it",
  FR: "dashboard.news.leagues.fr",
  CL: "dashboard.news.leagues.cl",
};

const GOLD = "#C5A059";

export function DashboardNewsLeaguePicker({
  activeLeagueId,
}: {
  activeLeagueId: DashboardNewsLeagueId;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const selectLeague = (leagueId: DashboardNewsLeagueId) => {
    if (leagueId === activeLeagueId || pending) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("league", leagueId);
    startTransition(() => {
      router.push(`/dashboard?${params.toString()}`);
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {DASHBOARD_NEWS_LEAGUE_IDS.map((leagueId) => {
        const active = leagueId === activeLeagueId;
        return (
          <button
            key={leagueId}
            type="button"
            disabled={pending}
            onClick={() => selectLeague(leagueId)}
            className="rounded-full px-3.5 py-1.5 text-xs font-bold tracking-wide transition-all disabled:opacity-60"
            style={{
              color: active ? "#071428" : "rgba(255,255,255,0.72)",
              backgroundColor: active ? GOLD : "rgba(255,255,255,0.06)",
              border: active ? "1px solid rgba(197,160,89,0.5)" : "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {t(LEAGUE_LABEL_KEYS[leagueId])}
          </button>
        );
      })}
    </div>
  );
}
