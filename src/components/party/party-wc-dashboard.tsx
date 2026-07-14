"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FootballDataMatch } from "@/lib/football-data";
import {
  parseStoredCompetition,
  COMPETITION_PICKER_OPTIONS,
} from "@/lib/competition";
import type { MatchOddsRow } from "@/lib/betting-odds";
import { refreshTournamentBettingOdds } from "@/app/actions/betting-odds";
import {
  refreshTournamentMatches,
  saveWcMatchPrediction,
} from "@/app/actions/wc-predictions";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatCaughtError } from "@/lib/i18n/errors";
import { getMatchPredictionLockReason } from "@/lib/knockout-predictions";
import {
  PartyMatchPredictionCard,
  predFromSaved,
  type MatchPredictionSaveInput,
} from "@/components/party/party-match-prediction-card";
import {
  NextThreePredictionsPanel,
  type NextThreeMatchPreds,
} from "@/components/party/next-three-predictions-panel";
import { WC_CYAN, WC_LIME, WC_SLATE } from "@/components/world-cup/wc-theme";
import { LeaderboardTh } from "@/components/ui/column-header-tip";
import { MatchPredDisplayInline } from "@/components/party/match-pred-display-inline";
import type { MatchPredDisplay } from "@/lib/wc-pred-display";

export type LeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  fg: number;
  pg: number;
  sc: number;
  correctScoreCount: number;
  total: number;
  lastMatch: {
    matchId: number;
    fixture: string;
    pred: MatchPredDisplay;
    actualHt: string | null;
    actualFt: string | null;
  } | null;
  nextMatches: ({
    matchId: number;
    fixture: string;
    pred: MatchPredDisplay;
  } | null)[];
};

