"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import type { MiniGameLeaderboardPeriod, MiniGameLeaderboardRow } from "@/lib/mini-games/types";

export default function MiniGamesLeaderboard({
  rows,
  period,
  onPeriodChange,
  currentUserId,
}: {
  rows: MiniGameLeaderboardRow[];
  period: MiniGameLeaderboardPeriod;
  onPeriodChange: (p: MiniGameLeaderboardPeriod) => void;
  currentUserId?: string;
}) {
  const { t } = useLocale();

  const periods: { id: MiniGameLeaderboardPeriod; label: string }[] = [
    { id: "today", label: t("miniGames.lb.today") },
    { id: "week", label: t("miniGames.lb.week") },
    { id: "all", label: t("miniGames.lb.allTime") },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {periods.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPeriodChange(p.id)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            style={{
              backgroundColor: period === p.id ? "rgba(34,211,238,0.15)" : "rgba(255,255,255,0.05)",
              color: period === p.id ? "#22D3EE" : "rgba(255,255,255,0.55)",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div
          className="rounded-2xl border p-8 text-center text-sm"
          style={{ borderColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)" }}
        >
          {t("miniGames.lb.empty")}
        </div>
      ) : (
        <div
          className="rounded-2xl border overflow-x-auto"
          style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#1E293B" }}
        >
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <th className="py-2.5 px-3 text-left text-white/50 font-medium">#</th>
                <th className="py-2.5 px-3 text-left text-white/50 font-medium">{t("miniGames.lb.player")}</th>
                <th className="py-2.5 px-2 text-right text-white/50 font-medium">{t("miniGames.lb.trivia")}</th>
                <th className="py-2.5 px-2 text-right text-white/50 font-medium">{t("miniGames.lb.champion")}</th>
                <th className="py-2.5 px-2 text-right text-white/50 font-medium">{t("miniGames.lb.bingo")}</th>
                <th className="py-2.5 px-3 text-right text-white/50 font-medium">{t("miniGames.lb.total")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.userId}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    backgroundColor:
                      row.userId === currentUserId ? "rgba(34,211,238,0.06)" : undefined,
                  }}
                >
                  <td className="py-2.5 px-3 text-white font-bold tabular-nums">{row.rank}</td>
                  <td className="py-2.5 px-3 text-white font-medium truncate max-w-[10rem]">
                    {row.displayName}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-white/85">{row.triviaScore}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-white/85">{row.championScore}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-white/85">{row.bingoScore}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-bold text-cyan-300">
                    {row.totalScore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
