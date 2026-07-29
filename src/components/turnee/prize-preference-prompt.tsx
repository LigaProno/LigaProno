"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ModalOverlay } from "@/components/ui/modal-overlay";
import { PrizePreferencePanel } from "@/components/turnee/prize-preference-panel";
import { useLocale } from "@/components/i18n/locale-provider";

/**
 * Pop-up afișat la deschiderea unui turneu cu premii, dacă membrul nu și-a
 * setat încă preferința. Din moment ce turneele publice înscriu automat pe
 * toată lumea (fără pasul de „alătură-te"), aici cerem ordinea premiilor.
 * Renunțarea se ține minte pe sesiune, ca să nu apară la fiecare navigare.
 */
export function PrizePreferencePrompt({
  tournamentId,
  pool,
}: {
  tournamentId: string;
  pool: string[];
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(`prizePrefSkip:${tournamentId}`)) return;
    // Deschidere la montare pe baza sessionStorage (indisponibil la SSR, deci
    // nu poate fi un initializer de state fără hydration mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, [tournamentId]);

  function dismiss() {
    sessionStorage.setItem(`prizePrefSkip:${tournamentId}`, "1");
    setOpen(false);
  }

  if (!open) return null;

  return (
    <ModalOverlay onDismiss={dismiss}>
      <div
        className="w-full max-w-md rounded-2xl border p-5 flex flex-col gap-3 max-h-[85vh] overflow-y-auto"
        style={{ backgroundColor: "#0D1422", borderColor: "rgba(197,160,89,0.3)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-white">🎁 {t("party.prizePref.joinTitle")}</h3>
          <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
            {t("party.prizePref.promptHint")}
          </p>
        </div>

        <PrizePreferencePanel
          tournamentId={tournamentId}
          pool={pool}
          initial={[]}
          compact
          onSaved={() => { setOpen(false); router.refresh(); }}
        />

        <button
          type="button"
          onClick={dismiss}
          className="self-center text-xs transition-colors hover:text-white/70 mt-1"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          {t("party.prizePref.promptSkip")}
        </button>
      </div>
    </ModalOverlay>
  );
}
