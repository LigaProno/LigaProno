"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FootballDataMatch } from "@/lib/football-data-types";
import {
  parseStoredCompetition,
  COMPETITION_PICKER_OPTIONS,
  competitionShortLabel,
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
import { isFtOutcomeConsistentWithExactScore } from "@/lib/prediction-consistency";
import { isMatchSettled } from "@/lib/match-status";
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
import { LeaderboardGapRow, LeaderboardToggle } from "@/components/ui/leaderboard-collapse";
import { WinnerBadge, type WinnerBadgeEntry } from "@/components/ui/winner-badge";
import { StreakBadge } from "@/components/ui/streak-badge";
import { buildLeaderboardView, canCollapseLeaderboard } from "@/lib/leaderboard-view";
import { getLeaderboardRowStyle, getPodiumStyle } from "@/lib/leaderboard-podium";
import { MatchPredDisplayInline } from "@/components/party/match-pred-display-inline";
import { PointsScoringLegend } from "@/components/party/potential-points";
import { fixtureTlaPair, getMatchPredDisplay, groupMatchesByDisplayMatchday, isPlayableUnfinishedMatch, type MatchPredDisplay } from "@/lib/wc-pred-display";
import { ShareButton } from "@/components/ui/share-button";
import { buildMyMatchdayShareText } from "@/lib/share-predictions";
import { LiveFixtureBanner } from "@/components/party/live-fixture-banner";
import type { LiveFixture } from "@/lib/live-fixture-types";
import { CopyPredictionsModal, type CopyTargetTournament } from "@/components/party/copy-predictions-modal";
import { FixtureStatsCard, type FixtureStats } from "@/components/party/fixture-stats-card";

export type LeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  wins: WinnerBadgeEntry[];
  bestStreak: number;
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
  competitions = [],
  isMixed = false,
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
  liveFixtures = [],
  otherTournaments = [],
  prizeLeaderboard = [],
  prizeMatchday = null,
  fixtureLeaderboards = [],
  fixtureStats = null,
}: {
  tournamentId: string;
  tournamentName: string;
  inviteCode: string;
  competition: string | null;
  /** Chei COD_an pentru turnee mix (ordine afișare tab-uri). */
  competitions?: string[];
  isMixed?: boolean;
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
  liveFixtures?: LiveFixture[];
  otherTournaments?: CopyTargetTournament[];
  prizeLeaderboard?: LeaderboardRow[];
  prizeMatchday?: number | null;
  fixtureLeaderboards?: { matchday: number; rows: LeaderboardRow[] }[];
  fixtureStats?: FixtureStats;
}) {
  const router = useRouter();
  const { t, dateLocale } = useLocale();
  const [tab, setTab] = useState<"leaderboard" | "predictions" | "prizes" | "fixtures">("leaderboard");
  const hasPrizeContest = prizeMatchday != null && prizeLeaderboard.length > 0;
  const hasFixtureLeaderboards = fixtureLeaderboards.length > 0;
  // Clasament pe etape: implicit ultima etapă începută.
  const [selectedFixtureMd, setSelectedFixtureMd] = useState(
    () => fixtureLeaderboards[fixtureLeaderboards.length - 1]?.matchday ?? 0,
  );
  const selectedFixtureRows =
    fixtureLeaderboards.find((f) => f.matchday === selectedFixtureMd)?.rows ?? [];
  // Tab-urile „premii" și „pe etape" refolosesc același tabel, doar cu alte rânduri.
  const activeRows =
    tab === "prizes" ? prizeLeaderboard
    : tab === "fixtures" ? selectedFixtureRows
    : leaderboard;
  const [copyOpen, setCopyOpen] = useState(false);
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);
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

  const leaderboardView = useMemo(
    () => buildLeaderboardView(activeRows, currentUserId, showAllLeaderboard),
    [activeRows, currentUserId, showAllLeaderboard],
  );

  const competitionActive = parseStoredCompetition(competition) != null;

  const predictionBlocks = useMemo(() => {
    const sortMatches = (list: FootballDataMatch[]) =>
      [...list].sort(
        (a, b) =>
          Date.parse(a.utcDate) - Date.parse(b.utcDate) || a.id - b.id,
      );

    if (isMixed) {
      const byKey = new Map<string, FootballDataMatch[]>();
      for (const m of matches) {
        const key = m.competitionKey?.trim();
        if (!key) continue;
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key)!.push(m);
      }
      const orderedKeys = [
        ...competitions.filter((k) => byKey.has(k)),
        ...[...byKey.keys()].filter((k) => !competitions.includes(k)),
      ];
      return orderedKeys.map((key) => ({
        id: key,
        label: competitionShortLabel(key),
        matches: sortMatches(byKey.get(key) ?? []),
      }));
    }

    return groupMatchesByDisplayMatchday(matches).map((block) => ({
      id: String(block.matchday),
      label: `Etapa ${block.matchday}`,
      matches: block.matches,
    }));
  }, [matches, isMixed, competitions]);

  const firstUnfinishedBlockId = useMemo(() => {
    for (const block of predictionBlocks) {
      if (block.matches.some((m) => isPlayableUnfinishedMatch(m))) {
        return block.id;
      }
    }
    return predictionBlocks[0]?.id ?? "";
  }, [predictionBlocks]);

  const [selectedBlockId, setSelectedBlockId] = useState("");
  useEffect(() => {
    if (firstUnfinishedBlockId) setSelectedBlockId(firstUnfinishedBlockId);
  }, [firstUnfinishedBlockId]);

  const selectedBlockMatches = useMemo(
    () => predictionBlocks.find((b) => b.id === selectedBlockId)?.matches ?? [],
    [predictionBlocks, selectedBlockId],
  );

  const selectedBlockLabel =
    predictionBlocks.find((b) => b.id === selectedBlockId)?.label ??
    (isMixed ? "" : `Etapa ${selectedBlockId}`);

  function lockReasonForMatch(m: FootballDataMatch) {
    return getMatchPredictionLockReason(m);
  }

  function renderMatchCard(m: FootballDataMatch) {
    const displayMatchday = isMixed ? null : Number(selectedBlockId);
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
        displayMatchday={Number.isFinite(displayMatchday) ? displayMatchday : null}
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
        const toSave = selectedBlockMatches.filter(
          (m) => !isMatchSettled(m) && lockReasonForMatch(m) == null,
        );
        let skippedConflict = false;
        for (const m of toSave) {
          const getPayload = matchDraftGettersRef.current.get(m.id);
          if (!getPayload) continue;
          const payload = getPayload();
          if (
            !isFtOutcomeConsistentWithExactScore(
              payload.ftOutcome,
              payload.predHomeGoals,
              payload.predAwayGoals,
            )
          ) {
            skippedConflict = true;
            continue;
          }
          await saveWcMatchPrediction(tournamentId, m.id, payload);
        }
        if (skippedConflict) {
          setErr(t("errors.scoreFtMismatch"));
        } else {
          setMsg(t("party.group.saveAllSuccess"));
        }
        router.refresh();
      } catch (e) {
        setErr(formatCaughtError(e, t));
      }
    });
  }

  // Persistă draftul blocului curent (fără toast/refresh) — folosit înainte de copiere.
  async function saveCurrentDraft() {
    const toSave = selectedBlockMatches.filter(
      (m) => !isMatchSettled(m) && lockReasonForMatch(m) == null,
    );
    for (const m of toSave) {
      const getPayload = matchDraftGettersRef.current.get(m.id);
      if (!getPayload) continue;
      const payload = getPayload();
      if (
        !isFtOutcomeConsistentWithExactScore(
          payload.ftOutcome,
          payload.predHomeGoals,
          payload.predAwayGoals,
        )
      ) {
        continue;
      }
      await saveWcMatchPrediction(tournamentId, m.id, payload);
    }
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
          {isPublic ?
            <Link
              href="/regulament"
              className="inline-block mt-1.5 text-xs font-medium text-white/45 underline decoration-white/20 underline-offset-2 transition-colors hover:text-white"
            >
              {t("tournament.page.prizeEligibilityRules")}
            </Link>
          : null}
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
                ...(hasPrizeContest ? ([["prizes", "party.tab.prizes"]] as const) : []),
                ...(hasFixtureLeaderboards ? ([["fixtures", "party.tab.fixtures"]] as const) : []),
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

          {(tab === "leaderboard" || tab === "prizes" || tab === "fixtures") && (
            <div className="flex flex-col gap-5 min-[1700px]:relative">
              {/* Card de statistici — în spațiul gol din stânga (gutter) pe ecrane
                  foarte late, altfel deasupra clasamentului. Doar la clasamente. */}
              {(tab === "leaderboard" || tab === "fixtures") && fixtureStats ? (
                <div className="max-w-md min-[1700px]:max-w-none min-[1700px]:w-56 min-[1700px]:absolute min-[1700px]:top-0 min-[1700px]:right-full min-[1700px]:mr-6">
                  <FixtureStatsCard stats={fixtureStats} />
                </div>
              ) : null}
              {tab === "leaderboard" ? (
                <LiveFixtureBanner tournamentId={tournamentId} initial={liveFixtures} />
              ) : tab === "prizes" ? (
                <p
                  className="text-sm rounded-xl border px-4 py-3"
                  style={{
                    borderColor: "rgba(59,130,246,0.3)",
                    backgroundColor: "rgba(59,130,246,0.07)",
                    color: "rgba(255,255,255,0.75)",
                  }}
                >
                  {t("party.prizes.hint", { matchday: prizeMatchday ?? 0 })}
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {/* Selector de etapă — un clasament separat pentru fiecare etapă. */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                    {fixtureLeaderboards.map((f) => (
                      <button
                        key={f.matchday}
                        type="button"
                        onClick={() => {
                          setSelectedFixtureMd(f.matchday);
                          setShowAllLeaderboard(false);
                        }}
                        className="shrink-0 px-3 h-9 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                        style={{
                          backgroundColor:
                            f.matchday === selectedFixtureMd ? "#3B82F6" : "rgba(255,255,255,0.06)",
                          color: f.matchday === selectedFixtureMd ? "#0A0B1E" : "rgba(255,255,255,0.7)",
                        }}
                      >
                        {t("party.fixtures.matchdayShort")} {f.matchday}
                      </button>
                    ))}
                  </div>
                  <p
                    className="text-sm rounded-xl border px-4 py-3"
                    style={{
                      borderColor: "rgba(59,130,246,0.3)",
                      backgroundColor: "rgba(59,130,246,0.07)",
                      color: "rgba(255,255,255,0.75)",
                    }}
                  >
                    {t("party.fixtures.hint", { matchday: selectedFixtureMd })}
                  </p>
                </div>
              )}
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
                    {leaderboardView.map((entry, i) => {
                      if (entry.kind === "gap") {
                        return (
                          <LeaderboardGapRow
                            key={`gap-${i}`}
                            colSpan={7}
                            hiddenCount={entry.hiddenCount}
                            onExpand={() => setShowAllLeaderboard(true)}
                          />
                        );
                      }
                      const row = entry.row;
                      const podium = getPodiumStyle(row.rank);
                      return (
                      <tr
                        key={row.userId}
                        style={getLeaderboardRowStyle(row.rank, row.userId === currentUserId)}
                      >
                        <td
                          className="py-2.5 px-2 font-bold tabular-nums align-top"
                          style={{ color: podium?.rankColor ?? "#FFFFFF" }}
                        >
                          {row.rank}
                        </td>
                        <td className="py-2.5 px-2 align-top max-w-[7rem] sm:max-w-[9rem]">
                          <span className="flex items-center gap-1 min-w-0">
                            <Link
                              href={`/turnee/${tournamentId}/member/${row.userId}`}
                              className="text-left text-white truncate hover:underline decoration-cyan-400/80 underline-offset-2 font-medium"
                            >
                              {row.displayName}
                            </Link>
                            <WinnerBadge wins={row.wins} />
                            <StreakBadge streak={row.bestStreak} />
                          </span>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {canCollapseLeaderboard(activeRows.length) ? (
                <LeaderboardToggle
                  showAll={showAllLeaderboard}
                  totalCount={activeRows.length}
                  onToggle={() => setShowAllLeaderboard((v) => !v)}
                />
              ) : null}
              {tab === "leaderboard" && !isPublic ? (
                <NextThreePredictionsPanel
                  matches={nextThreeMemberPreds}
                  currentUserId={currentUserId}
                  title={t("party.matchdayPreds.rollingTitle")}
                />
              ) : null}
            </div>
          )}

          {tab === "predictions" && (
            <div className="flex flex-col gap-5">
              {competition && otherTournaments.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setCopyOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-colors hover:bg-white/[0.04]"
                  style={{ borderColor: "rgba(59,130,246,0.4)", backgroundColor: "rgba(59,130,246,0.08)", color: "#60A5FA" }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                    <rect x="9" y="9" width="11" height="11" rx="2" />
                    <path d="M5 15V5a2 2 0 012-2h10" />
                  </svg>
                  {t("party.copyPreds.button")}
                </button>
              ) : null}
              <PointsScoringLegend />
              <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
                {predictionBlocks.map(({ id, label, matches: blockMatches }) => {
                  const hasPlayable = blockMatches.some((m) => isPlayableUnfinishedMatch(m));
                  const anyStarted = blockMatches.some(
                    (m) =>
                      isMatchSettled(m) ||
                      m.status === "IN_PLAY" ||
                      m.status === "PAUSED",
                  );
                  const isCurrent =
                    hasPlayable && (anyStarted || id === firstUnfinishedBlockId);
                  const isSelected = id === selectedBlockId;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedBlockId(id)}
                      className={
                        isMixed
                          ? "shrink-0 px-3 h-9 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                          : "shrink-0 w-9 h-9 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      }
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
                      {isMixed ? label : id}
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
                    {selectedBlockLabel}
                  </h3>
                  {selectedBlockMatches.length > 0 ?
                    <div className="flex flex-wrap items-center gap-2">
                      <ShareButton
                        className="inline-flex items-center gap-1.5 rounded-xl px-4 py-3 text-sm font-bold transition-colors"
                        getText={() =>
                          buildMyMatchdayShareText({
                            title: t("party.share.myTitle"),
                            matchdayLabel: selectedBlockLabel,
                            tournamentName,
                            rows: selectedBlockMatches.map((m) => ({
                              fixture: fixtureTlaPair(m),
                              pred: getMatchPredDisplay(myPreds[m.id]),
                            })),
                            labels: {
                              ht: t("party.lb.predHt"),
                              ft: t("party.lb.predFt"),
                              score: t("party.lb.predSc"),
                              fixture: t("party.share.fixture"),
                              noPreds: t("party.share.noPreds"),
                              via: t("party.share.via"),
                            },
                          })
                        }
                      />
                      <button
                        type="button"
                        disabled={pending}
                        onClick={handleSaveAllMatchdayPredictions}
                        className="self-start px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-50 cursor-pointer hover:opacity-90 active:scale-[0.98]"
                        style={{ backgroundColor: WC_LIME, color: "#0A0B1E" }}
                      >
                        {pending ? t("party.group.savingAll") : t("party.group.saveAllButton")}
                      </button>
                    </div>
                  : null}
                </div>
                {selectedBlockMatches.length === 0 ?
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                    {t("party.group.noMatches")}
                  </p>
                : (
                  <div className="flex flex-col gap-5">
                    {selectedBlockMatches.map((m) => renderMatchCard(m))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {copyOpen ? (
        <CopyPredictionsModal
          sourceTournamentId={tournamentId}
          sourceCompetition={competition}
          tournaments={otherTournaments}
          beforeCopy={saveCurrentDraft}
          onClose={() => setCopyOpen(false)}
        />
      ) : null}
    </div>
  );
}
