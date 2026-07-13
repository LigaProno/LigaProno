"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePublicTournament } from "@/app/actions/admin";

export default function DeletePublicTournamentButton({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Ștergi definitiv acest turneu public și toate pronosticurile?")) return;
    startTransition(async () => {
      await deletePublicTournament(tournamentId);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer hover:opacity-80 transition-opacity"
      style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}
    >
      {isPending ? "Se șterge…" : "Șterge"}
    </button>
  );
}
