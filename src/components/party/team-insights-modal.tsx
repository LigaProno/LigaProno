"use client";

import { AppModal } from "@/components/ui/app-modal";
import type { H2HRow, RecentMatchRow } from "@/lib/match-insights";

export function TeamInsightsModal({
  open,
  title,
  onClose,
  recentMatches,
  h2hRows,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  recentMatches?: RecentMatchRow[];
  h2hRows?: H2HRow[];
}) {
  return (
    <AppModal open={open} onClose={onClose} className="w-full sm:max-w-md max-h-[min(85dvh,640px)]">
      <div
        className="flex items-center justify-between px-5 py-4 shrink-0 border-b"
        style={{ borderColor: "rgba(197,160,89,0.18)" }}
      >
        <h3 className="text-base font-bold text-white">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.06)" }}
          aria-label="Închide"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="overflow-y-auto overscroll-contain p-5 space-y-2 flex-1 min-h-0">
        {recentMatches?.map((row, i) => (
          <div
            key={`${row.date}-${i}`}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm"
            style={{ backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <span
              className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-black shrink-0"
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
            <span className="font-bold tabular-nums text-white/80 shrink-0">{row.score}</span>
          </div>
        ))}

        {h2hRows?.map((row, i) => (
          <div
            key={`${row.date}-${i}`}
            className="flex flex-col gap-1 rounded-lg px-3 py-2.5 text-sm"
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

        {(!recentMatches?.length && !h2hRows?.length) ?
          <p className="text-sm text-center py-6 text-white/40">Nu există date disponibile.</p>
        : null}
      </div>
    </AppModal>
  );
}
