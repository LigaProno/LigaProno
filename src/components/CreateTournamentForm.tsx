"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTournament } from "@/app/actions/tournament";
import type { FootballDataCompetitionPickerOption } from "@/lib/competition";

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function CreateTournamentForm({
  competitionPickerOptions = [],
  competitionsLoadError = null,
}: {
  competitionPickerOptions?: FootballDataCompetitionPickerOption[];
  competitionsLoadError?: string | null;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState(() => generateCode());
  const [competitionKey, setCompetitionKey] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await createTournament(
          name.trim(),
          code.trim(),
          competitionKey.trim() || null,
        );
        setCreatedCode(result.inviteCode);
        setName("");
        setCode(generateCode());
        setCompetitionKey("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  function copyCode() {
    if (!createdCode) return;
    navigator.clipboard.writeText(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-2xl border p-6 flex flex-col gap-4" style={{ backgroundColor: "#1E293B", borderColor: "rgba(255,255,255,0.08)" }}>
      <div>
        <h2 className="text-white font-bold text-lg">Create Tournament</h2>
        <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
          Start a new party and invite friends
        </p>
      </div>

      {createdCode ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium" style={{ color: "#BEF264" }}>Tournament created!</p>
          <div className="flex items-center gap-2">
            <div
              className="flex-1 rounded-xl px-4 py-3 text-center text-lg font-bold tracking-[0.25em]"
              style={{ backgroundColor: "#0F172A", color: "#22D3EE" }}
            >
              {createdCode}
            </div>
            <button
              onClick={copyCode}
              className="px-4 py-3 rounded-xl text-sm font-semibold transition-all shrink-0 cursor-pointer hover:opacity-90 active:scale-95"
              style={{ backgroundColor: copied ? "#BEF264" : "#22D3EE", color: "#0F172A" }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => setCreatedCode(null)}
            className="text-sm text-center cursor-pointer hover:opacity-70 transition-opacity"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Create another
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
              Tournament name
            </label>
            <input
              type="text"
              placeholder="e.g. Champions League 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none border transition-colors"
              style={{ backgroundColor: "#0F172A", color: "#ffffff", borderColor: "rgba(255,255,255,0.12)" }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
              Competiție (Football-Data)
            </label>
            {competitionsLoadError ?
              <p className="text-xs" style={{ color: "#fbbf24" }}>
                {competitionsLoadError} Poți crea party fără competiție și o setezi mai târziu.
              </p>
            : null}
            <select
              value={competitionKey}
              onChange={(e) => setCompetitionKey(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none border transition-colors"
              style={{
                backgroundColor: "#0F172A",
                color: "#ffffff",
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              <option value="">Fără competiție (doar party)</option>
              {competitionPickerOptions.map((c) => (
                <option key={c.storageKey} value={c.storageKey}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
              Lista depinde de planul API Football-Data.org. Sezonul folosit este anul de start al sezonului curent.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
              Invite code
            </label>
            <div className="flex items-center gap-2 rounded-xl px-4 py-3 border" style={{ backgroundColor: "#0F172A", borderColor: "rgba(255,255,255,0.12)" }}>
              <span className="flex-1 text-sm font-bold tracking-[0.15em]" style={{ color: "#22D3EE" }}>
                {code}
              </span>
              <button
                type="button"
                onClick={() => setCode(generateCode())}
                title="Regenerate code"
                className="transition-all cursor-pointer active:scale-95 shrink-0"
                style={{ color: "rgba(255,255,255,0.4)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#ffffff")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>

          {error && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}

          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 mt-1 cursor-pointer hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: "#22D3EE", color: "#0F172A" }}
          >
            {isPending ? "Creating..." : "Create"}
          </button>
        </form>
      )}
    </div>
  );
}
