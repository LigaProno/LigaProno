"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { leaveTournament } from "@/app/actions/tournament";
import { useLocale } from "@/components/i18n/locale-provider";
import { ModalOverlay } from "@/components/ui/modal-overlay";

/** Ieșire din turneu, cu dialog de confirmare. Creatorul nu vede butonul. */
export default function LeaveTournamentButton({
  tournamentId,
  tournamentName,
  isPublic = false,
}: {
  tournamentId: string;
  tournamentName: string;
  isPublic?: boolean;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleLeave = () => {
    setError(null);
    startTransition(async () => {
      try {
        await leaveTournament(tournamentId);
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Eroare.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-white/[0.06] whitespace-nowrap shrink-0"
        style={{ color: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.14)" }}
      >
        {t("tournament.page.leave")}
      </button>

      {open ? (
        <ModalOverlay onDismiss={() => !isPending && setOpen(false)}>
          <div
            className="w-full max-w-sm rounded-2xl border p-5 flex flex-col gap-4"
            style={{ backgroundColor: "#0D1422", borderColor: "rgba(255,255,255,0.12)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-2">
              <h3 className="text-base font-bold text-white">{t("tournament.page.leaveTitle")}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                {t(
                  isPublic ? "tournament.page.leaveBodyPublic" : "tournament.page.leaveBodyPrivate",
                  { name: tournamentName },
                )}
              </p>
            </div>

            {error ? <p className="text-xs text-red-400">{error}</p> : null}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                {t("tournament.page.leaveCancel")}
              </button>
              <button
                type="button"
                onClick={handleLeave}
                disabled={isPending}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "rgba(239,68,68,0.9)", color: "#fff" }}
              >
                {isPending ? "…" : t("tournament.page.leaveYes")}
              </button>
            </div>
          </div>
        </ModalOverlay>
      ) : null}
    </>
  );
}
