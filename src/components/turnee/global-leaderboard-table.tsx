"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";
import { LeaderboardTh } from "@/components/ui/column-header-tip";
import type { GlobalLeaderboardRow } from "@/lib/global-leaderboard";

export default function GlobalLeaderboardTable({
  rows,
  currentUserId,
}: {
  rows: GlobalLeaderboardRow[];
  currentUserId?: string;
}) {
  const { t } = useLocale();

  if (rows.length === 0) {
    return (
      <div
        className="rounded-2xl border p-10 text-center"
        style={{ borderColor: "rgba(255,255,255,0.06)", borderStyle: "dashed" }}
      >
        <p style={{ color: "rgba(255,255,255,0.25)" }} className="text-sm">
          {t("globalLb.empty")}
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border overflow-x-auto"
      style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#1E293B" }}
    >
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <LeaderboardTh label={t("party.lb.rank")} tip={t("party.lb.rankTip")} className="px-2" />
            <LeaderboardTh label={t("globalLb.user")} tip={t("globalLb.userTip")} className="px-2 min-w-[6rem]" />
            <LeaderboardTh
              label={t("globalLb.bestTournament")}
              tip={t("globalLb.bestTournamentTip")}
              className="px-2 min-w-[5rem]"
            />
            <LeaderboardTh label={t("party.lb.fg")} tip={t("party.lb.fgTip")} align="right" />
            <LeaderboardTh label={t("party.lb.pg")} tip={t("party.lb.pgTip")} align="right" />
            <LeaderboardTh label={t("party.lb.sc")} tip={t("party.lb.scTip")} align="right" />
            <LeaderboardTh label={t("party.lb.cg")} tip={t("party.lb.cgTip")} align="right" />
            <LeaderboardTh label={t("party.lb.ch")} tip={t("party.lb.chTip")} align="right" hiddenMd />
            <LeaderboardTh label={t("party.lb.pen")} tip={t("party.lb.penTip")} align="right" />
            <LeaderboardTh label={t("party.lb.total")} tip={t("party.lb.totalTip")} align="right" className="px-2" />
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
              <td className="py-2.5 px-2 text-white font-bold tabular-nums align-top">{row.rank}</td>
              <td className="py-2.5 px-2 align-top text-white font-medium truncate max-w-[10rem]">
                {row.displayName}
              </td>
              <td className="py-2.5 px-2 align-top">
                <Link
                  href={`/turnee/${row.bestTournamentId}`}
                  className="text-cyan-300/90 hover:underline underline-offset-2 text-xs truncate block max-w-[8rem]"
                  title={row.bestTournamentName}
                >
                  {row.bestTournamentName}
                </Link>
              </td>
              <td className="py-2.5 px-1 text-right tabular-nums align-top" style={{ color: "rgba(255,255,255,0.85)" }}>
                {row.fg}
              </td>
              <td className="py-2.5 px-1 text-right tabular-nums align-top" style={{ color: "rgba(255,255,255,0.85)" }}>
                {row.pg}
              </td>
              <td className="py-2.5 px-1 text-right tabular-nums align-top" style={{ color: "rgba(255,255,255,0.85)" }}>
                {row.sc}
              </td>
              <td className="py-2.5 px-1 text-right tabular-nums align-top" style={{ color: "rgba(255,255,255,0.85)" }}>
                {row.cg}
              </td>
              <td className="py-2.5 px-1 text-right tabular-nums align-top hidden md:table-cell" style={{ color: "rgba(255,255,255,0.85)" }}>
                {row.championPoints}
              </td>
              <td
                className="py-2.5 px-1 text-right tabular-nums align-top"
                style={{
                  color: row.changePenalty > 0 ? "rgba(251,191,36,0.95)" : "rgba(255,255,255,0.35)",
                }}
              >
                {row.changePenalty > 0 ? `−${row.changePenalty}` : "—"}
              </td>
              <td className="py-2.5 px-2 text-right font-bold tabular-nums align-top" style={{ color: "#BEF264" }}>
                {row.total}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
