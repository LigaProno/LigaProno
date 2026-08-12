"use client";

import { useState } from "react";
import { PRIZE_OPTIONS, placeLabel } from "@/lib/tournament-prizes";
import { darkOptionStyle, darkSelectStyle } from "@/components/moderation/dark-select-styles";

const MAX_PRIZE_PLACES = 10;

type PrizeSelectorsProps = {
  prizeCount: number;
  prizeSelections: string[];
  onPrizeCountChange: (count: number) => void;
  onPrizeChange: (index: number, value: string) => void;
  /** Listă extra de premii custom adăugate în sesiune. */
  customPrizes: string[];
  onAddCustomPrize: (prize: string) => void;
};

export function PrizeSelectors({
  prizeCount,
  prizeSelections,
  onPrizeCountChange,
  onPrizeChange,
  customPrizes,
  onAddCustomPrize,
}: PrizeSelectorsProps) {
  const [newPrizeDraft, setNewPrizeDraft] = useState("");
  const [showNewPrize, setShowNewPrize] = useState(false);

  const allOptions = [...PRIZE_OPTIONS, ...customPrizes.filter((p) => !(PRIZE_OPTIONS as readonly string[]).includes(p))];

  function submitNewPrize() {
    const trimmed = newPrizeDraft.trim();
    if (!trimmed) return;
    onAddCustomPrize(trimmed);
    setNewPrizeDraft("");
    setShowNewPrize(false);
  }

  return (
    <div className="flex flex-col gap-3 min-w-0">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
          Câte locuri premiante?
        </label>
        <input
          type="number"
          min={0}
          max={MAX_PRIZE_PLACES}
          value={prizeCount === 0 ? "" : prizeCount}
          placeholder="0 (fără premii)"
          onChange={(e) => {
            const v = Math.min(MAX_PRIZE_PLACES, Math.max(0, parseInt(e.target.value) || 0));
            onPrizeCountChange(v);
          }}
          className="w-32 rounded-xl px-4 py-3 text-sm outline-none border"
          style={{ backgroundColor: "rgba(255,255,255,0.03)", color: "#fff", borderColor: "rgba(255,255,255,0.12)" }}
        />
      </div>

      {prizeCount > 0 ? (
        <div className="flex flex-col gap-2 min-w-0">
          <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
            Premii per loc
          </label>
          {Array.from({ length: prizeCount }, (_, i) => (
            <div key={i} className="flex items-center gap-2 min-w-0">
              <span
                className="text-xs font-bold shrink-0 w-12 sm:w-14 text-right"
                style={{ color: i === 0 ? "#60A5FA" : i === 1 ? "#3B82F6" : "rgba(255,255,255,0.45)" }}
              >
                {placeLabel(i + 1)}
              </span>
              <select
                value={prizeSelections[i] ?? allOptions[0]}
                onChange={(e) => onPrizeChange(i, e.target.value)}
                title={prizeSelections[i] ?? allOptions[0]}
                className="min-w-0 flex-1 rounded-xl px-2.5 py-2.5 text-xs sm:text-sm outline-none border"
                style={darkSelectStyle}
              >
                {allOptions.map((p) => (
                  <option key={p} value={p} title={p} style={darkOptionStyle}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {!showNewPrize ? (
            <button
              type="button"
              onClick={() => setShowNewPrize(true)}
              className="self-start text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer hover:opacity-90"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "#60A5FA" }}
            >
              + Premiu nou
            </button>
          ) : (
            <div className="flex flex-col gap-2 min-w-0">
              <input
                type="text"
                value={newPrizeDraft}
                onChange={(e) => setNewPrizeDraft(e.target.value)}
                placeholder="ex. Tricou personalizat"
                maxLength={80}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none border"
                style={{ backgroundColor: "rgba(255,255,255,0.03)", color: "#fff", borderColor: "rgba(255,255,255,0.12)" }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={submitNewPrize}
                  disabled={!newPrizeDraft.trim()}
                  className="px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-40 cursor-pointer"
                  style={{ backgroundColor: "#3B82F6", color: "#0A0B1E" }}
                >
                  Adaugă
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewPrize(false);
                    setNewPrizeDraft("");
                  }}
                  className="px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{ backgroundColor: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }}
                >
                  Anulează
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export { MAX_PRIZE_PLACES };
