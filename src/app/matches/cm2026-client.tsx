"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type {
  FootballDataMatch,
  GroupStanding,
} from "@/lib/football-data";
import { FootballDataMatchCard } from "@/components/world-cup/football-data-match-card";
import Image from "next/image";

type TabId = "standings" | "matches";

type KnockoutBlock = { stageLabel: string; matches: FootballDataMatch[] };

export function Cm2026FootballDataClient(props: {
  initialTab?: TabId;
  standings: GroupStanding[];
  groupKeysOrdered: string[];
  groupMatches: Record<string, FootballDataMatch[]>;
  knockoutBlocks: KnockoutBlock[];
}) {
  const {
    initialTab = "standings",
    standings,
    groupKeysOrdered,
    groupMatches,
    knockoutBlocks,
  } = props;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTabState] = useState<TabId>(initialTab);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "matches" || t === "standings") {
      setTabState(t);
    }
  }, [searchParams]);

  const setTab = useCallback(
    (next: TabId) => {
      setTabState(next);
      const p = new URLSearchParams(searchParams.toString());
      p.set("tab", next);
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const totalMatches = useMemo(
    () =>
      Object.values(groupMatches).reduce((n, a) => n + a.length, 0) +
      knockoutBlocks.reduce((n, b) => n + b.matches.length, 0),
    [groupMatches, knockoutBlocks],
  );

  return (
    <div className="mx-auto max-w-4xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: "#22D3EE" }}>
            Football-Data.org · API v4
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            FIFA World Cup 2026
          </h1>
          <p
            className="mt-2 text-sm max-w-xl"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            Group standings and full schedule (kick-offs Europe/Bucharest).
            Token:{" "}
            <code className="text-cyan-300 text-xs">FOOTBALL_DATA_TOKEN</code> /{" "}
            <code className="text-cyan-300 text-xs">FOOTBALL_API_KEY</code>.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-bold border transition-all hover:bg-white/5 self-start"
          style={{ borderColor: "rgba(255,255,255,0.2)", color: "#BEF264" }}
        >
          ← Home
        </Link>
      </header>

      <div
        className="flex rounded-2xl p-1 mb-10 border gap-1"
        style={{
          borderColor: "rgba(255,255,255,0.12)",
          backgroundColor: "rgba(255,255,255,0.04)",
        }}
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "standings"}
          onClick={() => setTab("standings")}
          className="flex-1 rounded-xl py-3 px-4 text-sm font-bold transition-all"
          style={
            tab === "standings"
              ? {
                  backgroundColor: "rgba(34,211,238,0.2)",
                  color: "#22D3EE",
                  border: "1px solid rgba(34,211,238,0.45)",
                }
              : {
                  color: "rgba(255,255,255,0.65)",
                  border: "1px solid transparent",
                }
          }
        >
          Group standings
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "matches"}
          onClick={() => setTab("matches")}
          className="flex-1 rounded-xl py-3 px-4 text-sm font-bold transition-all"
          style={
            tab === "matches"
              ? {
                  backgroundColor: "rgba(34,211,238,0.2)",
                  color: "#22D3EE",
                  border: "1px solid rgba(34,211,238,0.45)",
                }
              : {
                  color: "rgba(255,255,255,0.65)",
                  border: "1px solid transparent",
                }
          }
        >
          All matches{" "}
          <span className="opacity-60 font-normal">({totalMatches})</span>
        </button>
      </div>

      {tab === "standings" ? (
        <section className="space-y-10" aria-label="Standings">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {standings.map((g) => (
              <div key={`stand-${g.letter}`}>
                <h2
                  className="text-lg font-black mb-3 flex items-center gap-2"
                  style={{ color: "#BEF264" }}
                >
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
                    style={{
                      backgroundColor: "rgba(34,211,238,0.2)",
                      color: "#22D3EE",
                    }}
                  >
                    {g.letter}
                  </span>
                  {g.groupKey}
                </h2>
                <div
                  className="rounded-2xl border overflow-hidden text-sm"
                  style={{ borderColor: "rgba(255,255,255,0.12)" }}
                >
                  <table className="w-full text-left">
                    <thead>
                      <tr style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                        <th className="px-3 py-3 w-8 font-bold text-white">#</th>
                        <th className="px-3 py-3 font-bold text-white text-center">
                          Team
                        </th>
                        <th className="px-2 py-3 font-bold text-center text-white/80">
                          MP
                        </th>
                        <th className="px-2 py-3 font-bold text-center text-white/80">
                          W
                        </th>
                        <th className="px-2 py-3 font-bold text-center text-white/80">
                          D
                        </th>
                        <th className="px-2 py-3 font-bold text-center text-white/80">
                          L
                        </th>
                        <th className="px-2 py-3 font-bold text-center text-white/80">
                          GF
                        </th>
                        <th className="px-2 py-3 font-bold text-center text-white/80">
                          GA
                        </th>
                        <th className="px-3 py-3 font-bold text-right text-[#BEF264]">
                          Pts
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={9}
                            className="px-4 py-6 text-center text-sm"
                            style={{ color: "rgba(255,255,255,0.45)" }}
                          >
                            No standings data for this group in the API response yet.
                          </td>
                        </tr>
                      ) : (
                        g.rows.map((row) => (
                          <tr
                            key={
                              row.team.id ??
                              `${g.letter}-${row.position}-${row.team.name}`
                            }
                            className="border-t"
                            style={{ borderColor: "rgba(255,255,255,0.06)" }}
                          >
                            <td className="px-3 py-3 tabular-nums text-white/60 align-middle">
                              {row.position}
                            </td>
                            <td className="px-3 py-3 align-middle">
                              <div className="flex flex-col items-center justify-center gap-2 text-center py-1 px-1 min-w-0">
                                {row.team.crest ? (
                                  <Image
                                    src={row.team.crest}
                                    alt=""
                                    width={24}
                                    height={24}
                                    className="rounded shrink-0 bg-white/90 p-0.5 object-contain mx-auto"
                                    unoptimized
                                  />
                                ) : null}
                                <span className="font-semibold text-white text-sm leading-tight break-words">
                                  {row.team.name ?? row.team.shortName ?? "—"}
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
                            <td className="px-3 py-3 text-right font-black tabular-nums text-[#BEF264] align-middle">
                              {row.points}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="space-y-12" aria-label="Matches">
          {groupKeysOrdered.length > 0 ? (
            <div>
              <h2
                className="text-xl font-black mb-6 pb-2 border-b"
                style={{ color: "#fff", borderColor: "rgba(34,211,238,0.35)" }}
              >
                Group stage
              </h2>
              <div className="space-y-10">
                {groupKeysOrdered.map((key) => {
                  const list = groupMatches[key] ?? [];
                  return (
                    <div key={`match-${key}`}>
                      <h3
                        className="text-base font-bold mb-4 text-center lg:text-left"
                        style={{ color: "#BEF264" }}
                      >
                        {key}{" "}
                        <span className="text-xs font-normal opacity-50">
                          ({list.length})
                        </span>
                      </h3>
                      {list.length === 0 ? (
                        <p
                          className="text-sm text-center py-4 max-w-xl mx-auto"
                          style={{ color: "rgba(255,255,255,0.4)" }}
                        >
                          No matches for this group in the API response.
                        </p>
                      ) : (
                        <div className="flex flex-col gap-3">
                          {list.map((m) => (
                            <FootballDataMatchCard key={m.id} m={m} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {knockoutBlocks.length > 0 ? (
            <div>
              <h2
                className="text-xl font-black mb-6 pb-2 border-b"
                style={{ color: "#fff", borderColor: "rgba(34,211,238,0.35)" }}
              >
                Knockout stage
              </h2>
              <div className="space-y-10">
                {knockoutBlocks.map(({ stageLabel, matches: ms }) => (
                  <div key={stageLabel}>
                    <h3
                      className="text-base font-bold mb-4 text-center lg:text-left"
                      style={{ color: "#22D3EE" }}
                    >
                      {stageLabel}{" "}
                      <span className="text-xs font-normal opacity-50">
                        ({ms.length})
                      </span>
                    </h3>
                    <div className="flex flex-col gap-3">
                      {ms.map((m) => (
                        <FootballDataMatchCard key={m.id} m={m} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {groupKeysOrdered.length === 0 && knockoutBlocks.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.55)" }}>
              No matches returned by the API.
            </p>
          ) : null}
        </section>
      )}
    </div>
  );
}
