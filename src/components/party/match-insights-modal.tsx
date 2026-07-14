"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormResult, H2HRow, RecentMatchRow } from "@/lib/match-insights";
import type { MatchInsightsPayload } from "@/lib/match-insights-fetch";
import { useLocale } from "@/components/i18n/locale-provider";

type TabId = "home" | "away" | "h2h";

function FormStrip({ results, label }: { results: FormResult[]; label: string }) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40 truncate">
        {label}
      </span>
      <div className="flex gap-1">
        {results.length === 0 ?
          <span className="text-xs text-white/30">—</span>
        : results.map((r, i) => (
            <span
              key={i}
              className="w-7 h-7 rounded-md text-[10px] font-black flex items-center justify-center"
              style={{
                backgroundColor:
                  r === "W" ? "rgba(34,197,94,0.22)"
                  : r === "L" ? "rgba(239,68,68,0.22)"
                  : "rgba(255,255,255,0.08)",
                color:
                  r === "W" ? "#86efac"
                  : r === "L" ? "#fca5a5"
                  : "rgba(255,255,255,0.55)",
              }}
            >
              {r}
            </span>
          ))
        }
      </div>
    </div>
  );
}

function RecentList({ rows, emptyLabel }: { rows: RecentMatchRow[]; emptyLabel: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-center py-8 text-white/40">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div
          key={`${row.date}-${row.opponent}-${i}`}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span
            className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-black shrink-0"
            style={{
              backgroundColor:
                row.result === "W" ? "rgba(34,197,94,0.2)"
                : row.result === "L" ? "rgba(239,68,68,0.2)"
                : "rgba(255,255,255,0.08)",
              color:
                row.result === "W" ? "#86efac"
                : row.result === "L" ? "#fca5a5"
                : "rgba(255,255,255,0.55)",
            }}
          >
            {row.result}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-white/90 truncate">
              {row.isHome ? "vs" : "@"} {row.opponent}
            </p>
            <p className="text-xs text-white/40">{row.date}</p>
          </div>
          <span className="font-bold tabular-nums text-white/85 shrink-0">{row.score}</span>
        </div>
      ))}
    </div>
  );
}

function H2HList({ rows, emptyLabel }: { rows: H2HRow[]; emptyLabel: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-center py-8 text-white/40">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div
          key={`${row.date}-${i}`}
          className="flex flex-col gap-1 rounded-xl px-3 py-2.5 text-sm"
          style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-white/90">
            {row.home} <span className="text-white/35">vs</span> {row.away}
          </p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">{row.date}</span>
            <span className="font-bold tabular-nums text-[#C5A059]">{row.score}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MatchInsightsModal({
  open,
  onClose,
  matchId,
  homeId,
  awayId,
  homeName,
  awayName,
  competition,
}: {
  open: boolean;
  onClose: () => void;
  matchId: number;
  homeId: number;
  awayId: number;
  homeName: string;
  awayName: string;
  competition: string | null;
}) {
  const { t } = useLocale();
  const [tab, setTab] = useState<TabId>("home");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MatchInsightsPayload | null>(null);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        matchId: String(matchId),
        homeId: String(homeId),
        awayId: String(awayId),
      });
      if (competition) params.set("competition", competition);

      const res = await fetch(`/api/match-insights?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? t("party.insights.loadError"));
      }
      setData(json as MatchInsightsPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("party.insights.loadError"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [matchId, homeId, awayId, competition, t]);

  useEffect(() => {
    if (!open) return;
    setTab("home");
    void fetchInsights();
  }, [open, fetchInsights]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const tabs: { id: TabId; label: string }[] = [
    { id: "home", label: homeName },
    { id: "away", label: awayName },
    { id: "h2h", label: "H2H" },
  ];

  return (
    <>
      <div className="ph-modal-backdrop" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 pointer-events-none">
        <div
          className="ph-modal w-full sm:max-w-lg max-h-[88vh] flex flex-col rounded-t-2xl sm:rounded-2xl pointer-events-auto overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="match-insights-title"
        >
          <div
            className="flex items-start justify-between gap-3 px-5 py-4 shrink-0 border-b"
            style={{ borderColor: "rgba(197,160,89,0.18)" }}
          >
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#C5A059] mb-1">
                {t("party.insights.badge")}
              </p>
              <h3 id="match-insights-title" className="text-base font-bold text-white leading-snug">
                {homeName} <span className="text-white/35 font-semibold">vs</span> {awayName}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/40 hover:text-white transition-colors p-1 shrink-0"
              aria-label={t("party.insights.close")}
            >
              ✕
            </button>
          </div>

          {loading ?
            <div className="p-8 text-center text-sm text-white/50">{t("party.insights.loading")}</div>
          : error ?
            <div className="p-6 flex flex-col gap-4 items-center text-center">
              <p className="text-sm text-red-300">{error}</p>
              <button
                type="button"
                onClick={() => void fetchInsights()}
                className="px-4 py-2 rounded-lg text-xs font-bold"
                style={{ backgroundColor: "rgba(197,160,89,0.2)", color: "#F5E6C8" }}
              >
                {t("party.insights.retry")}
              </button>
            </div>
          : data ?
            <>
              <div className="px-5 py-4 grid grid-cols-2 gap-4 border-b border-white/6">
                <FormStrip results={data.homeForm} label={homeName} />
                <FormStrip results={data.awayForm} label={awayName} />
              </div>

              {data.h2hSummary ?
                <div
                  className="mx-5 mt-4 px-3 py-2 rounded-lg text-xs tabular-nums text-center"
                  style={{ backgroundColor: "rgba(197,160,89,0.08)", color: "rgba(245,230,200,0.85)" }}
                >
                  H2H: {homeName} {data.h2hSummary.homeWins} – {data.h2hSummary.draws} – {data.h2hSummary.awayWins} {awayName}
                </div>
              : null}

              <div className="px-5 pt-4 flex gap-1.5 shrink-0">
                {tabs.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className="flex-1 min-w-0 px-2 py-2 rounded-lg text-[11px] sm:text-xs font-bold truncate transition-colors"
                    style={{
                      backgroundColor: tab === id ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.05)",
                      color: tab === id ? "#60A5FA" : "rgba(255,255,255,0.5)",
                      border: tab === id ? "1px solid rgba(59,130,246,0.35)" : "1px solid transparent",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="overflow-y-auto p-5 flex-1 min-h-0">
                {tab === "home" ?
                  <RecentList rows={data.homeRecent} emptyLabel={t("party.insights.noData")} />
                : tab === "away" ?
                  <RecentList rows={data.awayRecent} emptyLabel={t("party.insights.noData")} />
                : <H2HList rows={data.h2h} emptyLabel={t("party.insights.noH2H")} />}
              </div>
            </>
          : null}
        </div>
      </div>
    </>
  );
}
