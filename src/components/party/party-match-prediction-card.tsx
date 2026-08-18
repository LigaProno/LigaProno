"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { FootballDataMatch } from "@/lib/football-data-types";
import { venueLabel } from "@/lib/football-data-helpers";
import { formatMatchKickoff } from "@/lib/match-datetime";
import type { MatchOddsRow } from "@/lib/betting-odds";
import { saveWcMatchPrediction } from "@/app/actions/wc-predictions";
import { useLocale } from "@/components/i18n/locale-provider";
import { formatCaughtError } from "@/lib/i18n/errors";
import type { PredictionLockedReason } from "@/lib/knockout-predictions";
import { getPredictionLockMessage } from "@/lib/knockout-predictions";
import { getMatchScoreAfter90 } from "@/lib/match-score";
import { computeMatchPoints } from "@/lib/wc-scoring";
import { PotentialPoints } from "@/components/party/potential-points";
import { MatchInsightsModal } from "@/components/party/match-insights-modal";
import { formatTeamDisplayName } from "@/lib/team-display";
import { isFtOutcomeConsistentWithExactScore } from "@/lib/prediction-consistency";
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
  return { htOutcome: "", ftOutcome: "", predHomeGoals: "", predAwayGoals: "" };
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
                  "1px solid rgba(59,130,246,0.5)"
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
  predAdvancingTeamId: null;
};

function toSaveInput(p: MatchPredState): MatchPredictionSaveInput {
  return {
    htOutcome: p.htOutcome || null,
    ftOutcome: p.ftOutcome || null,
    predHomeGoals: p.predHomeGoals === "" ? null : Number(p.predHomeGoals),
    predAwayGoals: p.predAwayGoals === "" ? null : Number(p.predAwayGoals),
    predAdvancingTeamId: null,
  };
}

