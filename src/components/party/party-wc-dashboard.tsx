"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FootballDataMatch, FootballDataTeam, GroupStanding } from "@/lib/football-data";
import {
  buildTeamIdToGroupKeyFromStandings,
  partitionFootballDataMatches,
  sortKnockoutStageLabels,
  WC_GROUP_ORDER,
  WC_UNASSIGNED_GROUP_KEY,
} from "@/lib/football-data";
import {
  isWorldCup2026Storage,
  parseStoredCompetition,
} from "@/lib/competition";
import type { MatchOddsRow, TeamOddsRow } from "@/lib/betting-odds";
import { refreshTournamentBettingOdds } from "@/app/actions/betting-odds";
import {
  refreshTournamentMatches,
  saveWcExtraPrediction,
  simulateRandomClPredictionsForMe,
} from "@/app/actions/wc-predictions";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatCaughtError } from "@/lib/i18n/errors";
import {
  areKnockoutPredictionsUnlocked,
  getMatchPredictionLockReason,
  isKnockoutMatchPredictable,
} from "@/lib/knockout-predictions";
import { POINTS_PER_PREDICTION_CHANGE_AFTER_START } from "@/lib/prediction-window";
import { PartyChampionSection } from "@/components/party/party-champion-section";
import {
  PartyMatchPredictionCard,
  predFromSaved,
} from "@/components/party/party-match-prediction-card";
import {
  PartyPredictionNav,
  type PredictionPhase,
} from "@/components/party/party-prediction-nav";
import {
  ChampionPotentialPoints,
  QualifiersPotentialPoints,
} from "@/components/party/extra-potential-points";
import {
  NextThreePredictionsPanel,
  type NextThreeMatchPreds,
} from "@/components/party/next-three-predictions-panel";
import { WC_CYAN, WC_SLATE } from "@/components/world-cup/wc-theme";
import { LeaderboardTh } from "@/components/ui/column-header-tip";

export type LeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  /** Final guessed (full-time outcome points). */
  fg: number;
  /** Half-time guessed. */
  pg: number;
  /** Correct scores. */
  sc: number;
  /** Qualifiers guessed. */
  cg: number;
  championPoints: number;
  /** Puncte scăzute pentru modificări după start (10 × nr. schimbări). */
  changePenalty: number;
  total: number;
  championPick: string | null;
  lastMatch: {
    matchId: number;
    fixture: string;
    pred: string;
    actualHt: string | null;
    actualFt: string | null;
  } | null;
  nextMatches: ({
    matchId: number;
    fixture: string;
    pred: string;
  } | null)[];
};

