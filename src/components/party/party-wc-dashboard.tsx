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
  venueLabel,
  WC_GROUP_ORDER,
  WC_UNASSIGNED_GROUP_KEY,
} from "@/lib/football-data";
import { formatMatchKickoff } from "@/lib/match-datetime";
import {
  isWorldCup2026Storage,
  parseStoredCompetition,
  type FootballDataCompetitionPickerOption,
} from "@/lib/competition";
import type { MatchOddsRow } from "@/lib/betting-odds";
import { refreshTournamentBettingOdds } from "@/app/actions/betting-odds";
import {
  saveWcExtraPrediction,
  saveWcMatchPrediction,
  setTournamentCompetition,
  simulateRandomClPredictionsForMe,
} from "@/app/actions/wc-predictions";
import { POINTS_PER_PREDICTION_CHANGE_AFTER_START } from "@/lib/prediction-window";
import {
  computeMatchPoints,
  POINTS_CHAMPION_BASE,
  POINTS_CORRECT_SCORE_BASE,
  POINTS_FT_BASE,
  POINTS_HT_BASE,
  POINTS_QUALIFIER_TEAM_BASE,
} from "@/lib/wc-scoring";

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

type MatchPredState = {
  htOutcome: string;
  ftOutcome: string;
  predHomeGoals: string;
  predAwayGoals: string;
};

function emptyPred(): MatchPredState {
  return {
    htOutcome: "",
    ftOutcome: "",
    predHomeGoals: "",
    predAwayGoals: "",
  };
}

function predFromSaved(
  p:
    | {
        htOutcome?: string | null;
        ftOutcome?: string | null;
        predHomeGoals?: number | null;
        predAwayGoals?: number | null;
      }
    | undefined,
): MatchPredState {
  if (!p) return emptyPred();
  return {
    htOutcome: p.htOutcome ?? "",
    ftOutcome: p.ftOutcome ?? "",
    predHomeGoals:
      p.predHomeGoals !== null && p.predHomeGoals !== undefined ?
        String(p.predHomeGoals)
      : "",
    predAwayGoals:
      p.predAwayGoals !== null && p.predAwayGoals !== undefined ?
        String(p.predAwayGoals)
      : "",
  };
}

