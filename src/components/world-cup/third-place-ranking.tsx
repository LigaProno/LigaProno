"use client";

import Image from "next/image";
import type { ThirdPlaceRankingEntry } from "@/lib/wc-scoring";
import { useLocale } from "@/components/i18n/locale-provider";

export function ThirdPlaceRankingTable({
  entries,
}: {
  entries: ThirdPlaceRankingEntry[];
}) {
  const { t } = useLocale();

  if (entries.length === 0) return null;

  return (
    <section aria-label={t("matches.thirdPlace.title")}>
      <div className="mb-4">
        <h2 className="text-lg font-black text-white mb-1">
          {t("matches.thirdPlace.title")}
        </h2>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
          {t("matches.thirdPlace.subtitle")}
        </p>
      </div>
      <div
        className="rounded-2xl border overflow-hidden text-sm"
        style={{ borderColor: "rgba(255,255,255,0.12)" }}
      >
        <table className="w-full text-left">
          <thead>
            <tr style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
              <th className="px-3 py-3 w-10 font-bold text-white">#</th>
              <th className="px-3 py-3 w-12 font-bold text-white">
                {t("matches.thirdPlace.group")}
              </th>
              <th className="px-3 py-3 font-bold text-white">
                {t("matches.standings.team")}
              </th>
              <th className="px-2 py-3 font-bold text-center text-white/80">
                {t("matches.standings.played")}
              </th>
              <th className="px-2 py-3 font-bold text-center text-white/80">
                {t("matches.standings.won")}
              </th>
              <th className="px-2 py-3 font-bold text-center text-white/80">
                {t("matches.standings.draw")}
              </th>
              <th className="px-2 py-3 font-bold text-center text-white/80">
                {t("matches.standings.lost")}
              </th>
              <th className="px-2 py-3 font-bold text-center text-white/80">
                {t("matches.standings.goalsFor")}
              </th>
              <th className="px-2 py-3 font-bold text-center text-white/80">
                {t("matches.standings.goalsAgainst")}
              </th>
              <th className="px-3 py-3 font-bold text-right text-[#BEF264]">
                {t("matches.standings.points")}
              </th>
              <th className="px-3 py-3 font-bold text-right text-white/80">
                {t("matches.thirdPlace.status")}
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const row = entry.row;
              const gd =
                row.goalDifference ??
                (row.goalsFor ?? 0) - (row.goalsAgainst ?? 0);
              return (
                <tr
                  key={`${entry.groupLetter}-${row.team?.id ?? entry.rank}`}
                  className="border-t"
                  style={{
                    borderColor: "rgba(255,255,255,0.06)",
                    backgroundColor: entry.qualifies
                      ? "rgba(34,211,238,0.06)"
                      : undefined,
                  }}
                >
                  <td className="px-3 py-3 tabular-nums font-bold text-white align-middle">
                    {entry.rank}
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <span
                      className="inline-flex w-8 h-8 rounded-lg items-center justify-center text-sm font-black"
                      style={{
                        backgroundColor: "rgba(34,211,238,0.2)",
                        color: "#22D3EE",
                      }}
                    >
                      {entry.groupLetter}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-middle">
                    <div className="flex items-center gap-2 min-w-0">
                      {row.team?.crest ? (
                        <Image
                          src={row.team.crest}
                          alt=""
                          width={24}
                          height={24}
                          className="rounded shrink-0 bg-white/90 p-0.5 object-contain"
                          unoptimized
                        />
                      ) : null}
                      <span className="font-semibold text-white truncate">
                        {row.team?.name ?? row.team?.shortName ?? "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center tabular-nums text-white/85 align-middle">
                    {row.playedGames}
                  </td>
                  <td className="px-2 py-3 text-center tabular-nums text-white/85 align-middle">
                    {row.won}
                  </td>
                  <td className="px-2 py-3 text-center tabular-nums text-white/85 align-middle">
                    {row.draw}
                  </td>
                  <td className="px-2 py-3 text-center tabular-nums text-white/85 align-middle">
                    {row.lost}
                  </td>
                  <td className="px-2 py-3 text-center tabular-nums text-white/85 align-middle">
                    {row.goalsFor}
                  </td>
                  <td className="px-2 py-3 text-center tabular-nums text-white/85 align-middle">
                    {row.goalsAgainst}
                  </td>
                  <td
                    className="px-3 py-3 text-right font-black tabular-nums align-middle"
                    style={{ color: "#BEF264" }}
                    title={`GD ${gd}`}
                  >
                    {row.points}
                  </td>
                  <td
                    className="px-3 py-3 text-right text-xs font-bold align-middle"
                    style={{
                      color: entry.qualifies ? "#22D3EE" : "rgba(255,255,255,0.35)",
                    }}
                  >
                    {entry.qualifies
                      ? t("matches.thirdPlace.qualified")
                      : t("matches.thirdPlace.eliminated")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