export default function PartyWcDashboard({
  tournamentId,
  tournamentName,
  inviteCode,
  competition,
  allowPredictionChangesDuringCompetition = false,
  competitionUnderway = false,
  myMidCompetitionChangeCount = 0,
  showDevClSimulator = false,
  isCreator,
  currentUserId,
  matches,
  standings,
  leaderboard,
  myPreds,
  myExtra,
  allTeams,
  bettingOddsByMatchId = {},
  bettingOddsByTeamId = {},
  bettingOddsFetchedAt = null,
  lastManualOddsRefreshAt = null,
  canManualRefreshOddsToday = true,
  nextThreeMemberPreds = [],
}: {
  tournamentId: string;
  tournamentName: string;
  inviteCode: string;
  competition: string | null;
  allowPredictionChangesDuringCompetition?: boolean;
  competitionUnderway?: boolean;
  myMidCompetitionChangeCount?: number;
  /** Dev only: buton pentru pronosticuri UCL aleatoare (setat din server). */
  showDevClSimulator?: boolean;
  isCreator: boolean;
  currentUserId: string;
  matches: FootballDataMatch[];
  standings: GroupStanding[];
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
  myExtra: {
    advancingTeamIds: number[];
    championTeamId: number | null;
  } | null;
  allTeams: FootballDataTeam[];
  /** Cote per matchId (string cheie), pentru multiplicator la punctaj. */
  bettingOddsByMatchId?: Record<string, MatchOddsRow>;
  /** Cote per teamId (string cheie), pentru campion și calificări. */
  bettingOddsByTeamId?: Record<string, TeamOddsRow>;
  bettingOddsFetchedAt?: string | null;
  lastManualOddsRefreshAt?: string | null;
  canManualRefreshOddsToday?: boolean;
  nextThreeMemberPreds?: NextThreeMatchPreds[];
}) {
  const router = useRouter();
  const { t, dateLocale } = useLocale();
  const [tab, setTab] = useState<"leaderboard" | "predictions">("leaderboard");
  const [predictionPhase, setPredictionPhase] = useState<PredictionPhase>("champion");
  const [groupLetter, setGroupLetter] = useState("A");
  const [knockoutStageLabel, setKnockoutStageLabel] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [simDevNote, setSimDevNote] = useState<string | null>(null);

  const wc2026Mode = isWorldCup2026Storage(competition);
  const competitionActive = parseStoredCompetition(competition) != null;
  const isChampionsLeagueParty =
    parseStoredCompetition(competition)?.code === "CL";

  const predictionsReadOnly =
    competitionActive &&
    competitionUnderway &&
    !allowPredictionChangesDuringCompetition;

  const midCompetitionPenaltyMode =
    competitionActive &&
    competitionUnderway &&
    allowPredictionChangesDuringCompetition;

  const teamIdToGroupKey = useMemo(
    () => buildTeamIdToGroupKeyFromStandings(standings),
    [standings],
  );

  const { groupBlocks, knockoutBlocks } = useMemo(() => {
    const { groups, knockoutByStageLabel } = partitionFootballDataMatches(matches);
    let groupKeysOrdered: string[];
    if (wc2026Mode) {
      groupKeysOrdered = [...WC_GROUP_ORDER];
      if ((groups.get(WC_UNASSIGNED_GROUP_KEY)?.length ?? 0) > 0) {
        groupKeysOrdered.push(WC_UNASSIGNED_GROUP_KEY);
      }
    } else {
      groupKeysOrdered = [...groups.keys()].sort((a, b) => {
        if (a === WC_UNASSIGNED_GROUP_KEY) return 1;
        if (b === WC_UNASSIGNED_GROUP_KEY) return -1;
        return a.localeCompare(b, undefined, { numeric: true });
      });
    }
    const groupBlocks = groupKeysOrdered.map((key) => ({
      key,
      matches: groups.get(key) ?? [],
    }));
    const knockoutKeys = sortKnockoutStageLabels([...knockoutByStageLabel.keys()]);
    const knockoutBlocks = knockoutKeys.map((stageLabel) => ({
      stageLabel,
      matches: knockoutByStageLabel.get(stageLabel) ?? [],
    }));
    return { groupBlocks, knockoutBlocks };
  }, [matches, wc2026Mode]);

  const allowChanges = allowPredictionChangesDuringCompetition ?? false;

  const groupLetters = useMemo(() => {
    return groupBlocks
      .filter((b) => b.matches.length > 0)
      .map((b) => b.key.replace(/^Group\s+/i, "").trim())
      .filter(Boolean);
  }, [groupBlocks]);

  const knockoutStageStats = useMemo(() => {
    const stats = knockoutBlocks.map(({ stageLabel, matches: km }) => ({
      label: stageLabel,
      predictable: km.filter((m) =>
        isKnockoutMatchPredictable(m),
      ).length,
      total: km.length,
    }));
    return stats;
  }, [knockoutBlocks]);

  const selectedGroupKey = useMemo(() => {
    const fromLetter = groupBlocks.find(
      (b) => b.key.replace(/^Group\s+/i, "").trim() === groupLetter,
    );
    return fromLetter?.key ?? groupBlocks.find((b) => b.matches.length > 0)?.key ?? "";
  }, [groupBlocks, groupLetter]);

  const selectedGroupMatches = useMemo(() => {
    return groupBlocks.find((b) => b.key === selectedGroupKey)?.matches ?? [];
  }, [groupBlocks, selectedGroupKey]);

  const selectedKnockoutMatches = useMemo(() => {
    const block = knockoutBlocks.find((b) => b.stageLabel === knockoutStageLabel);
    return block?.matches ?? [];
  }, [knockoutBlocks, knockoutStageLabel]);

  const koUnlocked = useMemo(
    () => areKnockoutPredictionsUnlocked(matches),
    [matches],
  );

  const teamLabels = useMemo(() => {
    const map: Record<number, string> = {};
    for (const t of allTeams) {
      if (t.id != null) {
        map[t.id] = t.shortName ?? t.tla ?? t.name ?? `#${t.id}`;
      }
    }
    return map;
  }, [allTeams]);

  useEffect(() => {
    if (groupLetters.length > 0 && !groupLetters.includes(groupLetter)) {
      setGroupLetter(groupLetters[0]!);
    }
  }, [groupLetters, groupLetter]);

  useEffect(() => {
    if (knockoutBlocks.length === 0) return;
    const labels = knockoutBlocks.map((b) => b.stageLabel);
    if (!knockoutStageLabel || !labels.includes(knockoutStageLabel)) {
      setKnockoutStageLabel(labels[0]!);
    }
  }, [knockoutBlocks, knockoutStageLabel]);

  function lockReasonForMatch(m: FootballDataMatch) {
    return getMatchPredictionLockReason(
      m,
      competitionUnderway,
      allowChanges,
    );
  }

  function renderMatchCard(m: FootballDataMatch) {
    return (
      <PartyMatchPredictionCard
        key={m.id}
        m={m}
        tournamentId={tournamentId}
        matchOddsRow={bettingOddsByMatchId[String(m.id)] ?? null}
        initial={predFromSaved(myPreds[m.id])}
        predictionLockedReason={lockReasonForMatch(m)}
        midCompetitionPenaltyMode={midCompetitionPenaltyMode}
        onSaved={() => {
          setMsg(t("party.predictionSaved"));
          setErr(null);
          router.refresh();
        }}
        onError={(t) => {
          setErr(t);
          setMsg(null);
        }}
      />
    );
  }

  const [advancing, setAdvancing] = useState<Set<number>>(
    () => new Set(myExtra?.advancingTeamIds ?? []),
  );
  const [championId, setChampionId] = useState<string>(
    myExtra?.championTeamId != null ? String(myExtra.championTeamId) : "",
  );

  const extraSyncKey = JSON.stringify(myExtra);
  useEffect(() => {
    setAdvancing(new Set(myExtra?.advancingTeamIds ?? []));
    setChampionId(myExtra?.championTeamId != null ? String(myExtra.championTeamId) : "");
  }, [extraSyncKey]);

  function toggleTeam(id: number) {
    setAdvancing((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
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
            {wc2026Mode ? t("party.worldCup2026") : t("party.privateTournament")}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{tournamentName}</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            {t("party.inviteCode")}:{" "}
            <span className="font-bold tracking-widest" style={{ color: WC_CYAN }}>
              {inviteCode}
            </span>
          </p>
          {competitionActive && (
            <p className="text-[10px] mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              {t("party.competitionLabel")}: {wc2026Mode ? t("party.worldCup2026") : competition}
            </p>
          )}
          {competitionActive && bettingOddsFetchedAt ?
            <p className="text-[10px] mt-1.5" style={{ color: "rgba(167,243,208,0.8)" }}>
              {t("party.oddsAt")}: {formatOddsDate(bettingOddsFetchedAt)} ·{" "}
              {t("party.oddsMatchCount", { count: Object.keys(bettingOddsByMatchId).length })}
            </p>
          : competitionActive ?
            <p className="text-[10px] mt-1.5 text-amber-200/85">{t("party.oddsUnavailable")}</p>
          : null}
          {competitionActive && predictionsReadOnly ?
            <p className="text-[10px] mt-1.5 text-amber-200/95 font-medium">
              {t("party.predictionsLocked")}
            </p>
          : null}
          {competitionActive && midCompetitionPenaltyMode ?
            <p className="text-[10px] mt-1.5" style={{ color: "rgba(253,224,71,0.92)" }}>
              {t("party.midCompetitionChanges", {
                count: myMidCompetitionChangeCount,
                penalty: myMidCompetitionChangeCount * POINTS_PER_PREDICTION_CHANGE_AFTER_START,
                perChange: POINTS_PER_PREDICTION_CHANGE_AFTER_START,
              })}
            </p>
          : null}
        </div>
        {competitionActive && wc2026Mode ?
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
              borderColor: "rgba(34,211,238,0.35)",
              color: WC_CYAN,
              backgroundColor: "rgba(34,211,238,0.08)",
            }}
          >
            {t("party.refreshMatches")}
          </button>
        : null}
      </header>

      {showDevClSimulator && isChampionsLeagueParty && competitionActive && (
        <div
          className="rounded-xl border px-4 py-3 text-xs flex flex-col gap-2"
          style={{
            borderColor: "rgba(251,191,36,0.35)",
            backgroundColor: "rgba(120,53,15,0.25)",
            color: "rgba(254,243,199,0.95)",
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="flex-1">
              <strong className="text-amber-200">Dev:</strong> generează pronosticuri aleatoare pe toate meciurile UCL
              (scoruri + 1–3 echipe aleatoare per grupă din clasament + campion aleator). Suprascrie pronosticurile tale.
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setErr(null);
                setMsg(null);
                setSimDevNote(null);
                startTransition(async () => {
                  try {
                    const r = await simulateRandomClPredictionsForMe(tournamentId);
                    setSimDevNote(
                      `Gata: ${r.matchCount} meciuri, ${r.advancingCount} calificați aleși în extras.`,
                    );
                    router.refresh();
                  } catch (e) {
                    setSimDevNote(
                      e instanceof Error ? e.message : "Simulator failed",
                    );
                  }
                });
              }}
              className="shrink-0 px-4 py-2 rounded-lg font-bold text-xs cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: "#FBBF24", color: "#1c1917" }}
            >
              Randomize my UCL picks
            </button>
          </div>
          {simDevNote ?
            <p
              className={`text-xs ${simDevNote.startsWith("Gata:") ? "text-emerald-300" : "text-red-300"}`}
            >
              {simDevNote}
            </p>
          : null}
        </div>
      )}

      {isCreator && competitionActive && (
        <div
          className="rounded-2xl border px-4 py-4 flex flex-col gap-3"
          style={{ backgroundColor: "#1E293B", borderColor: "rgba(255,255,255,0.08)" }}
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
          : <p className="text-[10px] text-amber-200/90">{t("party.oddsUnavailable")}</p>}
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
            style={{ backgroundColor: "#0EA5E9", color: "#0f172a" }}
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
                  backgroundColor: tab === id ? "rgba(34,211,238,0.15)" : "transparent",
                  color: tab === id ? "#22D3EE" : "rgba(255,255,255,0.55)",
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
              style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#1E293B" }}
            >
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <LeaderboardTh label={t("party.lb.rank")} tip={t("party.lb.rankTip")} className="px-2" />
                      <LeaderboardTh label={t("party.lb.member")} tip={t("party.lb.memberTip")} className="px-2 min-w-[5.5rem]" />
                      <LeaderboardTh label={t("party.lb.pick")} tip={t("party.lb.pickTip")} className="max-w-[3.25rem]" />
                      <LeaderboardTh label={t("party.lb.last")} tip={t("party.lb.lastTip")} className="min-w-[4.5rem]" />
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
                    {leaderboard.map((row) => (
                      <tr
                        key={row.userId}
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                          backgroundColor:
                            row.userId === currentUserId ? "rgba(34,211,238,0.06)" : undefined,
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
                        <td
                          className="py-2.5 px-1.5 align-top text-[10px] sm:text-xs font-semibold tabular-nums max-w-[3.25rem] truncate"
                          style={{ color: "#FDE68A" }}
                          title={row.championPick ?? undefined}
                        >
                          {row.championPick ?? "—"}
                        </td>
                        <td className="py-2.5 px-1.5 align-top text-[10px] leading-snug" style={{ color: "rgba(255,255,255,0.82)" }}>
                          {row.lastMatch ?
                            <>
                              <div className="font-medium text-cyan-200/90">{row.lastMatch.fixture}</div>
                              <div>{row.lastMatch.pred}</div>
                              {(row.lastMatch.actualHt || row.lastMatch.actualFt) && (
                                <div className="text-[9px] mt-0.5 space-y-0.5" style={{ color: "rgba(255,255,255,0.38)" }}>
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
                            color:
                              row.changePenalty > 0 ? "rgba(251,191,36,0.95)" : "rgba(255,255,255,0.35)",
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
              <NextThreePredictionsPanel
                matches={nextThreeMemberPreds}
                currentUserId={currentUserId}
              />
            </div>
          )}

          {tab === "predictions" && (
            <div className="flex flex-col gap-5">
              {competitionActive && predictionsReadOnly ?
                <div
                  className="rounded-xl border px-4 py-3 text-sm"
                  style={{
                    borderColor: "rgba(251,191,36,0.35)",
                    backgroundColor: "rgba(120,53,15,0.22)",
                    color: "rgba(254,243,199,0.95)",
                  }}
                >
                  {t("party.predictions.closedBanner")}
                </div>
              : null}
              {competitionActive && midCompetitionPenaltyMode ?
                <div
                  className="rounded-xl border px-4 py-3 text-sm"
                  style={{
                    borderColor: "rgba(34,211,238,0.25)",
                    backgroundColor: "rgba(15,23,42,0.65)",
                    color: "rgba(226,232,240,0.95)",
                  }}
                >
                  {t("party.predictions.penaltyBanner", {
                    points: POINTS_PER_PREDICTION_CHANGE_AFTER_START,
                  })}
                </div>
              : null}

              <PartyPredictionNav
                phase={predictionPhase}
                onPhaseChange={setPredictionPhase}
                groupLetter={groupLetter}
                onGroupLetterChange={setGroupLetter}
                groupLetters={groupLetters}
                knockoutStageLabel={knockoutStageLabel}
                onKnockoutStageChange={setKnockoutStageLabel}
                knockoutStages={knockoutStageStats}
              />

              <div
                className="rounded-2xl border p-4 sm:p-6 flex flex-col gap-6"
                style={{ backgroundColor: WC_SLATE, borderColor: "rgba(255,255,255,0.08)" }}
              >
                {predictionPhase === "champion" && (
                  <>
                    <PartyChampionSection
                      allTeams={allTeams}
                      championId={championId}
                      onSelect={setChampionId}
                      disabled={predictionsReadOnly}
                    />
                    <ChampionPotentialPoints
                      championTeamId={championId ? Number(championId) : null}
                      bettingOddsByTeamId={bettingOddsByTeamId}
                    />
                    {predictionsReadOnly ?
                      <p className="text-sm text-amber-200/95">
                        {t("party.champion.locked")}
                      </p>
                    : null}
                    {midCompetitionPenaltyMode ?
                      <p className="text-sm" style={{ color: "rgba(226,232,240,0.88)" }}>
                        {t("party.champion.savePenalty", {
                          points: POINTS_PER_PREDICTION_CHANGE_AFTER_START,
                        })}
                      </p>
                    : null}
                    <button
                      type="button"
                      disabled={pending || predictionsReadOnly}
                      onClick={() => {
                        setErr(null);
                        setMsg(null);
                        startTransition(async () => {
                          try {
                            await saveWcExtraPrediction(
                              tournamentId,
                              [...advancing],
                              championId ? Number(championId) : null,
                            );
                            setMsg(t("party.champion.saved"));
                            router.refresh();
                          } catch (e) {
                            setErr(formatCaughtError(e, t));
                          }
                        });
                      }}
                      className="self-start px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-50 cursor-pointer"
                      style={{ backgroundColor: WC_CYAN, color: "#0F172A" }}
                    >
                      {t("party.champion.saveButton")}
                    </button>
                  </>
                )}

                {predictionPhase === "qualifiers" && (
                  <>
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">{t("party.qualifiers.title")}</h3>
                      <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                        {t("party.qualifiers.hint")}
                      </p>
                    </div>
                    {predictionsReadOnly ?
                      <p className="text-sm text-amber-200/95">
                        {t("party.qualifiers.locked")}
                      </p>
                    : null}
                    <div className="flex flex-col gap-6">
                      {standings.map((g) => {
                        let selectedInGroup = 0;
                        for (const tid of advancing) {
                          if (teamIdToGroupKey.get(tid) === g.groupKey) selectedInGroup += 1;
                        }
                        return (
                          <div key={g.groupKey}>
                            <h4 className="text-white text-sm font-semibold mb-2">{g.groupKey}</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {g.rows.map((row) => {
                                const id = row.team?.id;
                                if (id === undefined) return null;
                                const name = row.team.name ?? row.team.shortName ?? `#${id}`;
                                const checked = advancing.has(id);
                                const cannotAddMore = !checked && selectedInGroup >= 3;
                                const checkboxDisabled = predictionsReadOnly || cannotAddMore;
                                return (
                                  <label
                                    key={id}
                                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 border"
                                    style={{
                                      borderColor:
                                        checked ?
                                          "rgba(34,211,238,0.35)"
                                        : "rgba(255,255,255,0.08)",
                                      backgroundColor:
                                        checked ? "rgba(34,211,238,0.08)" : "rgba(0,0,0,0.15)",
                                      cursor: checkboxDisabled ? "not-allowed" : "pointer",
                                      opacity: checkboxDisabled ? 0.45 : 1,
                                    }}
                                    title={cannotAddMore ? t("party.qualifiers.maxPerGroup") : undefined}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={checkboxDisabled}
                                      onChange={() => toggleTeam(id)}
                                      className="rounded border-gray-500 disabled:cursor-not-allowed w-4 h-4"
                                    />
                                    {row.team.crest ?
                                      <Image
                                        src={row.team.crest}
                                        alt=""
                                        width={36}
                                        height={36}
                                        className="rounded-lg bg-white/90 p-0.5 object-contain shrink-0"
                                        unoptimized
                                      />
                                    : null}
                                    <span className="text-sm text-white truncate font-medium">{name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <QualifiersPotentialPoints
                      advancingTeamIds={[...advancing]}
                      bettingOddsByTeamId={bettingOddsByTeamId}
                      teamLabels={teamLabels}
                    />
                    <button
                      type="button"
                      disabled={pending || predictionsReadOnly}
                      onClick={() => {
                        setErr(null);
                        setMsg(null);
                        startTransition(async () => {
                          try {
                            await saveWcExtraPrediction(
                              tournamentId,
                              [...advancing],
                              championId ? Number(championId) : null,
                            );
                            setMsg(t("party.qualifiers.saved"));
                            router.refresh();
                          } catch (e) {
                            setErr(formatCaughtError(e, t));
                          }
                        });
                      }}
                      className="self-start px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-50 cursor-pointer"
                      style={{ backgroundColor: WC_CYAN, color: "#0F172A" }}
                    >
                      {t("party.qualifiers.saveButton")}
                    </button>
                  </>
                )}

                {predictionPhase === "groups" && (
                  <>
                    <h3 className="text-lg font-bold text-white">
                      {t("party.group.title", { letter: groupLetter })}
                    </h3>
                    {selectedGroupMatches.length === 0 ?
                      <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                        {t("party.group.noMatches")}
                      </p>
                    : (
                      <div className="flex flex-col gap-5">
                        {selectedGroupMatches.map((m) => renderMatchCard(m))}
                      </div>
                    )}
                  </>
                )}

                {predictionPhase === "knockout" && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h3 className="text-lg font-bold text-white">{knockoutStageLabel}</h3>
                      {!koUnlocked ?
                        <span
                          className="text-xs font-medium px-3 py-1 rounded-lg"
                          style={{
                            backgroundColor: "rgba(251,191,36,0.15)",
                            color: "rgba(253,224,71,0.95)",
                          }}
                        >
                          {t("party.knockout.opensAfterGroups")}
                        </span>
                      : null}
                    </div>
                    {selectedKnockoutMatches.length === 0 ?
                      <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                        {t("party.knockout.noMatches")}
                      </p>
                    : (
                      <div className="flex flex-col gap-5">
                        {selectedKnockoutMatches.map((m) => renderMatchCard(m))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