function OutcomeSelect({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.45)" }}>
        {label}
      </span>
      <select
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg px-2 py-2 text-xs outline-none border w-full disabled:opacity-50"
        style={{
          backgroundColor: "#0F172A",
          color: "#fff",
          borderColor: "rgba(255,255,255,0.12)",
        }}
      >
        <option value="">—</option>
        <option value="HOME">Home</option>
        <option value="DRAW">Draw</option>
        <option value="AWAY">Away</option>
      </select>
    </label>
  );
}

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
              Snapshot cote: {new Date(bettingOddsFetchedAt).toLocaleString("ro-RO")} ·{" "}
              {Object.keys(bettingOddsByMatchId).length} meciuri
            </p>
          : competitionActive ?
            <p className="text-[10px] mt-1.5 text-amber-200/85">
              Fără snapshot de cote — multiplicator 1 (creatorul poate actualiza din setările competiției).
            </p>
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
        {competitionActive && wc2026Mode && (
          <div
            className="rounded-xl px-4 py-2 text-xs font-medium shrink-0 max-w-lg leading-snug"
            style={{ backgroundColor: "rgba(34,211,238,0.12)", color: "#67E8F9" }}
          >
            WC 2026 · punctaj: pauză {POINTS_HT_BASE}×cota 1X2 la pauză (rezultat real), final {POINTS_FT_BASE}×cota 1X2
            final, scor exact {POINTS_CORRECT_SCORE_BASE}×cota scorului, calificat {POINTS_QUALIFIER_TEAM_BASE}×cota
            calificării, campion {POINTS_CHAMPION_BASE}×cota câștigătorului. Fără snapshot de cote, multiplicatorul e
            1.
          </div>
        )}
        {competitionActive && !wc2026Mode && (
          <div
            className="rounded-xl px-4 py-2 text-xs font-medium shrink-0 max-w-lg leading-snug"
            style={{ backgroundColor: "rgba(34,211,238,0.12)", color: "#67E8F9" }}
          >
            Pronosticuri active · aceleași reguli de bază × cote (Gemini). Extras: calificări + campion când programul
            suportă regulile de cupă.
          </div>
        )}
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
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                Cote pentru punctaj: Gemini cu{" "}
                <strong className="text-cyan-200/95">Grounding Google Search</strong> (căutare web pentru linii
                actuale), salvate în MongoDB. Necesită{" "}
                <code className="text-cyan-200/90">GEMINI_API_KEY</code>. Poți dezactiva căutarea cu{" "}
                <code className="text-cyan-200/90">GEMINI_ODDS_USE_GOOGLE_SEARCH=false</code> dacă API-ul refuză
                combinația sau vrei doar răspuns fără web.
              </p>
              {bettingOddsFetchedAt ?
                <p className="text-[10px]" style={{ color: "rgba(167,243,208,0.85)" }}>
                  Snapshot cote: {new Date(bettingOddsFetchedAt).toLocaleString("ro-RO")} ·{" "}
                  {Object.keys(bettingOddsByMatchId).length} meciuri cu linii în snapshot
                </p>
              : <p className="text-[10px] text-amber-200/90">Încă nu există snapshot de cote — punctajul folosește
                  multiplicator 1 până la prima actualizare.</p>}
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
                        `Cote actualizate (${r.matchCount} meciuri, ${r.teamCount} echipe, model ${r.model}${r.usedGoogleSearch ? ", cu căutare Google" : ", fără căutare Google"}).`,
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
                Actualizează cotele (Gemini)
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
              <p
                className="text-[10px] sm:text-xs px-3 sm:px-4 pt-3 pb-2 leading-relaxed"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                  <span className="font-semibold text-cyan-300/90">FG</span> Final guessed ·{" "}
                  <span className="font-semibold text-cyan-300/90">PG</span> Half-time guessed ·{" "}
                  <span className="font-semibold text-cyan-300/90">SC</span> Correct scores ·{" "}
                  <span className="font-semibold text-cyan-300/90">CG</span> Qualifiers guessed (counts after all
                  group games finish or Round of 32 line-up is complete) ·{" "}
                  <span className="font-semibold text-cyan-300/90">CH</span> Champion points ·{" "}
                  <span className="font-semibold text-cyan-300/90">Pen</span> penalizare modificări după start (dacă
                  party-ul o permite) ·{" "}
                  <span className="font-semibold text-cyan-300/90">Pick</span> champion team they chose ·{" "}
                  <span className="font-semibold text-cyan-300/90">Last</span> /{" "}
                  <span className="font-semibold text-cyan-300/90">Next 3</span> use the latest results and the next
                  three fixtures on the schedule (your pick or “—”). Click a member name to open their full prediction
                  page. Dacă există snapshot de cote (Gemini), fiecare categorie e înmulțită cu cota rezultatului /
                  echipei reale.
                </p>
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
              {groupBlocks.map(({ key, matches: gm }) =>
                gm.length > 0 ?
                  <section key={key}>
                    <h3 className="text-white font-semibold mb-3">{key}</h3>
                    <div className="flex flex-col gap-5">
                      {gm.map((m) => (
                        <MatchPredictionBlock
                          key={m.id}
                          m={m}
                          tournamentId={tournamentId}
                          matchOddsRow={bettingOddsByMatchId[String(m.id)] ?? null}
                          initial={predFromSaved(myPreds[m.id])}
                          predictionsReadOnly={predictionsReadOnly}
                          midCompetitionPenaltyMode={midCompetitionPenaltyMode}
                          onSaved={() => {
                            setMsg("Prediction saved.");
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
                        <MatchPredictionBlock
                          key={m.id}
                          m={m}
                          tournamentId={tournamentId}
                          matchOddsRow={bettingOddsByMatchId[String(m.id)] ?? null}
                          initial={predFromSaved(myPreds[m.id])}
                          predictionsReadOnly={predictionsReadOnly}
                          midCompetitionPenaltyMode={midCompetitionPenaltyMode}
                          onSaved={() => {
                            setMsg("Prediction saved.");
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
                Alege echipele care ajung în optimi (loc 1–2 în grupă + cele mai bune locuri 3, max. 3 echipe din
                aceeași grupă). Pentru fiecare calificat ghicit primești{" "}
                <span className="text-cyan-200/90">{POINTS_QUALIFIER_TEAM_BASE}×</span>cota lui de calificare (din
                snapshot) — punctele se acordă doar după ce calificările sunt clare (toate meciurile din grupe
                terminate sau 32 de echipe în bracket). Campionul corect:{" "}
                <span className="text-cyan-200/90">{POINTS_CHAMPION_BASE}×</span>cota de câștigător final, după finală.
              </p>
              <p className="text-xs font-medium" style={{ color: "rgba(250,204,21,0.9)" }}>
                You can select at most 3 teams from each group.
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

function MatchPredictionBlock({
  m,
  tournamentId,
  matchOddsRow,
  initial,
  predictionsReadOnly = false,
  midCompetitionPenaltyMode = false,
  onSaved,
  onError,
}: {
  m: FootballDataMatch;
  tournamentId: string;
  matchOddsRow: MatchOddsRow | null;
  initial: MatchPredState;
  predictionsReadOnly?: boolean;
  midCompetitionPenaltyMode?: boolean;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [p, setP] = useState<MatchPredState>(initial);
  const [pending, startTransition] = useTransition();
  const finished = m.status === "FINISHED";
  const formLocked = finished || predictionsReadOnly;

  useEffect(() => {
    setP(initial);
  }, [
    initial.htOutcome,
    initial.ftOutcome,
    initial.predHomeGoals,
    initial.predAwayGoals,
  ]);

  const breakdown = useMemo(
    () =>
      computeMatchPoints(
        {
          htOutcome: p.htOutcome || null,
          ftOutcome: p.ftOutcome || null,
          predHomeGoals: p.predHomeGoals === "" ? null : Number(p.predHomeGoals),
          predAwayGoals: p.predAwayGoals === "" ? null : Number(p.predAwayGoals),
        },
        m,
        matchOddsRow,
      ),
    [p, m, matchOddsRow],
  );

  const venue = venueLabel(m);
  const when = formatMatchKickoff(m.utcDate);
  const home = m.homeTeam.name ?? m.homeTeam.shortName ?? "—";
  const away = m.awayTeam.name ?? m.awayTeam.shortName ?? "—";
  const hl = m.homeTeam.crest;
  const al = m.awayTeam.crest;
  const ft = m.score?.fullTime;
  const ht = m.score?.halfTime;

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: "rgba(34,211,238,0.22)",
        background: "linear-gradient(145deg, rgba(15,23,42,0.96) 0%, rgba(30,41,59,0.88) 100%)",
      }}
    >
      <div className="px-4 py-4 sm:px-6 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="grid grid-cols-[1fr_minmax(7rem,1fr)_1fr] gap-2 sm:gap-4 items-center">
          <div className="flex flex-col items-center gap-2 min-w-0">
            {hl ?
              <Image
                src={hl}
                alt=""
                width={40}
                height={40}
                className="rounded-lg bg-white/90 p-0.5 object-contain"
                unoptimized
              />
            : null}
            <span className="font-bold text-white text-xs sm:text-sm text-center break-words">{home}</span>
          </div>
          <div className="flex flex-col items-center justify-center text-center px-1">
            <span className="text-[10px] sm:text-xs font-semibold line-clamp-3" style={{ color: "#67E8F9" }}>
              {venue ?? "Venue TBD"}
            </span>
            <span className="text-[10px] mt-1 tabular-nums" style={{ color: "#BEF264" }}>
              {when}
            </span>
            {finished && ft?.home != null && ft?.away != null && (
              <span className="text-white font-bold mt-2 tabular-nums">
                {ft.home} – {ft.away}
                {ht?.home != null && ht?.away != null ?
                  <span className="block text-[10px] font-normal mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
                    HT {ht.home}–{ht.away}
                  </span>
                : null}
              </span>
            )}
          </div>
          <div className="flex flex-col items-center gap-2 min-w-0">
            {al ?
              <Image
                src={al}
                alt=""
                width={40}
                height={40}
                className="rounded-lg bg-white/90 p-0.5 object-contain"
                unoptimized
              />
            : null}
            <span className="font-bold text-white text-xs sm:text-sm text-center break-words">{away}</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 flex flex-col gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <OutcomeSelect
            label={`Pauză (${POINTS_HT_BASE}×cotă 1X2)`}
            value={p.htOutcome}
            onChange={(v) => setP((s) => ({ ...s, htOutcome: v }))}
            disabled={formLocked}
          />
          <OutcomeSelect
            label={`Final (${POINTS_FT_BASE}×cotă 1X2)`}
            value={p.ftOutcome}
            onChange={(v) => setP((s) => ({ ...s, ftOutcome: v }))}
            disabled={formLocked}
          />
          <label className="flex flex-col gap-1 min-w-0">
            <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.45)" }}>
              Goluri acasă (scor exact {POINTS_CORRECT_SCORE_BASE}×cotă)
            </span>
            <input
              type="number"
              min={0}
              disabled={formLocked}
              value={p.predHomeGoals}
              onChange={(e) => setP((s) => ({ ...s, predHomeGoals: e.target.value }))}
              className="rounded-lg px-2 py-2 text-xs outline-none border w-full disabled:opacity-50"
              style={{
                backgroundColor: "#0F172A",
                color: "#fff",
                borderColor: "rgba(255,255,255,0.12)",
              }}
            />
          </label>
          <label className="flex flex-col gap-1 min-w-0">
            <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.45)" }}>
              Away goals
            </span>
            <input
              type="number"
              min={0}
              disabled={formLocked}
              value={p.predAwayGoals}
              onChange={(e) => setP((s) => ({ ...s, predAwayGoals: e.target.value }))}
              className="rounded-lg px-2 py-2 text-xs outline-none border w-full disabled:opacity-50"
              style={{
                backgroundColor: "#0F172A",
                color: "#fff",
                borderColor: "rgba(255,255,255,0.12)",
              }}
            />
          </label>
        </div>

        {finished && (
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
            Points from this match:{" "}
            <span className="font-bold text-emerald-400">{breakdown.total}</span> (HT {breakdown.halfTime}, FT{" "}
            {breakdown.fullTime}, exact score {breakdown.correctScore})
          </p>
        )}

        {!finished && predictionsReadOnly ?
          <p className="text-xs text-amber-200/90">
            Nu poți salva: pronosticurile sunt blocate după startul competiției.
          </p>
        : !finished ?
          <div className="flex flex-col gap-1.5 items-start">
            {midCompetitionPenaltyMode ?
              <p className="text-[11px] leading-snug" style={{ color: "rgba(253,224,71,0.88)" }}>
                Dacă această salvare schimbă pronosticul față de ce era înregistrat, pierzi{" "}
                {POINTS_PER_PREDICTION_CHANGE_AFTER_START} puncte.
              </p>
            : null}
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  try {
                    await saveWcMatchPrediction(tournamentId, m.id, {
                      htOutcome: p.htOutcome || null,
                      ftOutcome: p.ftOutcome || null,
                      predHomeGoals:
                        p.predHomeGoals === "" ? null : Number(p.predHomeGoals),
                      predAwayGoals:
                        p.predAwayGoals === "" ? null : Number(p.predAwayGoals),
                    });
                    onSaved();
                  } catch (e) {
                    onError(e instanceof Error ? e.message : "Something went wrong");
                  }
                });
              }}
              className="self-start px-5 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: "#22D3EE", color: "#0F172A" }}
            >
              Save prediction
            </button>
          </div>
        : null}
      </div>
    </div>
  );
}
