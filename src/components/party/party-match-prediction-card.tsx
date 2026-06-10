"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { FootballDataMatch } from "@/lib/football-data";
import { venueLabel } from "@/lib/football-data";
import { formatMatchKickoff } from "@/lib/match-datetime";
import type { MatchOddsRow } from "@/lib/betting-odds";
import { saveWcMatchPrediction } from "@/app/actions/wc-predictions";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatCaughtError } from "@/lib/i18n/errors";
import { POINTS_PER_PREDICTION_CHANGE_AFTER_START } from "@/lib/prediction-window";
import {
  getPredictionLockMessage,
  type PredictionLockedReason,
} from "@/lib/knockout-predictions";
import { computeMatchPoints } from "@/lib/wc-scoring";
import { PotentialPoints } from "@/components/party/potential-points";
import {
  WC_BORDER,
  WC_CARD_GRADIENT,
  WC_CYAN,
  WC_LIME,
  WC_MUTED,
  WC_NAVY,
  WC_TOP_BORDER_GRADIENT,
} from "@/components/world-cup/wc-theme";

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
  { val: "HOME", label: "1" },
  { val: "DRAW", label: "X" },
  { val: "AWAY", label: "2" },
];

function OutcomeButtons({
  label,
  prefix,
  value,
  onChange,
  disabled,
}: {
  label: string;
  prefix: string;
  value: string;
  onChange: (val: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: WC_MUTED }}>
        {label}
      </span>
      <div className="grid grid-cols-3 gap-2">
        {OUTCOMES.map((o) => (
          <button
            key={`${prefix}-${o.val}`}
            type="button"
            disabled={disabled}
            onClick={() => onChange(value === o.val ? "" : o.val)}
            className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            style={{
              backgroundColor: value === o.val ? WC_CYAN : "rgba(255,255,255,0.08)",
              color: value === o.val ? WC_NAVY : WC_MUTED,
              border:
                value === o.val ?
                  "1px solid rgba(34,211,238,0.5)"
                : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export type MatchPredictionSaveInput = {
  htOutcome: string | null;
  ftOutcome: string | null;
  predHomeGoals: number | null;
  predAwayGoals: number | null;
};

function toSaveInput(p: MatchPredState): MatchPredictionSaveInput {
  return {
    htOutcome: p.htOutcome || null,
    ftOutcome: p.ftOutcome || null,
    predHomeGoals: p.predHomeGoals === "" ? null : Number(p.predHomeGoals),
    predAwayGoals: p.predAwayGoals === "" ? null : Number(p.predAwayGoals),
  };
}

export function PartyMatchPredictionCard({
  m,
  tournamentId,
  matchOddsRow,
  initial,
  predictionLockedReason = null,
  midCompetitionPenaltyMode = false,
  onSaved,
  onError,
  registerMatchDraft,
  unregisterMatchDraft,
}: {
  m: FootballDataMatch;
  tournamentId: string;
  matchOddsRow: MatchOddsRow | null;
  initial: MatchPredState;
  predictionLockedReason?: PredictionLockedReason | null;
  midCompetitionPenaltyMode?: boolean;
  onSaved: () => void;
  onError: (msg: string) => void;
  registerMatchDraft?: (
    matchId: number,
    getPayload: () => MatchPredictionSaveInput,
  ) => void;
  unregisterMatchDraft?: (matchId: number) => void;
}) {
  const { t } = useLocale();
  const [p, setP] = useState<MatchPredState>(initial);
  const pRef = useRef(p);
  pRef.current = p;
  const [pending, startTransition] = useTransition();
  const finished = m.status === "FINISHED";
  const formLocked = finished || predictionLockedReason != null;

  useEffect(() => {
    setP(initial);
  }, [
    initial.htOutcome,
    initial.ftOutcome,
    initial.predHomeGoals,
    initial.predAwayGoals,
  ]);

  useEffect(() => {
    if (!registerMatchDraft || formLocked) return;
    registerMatchDraft(m.id, () => toSaveInput(pRef.current));
    return () => unregisterMatchDraft?.(m.id);
  }, [m.id, formLocked, registerMatchDraft, unregisterMatchDraft]);

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
        await saveWcMatchPrediction(tournamentId, m.id, toSaveInput(p));
        onSaved();
      } catch (e) {
        onError(formatCaughtError(e, t));
      }
    });
  }

  return (
    <div
      className="rounded-2xl border overflow-hidden relative"
      style={{
        borderColor: "rgba(34,211,238,0.18)",
        background: WC_CARD_GRADIENT,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px opacity-70"
        style={{ background: WC_TOP_BORDER_GRADIENT }}
      />

      <div className="px-4 py-5 sm:px-6 sm:py-6 flex flex-col gap-5">
        <div className="grid grid-cols-[1fr_minmax(7rem,1.1fr)_1fr] gap-3 sm:gap-5 items-stretch">
          <div className="flex flex-col items-center justify-center gap-2.5 text-center min-w-0 px-2 py-2">
            {hl ?
              <Image
                src={hl}
                alt=""
                width={52}
                height={52}
                className="rounded-xl bg-white/90 p-1 object-contain shrink-0"
                unoptimized
              />
            : (
              <div
                className="w-[52px] h-[52px] rounded-xl shrink-0"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
              />
            )}
            <span className="font-bold text-white text-sm sm:text-base leading-snug break-words">
              {home}
            </span>
          </div>

          <div
            className="flex flex-col items-center justify-center text-center px-3 py-4 rounded-xl min-h-[5.5rem]"
            style={{
              backgroundColor: "rgba(0,0,0,0.28)",
              border: `1px solid ${WC_BORDER}`,
            }}
          >
            {finished && ft?.home != null && ft?.away != null ?
              <div className="font-black text-white text-xl tabular-nums">
                {ft.home}–{ft.away}
                {ht?.home != null && ht?.away != null ?
                  <span className="block text-xs font-medium mt-1" style={{ color: WC_MUTED }}>
                    HT {ht.home}–{ht.away}
                  </span>
                : null}
              </div>
            : (
              <>
                <span
                  className="text-[11px] sm:text-xs font-semibold leading-snug line-clamp-3 px-1"
                  style={{ color: "#67E8F9" }}
                >
                  {venue ?? "Stadion de confirmat"}
                </span>
                <span
                  className="text-[10px] mt-2 font-medium tabular-nums"
                  style={{ color: WC_LIME }}
                >
                  {when} · ora României
                </span>
              </>
            )}
          </div>

          <div className="flex flex-col items-center justify-center gap-2.5 text-center min-w-0 px-2 py-2">
            {al ?
              <Image
                src={al}
                alt=""
                width={52}
                height={52}
                className="rounded-xl bg-white/90 p-1 object-contain shrink-0"
                unoptimized
              />
            : (
              <div
                className="w-[52px] h-[52px] rounded-xl shrink-0"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
              />
            )}
            <span className="font-bold text-white text-sm sm:text-base leading-snug break-words">
              {away}
            </span>
          </div>
        </div>

        {predictionLockedReason === "ko_pending" && (
          <div
            className="rounded-xl border px-4 py-3 text-sm flex items-start gap-3"
            style={{
              borderColor: "rgba(251,191,36,0.35)",
              backgroundColor: "rgba(120,53,15,0.22)",
              color: "rgba(254,243,199,0.95)",
            }}
          >
            <span className="text-lg shrink-0" aria-hidden>
              🔒
            </span>
            <p>{getPredictionLockMessage("ko_pending")}</p>
          </div>
        )}

        {predictionLockedReason && predictionLockedReason !== "ko_pending" && (
          <p className="text-sm text-amber-200/90">
            {getPredictionLockMessage(predictionLockedReason)}
          </p>
        )}

        {!formLocked && (
          <>
            <PotentialPoints
              ht={p.htOutcome}
              ft={p.ftOutcome}
              hg={p.predHomeGoals}
              ag={p.predAwayGoals}
              matchOdds={matchOddsRow}
            />

            <div className="grid sm:grid-cols-2 gap-4">
              <OutcomeButtons
                label={t("party.match.halfTime")}
                prefix="ht"
                value={p.htOutcome}
                disabled={pending}
                onChange={(val) => setP((s) => ({ ...s, htOutcome: val }))}
              />
              <OutcomeButtons
                label={t("party.match.fullTime")}
                prefix="ft"
                value={p.ftOutcome}
                disabled={pending}
                onChange={(val) => setP((s) => ({ ...s, ftOutcome: val }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: WC_MUTED }}>
                {t("party.exactScore")}
              </span>
              <div className="flex items-center justify-center gap-4">
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px]" style={{ color: WC_MUTED }}>
                    {t("party.match.home")}
                  </span>
                  <input
                    value={p.predHomeGoals}
                    onChange={(e) =>
                      setP((s) => ({
                        ...s,
                        predHomeGoals: e.target.value.replace(/\D/g, ""),
                      }))
                    }
                    maxLength={2}
                    placeholder="0"
                    className="w-12 h-12 text-lg text-center rounded-xl border outline-none font-bold"
                    style={{
                      backgroundColor: WC_NAVY,
                      borderColor: WC_BORDER,
                      color: "#fff",
                    }}
                  />
                </div>
                <span className="text-xl font-bold mt-5" style={{ color: WC_MUTED }}>
                  –
                </span>
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px]" style={{ color: WC_MUTED }}>
                    {t("party.match.away")}
                  </span>
                  <input
                    value={p.predAwayGoals}
                    onChange={(e) =>
                      setP((s) => ({
                        ...s,
                        predAwayGoals: e.target.value.replace(/\D/g, ""),
                      }))
                    }
                    maxLength={2}
                    placeholder="0"
                    className="w-12 h-12 text-lg text-center rounded-xl border outline-none font-bold"
                    style={{
                      backgroundColor: WC_NAVY,
                      borderColor: WC_BORDER,
                      color: "#fff",
                    }}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className="w-full sm:w-auto sm:self-end px-8 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 cursor-pointer hover:opacity-90 active:scale-[0.98]"
              style={{ backgroundColor: WC_LIME, color: WC_NAVY }}
            >
              {pending ? t("party.savingPrediction") : t("party.savePrediction")}
            </button>

            {midCompetitionPenaltyMode && (
              <p className="text-[11px]" style={{ color: "rgba(253,224,71,0.88)" }}>
                {t("party.match.changePenaltyHint", {
                  points: POINTS_PER_PREDICTION_CHANGE_AFTER_START,
                })}
              </p>
            )}
          </>
        )}

        {finished && (
          <p className="text-sm" style={{ color: WC_MUTED }}>
            {t("party.match.points")}:{" "}
            <span className="font-bold" style={{ color: WC_LIME }}>
              {breakdown.total}
            </span>{" "}
            {t("party.match.pointsDetail", {
              htLabel: t("party.lb.ht"),
              halfTime: breakdown.halfTime,
              ftLabel: t("party.lb.ft"),
              fullTime: breakdown.fullTime,
              correctScore: breakdown.correctScore,
            })}
          </p>
        )}
      </div>
    </div>
  );
}
