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
      className="turnee-btn-primary shrink-0 disabled:opacity-50 cursor-pointer hover:opacity-95 active:scale-[0.98] transition-all"
    >
      {isPending ? "Se alătură…" : "Alătură-te"}
    </button>
  );
}
