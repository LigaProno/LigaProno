"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import type {
  FootballDataMatch,
  GroupStanding,
} from "@/lib/football-data";
import { FootballDataMatchCard } from "@/components/world-cup/football-data-match-card";
import { MatchesChronologicalTable } from "@/components/matches/matches-chronological-table";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useLocale } from "@/components/i18n/locale-provider";
import { ThirdPlaceRankingTable } from "@/components/world-cup/third-place-ranking";
import {
  buildBestThirdPlacesRanking,
  getStandingsQualificationMarks,
} from "@/lib/wc-standings";
import { getMatchAdvancingTeamId, getMatchScoreAfter90 } from "@/lib/match-score";

// ---------------------------------------------------------------------------
// Knockout bracket carousel
// ---------------------------------------------------------------------------

const KNOCKOUT_SHORT: Record<string, string> = {
  "Round of 32": "R32",
  "Round of 16": "R16",
  "Quarter-finals": "QF",
  "Semi-finals": "SF",
  "Final": "Final",
  "Third place": "3rd Place",
};

// Card height: active round gets full size, adjacent rounds get smaller cards
const BK_CARD_H_MAIN = 72;
const BK_CARD_H_SIDE = 52;
// Slot height for the base (first/most-matches) round — card + gap
const BK_SLOT = 84;
// Gap between columns (space between active and adjacent round)
const BK_COL_GAP = 28;
// Previous rounds slide fully off-screen; active starts at left edge
const BK_PEEK_L = 0;
// Right margin — next-next round peeks this many pixels from the right edge
const BK_PEEK_R = 12;

function BracketMatchCard({
  m,
  width,
  cardH,
}: {
  m: FootballDataMatch;
  width: number;
  cardH: number;
}) {
  const ft90 = getMatchScoreAfter90(m);
  const winner = m.score?.winner;
  const homeGoals = ft90?.home;
  const awayGoals = ft90?.away;
  const homeWon = winner === "HOME_TEAM";
  const awayWon = winner === "AWAY_TEAM";
  const hasResult = homeGoals != null && awayGoals != null;
  const advancingId = getMatchAdvancingTeamId(m);
  const homeName =
    m.homeTeam.shortName ?? m.homeTeam.tla ?? m.homeTeam.name ?? "TBD";
  const awayName =
    m.awayTeam.shortName ?? m.awayTeam.tla ?? m.awayTeam.name ?? "TBD";

  const rowStyle = (dimmed: boolean): React.CSSProperties => ({
    flex: 1,
    display: "flex",
    alignItems: "center",
    padding: "0 10px",
    gap: 6,
    opacity: dimmed ? 0.38 : 1,
    minWidth: 0,
  });

  return (
    <div
      style={{
        width,
        height: cardH,
        backgroundColor: "#1E293B",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 8,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={rowStyle(hasResult && (awayWon || advancingId === m.awayTeam.id))}>
        {m.homeTeam.crest ? (
          <Image
            src={m.homeTeam.crest}
            alt=""
            width={16}
            height={16}
            unoptimized
            style={{ objectFit: "contain", flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 16, height: 16, flexShrink: 0 }} />
        )}
        <span
          style={{
            flex: 1,
            fontSize: 12,
            fontWeight: 600,
            color: "white",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {homeName}
        </span>
        {homeGoals != null && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              fontVariantNumeric: "tabular-nums",
              flexShrink: 0,
              color: homeWon || advancingId === m.homeTeam.id ? "#BEF264" : "rgba(255,255,255,0.6)",
            }}
          >
            {homeGoals}
          </span>
        )}
      </div>
      <div
        style={{ height: 1, backgroundColor: "rgba(255,255,255,0.08)", flexShrink: 0 }}
      />
      <div style={rowStyle(hasResult && (homeWon || advancingId === m.homeTeam.id))}>
        {m.awayTeam.crest ? (
          <Image
            src={m.awayTeam.crest}
            alt=""
            width={16}
            height={16}
            unoptimized
            style={{ objectFit: "contain", flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 16, height: 16, flexShrink: 0 }} />
        )}
        <span
          style={{
            flex: 1,
            fontSize: 12,
            fontWeight: 600,
            color: "white",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {awayName}
        </span>
        {awayGoals != null && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              fontVariantNumeric: "tabular-nums",
              flexShrink: 0,
              color: awayWon || advancingId === m.awayTeam.id ? "#BEF264" : "rgba(255,255,255,0.6)",
            }}
          >
            {awayGoals}
          </span>
        )}
      </div>
    </div>
  );
}