export function PartyMatchPredictionCard({
  m,
  tournamentId,
  matchOddsRow,
  initial,
  predictionLockedReason = null,
  competition = null,
  hideOddsUnavailable = false,
  displayMatchday = null,
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
  competition?: string | null;
  hideOddsUnavailable?: boolean;
  displayMatchday?: number | null;
  onSaved: () => void;
  onError: (msg: string) => void;
  registerMatchDraft?: (
    matchId: number,
    getPayload: () => MatchPredictionSaveInput,
  ) => void;
  unregisterMatchDraft?: (matchId: number) => void;
}) {
  const { t, locale } = useLocale();
  const [p, setP] = useState<MatchPredState>(initial);
  const pRef = useRef(p);
  pRef.current = p;
  // Scorurile au o singură cifră (nimeni nu pronostichează 2 cifre la fotbal),
  // așa că după prima cifră din „gazde" sărim automat la „oaspeți".
  const awayGoalsRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [insightsOpen, setInsightsOpen] = useState(false);
  const finished = isMatchSettled(m);
  const statusBadge = matchStatusBadge(m);
  const formLocked = finished || predictionLockedReason != null;
  const officialMatchday = m.matchday ?? 0;
  const rescheduledFrom =
    displayMatchday != null &&
    officialMatchday > 0 &&
    officialMatchday !== displayMatchday
      ? officialMatchday
      : null;

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
  const home = formatTeamDisplayName(m.homeTeam);
  const away = formatTeamDisplayName(m.awayTeam);
  const homeId = m.homeTeam.id;
  const awayId = m.awayTeam.id;
  const hl = m.homeTeam.crest;
  const al = m.awayTeam.crest;
  const ft90 = getMatchScoreAfter90(m);
  const ht = m.score?.halfTime;
  const homeGoalsNum = p.predHomeGoals === "" ? null : Number(p.predHomeGoals);
  const awayGoalsNum = p.predAwayGoals === "" ? null : Number(p.predAwayGoals);
  const scoreConflictsFt = !isFtOutcomeConsistentWithExactScore(
    p.ftOutcome || null,
    homeGoalsNum,
    awayGoalsNum,
  );

  void locale;

  function handleSave() {
    if (scoreConflictsFt) {
      onError(t("errors.scoreFtMismatch"));
      return;
    }
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
        borderColor: "rgba(59,130,246,0.18)",
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
            {finished && ft90 ?
              <div className="font-black text-white text-xl tabular-nums">
                {ft90.home}–{ft90.away}
                {ht?.home != null && ht?.away != null ?
                  <span className="block text-xs font-medium mt-1" style={{ color: WC_MUTED }}>
                    HT {ht.home}–{ht.away}
                  </span>
                : null}
              </div>
            : (
              <>
                {statusBadge?.tone === "postponed" || statusBadge?.tone === "cancelled" ? (
                  <span
                    className="text-[11px] sm:text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-md mb-1"
                    style={{
                      backgroundColor:
                        statusBadge.tone === "postponed"
                          ? "rgba(251,191,36,0.15)"
                          : "rgba(255,255,255,0.08)",
                      color:
                        statusBadge.tone === "postponed" ? "#FBBF24" : "rgba(255,255,255,0.55)",
                    }}
                  >
                    {statusBadge.label}
                  </span>
                ) : (
                  <span
                    className="text-[11px] sm:text-xs font-semibold leading-snug line-clamp-3 px-1"
                    style={{ color: "#67E8F9" }}
                  >
                    {venue ?? "Stadion de confirmat"}
                  </span>
                )}
                <span
                  className="text-[10px] mt-2 font-medium tabular-nums"
                  style={{ color: WC_LIME }}
                >
                  {statusBadge?.tone === "postponed"
                    ? t("party.match.dateTbd")
                    : statusBadge?.tone === "cancelled"
                      ? t("party.match.cancelled")
                      : `${when} · ${t("party.match.romaniaTime")}`}
                </span>
                {rescheduledFrom != null ? (
                  <span
                    className="text-[10px] mt-1 font-semibold"
                    style={{ color: "#FBBF24" }}
                  >
                    {t("party.match.rescheduledFrom", { matchday: rescheduledFrom })}
                  </span>
                ) : null}
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

        {!finished && homeId != null && awayId != null ?
          <div className="flex justify-center -mt-1">
            <button
              type="button"
              onClick={() => setInsightsOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-colors hover:bg-white/5"
              style={{ color: "#C5A059", border: "1px solid rgba(197,160,89,0.28)" }}
            >
              {t("party.insights.open")}
            </button>
          </div>
        : null}

        {predictionLockedReason && (
          <p className="text-sm text-amber-200/90">
            {getPredictionLockMessage(predictionLockedReason)}
          </p>
        )}

        {!formLocked && (
          <>
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

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="flex flex-col gap-2 flex-1">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: WC_MUTED }}>
                  {t("party.exactScore")}
                </span>
                <div className="flex items-center justify-center sm:justify-start gap-4">
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px]" style={{ color: WC_MUTED }}>
                      {t("party.match.home")}
                    </span>
                    <input
                      value={p.predHomeGoals}
                      onChange={(e) => {
                        const digit = e.target.value.replace(/\D/g, "").slice(-1);
                        setP((s) => ({ ...s, predHomeGoals: digit }));
                        // Cifră introdusă → mut focusul la scorul oaspeților.
                        if (digit) awayGoalsRef.current?.focus();
                      }}
                      inputMode="numeric"
                      maxLength={1}
                      placeholder="X"
                      className="w-12 h-12 text-lg text-center rounded-xl border outline-none font-bold"
                      style={{
                        backgroundColor: WC_NAVY,
                        borderColor: scoreConflictsFt ? "#FBBF24" : WC_BORDER,
                        color: "#fff",
                      }}
                    />
                  </div>
                  <span className="text-xl font-bold mt-5" style={{ color: WC_MUTED }}>–</span>
                  <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px]" style={{ color: WC_MUTED }}>
                      {t("party.match.away")}
                    </span>
                    <input
                      ref={awayGoalsRef}
                      value={p.predAwayGoals}
                      onChange={(e) => {
                        const digit = e.target.value.replace(/\D/g, "").slice(-1);
                        setP((s) => ({ ...s, predAwayGoals: digit }));
                      }}
                      inputMode="numeric"
                      maxLength={1}
                      placeholder="X"
                      className="w-12 h-12 text-lg text-center rounded-xl border outline-none font-bold"
                      style={{
                        backgroundColor: WC_NAVY,
                        borderColor: scoreConflictsFt ? "#FBBF24" : WC_BORDER,
                        color: "#fff",
                      }}
                    />
                  </div>
                </div>
                {scoreConflictsFt ? (
                  <p className="text-xs leading-relaxed text-amber-200/90 max-w-sm">
                    {t("party.scoreFtMismatch")}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={pending || scoreConflictsFt}
                className="w-full sm:w-auto shrink-0 px-8 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 cursor-pointer hover:opacity-90 active:scale-[0.98]"
                style={{ backgroundColor: WC_LIME, color: WC_NAVY }}
              >
                {pending ? t("party.savingPrediction") : t("party.savePrediction")}
              </button>
            </div>

            <PotentialPoints
              ht={p.htOutcome}
              ft={p.ftOutcome}
              hg={p.predHomeGoals}
              ag={p.predAwayGoals}
              matchOdds={matchOddsRow}
              hideOddsUnavailable={hideOddsUnavailable}
            />
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

      {homeId != null && awayId != null ?
        <MatchInsightsModal
          open={insightsOpen}
          onClose={() => setInsightsOpen(false)}
          matchId={m.id}
          homeId={homeId}
          awayId={awayId}
          homeName={home}
          awayName={away}
          competition={competition}
        />
      : null}
    </div>
  );
}
