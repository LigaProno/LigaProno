"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteTournament } from "@/app/actions/tournament";

export default function DeleteTournamentButton({ tournamentId }: { tournamentId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    startTransition(async () => {
      await deleteTournament(tournamentId);
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "rgba(239,68,68,0.2)", color: "#f87171", border: "1px solid rgba(239,68,68,0.4)" }}
        >
          {isPending ? "…" : "Delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer hover:opacity-90"
          style={{ color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title="Delete tournament"
      className="p-2 rounded-lg transition-all cursor-pointer hover:opacity-80"
      style={{ color: "rgba(255,255,255,0.25)" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  );
}
