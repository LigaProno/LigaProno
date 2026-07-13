"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinPublicTournament } from "@/app/actions/tournament";

export default function JoinPublicTournamentButton({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleJoin() {
    startTransition(async () => {
      await joinPublicTournament(tournamentId);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleJoin}
      disabled={isPending}
      className="px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all shrink-0"
      style={{ backgroundColor: "#BEF264", color: "#0F172A" }}
    >
      {isPending ? "Se alătură…" : "Alătură-te"}
    </button>
  );
}
