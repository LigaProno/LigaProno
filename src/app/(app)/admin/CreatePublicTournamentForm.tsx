"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPublicTournament } from "@/app/actions/admin";
import type { FootballDataCompetitionPickerOption } from "@/lib/competition";
import { PRIZE_OPTIONS, placeLabel } from "@/lib/tournament-prizes";

const MAX_PRIZE_PLACES = 10;

export default function CreatePublicTournamentForm({
  competitionPickerOptions,
}: {
  competitionPickerOptions: FootballDataCompetitionPickerOption[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [competitionKey, setCompetitionKey] = useState("");
  const [prizeCount, setPrizeCount] = useState(0);
  const [prizeSelections, setPrizeSelections] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handlePrizeCountChange(count: number) {
    setPrizeCount(count);
    setPrizeSelections((prev) => {
      const next = [...prev];
      while (next.length < count) next.push(PRIZE_OPTIONS[0]);
      return next.slice(0, count);
    });
  }

  function handlePrizeChange(index: number, value: string) {
    setPrizeSelections((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  const canSubmit = name.trim() && competitionKey.trim();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSuccess(null);
    const prizes = prizeSelections.map((prize, i) => ({ place: i + 1, prize }));
    startTransition(async () => {
      try {
        const result = await createPublicTournament(name.trim(), competitionKey.trim(), prizes);
        setSuccess(`Turneu creat! Cod: ${result.inviteCode}`);
        setName("");
        setCompetitionKey("");
        setPrizeCount(0);
        setPrizeSelections([]);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Eroare necunoscută.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Name */}
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
          style={{ backgroundColor: "#060911", color: "#fff", borderColor: "rgba(255,255,255,0.12)" }}
        />
      </div>

      {/* Competition */}
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
            backgroundColor: "#060911",
            color: competitionKey ? "#fff" : "rgba(255,255,255,0.4)",
            borderColor: "rgba(255,255,255,0.12)",
          }}
        >
          <option value="" disabled>Selectează o competiție</option>
          {competitionPickerOptions.map((c) => (
            <option key={c.storageKey} value={c.storageKey} style={{ color: "#fff" }}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Prize places count */}
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
            handlePrizeCountChange(v);
          }}
          className="w-32 rounded-xl px-4 py-3 text-sm outline-none border"
          style={{ backgroundColor: "#060911", color: "#fff", borderColor: "rgba(255,255,255,0.12)" }}
        />
      </div>

      {/* Per-place prize selectors */}
      {prizeCount > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
            Premii per loc
          </label>
          <div className="flex flex-col gap-2">
            {Array.from({ length: prizeCount }, (_, i) => (
              <div key={i} className="flex items-center gap-3">
                <span
                  className="text-xs font-bold shrink-0 w-14 text-right"
                  style={{ color: i === 0 ? "#BEF264" : i === 1 ? "#22D3EE" : "rgba(255,255,255,0.45)" }}
                >
                  {placeLabel(i + 1)}
                </span>
                <select
                  value={prizeSelections[i] ?? PRIZE_OPTIONS[0]}
                  onChange={(e) => handlePrizeChange(i, e.target.value)}
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none border"
                  style={{ backgroundColor: "#060911", color: "#fff", borderColor: "rgba(255,255,255,0.12)" }}
                >
                  {PRIZE_OPTIONS.map((p) => (
                    <option key={p} value={p} style={{ color: "#fff" }}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && <p className="text-sm" style={{ color: "#BEF264" }}>{success}</p>}

      <button
        type="submit"
        disabled={isPending || !canSubmit}
        className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50 cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
        style={{ backgroundColor: "#22D3EE", color: "#0F172A" }}
      >
        {isPending ? "Se creează…" : "Creează turneu public"}
      </button>
    </form>
  );
}