function KnockoutCarousel({
  blocks,
}: {
  blocks: { stageLabel: string; matches: FootballDataMatch[] }[];
}) {
  const thirdPlace = blocks.find((b) => b.stageLabel === "Third place");
  const mainBlocks = blocks.filter((b) => b.stageLabel !== "Third place");
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(640);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) =>
      setContainerW(entry.contentRect.width),
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (mainBlocks.length === 0) return null;

  const baseMatchCount = mainBlocks[0].matches.length;
  // Full bracket height — used for the track so all bracket-spaced rounds fit inside it
  const totalH = baseMatchCount * BK_SLOT;
  // Compact container height — active round's matches at tight BK_SLOT spacing
  const activeMatchCount = mainBlocks[activeIdx]?.matches.length ?? 1;
  const containerH = activeMatchCount * BK_SLOT;

  // Two columns must fit: BK_PEEK_L + colW + BK_COL_GAP + colW + BK_PEEK_R = containerW
  const colW = Math.max(140, Math.floor(
    (containerW - BK_PEEK_L - 2 * BK_COL_GAP - BK_PEEK_R) / 2,
  ));
  const colStep = colW + BK_COL_GAP;

  // Translate track so active column starts at BK_PEEK_L from left
  const trackX = BK_PEEK_L - activeIdx * colStep;

  return (
    <div>
      {/* Round tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {mainBlocks.map((block, i) => {
          const isActive = i === activeIdx;
          return (
            <button
              key={block.stageLabel}
              type="button"
              onClick={() => setActiveIdx(i)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer"
              style={{
                backgroundColor: isActive
                  ? "rgba(34,211,238,0.15)"
                  : "rgba(255,255,255,0.06)",
                color: isActive ? "#22D3EE" : "rgba(255,255,255,0.45)",
                border: isActive
                  ? "1px solid rgba(34,211,238,0.35)"
                  : "1px solid transparent",
              }}
            >
              {KNOCKOUT_SHORT[block.stageLabel] ?? block.stageLabel}
              <span className="ml-1.5 opacity-50 font-normal text-[10px]">
                {block.matches.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bracket container — height = active round compact height, clips overflow */}
      <div
        ref={containerRef}
        style={{
          position: "relative",
          overflow: "hidden",
          height: containerH,
          transition: "height 0.45s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Right edge fade — softens the next-round peek */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10"
          style={{
            width: 18,
            background: "linear-gradient(to left, #0F172A 60%, transparent)",
          }}
        />

        {/* Sliding track — moves horizontally to show active round */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: mainBlocks.length * colStep,
            // Track must be tall enough for all bracket-spaced rounds
            height: totalH,
            transform: `translateX(${trackX}px)`,
            transition: "transform 0.45s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {/* Connector SVGs — one per gap, visible only for active→next */}
          {mainBlocks.slice(0, -1).map((block, ri) => {
            const colX = ri * colStep;
            const isActive = ri === activeIdx;
            const pairCount = Math.floor(block.matches.length / 2);
            const juncX = BK_COL_GAP / 2;
            const CONN = "rgba(34,211,238,0.35)";
            return (
              <svg
                key={`conn-${ri}`}
                style={{
                  position: "absolute",
                  top: 0,
                  left: colX + colW,
                  width: BK_COL_GAP,
                  height: totalH,
                  pointerEvents: "none",
                  opacity: isActive ? 1 : 0,
                  transition: "opacity 0.3s ease",
                }}
              >
                {Array.from({ length: pairCount }, (_, k) => {
                  // Active round is compact (BK_SLOT), next uses 2×BK_SLOT
                  // → next match k center = (2k+1)*BK_SLOT = pair midpoint ✓
                  const topY = (2 * k + 0.5) * BK_SLOT;
                  const botY = (2 * k + 1.5) * BK_SLOT;
                  const midY = (2 * k + 1) * BK_SLOT;
                  return (
                    <g key={k} stroke={CONN} strokeWidth={1} fill="none">
                      <line x1={0} y1={topY} x2={juncX} y2={topY} />
                      <line x1={0} y1={botY} x2={juncX} y2={botY} />
                      <line x1={juncX} y1={topY} x2={juncX} y2={botY} />
                      <line x1={juncX} y1={midY} x2={BK_COL_GAP} y2={midY} />
                    </g>
                  );
                })}
              </svg>
            );
          })}

          {/* Cards for every round */}
          {mainBlocks.map((block, ri) => {
            const colX = ri * colStep;
            const offset = ri - activeIdx;
            const cardH = offset === 0 ? BK_CARD_H_MAIN : BK_CARD_H_SIDE;
            // Previous rounds off-screen (opacity 0), next round dimmed
            const opacity = offset < 0 || offset > 1 ? 0 : offset === 0 ? 1 : 0.65;
            // Active: compact (BK_SLOT). Next: 2×BK_SLOT so match k sits at
            // midpoint of active pair k — enables clean ⌐ connectors.
            // Previous: compact (BK_SLOT), cards off-screen to the left.
            const slotH = BK_SLOT * Math.pow(2, Math.max(0, offset));

            return block.matches.map((m, mi) => {
              const cardTop = mi * slotH + (slotH - cardH) / 2;

              return (
                <div
                  key={m.id}
                  style={{
                    position: "absolute",
                    top: cardTop,
                    left: colX,
                    opacity,
                    transition:
                      "top 0.45s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease",
                  }}
                >
                  <BracketMatchCard m={m} width={colW} cardH={cardH} />
                </div>
              );
            });
          })}
        </div>
      </div>

      {/* 3rd place — shown only alongside the Final tab, visually secondary */}
      {thirdPlace && thirdPlace.matches.length > 0 &&
        activeIdx === mainBlocks.length - 1 && (
          <div className="mt-5" style={{ opacity: 0.55 }}>
            <p
              className="text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{ color: "#fb923c" }}
            >
              Finala mică
            </p>
            {thirdPlace.matches.map((m) => (
              <BracketMatchCard
                key={m.id}
                m={m}
                width={colW}
                cardH={BK_CARD_H_SIDE}
              />
            ))}
          </div>
        )}
    </div>
  );
}

type TabId = "standings" | "matches";

type KnockoutBlock = { stageLabel: string; matches: FootballDataMatch[] };

type MatchSubTabId = "__results__" | "__upcoming__" | "__knockout__" | string;

export function Cm2026FootballDataClient(props: {
  initialTab?: TabId;
  standings: GroupStanding[];
  groupKeysOrdered: string[];
  groupMatches: Record<string, FootballDataMatch[]>;
  knockoutBlocks: KnockoutBlock[];
  finishedMatches: FootballDataMatch[];
  upcomingMatches: FootballDataMatch[];
}) {
  const {
    initialTab = "standings",
    standings,
    groupKeysOrdered,
    groupMatches,
    knockoutBlocks,
    finishedMatches,
    upcomingMatches,
  } = props;

  const { t } = useLocale();
  const searchParams = useSearchParams();
  const [tab, setTabState] = useState<TabId>(initialTab);
  const [matchSubTab, setMatchSubTab] = useState<MatchSubTabId>("__results__");

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "matches" || tabParam === "standings") {
      setTabState(tabParam);
    }
  }, [searchParams]);

  const setTab = useCallback(
    (next: TabId) => {
      setTabState(next);
      // Update the URL bar without triggering a server re-render.
      // router.replace would cause a new server fetch on every tab switch.
      const url = new URL(window.location.href);
      url.searchParams.set("tab", next);
      window.history.replaceState(null, "", url.toString());
    },
    [],
  );

  const totalMatches = useMemo(
    () =>
      Object.values(groupMatches).reduce((n, a) => n + a.length, 0) +
      knockoutBlocks.reduce((n, b) => n + b.matches.length, 0),
    [groupMatches, knockoutBlocks],
  );

  const thirdPlaceRanking = useMemo(
    () => buildBestThirdPlacesRanking(standings),
    [standings],
  );

  const { directQualifyIds, thirdPlaceQualifyIds } = useMemo(
    () => getStandingsQualificationMarks(standings),
    [standings],
  );

  return (
    <div className="mx-auto max-w-4xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: "#22D3EE" }}>
            {t("dashboard.hero.badge")}
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            {t("matches.page.title")}
          </h1>
          <p
            className="mt-2 text-sm max-w-xl"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            {t("matches.page.subtitle")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3 self-start">
          <LanguageSwitcher compact />
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-bold border transition-all hover:bg-white/5"
            style={{ borderColor: "rgba(255,255,255,0.2)", color: "#BEF264" }}
          >
            {t("matches.backHome")}
          </Link>
        </div>
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
          className="flex-1 rounded-xl py-3 px-4 text-sm font-bold transition-all cursor-pointer"
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
          {t("matches.tab.standings")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "matches"}
          onClick={() => setTab("matches")}
          className="flex-1 rounded-xl py-3 px-4 text-sm font-bold transition-all cursor-pointer"
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
          {t("matches.tab.matches")}{" "}
          <span className="opacity-60 font-normal">({totalMatches})</span>
        </button>
      </div>

      {tab === "standings" ? (
        <section className="space-y-10" aria-label={t("matches.tab.standings")}>
          <div className="flex flex-wrap gap-4 text-xs mb-2">
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(190,242,100,0.35)" }} />
              {t("matches.standings.legendDirect")}
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: "rgba(34,211,238,0.25)" }} />
              {t("matches.standings.legendThird")}
            </span>
          </div>
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
                            {t("matches.standings.noData")}
                          </td>
                        </tr>
                      ) : (
                        g.rows.map((row) => {
                          const teamId = row.team.id;
                          const isDirect =
                            teamId != null && directQualifyIds.has(teamId);
                          const isThirdQualify =
                            teamId != null && thirdPlaceQualifyIds.has(teamId);
                          return (
                          <tr
                            key={
                              row.team.id ??
                              `${g.letter}-${row.position}-${row.team.name}`
                            }
                            className="border-t"
                            style={{
                              borderColor: "rgba(255,255,255,0.06)",
                              backgroundColor: isDirect
                                ? "rgba(190,242,100,0.06)"
                                : isThirdQualify
                                  ? "rgba(34,211,238,0.06)"
                                  : undefined,
                            }}
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
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
          {thirdPlaceRanking.length > 0 ?
            <ThirdPlaceRankingTable entries={thirdPlaceRanking} />
          : null}
        </section>
      ) : (
        <section aria-label={t("matches.tab.matches")}>
          {/* Sub-tab pills */}
          <div className="flex gap-1.5 flex-wrap mb-8">
            <button
              type="button"
              onClick={() => setMatchSubTab("__results__")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              style={{
                backgroundColor: matchSubTab === "__results__" ? "rgba(190,242,100,0.15)" : "rgba(255,255,255,0.06)",
                color: matchSubTab === "__results__" ? "#BEF264" : "rgba(255,255,255,0.5)",
                border: matchSubTab === "__results__" ? "1px solid rgba(190,242,100,0.3)" : "1px solid transparent",
              }}
            >
              {t("matches.tab.results")}
              <span className="ml-1 opacity-50 font-normal">({finishedMatches.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setMatchSubTab("__upcoming__")}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              style={{
                backgroundColor: matchSubTab === "__upcoming__" ? "rgba(34,211,238,0.18)" : "rgba(255,255,255,0.06)",
                color: matchSubTab === "__upcoming__" ? "#22D3EE" : "rgba(255,255,255,0.5)",
                border: matchSubTab === "__upcoming__" ? "1px solid rgba(34,211,238,0.3)" : "1px solid transparent",
              }}
            >
              {t("matches.tab.upcoming")}
              <span className="ml-1 opacity-50 font-normal">({upcomingMatches.length})</span>
            </button>
            <span className="w-px h-6 self-center mx-0.5 hidden sm:block" style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />
            {groupKeysOrdered.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setMatchSubTab(key)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                style={{
                  backgroundColor: matchSubTab === key ? "rgba(34,211,238,0.18)" : "rgba(255,255,255,0.06)",
                  color: matchSubTab === key ? "#22D3EE" : "rgba(255,255,255,0.5)",
                  border: matchSubTab === key ? "1px solid rgba(34,211,238,0.3)" : "1px solid transparent",
                }}
              >
                {key}
              </button>
            ))}
            {knockoutBlocks.length > 0 && (
              <button
                type="button"
                onClick={() => setMatchSubTab("__knockout__")}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                style={{
                  backgroundColor: matchSubTab === "__knockout__" ? "rgba(190,242,100,0.15)" : "rgba(255,255,255,0.06)",
                  color: matchSubTab === "__knockout__" ? "#BEF264" : "rgba(255,255,255,0.5)",
                  border: matchSubTab === "__knockout__" ? "1px solid rgba(190,242,100,0.3)" : "1px solid transparent",
                }}
              >
                {t("matches.knockoutStage")}
              </button>
            )}
          </div>

          {matchSubTab === "__results__" && (
            <div>
              <h3 className="text-base font-bold mb-4" style={{ color: "#BEF264" }}>
                {t("matches.tab.results")}
              </h3>
              <MatchesChronologicalTable matches={finishedMatches} mode="results" />
            </div>
          )}

          {matchSubTab === "__upcoming__" && (
            <div>
              <h3 className="text-base font-bold mb-4" style={{ color: "#22D3EE" }}>
                {t("matches.tab.upcoming")}
              </h3>
              <MatchesChronologicalTable matches={upcomingMatches} mode="upcoming" />
            </div>
          )}

          {/* Group matches */}
          {matchSubTab !== "__knockout__" && matchSubTab !== "__results__" && matchSubTab !== "__upcoming__" && (() => {
            const list = groupMatches[matchSubTab] ?? [];
            return (
              <div>
                <h3
                  className="text-base font-bold mb-4"
                  style={{ color: "#BEF264" }}
                >
                  {matchSubTab}{" "}
                  <span className="text-xs font-normal opacity-50">({list.length})</span>
                </h3>
                {list.length === 0 ? (
                  <p className="text-sm py-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {t("matches.noGroupMatches")}
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
          })()}

          {/* Knockout carousel */}
          {matchSubTab === "__knockout__" && (
            <KnockoutCarousel blocks={knockoutBlocks} />
          )}

          {groupKeysOrdered.length === 0 && knockoutBlocks.length === 0 && (
            <p style={{ color: "rgba(255,255,255,0.55)" }}>
              {t("matches.noMatchesAvailable")}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
