"use client";

import type { FootballDataMatch } from "@/lib/football-data";
import { formatTeamDisplayName } from "@/lib/team-display";
import { formatMatchKickoff } from "@/lib/match-datetime";
import { getMatchScoreAfter90 } from "@/lib/match-score";

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
          const finished = m.status === "FINISHED" || m.status === "AWARDED";
          const score = finished ? getMatchScoreAfter90(m) : null;
          const home = formatTeamDisplayName(m.homeTeam);
          const away = formatTeamDisplayName(m.awayTeam);
          const active = activeMatchId === m.id;

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
                {formatMatchKickoff(m.utcDate).split(" ")[1] ?? "—"}
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
              : m.status === "IN_PLAY" || m.status === "PAUSED" ?
                <span className="text-[10px] font-bold text-red-400 shrink-0">LIVE</span>
              : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
