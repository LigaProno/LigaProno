"use client";

import type { FootballDataMatch } from "@/lib/football-data-types";
import { formatTeamDisplayName } from "@/lib/team-display";
import { formatMatchKickoff } from "@/lib/match-datetime";
import { getMatchScoreAfter90 } from "@/lib/match-score";
import { isMatchSettled, matchStatusBadge } from "@/lib/match-status";

export function MatchdayFixturesBar({
  matches,
  activeMatchId,
  onSelect,
}: {
  matches: FootballDataMatch[];
  activeMatchId?: number | null;
  onSelect?: (matchId: number) => void;
}) {
  if (matches.length === 0) return null;

  return (
    <div
      className="rounded-xl border p-3"
      style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] mb-2.5 text-[#C5A059]">
        Meciuri etapă ({matches.length})
      </p>
      <div className="flex flex-col gap-1.5">
        {matches.map((m) => {
          const finished = isMatchSettled(m);
          const score = finished ? getMatchScoreAfter90(m) : null;
          const home = formatTeamDisplayName(m.homeTeam);
          const away = formatTeamDisplayName(m.awayTeam);
          const active = activeMatchId === m.id;
          const badge = matchStatusBadge(m);

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onSelect?.(m.id)}
              className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-left transition-colors"
              style={{
                backgroundColor: active ? "rgba(197,160,89,0.14)" : "rgba(255,255,255,0.03)",
                border: active ? "1px solid rgba(197,160,89,0.28)" : "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <span className="text-[10px] tabular-nums shrink-0 w-12 text-white/35">
                {badge?.tone === "postponed" || badge?.tone === "cancelled"
                  ? "—"
                  : (formatMatchKickoff(m.utcDate).split(" ")[1] ?? "—")}
              </span>
              <span className="flex-1 min-w-0 text-xs sm:text-sm truncate">
                <span className="font-semibold text-white/90">{home}</span>
                <span className="text-white/30 mx-1.5">–</span>
                <span className="font-semibold text-white/90">{away}</span>
              </span>
              {score ?
                <span className="text-xs font-bold tabular-nums text-[#C5A059] shrink-0">
                  {score.home}:{score.away}
                </span>
              : badge ?
                <span
                  className="text-[10px] font-bold shrink-0"
                  style={{
                    color:
                      badge.tone === "live" ? "#f87171"
                      : badge.tone === "postponed" ? "#FBBF24"
                      : "rgba(255,255,255,0.45)",
                  }}
                >
                  {badge.label}
                </span>
              : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
