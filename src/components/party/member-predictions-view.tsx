import Link from "next/link";
import type { FootballDataMatch } from "@/lib/football-data";
import { formatMatchKickoff } from "@/lib/match-datetime";
import {
  formatPredFtPart,
  formatPredHtPart,
  matchResultHtFt,
  teamShort,
} from "@/lib/wc-pred-display";
import type { MatchPredictionInput } from "@/lib/wc-scoring";

type Row = { match: FootballDataMatch; pred: MatchPredictionInput };

export default function MemberPredictionsView({
  tournamentId,
  tournamentName,
  memberDisplayName,
  championPick,
  advancingCount,
  rows,
  loadError,
}: {
  tournamentId: string;
  tournamentName: string;
  memberDisplayName: string;
  championPick: string | null;
  advancingCount: number;
  rows: Row[];
  loadError: string | null;
}) {
  return (
    <div className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl mx-auto w-full">
      <Link
        href={`/turnee/${tournamentId}`}
        className="inline-flex items-center gap-2 text-sm mb-6 hover:opacity-80 transition-opacity"
        style={{ color: "rgba(255,255,255,0.5)" }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to party
      </Link>

      {loadError && (
        <div
          className="mb-6 rounded-xl border px-4 py-3 text-sm text-red-300"
          style={{
            borderColor: "rgba(248,113,113,0.35)",
            backgroundColor: "rgba(127,29,29,0.25)",
          }}
        >
          {loadError} Match list may be incomplete.
        </div>
      )}

      <header className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          {tournamentName}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">{memberDisplayName}</h1>
        <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.55)" }}>
          Champion:{" "}
          <span className="font-semibold text-amber-200/90">{championPick ?? "—"}</span>
          {" · "}
          Qualifier picks:{" "}
          <span className="font-semibold text-white/90">{advancingCount}</span>
        </p>
        <p className="text-xs sm:text-sm mt-3 leading-relaxed max-w-2xl" style={{ color: "rgba(255,255,255,0.38)" }}>
          Pr. HT / Pr. FT = half-time and full-time predictions they saved. HT / FT = official scores from the feed
          when available.
        </p>
      </header>

      {rows.length === 0 ?
        <div
          className="rounded-2xl border px-6 py-12 text-center text-sm"
          style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}
        >
          No saved match predictions yet.
        </div>
      : <div
          className="rounded-2xl border overflow-x-auto"
          style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#1E293B" }}
        >
          <table className="w-full text-xs sm:text-sm min-w-[32rem]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <th className="text-left py-3 px-3 sm:px-4 font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>
                  When
                </th>
                <th className="text-left py-3 px-2 font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Match
                </th>
                <th
                  className="text-center py-3 px-2 font-semibold"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                  title="Their half-time pick (1 / X / 2)"
                >
                  Pr. HT
                </th>
                <th
                  className="text-center py-3 px-2 font-semibold"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                  title="Their full-time pick (score or 1 / X / 2)"
                >
                  Pr. FT
                </th>
                <th
                  className="text-center py-3 px-2 font-semibold"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                  title="Actual half-time score"
                >
                  HT
                </th>
                <th
                  className="text-center py-3 px-2 font-semibold"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                  title="Actual full-time score"
                >
                  FT
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ match: m, pred }) => {
                const { ht: resHt, ft: resFt } = matchResultHtFt(m);
                const when = formatMatchKickoff(m.utcDate);
                const fx = `${teamShort(m.homeTeam)}–${teamShort(m.awayTeam)}`;
                return (
                  <tr key={m.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <td className="py-3 px-3 sm:px-4 align-top tabular-nums whitespace-nowrap" style={{ color: "rgba(255,255,255,0.55)" }}>
                      {when}
                    </td>
                    <td className="py-3 px-2 align-top font-medium text-cyan-200/90">{fx}</td>
                    <td className="py-3 px-2 align-top text-center tabular-nums font-medium" style={{ color: "rgba(255,255,255,0.92)" }}>
                      {formatPredHtPart(pred)}
                    </td>
                    <td className="py-3 px-2 align-top text-center tabular-nums font-medium" style={{ color: "rgba(255,255,255,0.92)" }}>
                      {formatPredFtPart(pred)}
                    </td>
                    <td className="py-3 px-2 align-top text-center tabular-nums font-semibold text-emerald-200/95">
                      {resHt ?? "—"}
                    </td>
                    <td className="py-3 px-2 align-top text-center tabular-nums font-semibold text-emerald-200/95">
                      {resFt ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      }
    </div>
  );
}
