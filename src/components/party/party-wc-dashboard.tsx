"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
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
  COMPETITION_WC_2026,
  computeMatchPoints,
  POINTS_CHAMPION,
  POINTS_CORRECT_SCORE,
  POINTS_FT,
  POINTS_HT,
  POINTS_QUALIFIER_TEAM,
} from "@/lib/wc-scoring";
import {
  saveWcExtraPrediction,
  saveWcMatchPrediction,
  setTournamentCompetition,
} from "@/app/actions/wc-predictions";

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
  total: number;
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
  isCreator,
  currentUserId,
  matches,
  standings,
  leaderboard,
  myPreds,
  myExtra,
  allTeams,
}: {
  tournamentId: string;
  tournamentName: string;
  inviteCode: string;
  competition: string | null;
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
}) {
  const [tab, setTab] = useState<"leaderboard" | "matches" | "extras">("leaderboard");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const wcActive = competition === COMPETITION_WC_2026;

  const teamIdToGroupKey = useMemo(
    () => buildTeamIdToGroupKeyFromStandings(standings),
    [standings],
  );

  const { groupBlocks, knockoutBlocks } = useMemo(() => {
    const { groups, knockoutByStageLabel } = partitionFootballDataMatches(matches);
    const groupKeysOrdered = [...WC_GROUP_ORDER];
    if ((groups.get(WC_UNASSIGNED_GROUP_KEY)?.length ?? 0) > 0) {
      groupKeysOrdered.push(WC_UNASSIGNED_GROUP_KEY);
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
  }, [matches]);

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

  function onSetCompetition(nextWc: boolean) {
    setErr(null);
    setMsg(null);
    startTransition(async () => {
      try {
        await setTournamentCompetition(
          tournamentId,
          nextWc ? COMPETITION_WC_2026 : null,
        );
        setMsg(
          nextWc ?
            "FIFA World Cup 2026 enabled for this party."
          : "Competition mode turned off.",
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
        </div>
        {wcActive && (
          <div
            className="rounded-xl px-4 py-2 text-xs font-medium shrink-0"
            style={{ backgroundColor: "rgba(34,211,238,0.12)", color: "#67E8F9" }}
          >
            WC 2026 on · scoring: HT {POINTS_HT}p · FT {POINTS_FT}p · exact score {POINTS_CORRECT_SCORE}p ·
            qualifier {POINTS_QUALIFIER_TEAM}p each · champion {POINTS_CHAMPION}p
          </div>
        )}
      </header>

      {isCreator && (
        <div
          className="rounded-2xl border px-4 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between"
          style={{ backgroundColor: "#1E293B", borderColor: "rgba(255,255,255,0.08)" }}
        >
          <div>
            <p className="text-white text-sm font-semibold">Party competition</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
              Enable FIFA World Cup 2026 for predictions and the leaderboard.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              disabled={pending || wcActive}
              onClick={() => onSetCompetition(true)}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity disabled:opacity-40 cursor-pointer"
              style={{ backgroundColor: "#22D3EE", color: "#0F172A" }}
            >
              FIFA World Cup 2026
            </button>
            <button
              type="button"
              disabled={pending || !wcActive}
              onClick={() => onSetCompetition(false)}
              className="px-4 py-2 rounded-xl text-sm font-semibold border cursor-pointer transition-opacity disabled:opacity-40"
              style={{
                borderColor: "rgba(255,255,255,0.2)",
                color: "rgba(255,255,255,0.85)",
              }}
            >
              No competition
            </button>
          </div>
        </div>
      )}

      {!wcActive && (
        <div
          className="rounded-2xl border p-6 text-center text-sm"
          style={{ borderColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}
        >
          {isCreator ?
            "Enable “FIFA World Cup 2026” above to load fixtures, standings, and scoring."
          : "The party creator can enable FIFA World Cup 2026 in the settings above."}
        </div>
      )}

      {wcActive && (
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
              className="rounded-2xl border overflow-hidden"
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
                <span className="font-semibold text-cyan-300/90">CH</span> Champion
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <th className="text-left py-3 px-3 text-xs font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>
                      #
                    </th>
                    <th className="text-left py-3 px-3 text-xs font-semibold min-w-[6rem]" style={{ color: "rgba(255,255,255,0.45)" }}>
                      Member
                    </th>
                    <th
                      className="text-right py-3 px-1.5 text-xs font-semibold tabular-nums"
                      style={{ color: "rgba(255,255,255,0.45)" }}
                      title="Final guessed (full-time winner)"
                    >
                      FG
                    </th>
                    <th
                      className="text-right py-3 px-1.5 text-xs font-semibold tabular-nums"
                      style={{ color: "rgba(255,255,255,0.45)" }}
                      title="Half-time guessed"
                    >
                      PG
                    </th>
                    <th
                      className="text-right py-3 px-1.5 text-xs font-semibold tabular-nums"
                      style={{ color: "rgba(255,255,255,0.45)" }}
                      title="Correct scores"
                    >
                      SC
                    </th>
                    <th
                      className="text-right py-3 px-1.5 text-xs font-semibold tabular-nums"
                      style={{ color: "rgba(255,255,255,0.45)" }}
                      title="Qualifiers guessed"
                    >
                      CG
                    </th>
                    <th
                      className="text-right py-3 px-1.5 text-xs font-semibold hidden md:table-cell tabular-nums"
                      style={{ color: "rgba(255,255,255,0.45)" }}
                      title="Champion"
                    >
                      CH
                    </th>
                    <th className="text-right py-3 px-3 text-xs font-semibold tabular-nums" style={{ color: "rgba(255,255,255,0.45)" }}>
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
                      <td className="py-3 px-3 text-white font-bold tabular-nums">{row.rank}</td>
                      <td className="py-3 px-3 text-white truncate max-w-[8rem] sm:max-w-none">{row.displayName}</td>
                      <td className="py-3 px-1.5 text-right tabular-nums" style={{ color: "rgba(255,255,255,0.85)" }}>
                        {row.fg}
                      </td>
                      <td className="py-3 px-1.5 text-right tabular-nums" style={{ color: "rgba(255,255,255,0.85)" }}>
                        {row.pg}
                      </td>
                      <td className="py-3 px-1.5 text-right tabular-nums" style={{ color: "rgba(255,255,255,0.85)" }}>
                        {row.sc}
                      </td>
                      <td className="py-3 px-1.5 text-right tabular-nums" style={{ color: "rgba(255,255,255,0.85)" }}>
                        {row.cg}
                      </td>
                      <td className="py-3 px-1.5 text-right tabular-nums hidden md:table-cell" style={{ color: "rgba(255,255,255,0.85)" }}>
                        {row.championPoints}
                      </td>
                      <td className="py-3 px-3 text-right font-bold tabular-nums" style={{ color: "#BEF264" }}>
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
                          initial={predFromSaved(myPreds[m.id])}
                          onSaved={() => {
                            setMsg("Prediction saved.");
                            setErr(null);
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
                          initial={predFromSaved(myPreds[m.id])}
                          onSaved={() => {
                            setMsg("Prediction saved.");
                            setErr(null);
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
                Pick the teams you think reach the Round of 32: 1st and 2nd in each group, plus the eight
                best 3rd‑placed sides (at most three picks from the same group). Points for correct picks (
                {POINTS_QUALIFIER_TEAM}p each) are awarded only once qualifiers are known (all group fixtures
                finished, or the Round of 32 bracket lists 32 teams). The correct champion adds{" "}
                {POINTS_CHAMPION}p after the final.
              </p>
              <p className="text-xs font-medium" style={{ color: "rgba(250,204,21,0.9)" }}>
                You can select at most 3 teams from each group.
              </p>

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
                        return (
                          <label
                            key={id}
                            className="flex items-center gap-3 rounded-xl px-3 py-2 border"
                            style={{
                              borderColor: checked ? "rgba(34,211,238,0.35)" : "rgba(255,255,255,0.08)",
                              backgroundColor: checked ? "rgba(34,211,238,0.08)" : "rgba(0,0,0,0.15)",
                              cursor: cannotAddMore ? "not-allowed" : "pointer",
                              opacity: cannotAddMore ? 0.45 : 1,
                            }}
                            title={
                              cannotAddMore ? "At most 3 teams per group." : undefined
                            }
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={cannotAddMore}
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
                  className="rounded-xl px-4 py-3 text-sm outline-none border"
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
                disabled={pending}
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
  initial,
  onSaved,
  onError,
}: {
  m: FootballDataMatch;
  tournamentId: string;
  initial: MatchPredState;
  onSaved: () => void;
  onError: (msg: string) => void;
}) {
  const [p, setP] = useState<MatchPredState>(initial);
  const [pending, startTransition] = useTransition();
  const finished = m.status === "FINISHED";

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
      ),
    [p, m],
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
            label={`Half-time (+${POINTS_HT}p)`}
            value={p.htOutcome}
            onChange={(v) => setP((s) => ({ ...s, htOutcome: v }))}
            disabled={finished}
          />
          <OutcomeSelect
            label={`Full-time (+${POINTS_FT}p)`}
            value={p.ftOutcome}
            onChange={(v) => setP((s) => ({ ...s, ftOutcome: v }))}
            disabled={finished}
          />
          <label className="flex flex-col gap-1 min-w-0">
            <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.45)" }}>
              Home goals (+{POINTS_CORRECT_SCORE}p)
            </span>
            <input
              type="number"
              min={0}
              disabled={finished}
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
              disabled={finished}
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

        {!finished && (
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
        )}
      </div>
    </div>
  );
}
