"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinPublicTournament } from "@/app/actions/tournament";
import { useLocale } from "@/components/i18n/locale-provider";
import { PrizePreferencePanel } from "@/components/turnee/prize-preference-panel";
import { ModalOverlay } from "@/components/ui/modal-overlay";

export default function JoinPublicTournamentButton({
  tournamentId,
  prizePool = [],
}: {
  tournamentId: string;
  prizePool?: string[];
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPrizes, setShowPrizes] = useState(false);

  function handleJoin() {
    startTransition(async () => {
      await joinPublicTournament(tournamentId);
      // Turneu cu premii de ales → cerem preferința imediat după înscriere.
      if (prizePool.length > 0) {
        setShowPrizes(true);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleJoin}
        disabled={isPending}
        className="turnee-btn-primary shrink-0 disabled:opacity-50 cursor-pointer hover:opacity-95 active:scale-[0.98] transition-all"
      >
        {isPending ? "Se alătură…" : "Alătură-te"}
      </button>

      {showPrizes ? (
        <ModalOverlay onDismiss={() => { setShowPrizes(false); router.refresh(); }}>
          <div
            className="w-full max-w-md rounded-2xl border p-5 flex flex-col gap-3 max-h-[85vh] overflow-y-auto"
            style={{ backgroundColor: "#0D1422", borderColor: "rgba(197,160,89,0.3)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold text-white">{t("party.prizePref.joinTitle")}</h3>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                {t("party.prizePref.joinHint")}
              </p>
            </div>

            <PrizePreferencePanel
              tournamentId={tournamentId}
              pool={prizePool}
              initial={[]}
              compact
              onSaved={() => { setShowPrizes(false); router.refresh(); }}
            />

            <button
              type="button"
              onClick={() => { setShowPrizes(false); router.refresh(); }}
              className="self-center text-xs transition-colors hover:text-white/70 mt-1"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              {t("party.prizePref.skip")}
            </button>
          </div>
        </ModalOverlay>
      ) : null}
    </>
  );
}
