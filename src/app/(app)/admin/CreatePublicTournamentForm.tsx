"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPublicTournament } from "@/app/actions/admin";
import type { FootballDataCompetitionPickerOption } from "@/lib/competition";
import { PRIZE_OPTIONS } from "@/lib/tournament-prizes";
import { PrizeSelectors } from "@/components/moderation/prize-selectors";
import { darkOptionStyle, darkSelectStyle } from "@/components/moderation/dark-select-styles";

export default function CreatePublicTournamentForm({
  competitionPickerOptions,
  savedCustomPrizes = [],
}: {
  competitionPickerOptions: FootballDataCompetitionPickerOption[];
  savedCustomPrizes?: string[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [competitionKey, setCompetitionKey] = useState("");
  const [matchdayCount, setMatchdayCount] = useState<number | "">(0);
  const [prizeCount, setPrizeCount] = useState(0);
  const [prizeSelections, setPrizeSelections] = useState<string[]>([]);
  const [customPrizes, setCustomPrizes] = useState<string[]>(savedCustomPrizes);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handlePrizeCountChange(count: number) {
    setPrizeCount(count);
    setPrizeSelections((prev) => {
      const next = [...prev];
      const fallback = customPrizes[0] ?? PRIZE_OPTIONS[0];
      while (next.length < count) next.push(fallback);
      return next.slice(0, count);
    });
  }

  const canSubmit =
    name.trim() &&
    competitionKey.trim() &&
    typeof matchdayCount === "number" &&
    matchdayCount > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSuccess(null);
    const prizes = prizeSelections.map((prize, i) => ({ place: i + 1, prize }));
    const fixtureCount = typeof matchdayCount === "number" && matchdayCount > 0 ? matchdayCount : undefined;
    startTransition(async () => {
      try {
        await createPublicTournament(name.trim(), competitionKey.trim(), prizes, fixtureCount);
        setSuccess("Turneu public creat cu succes!");
        setName("");
        setCompetitionKey("");
        setMatchdayCount(0);
        setPrizeCount(0);
        setPrizeSelections([]);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Eroare necunoscută.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 min-w-0">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
          Nume turneu
        </label>
        <input
          type="text"
          placeholder="ex. Premier League 2024/25 — Public"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
          style={{ backgroundColor: "rgba(255,255,255,0.03)", color: "#fff", borderColor: "rgba(255,255,255,0.12)" }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
          Competiție
        </label>
        <select
          value={competitionKey}
          onChange={(e) => setCompetitionKey(e.target.value)}
          required
          className="w-full rounded-xl px-4 py-3 text-sm outline-none border"
          style={{
            ...darkSelectStyle,
            color: competitionKey ? "#fff" : "rgba(255,255,255,0.45)",
          }}
        >
          <option value="" disabled style={darkOptionStyle}>
            Selectează o competiție
          </option>
          {competitionPickerOptions.map((c) => (
            <option key={c.storageKey} value={c.storageKey} style={darkOptionStyle}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
          Număr etape
        </label>
        <input
          type="number"
          min={1}
          max={100}
          required
          value={matchdayCount === 0 ? "" : matchdayCount}
          placeholder="ex. 8"
          onChange={(e) => {
            const v = e.target.value === "" ? "" : Math.max(1, parseInt(e.target.value) || 1);
            setMatchdayCount(v === "" ? 0 : (v as number));
          }}
          className="w-32 rounded-xl px-4 py-3 text-sm outline-none border"
          style={{ backgroundColor: "#060911", color: "#fff", borderColor: "rgba(255,255,255,0.12)" }}
        />
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          Turneul începe de la prima etapă viitoare; pronosticurile sunt permise doar pe acest număr de etape.
        </p>
      </div>

      <PrizeSelectors
        prizeCount={prizeCount}
        prizeSelections={prizeSelections}
        onPrizeCountChange={handlePrizeCountChange}
        onPrizeChange={(index, value) => {
          setPrizeSelections((prev) => {
            const next = [...prev];
            next[index] = value;
            return next;
          });
        }}
        customPrizes={customPrizes}
        onCustomPrizesChange={setCustomPrizes}
      />

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm" style={{ color: "#60A5FA" }}>{success}</p>}

      <button
        type="submit"
        disabled={isPending || !canSubmit}
        className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50 cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
        style={{ backgroundColor: "#3B82F6", color: "#0A0B1E" }}
      >
        {isPending ? "Se creează…" : "Creează turneu public"}
      </button>
    </form>
  );
}
