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
  type FootballDataCompetitionPickerOption,
} from "@/lib/competition";
import type { MatchOddsRow } from "@/lib/betting-odds";
import { refreshTournamentBettingOdds } from "@/app/actions/betting-odds";
import {
  saveWcExtraPrediction,
  setTournamentCompetition,
  simulateRandomClPredictionsForMe,
} from "@/app/actions/wc-predictions";
import { POINTS_PER_PREDICTION_CHANGE_AFTER_START } from "@/lib/prediction-window";
import {
  PartyMatchPredictionCard,
  predFromSaved,
  type MatchPredState,
} from "@/components/party/party-match-prediction-card";
import {
  NextThreePredictionsPanel,
  type NextThreeMatchPreds,
} from "@/components/party/next-three-predictions-panel";

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
  competitionPickerOptions = [],
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
  bettingOddsFetchedAt = null,
  nextThreeMemberPreds = [],
}: {
  tournamentId: string;
  tournamentName: string;
  inviteCode: string;
  competition: string | null;
  allowPredictionChangesDuringCompetition?: boolean;
  competitionUnderway?: boolean;
  myMidCompetitionChangeCount?: number;
  competitionPickerOptions?: FootballDataCompetitionPickerOption[];
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
  bettingOddsFetchedAt?: string | null;
  nextThreeMemberPreds?: NextThreeMatchPreds[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"leaderboard" | "matches" | "extras">("leaderboard");
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

  function onCompetitionChange(storageKey: string) {
    setErr(null);
    setMsg(null);
    startTransition(async () => {
      try {
        await setTournamentCompetition(
          tournamentId,
          storageKey.trim() === "" ? null : storageKey.trim(),
        );
        setMsg(
          storageKey.trim() === "" ?
            "Competition cleared."
          : "Competition updated.",
        );
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{tournamentName}</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
            Invite code:{" "}
            <span className="font-bold tracking-widest" style={{ color: "#22D3EE" }}>
              {inviteCode}
            </span>
          </p>
          {competitionActive && bettingOddsFetchedAt ?
            <p className="text-[10px] mt-1.5" style={{ color: "rgba(167,243,208,0.8)" }}>
              Cote: {new Date(bettingOddsFetchedAt).toLocaleString("ro-RO")} ·{" "}
              {Object.keys(bettingOddsByMatchId).length} meciuri
            </p>
          : competitionActive ?
            <p className="text-[10px] mt-1.5 text-amber-200/85">Cote indisponibile (×1)</p>
          : null}
          {competitionActive && predictionsReadOnly ?
            <p className="text-[10px] mt-1.5 text-amber-200/95 font-medium">
              Pronosticuri blocate: acest party permite doar pronosticuri înainte de startul competiției.
            </p>
          : null}
          {competitionActive && midCompetitionPenaltyMode ?
            <p className="text-[10px] mt-1.5" style={{ color: "rgba(253,224,71,0.92)" }}>
              Modificări după start: {myMidCompetitionChangeCount} · penalizare{" "}
              {myMidCompetitionChangeCount * POINTS_PER_PREDICTION_CHANGE_AFTER_START} pct (fiecare schimbare: −
              {POINTS_PER_PREDICTION_CHANGE_AFTER_START} pct).
            </p>
          : null}
        </div>
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

      {isCreator && (
        <div
          className="rounded-2xl border px-4 py-4 flex flex-col gap-3"
          style={{ backgroundColor: "#1E293B", borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div>
            <p className="text-white text-sm font-semibold">Party competition</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
              Alege competiția din Football-Data (același catalog ca la creare). Lista depinde de planul API.
            </p>
          </div>
          {competitionPickerOptions.length > 0 ?
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:flex-wrap">
              <select
                value={competition ?? ""}
                disabled={pending}
                onChange={(e) => onCompetitionChange(e.target.value)}
                className="rounded-xl px-4 py-3 text-sm outline-none border min-w-[12rem] max-w-full sm:max-w-md cursor-pointer disabled:opacity-50"
                style={{
                  backgroundColor: "#0F172A",
                  color: "#fff",
                  borderColor: "rgba(255,255,255,0.12)",
                }}
              >
                <option value="">Fără competiție</option>
                {competitionPickerOptions.map((c) => (
                  <option key={c.storageKey} value={c.storageKey}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          : <p className="text-xs" style={{ color: "#fbbf24" }}>
              Lista de competiții nu e disponibilă (verifică token-ul API). Poți șterge competiția curentă dacă e
              setată.
            </p>}
          {competition && competitionPickerOptions.length === 0 ?
            <button
              type="button"
              disabled={pending}
              onClick={() => onCompetitionChange("")}
              className="self-start px-4 py-2 rounded-xl text-sm font-semibold border cursor-pointer transition-opacity disabled:opacity-40"
              style={{
                borderColor: "rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.85)",
              }}
            >
              Șterge competiția
            </button>
          : null}
          {competitionActive && (
            <div
              className="mt-3 pt-3 border-t flex flex-col gap-2"
              style={{ borderColor: "rgba(255,255,255,0.08)" }}
            >
              {bettingOddsFetchedAt ?
                <p className="text-[10px]" style={{ color: "rgba(167,243,208,0.85)" }}>
                  Cote: {new Date(bettingOddsFetchedAt).toLocaleString("ro-RO")} ·{" "}
                  {Object.keys(bettingOddsByMatchId).length} meciuri
                </p>
              : <p className="text-[10px] text-amber-200/90">Cote indisponibile (×1)</p>}
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setErr(null);
                  setMsg(null);
                  startTransition(async () => {
                    try {
                      const r = await refreshTournamentBettingOdds(tournamentId);
                      setMsg(
                        `Cote actualizate (${r.matchCount} meciuri, ${r.teamCount} echipe, sursă ${r.oddsSource}${r.usedFallback ? ", fallback Gemini" : ""}).`,
                      );
                      router.refresh();
                    } catch (e) {
                      setErr(e instanceof Error ? e.message : "Nu s-au putut actualiza cotele");
                    }
                  });
                }}
                className="self-start px-4 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-40"
                style={{ backgroundColor: "#0EA5E9", color: "#0f172a" }}
              >
                Actualizează cotele
              </button>
            </div>
          )}
        </div>
      )}

      {!competitionActive && (
        <div
          className="rounded-2xl border p-6 text-center text-sm"
          style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}
        >
          {isCreator ?
            "Selectează o competiție mai sus pentru meciuri, clasament și pronosticuri."
          : "Creatorul party-ului poate seta competiția din setările de mai sus."}
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
                ["leaderboard", "Leaderboard"],
                ["matches", "Matches"],
                ["extras", "Qualifiers & champion"],
              ] as const
            ).map(([id, label]) => (
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
                {label}
              </button>
            ))}
          </div>

          {tab === "leaderboard" && (
            <div
              className="rounded-2xl border overflow-x-auto"
              style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#1E293B" }}
            >
                <table className="w-full text-sm min-w-[780px]">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <th className="text-left py-3 px-2 text-xs font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>
                        #
                      </th>
                      <th className="text-left py-3 px-2 text-xs font-semibold min-w-[5.5rem]" style={{ color: "rgba(255,255,255,0.45)" }}>
                        Member
                      </th>
                      <th
                        className="text-left py-3 px-1.5 text-xs font-semibold max-w-[3.25rem]"
                        style={{ color: "rgba(255,255,255,0.45)" }}
                        title="Champion team they picked"
                      >
                        Pick
                      </th>
                      <th
                        className="text-left py-3 px-1.5 text-xs font-semibold min-w-[4.5rem]"
                        style={{ color: "rgba(255,255,255,0.45)" }}
                        title="Prediction for the most recently finished match; HT/FT lines = actual scores when available"
                      >
                        Last
                      </th>
                      <th
                        className="text-left py-3 px-1.5 text-xs font-semibold min-w-[5.5rem]"
                        style={{ color: "rgba(255,255,255,0.45)" }}
                        title="Their picks for the next three scheduled fixtures"
                      >
                        Next 3
                      </th>
                      <th
                        className="text-right py-3 px-1 text-xs font-semibold tabular-nums"
                        style={{ color: "rgba(255,255,255,0.45)" }}
                        title="Final guessed (full-time winner)"
                      >
                        FG
                      </th>
                      <th
                        className="text-right py-3 px-1 text-xs font-semibold tabular-nums"
                        style={{ color: "rgba(255,255,255,0.45)" }}
                        title="Half-time guessed"
                      >
                        PG
                      </th>
                      <th
                        className="text-right py-3 px-1 text-xs font-semibold tabular-nums"
                        style={{ color: "rgba(255,255,255,0.45)" }}
                        title="Correct scores"
                      >
                        SC
                      </th>
                      <th
                        className="text-right py-3 px-1 text-xs font-semibold tabular-nums"
                        style={{ color: "rgba(255,255,255,0.45)" }}
                        title="Qualifiers guessed"
                      >
                        CG
                      </th>
                      <th
                        className="text-right py-3 px-1 text-xs font-semibold hidden md:table-cell tabular-nums"
                        style={{ color: "rgba(255,255,255,0.45)" }}
                        title="Champion points (scoring)"
                      >
                        CH
                      </th>
                      <th
                        className="text-right py-3 px-1 text-xs font-semibold tabular-nums"
                        style={{ color: "rgba(255,255,255,0.45)" }}
                        title="Penalizare pentru modificări după startul competiției"
                      >
                        Pen
                      </th>
                      <th className="text-right py-3 px-2 text-xs font-semibold tabular-nums" style={{ color: "rgba(255,255,255,0.45)" }}>
                        Total
                      </th>
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
                            href={`/party/${tournamentId}/member/${row.userId}`}
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
                                    <div>HT {row.lastMatch.actualHt}</div>
                                  : null}
                                  {row.lastMatch.actualFt ?
                                    <div>FT {row.lastMatch.actualFt}</div>
                                  : null}
                                </div>
                              )}
                            </>
                          : <span style={{ color: "rgba(255,255,255,0.35)" }}>—</span>}
                        </td>
                        <td className="py-2.5 px-1.5 align-top text-[10px] leading-snug space-y-0.5" style={{ color: "rgba(255,255,255,0.82)" }}>
                          {row.nextMatches.some(Boolean) ?
                            row.nextMatches.map((n, i) =>
                              n ?
                                <div key={n.matchId}>
                                  <span className="text-cyan-200/85">{n.fixture}</span>{" "}
                                  <span className="tabular-nums">{n.pred}</span>
                                </div>
                              : null,
                            )
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
          )}

          {tab === "matches" && (
            <div className="flex flex-col gap-8">
              {competitionActive && predictionsReadOnly ?
                <div
                  className="rounded-xl border px-4 py-3 text-sm"
                  style={{
                    borderColor: "rgba(251,191,36,0.35)",
                    backgroundColor: "rgba(120,53,15,0.22)",
                    color: "rgba(254,243,199,0.95)",
                  }}
                >
                  Pronosticurile sunt închise: competiția a început, iar creatorul a ales varianta „doar înainte de
                  start”.
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
                  Poți modifica pronosticurile după start, dar{" "}
                  <strong className="text-amber-200">
                    fiecare salvare care schimbă datele costă {POINTS_PER_PREDICTION_CHANGE_AFTER_START} puncte
                  </strong>{" "}
                  (meci sau extras), scăzute din totalul tău.
                </div>
              : null}
              <NextThreePredictionsPanel
                matches={nextThreeMemberPreds}
                currentUserId={currentUserId}
              />
              {groupBlocks.map(({ key, matches: gm }) =>
                gm.length > 0 ?
                  <section key={key}>
                    <h3 className="text-white font-semibold mb-3">{key}</h3>
                    <div className="flex flex-col gap-5">
                      {gm.map((m) => (
                        <PartyMatchPredictionCard
                          key={m.id}
                          m={m}
                          tournamentId={tournamentId}
                          matchOddsRow={bettingOddsByMatchId[String(m.id)] ?? null}
                          initial={predFromSaved(myPreds[m.id])}
                          predictionsReadOnly={predictionsReadOnly}
                          midCompetitionPenaltyMode={midCompetitionPenaltyMode}
                          onSaved={() => {
                            setMsg("Pronostic salvat.");
                            setErr(null);
                            router.refresh();
                          }}
                          onError={(t) => {
                            setErr(t);
                            setMsg(null);
                          }}
                        />
                      ))}
                    </div>
                  </section>
                : null,
              )}
              {knockoutBlocks.map(({ stageLabel, matches: km }) =>
                km.length > 0 ?
                  <section key={stageLabel}>
                    <h3 className="text-white font-semibold mb-3">{stageLabel}</h3>
                    <div className="flex flex-col gap-5">
                      {km.map((m) => (
                        <PartyMatchPredictionCard
                          key={m.id}
                          m={m}
                          tournamentId={tournamentId}
                          matchOddsRow={bettingOddsByMatchId[String(m.id)] ?? null}
                          initial={predFromSaved(myPreds[m.id])}
                          predictionsReadOnly={predictionsReadOnly}
                          midCompetitionPenaltyMode={midCompetitionPenaltyMode}
                          onSaved={() => {
                            setMsg("Pronostic salvat.");
                            setErr(null);
                            router.refresh();
                          }}
                          onError={(t) => {
                            setErr(t);
                            setMsg(null);
                          }}
                        />
                      ))}
                    </div>
                  </section>
                : null,
              )}
            </div>
          )}

          {tab === "extras" && (
            <div
              className="rounded-2xl border p-4 sm:p-6 flex flex-col gap-6"
              style={{ backgroundColor: "#1E293B", borderColor: "rgba(255,255,255,0.08)" }}
            >
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
                Calificări în optimi și campion. Max. 3 echipe din aceeași grupă.
              </p>
              {predictionsReadOnly ?
                <p className="text-sm text-amber-200/95">
                  Extras blocate: competiția a început și acest party nu permite modificări după start.
                </p>
              : null}
              {midCompetitionPenaltyMode ?
                <p className="text-sm" style={{ color: "rgba(226,232,240,0.88)" }}>
                  După start, salvarea extraselor dacă schimbă față de ultima versiune costă{" "}
                  <strong className="text-amber-200">{POINTS_PER_PREDICTION_CHANGE_AFTER_START} puncte</strong>.
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
                        const cannotAddMore =
                          !checked && selectedInGroup >= 3;
                        const checkboxDisabled =
                          predictionsReadOnly || cannotAddMore;
                        return (
                          <label
                            key={id}
                            className="flex items-center gap-3 rounded-xl px-3 py-2 border"
                            style={{
                              borderColor: checked ? "rgba(34,211,238,0.35)" : "rgba(255,255,255,0.08)",
                              backgroundColor: checked ? "rgba(34,211,238,0.08)" : "rgba(0,0,0,0.15)",
                              cursor: checkboxDisabled ? "not-allowed" : "pointer",
                              opacity: checkboxDisabled ? 0.45 : 1,
                            }}
                            title={
                              cannotAddMore ? "At most 3 teams per group." : undefined
                            }
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={checkboxDisabled}
                              onChange={() => toggleTeam(id)}
                              className="rounded border-gray-500 disabled:cursor-not-allowed"
                            />
                            {row.team.crest ?
                              <Image
                                src={row.team.crest}
                                alt=""
                                width={28}
                                height={28}
                                className="rounded-md bg-white/90 p-0.5 object-contain shrink-0"
                                unoptimized
                              />
                            : null}
                            <span className="text-sm text-white truncate">{name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-2 max-w-md">
                <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Champion (final)
                </label>
                <select
                  value={championId}
                  onChange={(e) => setChampionId(e.target.value)}
                  disabled={predictionsReadOnly}
                  className="rounded-xl px-4 py-3 text-sm outline-none border disabled:opacity-50"
                  style={{
                    backgroundColor: "#0F172A",
                    color: "#fff",
                    borderColor: "rgba(255,255,255,0.12)",
                  }}
                >
                  <option value="">— Pick a team —</option>
                  {allTeams.map((t) =>
                    t.id !== undefined ?
                      <option key={t.id} value={String(t.id)}>
                        {t.name ?? t.shortName ?? t.id}
                      </option>
                    : null,
                  )}
                </select>
              </div>

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
                      setMsg("Qualifiers and champion saved.");
                      router.refresh();
                    } catch (e) {
                      setErr(e instanceof Error ? e.message : "Something went wrong");
                    }
                  });
                }}
                className="self-start px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: "#22D3EE", color: "#0F172A" }}
              >
                Save qualifiers & champion
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
