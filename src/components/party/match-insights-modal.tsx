"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { AppModal } from "@/components/ui/app-modal";
import type { FormResult, H2HRow, RecentMatchRow } from "@/lib/match-insights";
import type { MatchInsightsPayload } from "@/lib/match-insights-fetch";
import { useLocale } from "@/components/i18n/locale-provider";

type TabId = "home" | "away" | "h2h";

const TAB_ORDER: TabId[] = ["home", "away", "h2h"];

const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.045, delayChildren: 0.04 },
  },
  exit: { opacity: 0, transition: { duration: 0.12 } },
};

const listItemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, damping: 22, stiffness: 320 },
  },
};

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
            <motion.span
              key={i}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04, type: "spring", damping: 16, stiffness: 420 }}
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
            </motion.span>
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
    <motion.div className="space-y-2" variants={listContainerVariants} initial="hidden" animate="visible" exit="exit">
      {rows.map((row, i) => (
        <motion.div
          key={`${row.date}-${row.opponent}-${i}`}
          variants={listItemVariants}
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
        </motion.div>
      ))}
    </motion.div>
  );
}

function H2HList({ rows, emptyLabel }: { rows: H2HRow[]; emptyLabel: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-center py-8 text-white/40">{emptyLabel}</p>;
  }

  return (
    <motion.div className="space-y-2" variants={listContainerVariants} initial="hidden" animate="visible" exit="exit">
      {rows.map((row, i) => (
        <motion.div
          key={`${row.date}-${i}`}
          variants={listItemVariants}
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
        </motion.div>
      ))}
    </motion.div>
  );
}

function TabPanel({
  tab,
  direction,
  data,
  emptyLabel,
  noH2HLabel,
  reduceMotion,
}: {
  tab: TabId;
  direction: number;
  data: MatchInsightsPayload;
  emptyLabel: string;
  noH2HLabel: string;
  reduceMotion: boolean;
}) {
  const slide = reduceMotion ? 0 : 28;

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={tab}
        custom={direction}
        initial={{ opacity: 0, x: direction * slide }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: direction * -slide }}
        transition={{ duration: reduceMotion ? 0.12 : 0.22, ease: [0.4, 0, 0.2, 1] }}
        className="overflow-y-auto overscroll-contain p-5 flex-1 min-h-0"
      >
        {tab === "home" ?
          <RecentList rows={data.homeRecent} emptyLabel={emptyLabel} />
        : tab === "away" ?
          <RecentList rows={data.awayRecent} emptyLabel={emptyLabel} />
        : <H2HList rows={data.h2h} emptyLabel={noH2HLabel} />}
      </motion.div>
    </AnimatePresence>
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
  const reduceMotion = useReducedMotion() ?? false;
  const [tab, setTab] = useState<TabId>("home");
  const [tabDirection, setTabDirection] = useState(0);
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
    setTabDirection(0);
    void fetchInsights();
  }, [open, fetchInsights]);

  function selectTab(next: TabId) {
    if (next === tab) return;
    const currentIdx = TAB_ORDER.indexOf(tab);
    const nextIdx = TAB_ORDER.indexOf(next);
    setTabDirection(nextIdx >= currentIdx ? 1 : -1);
    setTab(next);
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "home", label: homeName },
    { id: "away", label: awayName },
    { id: "h2h", label: "H2H" },
  ];

  return (
    <AppModal open={open} onClose={onClose} aria-labelledby="match-insights-title">
      <div
        className="flex items-start justify-between gap-3 px-5 py-4 shrink-0 border-b"
        style={{
          background:
            "linear-gradient(135deg, rgba(197,160,89,0.12) 0%, rgba(197,160,89,0.02) 60%, transparent 100%)",
          borderColor: "rgba(197,160,89,0.18)",
        }}
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
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0"
          style={{ color: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.06)" }}
          aria-label={t("party.insights.close")}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading ?
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="p-8 flex flex-col items-center gap-3 text-center"
          >
            <motion.span
              className="w-8 h-8 rounded-full border-2 border-[#C5A059]/30 border-t-[#C5A059]"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-sm text-white/50">{t("party.insights.loading")}</p>
          </motion.div>
        : error ?
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="p-6 flex flex-col gap-4 items-center text-center"
          >
            <p className="text-sm text-red-300">{error}</p>
            <button
              type="button"
              onClick={() => void fetchInsights()}
              className="px-4 py-2 rounded-lg text-xs font-bold"
              style={{ backgroundColor: "rgba(197,160,89,0.2)", color: "#F5E6C8" }}
            >
              {t("party.insights.retry")}
            </button>
          </motion.div>
        : data ?
          <motion.div
            key="content"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="px-5 py-4 grid grid-cols-2 gap-4 border-b border-white/6 shrink-0">
              <FormStrip results={data.homeForm} label={homeName} />
              <FormStrip results={data.awayForm} label={awayName} />
            </div>

            {data.h2hSummary ?
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08, duration: 0.2 }}
                className="mx-5 mt-4 px-3 py-2 rounded-lg text-xs tabular-nums text-center shrink-0"
                style={{ backgroundColor: "rgba(197,160,89,0.08)", color: "rgba(245,230,200,0.85)" }}
              >
                H2H: {homeName} {data.h2hSummary.homeWins} – {data.h2hSummary.draws} – {data.h2hSummary.awayWins}{" "}
                {awayName}
              </motion.div>
            : null}

            <div className="px-5 pt-4 flex gap-1.5 shrink-0">
              {tabs.map(({ id, label }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => selectTab(id)}
                    className="relative flex-1 min-w-0 px-2 py-2 rounded-lg text-[11px] sm:text-xs font-bold truncate transition-colors"
                    style={{ color: active ? "#60A5FA" : "rgba(255,255,255,0.5)" }}
                  >
                    {active ?
                      <motion.span
                        layoutId="insights-tab-highlight"
                        className="absolute inset-0 rounded-lg"
                        style={{
                          backgroundColor: "rgba(59,130,246,0.18)",
                          border: "1px solid rgba(59,130,246,0.35)",
                        }}
                        transition={{ type: "spring", damping: 26, stiffness: 380 }}
                      />
                    : null}
                    <span className="relative z-[1]">{label}</span>
                  </button>
                );
              })}
            </div>

            <TabPanel
              tab={tab}
              direction={tabDirection}
              data={data}
              emptyLabel={t("party.insights.noData")}
              noH2HLabel={t("party.insights.noH2H")}
              reduceMotion={reduceMotion}
            />
          </motion.div>
        : null}
      </AnimatePresence>
    </AppModal>
  );
}
