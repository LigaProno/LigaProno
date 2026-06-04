"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  initLiga1Fixtures,
  resetLiga1Fixtures,
  refreshLiga1BettingOdds,
  saveLiga1MatchPrediction,
  saveLiga1ExtraPrediction,
  fetchLiga1ResultsNow,
} from "@/app/actions/liga1";
import type { Liga1FixtureForScoring } from "@/lib/liga1-scoring";
import type { Liga1UserTotals } from "@/lib/liga1-scoring";
import { formatMatchKickoff } from "@/lib/match-datetime";
import type { MatchOddsRow } from "@/lib/betting-odds";
import { PotentialPoints } from "@/components/party/potential-points";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Liga1LeaderboardRow = {
  rank: number;
  userId: string;
  displayName: string;
  fg: number;
  pg: number;
  sc: number;
  top4: number;
  championPoints: number;
  changePenalty: number;
  total: number;
  championPickName: string | null;
};

export type Liga1Team = { id: number; name: string; shortName: string };

type Props = {
  tournamentId: string;
  tournamentName: string;
  inviteCode: string;
  competition: string;
  isCreator: boolean;
  currentUserId: string;
  fixturesInitialised: boolean;
  fixtures: Liga1FixtureForScoring[];
  leaderboard: Liga1LeaderboardRow[];
  myPreds: Record<number, { htOutcome: string | null; ftOutcome: string | null; predHomeGoals: number | null; predAwayGoals: number | null }>;
  myExtra: { advancingTeamIds: number[]; championTeamId: number | null } | null;
  allTeams: Liga1Team[];
  competitionUnderway: boolean;
  allowPredictionChangesDuringCompetition: boolean;
  bettingOddsByMatchId: Record<string, MatchOddsRow>;
  bettingOddsFetchedAt: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NAVY = "#0F172A";
const CYAN = "#22D3EE";
const LIME = "#BEF264";
const MUTED = "rgba(255,255,255,0.45)";
const BORDER = "rgba(255,255,255,0.08)";
const CARD = "#1E293B";

function outcomeLabel(o: string | null) {
  if (o === "HOME") return "H";
  if (o === "DRAW") return "D";
  if (o === "AWAY") return "A";
  return "—";
}

function statusColor(status: string) {
  if (status === "FINISHED") return "#4ade80";
  if (status === "IN_PLAY") return CYAN;
  if (status === "PAUSED") return "#fb923c";
  if (status === "PENDING") return "#fbbf24";
  return MUTED;
}

function statusLabel(status: string) {
  if (status === "FINISHED") return "FT";
  if (status === "IN_PLAY") return "Live";
  if (status === "PAUSED") return "HT";
  if (status === "PENDING") return "...";
  return "–";
}

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

function Leaderboard({ rows, currentUserId }: { rows: Liga1LeaderboardRow[]; currentUserId: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ color: MUTED, borderBottom: `1px solid ${BORDER}` }}>
            <th className="text-left py-2 pr-3 font-medium">#</th>
            <th className="text-left py-2 pr-3 font-medium">Player</th>
            <th className="text-right py-2 px-2 font-medium">FG</th>
            <th className="text-right py-2 px-2 font-medium">PG</th>
            <th className="text-right py-2 px-2 font-medium">SC</th>
            <th className="text-right py-2 px-2 font-medium">T4</th>
            <th className="text-right py-2 px-2 font-medium">CH</th>
            <th className="text-right py-2 px-2 font-medium">Pen</th>
            <th className="text-right py-2 pl-2 font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.userId}
              style={{
                borderBottom: `1px solid ${BORDER}`,
                backgroundColor: r.userId === currentUserId ? "rgba(34,211,238,0.06)" : "transparent",
              }}
            >
              <td className="py-2 pr-3 font-bold" style={{ color: r.rank <= 3 ? CYAN : MUTED }}>
                {r.rank}
              </td>
              <td className="py-2 pr-3" style={{ color: r.userId === currentUserId ? CYAN : "#ffffff" }}>
                {r.displayName}
                {r.championPickName && (
                  <span className="ml-1 text-xs" style={{ color: MUTED }}>({r.championPickName})</span>
                )}
              </td>
              <td className="py-2 px-2 text-right tabular-nums" style={{ color: MUTED }}>{r.fg}</td>
              <td className="py-2 px-2 text-right tabular-nums" style={{ color: MUTED }}>{r.pg}</td>
              <td className="py-2 px-2 text-right tabular-nums" style={{ color: MUTED }}>{r.sc}</td>
              <td className="py-2 px-2 text-right tabular-nums" style={{ color: MUTED }}>{r.top4}</td>
              <td className="py-2 px-2 text-right tabular-nums" style={{ color: MUTED }}>{r.championPoints}</td>
              <td className="py-2 px-2 text-right tabular-nums" style={{ color: r.changePenalty > 0 ? "#f87171" : MUTED }}>
                {r.changePenalty > 0 ? `-${r.changePenalty}` : "—"}
              </td>
              <td className="py-2 pl-2 text-right tabular-nums font-bold" style={{ color: LIME }}>{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fixture card with inline prediction
// ---------------------------------------------------------------------------

function FixtureCard({
  fixture,
  saved,
  locked,
  matchOdds,
  onSave,
}: {
  fixture: Liga1FixtureForScoring;
  saved: Props["myPreds"][number] | undefined;
  locked: boolean;
  matchOdds: MatchOddsRow | null | undefined;
  onSave: (matchId: number, pred: { htOutcome: string | null; ftOutcome: string | null; predHomeGoals: number | null; predAwayGoals: number | null }) => void;
}) {
  const [ht, setHt] = useState<string>(saved?.htOutcome ?? "");
  const [ft, setFt] = useState<string>(saved?.ftOutcome ?? "");
  const [hg, setHg] = useState<string>(saved?.predHomeGoals?.toString() ?? "");
  const [ag, setAg] = useState<string>(saved?.predAwayGoals?.toString() ?? "");
  const [saving, startSave] = useTransition();

  const finished = fixture.status === "FINISHED";
  const hasResult = fixture.ftHome != null && fixture.ftAway != null;
  const hasLiveScore = !hasResult && fixture.htHome != null && fixture.htAway != null;

  function handleSave() {
    startSave(() => {
      onSave(fixture.internalMatchId, {
        htOutcome: (["HOME", "DRAW", "AWAY"].includes(ht) ? ht : null),
        ftOutcome: (["HOME", "DRAW", "AWAY"].includes(ft) ? ft : null),
        predHomeGoals: hg !== "" && !isNaN(Number(hg)) ? Number(hg) : null,
        predAwayGoals: ag !== "" && !isNaN(Number(ag)) ? Number(ag) : null,
      });
    });
  }

  const outcomes: { val: string; label: string }[] = [
    { val: "HOME", label: "H" },
    { val: "DRAW", label: "D" },
    { val: "AWAY", label: "A" },
  ];

  return (
    <div
      className="rounded-xl border p-3 flex flex-col gap-2"
      style={{ backgroundColor: NAVY, borderColor: BORDER }}
    >
      {/* Header: teams + score */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white truncate">{fixture.homeTeamName}</span>
            <span className="text-xs" style={{ color: MUTED }}>vs</span>
            <span className="text-sm font-semibold text-white truncate">{fixture.awayTeamName}</span>
          </div>
          <div className="text-xs mt-0.5" style={{ color: MUTED }}>
            MD {fixture.matchday} · {formatMatchKickoff(typeof fixture.utcDate === "string" ? fixture.utcDate : fixture.utcDate.toISOString())}
          </div>
        </div>
        <div className="text-right shrink-0">
          {hasResult ? (
            <div className="font-bold text-white text-sm">
              {fixture.ftHome}–{fixture.ftAway}
              {fixture.htHome != null && (
                <span className="ml-1 text-xs" style={{ color: MUTED }}>
                  ({fixture.htHome}–{fixture.htAway})
                </span>
              )}
            </div>
          ) : hasLiveScore ? (
            <div className="flex flex-col items-end gap-0.5">
              <div className="font-bold text-white text-sm">
                {fixture.htHome}–{fixture.htAway}
              </div>
              <span className="text-xs font-medium" style={{ color: statusColor(fixture.status) }}>
                {statusLabel(fixture.status)}
              </span>
            </div>
          ) : (
            <span className="text-xs font-medium" style={{ color: statusColor(fixture.status) }}>
              {statusLabel(fixture.status)}
            </span>
          )}
        </div>
      </div>

      {/* Odds + potential points preview */}
      <PotentialPoints ht={ht} ft={ft} hg={hg} ag={ag} matchOdds={matchOdds} />

      {/* Prediction row */}
      {!locked && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            <span className="text-xs self-center" style={{ color: MUTED }}>HT</span>
            {outcomes.map((o) => (
              <button
                key={o.val}
                onClick={() => setHt(ht === o.val ? "" : o.val)}
                className="px-2 py-0.5 rounded text-xs font-medium transition-all cursor-pointer"
                style={{
                  backgroundColor: ht === o.val ? CYAN : "rgba(255,255,255,0.08)",
                  color: ht === o.val ? NAVY : MUTED,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <span className="text-xs self-center" style={{ color: MUTED }}>FT</span>
            {outcomes.map((o) => (
              <button
                key={o.val}
                onClick={() => setFt(ft === o.val ? "" : o.val)}
                className="px-2 py-0.5 rounded text-xs font-medium transition-all cursor-pointer"
                style={{
                  backgroundColor: ft === o.val ? CYAN : "rgba(255,255,255,0.08)",
                  color: ft === o.val ? NAVY : MUTED,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <input
              value={hg}
              onChange={(e) => setHg(e.target.value.replace(/\D/g, ""))}
              maxLength={2}
              placeholder="H"
              className="w-8 text-center text-xs rounded border py-0.5 outline-none"
              style={{ backgroundColor: NAVY, borderColor: BORDER, color: "#fff" }}
            />
            <span style={{ color: MUTED }}>–</span>
            <input
              value={ag}
              onChange={(e) => setAg(e.target.value.replace(/\D/g, ""))}
              maxLength={2}
              placeholder="A"
              className="w-8 text-center text-xs rounded border py-0.5 outline-none"
              style={{ backgroundColor: NAVY, borderColor: BORDER, color: "#fff" }}
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-0.5 rounded text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer hover:opacity-90 active:scale-95 ml-auto"
            style={{ backgroundColor: LIME, color: NAVY }}
          >
            {saving ? "…" : "Save"}
          </button>
        </div>
      )}

      {/* Show saved pred if locked */}
      {locked && saved && (
        <div className="flex gap-3 text-xs" style={{ color: MUTED }}>
          <span>HT: <span className="text-white">{outcomeLabel(saved.htOutcome)}</span></span>
          <span>FT: <span className="text-white">{outcomeLabel(saved.ftOutcome)}</span></span>
          {saved.predHomeGoals != null && saved.predAwayGoals != null && (
            <span>Score: <span className="text-white">{saved.predHomeGoals}–{saved.predAwayGoals}</span></span>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Extra predictions (Top 4 + Champion)
// ---------------------------------------------------------------------------

function ExtraPredictions({
  teams,
  myExtra,
  locked,
  onSave,
}: {
  teams: Liga1Team[];
  myExtra: Props["myExtra"];
  locked: boolean;
  onSave: (top4: number[], champion: number | null) => void;
}) {
  const [top4, setTop4] = useState<number[]>(myExtra?.advancingTeamIds ?? []);
  const [champion, setChampion] = useState<number | null>(myExtra?.championTeamId ?? null);
  const [saving, startSave] = useTransition();

  function toggleTop4(id: number) {
    setTop4((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev,
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-white mb-2">Top 4 (select exactly 4 teams)</h3>
        <div className="grid grid-cols-2 gap-2">
          {teams.map((t) => (
            <button
              key={t.id}
              disabled={locked}
              onClick={() => toggleTop4(t.id)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-left transition-all disabled:cursor-default cursor-pointer"
              style={{
                backgroundColor: top4.includes(t.id) ? CYAN : CARD,
                color: top4.includes(t.id) ? NAVY : "#fff",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: top4.includes(t.id) ? CYAN : BORDER,
                opacity: locked ? 0.7 : 1,
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
        <p className="text-xs mt-1.5" style={{ color: MUTED }}>
          {top4.length}/4 selected
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-white mb-2">Liga 1 Champion</h3>
        <div className="grid grid-cols-2 gap-2">
          {teams.map((t) => (
            <button
              key={t.id}
              disabled={locked}
              onClick={() => setChampion(champion === t.id ? null : t.id)}
              className="px-3 py-2 rounded-lg text-sm font-medium text-left transition-all disabled:cursor-default cursor-pointer"
              style={{
                backgroundColor: champion === t.id ? LIME : CARD,
                color: champion === t.id ? NAVY : "#fff",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: champion === t.id ? LIME : BORDER,
                opacity: locked ? 0.7 : 1,
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {!locked && (
        <button
          disabled={saving || top4.length !== 4}
          onClick={() => startSave(() => onSave(top4, champion))}
          className="w-full py-2.5 rounded-xl font-bold text-sm transition-all disabled:opacity-50 cursor-pointer hover:opacity-90 active:scale-[0.98]"
          style={{ backgroundColor: CYAN, color: NAVY }}
        >
          {saving ? "Saving…" : "Save Extra Predictions"}
        </button>
      )}

      {locked && (
        <div className="text-sm rounded-xl px-4 py-3" style={{ backgroundColor: CARD, color: MUTED }}>
          Extra predictions are locked (competition started).
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------

export default function PartyLiga1Dashboard(props: Props) {
  const {
    tournamentId,
    tournamentName,
    inviteCode,
    isCreator,
    currentUserId,
    fixturesInitialised,
    fixtures,
    leaderboard,
    myPreds,
    myExtra,
    allTeams,
    competitionUnderway,
    allowPredictionChangesDuringCompetition,
    bettingOddsByMatchId,
    bettingOddsFetchedAt,
  } = props;

  const router = useRouter();
  const [tab, setTab] = useState<"leaderboard" | "fixtures" | "extra">("leaderboard");
  const [adminMsg, setAdminMsg] = useState<string | null>(null);
  const [adminPending, startAdmin] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (adminPending) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [adminPending]);

  // Group fixtures by matchday
  const byMatchday = fixtures.reduce<Map<number, Liga1FixtureForScoring[]>>((acc, f) => {
    const arr = acc.get(f.matchday) ?? [];
    arr.push(f);
    acc.set(f.matchday, arr);
    return acc;
  }, new Map());
  const matchdays = [...byMatchday.keys()].sort((a, b) => a - b);

  function handleSaveMatch(
    matchId: number,
    pred: { htOutcome: string | null; ftOutcome: string | null; predHomeGoals: number | null; predAwayGoals: number | null },
  ) {
    saveLiga1MatchPrediction(tournamentId, matchId, pred)
      .then(() => router.refresh())
      .catch((e: unknown) => setErrorMsg(e instanceof Error ? e.message : "Error saving prediction."));
  }

  function handleSaveExtra(top4: number[], champion: number | null) {
    saveLiga1ExtraPrediction(tournamentId, top4, champion)
      .then(() => router.refresh())
      .catch((e: unknown) => setErrorMsg(e instanceof Error ? e.message : "Error saving extra prediction."));
  }

  function adminAction(fn: () => Promise<string>) {
    setAdminMsg(null);
    setErrorMsg(null);
    startAdmin(async () => {
      try {
        const msg = await fn();
        setAdminMsg(msg);
        router.refresh();
      } catch (e: unknown) {
        setErrorMsg(e instanceof Error ? e.message : "Error.");
      }
    });
  }

  const extraLocked = competitionUnderway && !allowPredictionChangesDuringCompetition;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-white">{tournamentName}</h1>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full border"
            style={{ color: "#fb923c", borderColor: "rgba(251,146,60,0.4)", backgroundColor: "rgba(251,146,60,0.1)" }}
          >
            experimental
          </span>
        </div>
        <p className="text-sm" style={{ color: MUTED }}>
          Liga 1 România 2025-26 · Code:{" "}
          <span className="font-mono font-bold" style={{ color: CYAN }}>{inviteCode}</span>
        </p>
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="rounded-xl border px-4 py-3 text-sm text-red-300" style={{ borderColor: "rgba(248,113,113,0.35)", backgroundColor: "rgba(127,29,29,0.25)" }}>
          {errorMsg}
        </div>
      )}

      {/* Admin panel */}
      {isCreator && (
        <div className="rounded-2xl border p-4 flex flex-col gap-3" style={{ borderColor: BORDER, backgroundColor: CARD }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: MUTED }}>Admin</p>
          {adminMsg && <p className="text-sm" style={{ color: LIME }}>{adminMsg}</p>}
          <div className="flex flex-wrap gap-2">
            {!fixturesInitialised ? (
              <button
                disabled={adminPending}
                onClick={() =>
                  adminAction(async () => {
                    const r = await initLiga1Fixtures(tournamentId);
                    return `Loaded ${r.fixtureCount} fixtures for ${r.teamCount} teams.`;
                  })
                }
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer hover:opacity-90 active:scale-95"
                style={{ backgroundColor: CYAN, color: NAVY }}
              >
                {adminPending ? `Loading… ${elapsed}s` : "Load Today's Fixtures"}
              </button>
            ) : (
              <button
                disabled={adminPending}
                onClick={() =>
                  adminAction(async () => {
                    await resetLiga1Fixtures(tournamentId);
                    return "Fixtures reset. Click Load Fixtures to reload.";
                  })
                }
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer hover:opacity-90 active:scale-95"
                style={{ backgroundColor: "rgba(248,113,113,0.15)", color: "#f87171", border: "1px solid rgba(248,113,113,0.3)" }}
              >
                Reset Fixtures
              </button>
            )}
            <button
              disabled={adminPending || !fixturesInitialised}
              onClick={() =>
                adminAction(async () => {
                  const r = await refreshLiga1BettingOdds(tournamentId);
                  return `Odds refreshed: ${r.matchCount} matches, ${r.teamCount} teams (${r.model}).`;
                })
              }
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "rgba(190,242,100,0.15)", color: LIME, border: "1px solid rgba(190,242,100,0.3)" }}
            >
              {adminPending ? "…" : "Refresh Odds (Gemini)"}
            </button>
            <button
              disabled={adminPending || !fixturesInitialised}
              onClick={() =>
                adminAction(async () => {
                  const r = await fetchLiga1ResultsNow(tournamentId);
                  return `Results fetched: ${r.updated} updated, ${r.pending} still pending.`;
                })
              }
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 cursor-pointer hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "rgba(34,211,238,0.12)", color: CYAN, border: `1px solid rgba(34,211,238,0.3)` }}
            >
              {adminPending ? "…" : "Fetch Results (Gemini)"}
            </button>
          </div>
          {adminPending && elapsed > 8 && (
            <p className="text-xs" style={{ color: "#fb923c" }}>
              Gemini is searching the web for today&apos;s fixtures — should finish in ~20s. Don&apos;t close the tab.
            </p>
          )}
          {bettingOddsFetchedAt && (
            <p className="text-xs" style={{ color: MUTED }}>
              Odds last updated: {new Date(bettingOddsFetchedAt).toLocaleString()}
            </p>
          )}
        </div>
      )}

      {/* No fixtures yet */}
      {!fixturesInitialised && (
        <div className="rounded-2xl border px-4 py-8 text-center" style={{ borderColor: BORDER, backgroundColor: CARD }}>
          <p className="text-white font-medium">Fixtures not loaded yet.</p>
          <p className="text-sm mt-1" style={{ color: MUTED }}>
            {isCreator ? "Use the admin panel above to load fixtures via Gemini." : "The creator needs to initialise fixtures first."}
          </p>
        </div>
      )}

      {/* Tab nav */}
      {fixturesInitialised && (
        <>
          <div className="flex gap-1 rounded-xl p-1" style={{ backgroundColor: CARD }}>
            {(["leaderboard", "fixtures", "extra"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer capitalize"
                style={{
                  backgroundColor: tab === t ? NAVY : "transparent",
                  color: tab === t ? "#fff" : MUTED,
                }}
              >
                {t === "extra" ? "Top 4 & Champion" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Leaderboard */}
          {tab === "leaderboard" && (
            <div className="rounded-2xl border p-4" style={{ borderColor: BORDER, backgroundColor: CARD }}>
              {leaderboard.length === 0 ? (
                <p className="text-sm text-center" style={{ color: MUTED }}>No members yet.</p>
              ) : (
                <Leaderboard rows={leaderboard} currentUserId={currentUserId} />
              )}
            </div>
          )}

          {/* Fixtures by matchday */}
          {tab === "fixtures" && (
            <div className="flex flex-col gap-4">
              {matchdays.map((md) => (
                <div key={md}>
                  <h2 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: MUTED }}>
                    Matchday {md}
                  </h2>
                  <div className="flex flex-col gap-2">
                    {(byMatchday.get(md) ?? []).map((f) => {
                      const kickoff = typeof f.utcDate === "string" ? new Date(f.utcDate) : f.utcDate;
                      const matchStarted =
                        new Date() >= kickoff || ["IN_PLAY", "PAUSED", "FINISHED"].includes(f.status);
                      const locked = matchStarted && !allowPredictionChangesDuringCompetition;
                      return (
                        <FixtureCard
                          key={f.internalMatchId}
                          fixture={f}
                          saved={myPreds[f.internalMatchId]}
                          locked={locked}
                          matchOdds={bettingOddsByMatchId[String(f.internalMatchId)] ?? null}
                          onSave={handleSaveMatch}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Extra predictions */}
          {tab === "extra" && (
            <div className="rounded-2xl border p-4" style={{ borderColor: BORDER, backgroundColor: CARD }}>
              {allTeams.length === 0 ? (
                <p className="text-sm" style={{ color: MUTED }}>Teams will appear once fixtures are loaded.</p>
              ) : (
                <ExtraPredictions
                  teams={allTeams}
                  myExtra={myExtra}
                  locked={extraLocked}
                  onSave={handleSaveExtra}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
