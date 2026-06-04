"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { FootballDataMatch } from "@/lib/football-data";
import { venueLabel } from "@/lib/football-data";
import { formatMatchKickoff } from "@/lib/match-datetime";
import type { MatchOddsRow } from "@/lib/betting-odds";
import { saveWcMatchPrediction } from "@/app/actions/wc-predictions";
import { POINTS_PER_PREDICTION_CHANGE_AFTER_START } from "@/lib/prediction-window";
import { computeMatchPoints } from "@/lib/wc-scoring";
import { PotentialPoints } from "@/components/party/potential-points";

const NAVY = "#0F172A";
const CYAN = "#22D3EE";
const LIME = "#BEF264";
const MUTED = "rgba(255,255,255,0.45)";
const BORDER = "rgba(255,255,255,0.08)";

export type MatchPredState = {
  htOutcome: string;
  ftOutcome: string;
  predHomeGoals: string;
  predAwayGoals: string;
};

export function emptyMatchPred(): MatchPredState {
  return {
    htOutcome: "",
    ftOutcome: "",
    predHomeGoals: "",
    predAwayGoals: "",
  };
}

export function predFromSaved(
  p:
    | {
        htOutcome?: string | null;
        ftOutcome?: string | null;
        predHomeGoals?: number | null;
        predAwayGoals?: number | null;
      }
    | undefined,
): MatchPredState {
  if (!p) return emptyMatchPred();
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

const OUTCOMES: { val: string; label: string }[] = [
  { val: "HOME", label: "H" },
  { val: "DRAW", label: "D" },
  { val: "AWAY", label: "A" },
];

export function PartyMatchPredictionCard({
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

  function handleSave() {
    startTransition(async () => {
      try {
        await saveWcMatchPrediction(tournamentId, m.id, {
          htOutcome: p.htOutcome || null,
          ftOutcome: p.ftOutcome || null,
          predHomeGoals: p.predHomeGoals === "" ? null : Number(p.predHomeGoals),
          predAwayGoals: p.predAwayGoals === "" ? null : Number(p.predAwayGoals),
        });
        onSaved();
      } catch (e) {
        onError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div
      className="rounded-xl border p-3 flex flex-col gap-2"
      style={{ backgroundColor: NAVY, borderColor: BORDER }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {hl ?
            <Image
              src={hl}
              alt=""
              width={28}
              height={28}
              className="rounded-md bg-white/90 p-0.5 object-contain shrink-0"
              unoptimized
            />
          : null}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white truncate">{home}</span>
              <span className="text-xs" style={{ color: MUTED }}>vs</span>
              <span className="text-sm font-semibold text-white truncate">{away}</span>
            </div>
            <div className="text-xs mt-0.5" style={{ color: MUTED }}>
              {venue ? `${venue} · ` : ""}
              {when}
            </div>
          </div>
          {al ?
            <Image
              src={al}
              alt=""
              width={28}
              height={28}
              className="rounded-md bg-white/90 p-0.5 object-contain shrink-0 ml-auto"
              unoptimized
            />
          : null}
        </div>
        <div className="text-right shrink-0">
          {finished && ft?.home != null && ft?.away != null ?
            <div className="font-bold text-white text-sm">
              {ft.home}–{ft.away}
              {ht?.home != null && ht?.away != null ?
                <span className="ml-1 text-xs" style={{ color: MUTED }}>
                  ({ht.home}–{ht.away})
                </span>
              : null}
            </div>
          : null}
        </div>
      </div>

      <PotentialPoints
        ht={p.htOutcome}
        ft={p.ftOutcome}
        hg={p.predHomeGoals}
        ag={p.predAwayGoals}
        matchOdds={matchOddsRow}
      />

      {!formLocked && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            <span className="text-xs self-center" style={{ color: MUTED }}>HT</span>
            {OUTCOMES.map((o) => (
              <button
                key={`ht-${o.val}`}
                type="button"
                onClick={() =>
                  setP((s) => ({ ...s, htOutcome: s.htOutcome === o.val ? "" : o.val }))
                }
                className="px-2 py-0.5 rounded text-xs font-medium transition-all cursor-pointer"
                style={{
                  backgroundColor: p.htOutcome === o.val ? CYAN : "rgba(255,255,255,0.08)",
                  color: p.htOutcome === o.val ? NAVY : MUTED,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <span className="text-xs self-center" style={{ color: MUTED }}>FT</span>
            {OUTCOMES.map((o) => (
              <button
                key={`ft-${o.val}`}
                type="button"
                onClick={() =>
                  setP((s) => ({ ...s, ftOutcome: s.ftOutcome === o.val ? "" : o.val }))
                }
                className="px-2 py-0.5 rounded text-xs font-medium transition-all cursor-pointer"
                style={{
                  backgroundColor: p.ftOutcome === o.val ? CYAN : "rgba(255,255,255,0.08)",
                  color: p.ftOutcome === o.val ? NAVY : MUTED,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <input
              value={p.predHomeGoals}
              onChange={(e) =>
                setP((s) => ({ ...s, predHomeGoals: e.target.value.replace(/\D/g, "") }))
              }
              maxLength={2}
              placeholder="H"
              className="w-8 text-center text-xs rounded border py-0.5 outline-none"
              style={{ backgroundColor: NAVY, borderColor: BORDER, color: "#fff" }}
            />
            <span style={{ color: MUTED }}>–</span>
            <input
              value={p.predAwayGoals}
              onChange={(e) =>
                setP((s) => ({ ...s, predAwayGoals: e.target.value.replace(/\D/g, "") }))
              }
              maxLength={2}
              placeholder="A"
              className="w-8 text-center text-xs rounded border py-0.5 outline-none"
              style={{ backgroundColor: NAVY, borderColor: BORDER, color: "#fff" }}
            />
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="px-3 py-0.5 rounded text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer hover:opacity-90 active:scale-95 ml-auto"
            style={{ backgroundColor: LIME, color: NAVY }}
          >
            {pending ? "…" : "Salvează"}
          </button>
        </div>
      )}

      {formLocked && !finished && (
        <p className="text-xs text-amber-200/90">
          Pronosticurile sunt blocate după startul competiției.
        </p>
      )}

      {!finished && !predictionsReadOnly && midCompetitionPenaltyMode && (
        <p className="text-[11px]" style={{ color: "rgba(253,224,71,0.88)" }}>
          O schimbare față de pronosticul salvat costă {POINTS_PER_PREDICTION_CHANGE_AFTER_START} puncte.
        </p>
      )}

      {finished && (
        <p className="text-xs" style={{ color: MUTED }}>
          Puncte:{" "}
          <span className="font-bold" style={{ color: LIME }}>
            {breakdown.total}
          </span>{" "}
          (HT {breakdown.halfTime}, FT {breakdown.fullTime}, scor {breakdown.correctScore})
        </p>
      )}
    </div>
  );
}