export default function PartyWcDashboard({
  tournamentId,
  tournamentName,
  inviteCode,
  competition,
  isPublic = false,
  isCreator,
  currentUserId,
  matches,
  leaderboard,
  myPreds,
  bettingOddsByMatchId = {},
  bettingOddsFetchedAt = null,
  lastManualOddsRefreshAt = null,
  canManualRefreshOddsToday = true,
  nextThreeMemberPreds = [],
  currentMatchday = 1,
}: {
  tournamentId: string;
  tournamentName: string;
  inviteCode: string;
  competition: string | null;
  isPublic?: boolean;
  isCreator: boolean;
  currentUserId: string;
  matches: FootballDataMatch[];
  leaderboard: LeaderboardRow[];
  myPreds: Record<
    number,
    {
      htOutcome: string | null;
      ftOutcome: string | null;
      predHomeGoals: number | null;
      predAwayGoals: number | null;
    }
  >;
  bettingOddsByMatchId?: Record<string, MatchOddsRow>;
  bettingOddsFetchedAt?: string | null;
  lastManualOddsRefreshAt?: string | null;
  canManualRefreshOddsToday?: boolean;
  nextThreeMemberPreds?: NextThreeMatchPreds[];
  currentMatchday?: number;
}) {
  const router = useRouter();
  const { t, dateLocale } = useLocale();
  const [tab, setTab] = useState<"leaderboard" | "predictions">("leaderboard");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const matchDraftGettersRef = useRef(
    new Map<number, () => MatchPredictionSaveInput>(),
  );

  const registerMatchDraft = useCallback(
    (matchId: number, getPayload: () => MatchPredictionSaveInput) => {
      matchDraftGettersRef.current.set(matchId, getPayload);
    },
    [],
  );

  const unregisterMatchDraft = useCallback((matchId: number) => {
    matchDraftGettersRef.current.delete(matchId);
  }, []);

  const competitionActive = parseStoredCompetition(competition) != null;

  const matchdayBlocks = useMemo(() => {
    const byMatchday = new Map<number, FootballDataMatch[]>();
    for (const m of matches) {
      const md = m.matchday ?? 0;
      if (md > 0) {
        if (!byMatchday.has(md)) byMatchday.set(md, []);
        byMatchday.get(md)!.push(m);
      }
    }
    const sorted = [...byMatchday.keys()].sort((a, b) => a - b);
    return sorted.map((md) => ({ matchday: md, matches: byMatchday.get(md)! }));
  }, [matches]);

  const firstUnfinishedMatchday = useMemo(() => {
    for (const block of matchdayBlocks) {
      if (block.matches.some((m) => m.status !== "FINISHED" && m.status !== "AWARDED")) {
        return block.matchday;
      }
    }
    return matchdayBlocks[0]?.matchday ?? 1;
  }, [matchdayBlocks]);

  const [selectedMatchday, setSelectedMatchday] = useState(0);
  useEffect(() => {
    if (firstUnfinishedMatchday > 0) setSelectedMatchday(firstUnfinishedMatchday);
  }, [firstUnfinishedMatchday]);

  const selectedMatchdayMatches = useMemo(
    () => matchdayBlocks.find((b) => b.matchday === selectedMatchday)?.matches ?? [],
    [matchdayBlocks, selectedMatchday],
  );

  function lockReasonForMatch(m: FootballDataMatch) {
    return getMatchPredictionLockReason(m);
  }

  function renderMatchCard(m: FootballDataMatch) {
    return (
      <PartyMatchPredictionCard
        key={m.id}
        m={m}
        tournamentId={tournamentId}
        matchOddsRow={bettingOddsByMatchId[String(m.id)] ?? null}
        initial={predFromSaved(myPreds[m.id])}
        competition={competition}
        hideOddsUnavailable={isPublic}
        predictionLockedReason={lockReasonForMatch(m)}
        registerMatchDraft={registerMatchDraft}
        unregisterMatchDraft={unregisterMatchDraft}
        onSaved={() => {
          setMsg(t("party.predictionSaved"));
          setErr(null);
          router.refresh();
        }}
        onError={(msg) => {
          setErr(msg);
          setMsg(null);
        }}
      />
    );
  }

  function handleSaveAllMatchdayPredictions() {
    setErr(null);
    setMsg(null);
    startTransition(async () => {
      try {
        const toSave = selectedMatchdayMatches.filter(
          (m) => m.status !== "FINISHED" && lockReasonForMatch(m) == null,
        );
        for (const m of toSave) {
          const getPayload = matchDraftGettersRef.current.get(m.id);
          if (!getPayload) continue;
          await saveWcMatchPrediction(tournamentId, m.id, getPayload());
        }
        setMsg(t("party.group.saveAllSuccess"));
        router.refresh();
      } catch (e) {
        setErr(formatCaughtError(e, t));
      }
    });
  }

  function formatOddsDate(iso: string | null): string | null {
    if (!iso) return null;
    return new Date(iso).toLocaleString(dateLocale);
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: WC_CYAN }}>
            {isPublic ?
              t("party.publicContest")
            : competitionActive ?
              (COMPETITION_PICKER_OPTIONS.find((o) => o.storageKey === competition)?.label ??
                t("party.privateTournament"))
            : t("party.privateTournament")}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{tournamentName}</h1>
          {!isPublic ?
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
              {t("party.inviteCode")}:{" "}
              <span className="font-bold tracking-widest" style={{ color: WC_CYAN }}>
                {inviteCode}
              </span>
            </p>
          : null}
          {!isPublic && competitionActive && (
            <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              {t("party.competitionLabel")}:{" "}
              {COMPETITION_PICKER_OPTIONS.find((o) => o.storageKey === competition)?.label ?? competition}
            </p>
          )}
          {!isPublic && competitionActive && bettingOddsFetchedAt ?
            <p className="text-[10px] mt-1.5" style={{ color: "rgba(167,243,208,0.8)" }}>
              {t("party.oddsAt")}: {formatOddsDate(bettingOddsFetchedAt)} ·{" "}
              {t("party.oddsMatchCount", { count: Object.keys(bettingOddsByMatchId).length })}
            </p>
          : !isPublic && competitionActive ?
            <p className="text-[10px] mt-1.5 text-amber-200/85">{t("party.oddsUnavailable")}</p>
          : null}
        </div>
        {competitionActive ?
          <div className="flex flex-col sm:flex-row gap-2 shrink-0 self-start">
            <Link
              href={
                competition ?
                  `/matches?competition=${encodeURIComponent(competition)}`
                : "/matches"
              }
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold border transition-opacity hover:opacity-90"
              style={{
                borderColor: "rgba(96,165,250,0.35)",
                color: "#60A5FA",
                backgroundColor: "rgba(96,165,250,0.08)",
              }}
            >
              {t("party.scheduleStandings")}
            </Link>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setErr(null);
                setMsg(null);
                startTransition(async () => {
                  try {
                    const r = await refreshTournamentMatches(tournamentId);
                    setMsg(t("party.matchesUpdated", { count: r.matchCount }));
                    router.refresh();
                  } catch (e) {
                    setErr(formatCaughtError(e, t));
                  }
                });
              }}
              className="shrink-0 self-start px-4 py-2.5 rounded-xl text-xs font-bold border cursor-pointer disabled:opacity-40 transition-opacity"
              style={{
                borderColor: "rgba(59,130,246,0.35)",
                color: WC_CYAN,
                backgroundColor: "rgba(59,130,246,0.08)",
              }}
            >
              {t("party.refreshMatches")}
            </button>
          </div>
        : null}
      </header>

      {isCreator && competitionActive && (
        <div
          className="rounded-2xl border px-4 py-4 flex flex-col gap-3"
          style={{ backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div>
            <p className="text-white text-sm font-semibold">{t("party.creatorOddsTitle")}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
              {t("party.creatorOddsHint")}
            </p>
          </div>
          {bettingOddsFetchedAt ?
            <p className="text-[10px]" style={{ color: "rgba(167,243,208,0.85)" }}>
              {t("party.oddsAt")}: {formatOddsDate(bettingOddsFetchedAt)} ·{" "}
              {t("party.oddsMatchCount", { count: Object.keys(bettingOddsByMatchId).length })}
            </p>
          : !isPublic ?
            <p className="text-[10px] text-amber-200/90">{t("party.oddsUnavailable")}</p>
          : null}
          {lastManualOddsRefreshAt ?
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>
              {t("party.oddsManualLast", { date: formatOddsDate(lastManualOddsRefreshAt) ?? "—" })}
            </p>
          : null}
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            {t("party.oddsPointsNote")}
          </p>
          {!canManualRefreshOddsToday ?
            <p className="text-[10px] text-amber-200/90">{t("party.oddsOncePerDayHint")}</p>
          : null}
          <button
            type="button"
            disabled={pending || !canManualRefreshOddsToday}
            onClick={() => {
              setErr(null);
              setMsg(null);
              startTransition(async () => {
                try {
                  const r = await refreshTournamentBettingOdds(tournamentId);
                  setMsg(
                    t("party.oddsRefreshed", {
                      matchCount: r.matchCount,
                      teamCount: r.teamCount,
                      source: r.oddsSource,
                      fallback: r.usedFallback ? ", fallback Gemini" : "",
                    }),
                  );
                  router.refresh();
                } catch (e) {
                  setErr(formatCaughtError(e, t));
                }
              });
            }}
            className="self-start px-4 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-40"
            style={{ backgroundColor: "#2563EB", color: "#0f172a" }}
          >
            {t("party.refreshOdds")}
          </button>
        </div>
      )}

      {!competitionActive && (
        <div
          className="rounded-2xl border p-6 text-center text-sm"
          style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}
        >
          {t("party.noCompetitionMember")}
        </div>
      )}

      {competitionActive && (
        <>
          {(msg || err) && (
            <p className={`text-sm ${err ? "text-red-400" : "text-emerald-400"}`}>
              {err ?? msg}
            </p>
          )}

          <div className="flex gap-2 flex-wrap border-b pb-2" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            {(
              [
                ["leaderboard", "party.tab.leaderboard"],
                ["predictions", "party.tab.predictions"],
              ] as const
            ).map(([id, labelKey]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                style={{
                  backgroundColor: tab === id ? "rgba(59,130,246,0.15)" : "transparent",
                  color: tab === id ? "#3B82F6" : "rgba(255,255,255,0.55)",
                }}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>

          {tab === "leaderboard" && (
            <div className="flex flex-col gap-5">
              <div
                className="rounded-2xl border overflow-x-auto"
                style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.08)" }}
              >
                <table className="w-full text-sm min-w-[540px]">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <LeaderboardTh label={t("party.lb.rank")} tip={t("party.lb.rankTip")} className="px-2" />
                      <LeaderboardTh label={t("party.lb.member")} tip={t("party.lb.memberTip")} className="px-2 min-w-[5.5rem]" />
                      <LeaderboardTh label={t("party.lb.last")} tip={t("party.lb.lastTip")} className="min-w-[4.5rem]" />
                      <LeaderboardTh label={t("party.lb.fg")} tip={t("party.lb.fgTip")} align="right" />
                      <LeaderboardTh label={t("party.lb.pg")} tip={t("party.lb.pgTip")} align="right" />
                      <LeaderboardTh label={t("party.lb.sc")} tip={t("party.lb.scTip")} align="right" />
                      <LeaderboardTh label={t("party.lb.total")} tip={t("party.lb.totalTip")} align="right" className="px-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row) => (
                      <tr
                        key={row.userId}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                          backgroundColor:
                            row.userId === currentUserId ? "rgba(59,130,246,0.06)" : undefined,
                        }}
                      >
                        <td className="py-2.5 px-2 text-white font-bold tabular-nums align-top">{row.rank}</td>
                        <td className="py-2.5 px-2 align-top max-w-[7rem] sm:max-w-[9rem]">
                          <Link
                            href={`/turnee/${tournamentId}/member/${row.userId}`}
                            className="text-left w-full inline-block text-white truncate hover:underline decoration-cyan-400/80 underline-offset-2 font-medium"
                          >
                            {row.displayName}
                          </Link>
                        </td>
                        <td className="py-2.5 px-1.5 align-top text-[10px] leading-snug min-w-[5.5rem]" style={{ color: "rgba(255,255,255,0.82)" }}>
                          {row.lastMatch ?
                            <>
                              <div className="font-medium text-cyan-200/90 mb-1">{row.lastMatch.fixture}</div>
                              <MatchPredDisplayInline
                                pred={row.lastMatch.pred}
                                labelHt={t("party.lb.predHt")}
                                labelFt={t("party.lb.predFt")}
                                labelScore={t("party.lb.predSc")}
                                stacked
                              />
                              {(row.lastMatch.actualHt || row.lastMatch.actualFt) && (
                                <div className="text-[9px] mt-1 space-y-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>
                                  {row.lastMatch.actualHt ?
                                    <div>{t("party.lb.ht")} {row.lastMatch.actualHt}</div>
                                  : null}
                                  {row.lastMatch.actualFt ?
                                    <div>{t("party.lb.ft")} {row.lastMatch.actualFt}</div>
                                  : null}
                                </div>
                              )}
                            </>
                          : <span style={{ color: "rgba(255,255,255,0.35)" }}>—</span>}
                        </td>
                        <td className="py-2.5 px-1 text-right tabular-nums align-top" style={{ color: "rgba(255,255,255,0.85)" }}>
                          {row.fg}
                        </td>
                        <td className="py-2.5 px-1 text-right tabular-nums align-top" style={{ color: "rgba(255,255,255,0.85)" }}>
                          {row.pg}
                        </td>
                        <td className="py-2.5 px-1 text-right tabular-nums align-top" style={{ color: "rgba(255,255,255,0.85)" }}>
                          <div className="font-medium">{row.sc}</div>
                          {row.correctScoreCount > 0 ?
                            <div className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.42)" }}>
                              {t("party.lb.scCount", { count: row.correctScoreCount })}
                            </div>
                          : null}
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold tabular-nums align-top" style={{ color: "#60A5FA" }}>
                          {row.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <NextThreePredictionsPanel
                matches={nextThreeMemberPreds}
                currentUserId={currentUserId}
                title={t("party.matchdayPreds.title", { matchday: currentMatchday })}
              />
            </div>
          )}

          {tab === "predictions" && (
            <div className="flex flex-col gap-5">
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {matchdayBlocks.map(({ matchday, matches: mdMatches }) => {
                  const allDone = mdMatches.every(
                    (m) => m.status === "FINISHED" || m.status === "AWARDED",
                  );
                  const anyStarted = mdMatches.some(
                    (m) => m.status === "FINISHED" || m.status === "IN_PLAY" || m.status === "PAUSED",
                  );
                  const isCurrent = !allDone && anyStarted;
                  const isSelected = matchday === selectedMatchday;
                  return (
                    <button
                      key={matchday}
                      type="button"
                      onClick={() => setSelectedMatchday(matchday)}
                      className="shrink-0 w-9 h-9 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      style={{
                        backgroundColor:
                          isSelected ? "#3B82F6"
                          : isCurrent ? "rgba(96,165,250,0.15)"
                          : "rgba(255,255,255,0.06)",
                        color:
                          isSelected ? "#0A0B1E"
                          : isCurrent ? "#60A5FA"
                          : "rgba(255,255,255,0.55)",
                        border:
                          isCurrent && !isSelected ?
                            "1px solid rgba(96,165,250,0.4)"
                          : "1px solid transparent",
                      }}
                    >
                      {matchday}
                    </button>
                  );
                })}
              </div>

              <div
                className="rounded-2xl border p-4 sm:p-6 flex flex-col gap-6"
                style={{ backgroundColor: WC_SLATE, borderColor: "rgba(255,255,255,0.08)" }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h3 className="text-lg font-bold text-white">
                    Etapa {selectedMatchday}
                  </h3>
                  {selectedMatchdayMatches.length > 0 ?
                    <button
                      type="button"
                      disabled={pending}
                      onClick={handleSaveAllMatchdayPredictions}
                      className="self-start px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-50 cursor-pointer hover:opacity-90 active:scale-[0.98]"
                      style={{ backgroundColor: WC_LIME, color: "#0A0B1E" }}
                    >
                      {pending ? t("party.group.savingAll") : t("party.group.saveAllButton")}
                    </button>
                  : null}
                </div>
                {selectedMatchdayMatches.length === 0 ?
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {t("party.group.noMatches")}
                  </p>
                : (
                  <div className="flex flex-col gap-5">
                    {selectedMatchdayMatches.map((m) => renderMatchCard(m))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
