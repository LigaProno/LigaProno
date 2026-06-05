"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinTournament } from "@/app/actions/tournament";

export default function JoinTournamentForm() {
  const [code, setCode] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      try {
        await joinTournament(code.trim());
        setSuccess(true);
        setCode("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="rounded-2xl border p-6 flex flex-col gap-4" style={{ backgroundColor: "#1E293B", borderColor: "rgba(255,255,255,0.08)" }}>
      <div>
        <h2 className="text-white font-bold text-lg">Join Tournament</h2>
        <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
          Enter an invite code to join a tournament
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Enter invite code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 10))}
          maxLength={10}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none border tracking-[0.2em] uppercase font-bold transition-colors"
          style={{
            backgroundColor: "#0F172A",
            color: "#22D3EE",
            borderColor: "rgba(255,255,255,0.12)",
          }}
        />
        {success && (
          <p className="text-sm" style={{ color: "#BEF264" }}>Successfully joined!</p>
        )}
        {error && <p className="text-sm" style={{ color: "#f87171" }}>{error}</p>}
        <button
          type="submit"
          disabled={isPending || code.length < 4}
          className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 cursor-pointer hover:opacity-90 active:scale-[0.98]"
          style={{ backgroundColor: "#BEF264", color: "#0F172A" }}
        >
          {isPending ? "Joining..." : "Join"}
        </button>
      </form>
    </div>
  );
}
