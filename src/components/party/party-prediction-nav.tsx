"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n";
import { WC_CYAN, WC_GOLD, WC_BORDER } from "@/components/world-cup/wc-theme";

export type PredictionPhase =
  | "champion"
  | "qualifiers"
  | "groups"
  | "knockout";

const PHASE_LABEL_KEYS: Record<PredictionPhase, MessageKey> = {
  champion: "party.phase.champion",
  qualifiers: "party.phase.qualifiers",
  groups: "party.phase.groups",
  knockout: "party.phase.knockout",
};

export function PartyPredictionNav({
  phase,
  onPhaseChange,
  groupLetter,
  onGroupLetterChange,
  groupLetters,
  knockoutStageLabel,
  onKnockoutStageChange,
  knockoutStages,
}: {
  phase: PredictionPhase;
  onPhaseChange: (p: PredictionPhase) => void;
  groupLetter: string;
  onGroupLetterChange: (letter: string) => void;
  groupLetters: string[];
  knockoutStageLabel: string;
  onKnockoutStageChange: (label: string) => void;
  knockoutStages: { label: string; predictable: number; total: number }[];
}) {
  const { t } = useLocale();
  const phases: PredictionPhase[] = [
    "champion",
    "qualifiers",
    "groups",
    "knockout",
  ];

  return (
    <div className="sticky top-0 z-10 -mx-1 px-1 py-2 flex flex-col gap-3 bg-[#0A0B1E]/95 backdrop-blur-sm border-b" style={{ borderColor: WC_BORDER }}>
      <div
        className="flex rounded-2xl p-1 border gap-1 overflow-x-auto"
        style={{
          borderColor: "rgba(255,255,255,0.1)",
          backgroundColor: "rgba(255,255,255,0.04)",
        }}
        role="tablist"
      >
        {phases.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={phase === p}
            onClick={() => onPhaseChange(p)}
            className="shrink-0 rounded-xl py-2.5 px-4 text-sm font-bold transition-all cursor-pointer"
            style={{
              backgroundColor: phase === p ? "rgba(59,130,246,0.18)" : "transparent",
              color: phase === p ? WC_CYAN : "rgba(255,255,255,0.55)",
            }}
          >
            {t(PHASE_LABEL_KEYS[p])}
          </button>
        ))}
      </div>

      {phase === "groups" && groupLetters.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {groupLetters.map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => onGroupLetterChange(letter)}
              className="w-9 h-9 rounded-lg text-sm font-bold transition-all cursor-pointer"
              style={{
                backgroundColor:
                  groupLetter === letter ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.06)",
                color: groupLetter === letter ? WC_CYAN : "rgba(255,255,255,0.55)",
                border:
                  groupLetter === letter ?
                    "1px solid rgba(59,130,246,0.35)"
                  : "1px solid transparent",
              }}
            >
              {letter}
            </button>
          ))}
        </div>
      )}

      {phase === "knockout" && knockoutStages.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {knockoutStages.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => onKnockoutStageChange(s.label)}
              className="shrink-0 rounded-xl py-2 px-3 text-xs font-bold transition-all cursor-pointer"
              style={{
                backgroundColor:
                  knockoutStageLabel === s.label ?
                    "rgba(251,191,36,0.15)"
                  : "rgba(255,255,255,0.06)",
                color: knockoutStageLabel === s.label ? WC_GOLD : "rgba(255,255,255,0.55)",
                border:
                  knockoutStageLabel === s.label ?
                    "1px solid rgba(251,191,36,0.35)"
                  : "1px solid transparent",
              }}
            >
              {s.label}
              {s.total > 0 ?
                <span className="ml-1 opacity-70">
                  ({s.predictable}/{s.total})
                </span>
              : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
