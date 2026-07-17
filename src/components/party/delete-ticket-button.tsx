"use client";

import { useState, useTransition } from "react";
import {
  deleteMySupportTicket,
  deleteSupportTicketAsAdmin,
} from "@/app/actions/support";

/** Buton de ștergere tichet cu confirmare în doi pași. `admin` alege acțiunea. */
export function DeleteTicketButton({
  messageId,
  admin = false,
}: {
  messageId: string;
  admin?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const doDelete = () => {
    setError(null);
    startTransition(async () => {
      try {
        if (admin) await deleteSupportTicketAsAdmin(messageId);
        else await deleteMySupportTicket(messageId);
        // Rândul dispare la revalidate; nu resetăm starea.
      } catch (err) {
        setError(err instanceof Error ? err.message : "Eroare.");
        setConfirming(false);
      }
    });
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-white/[0.06] whitespace-nowrap"
        style={{ color: "rgba(248,113,113,0.85)", border: "1px solid rgba(248,113,113,0.3)" }}
      >
        Șterge
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>
          Sigur?
        </span>
        <button
          type="button"
          onClick={doDelete}
          disabled={isPending}
          className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-90 disabled:opacity-50 whitespace-nowrap"
          style={{ backgroundColor: "#F87171", color: "#0A0B1E" }}
        >
          {isPending ? "..." : "Șterge"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-white/[0.06] whitespace-nowrap"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          Anulează
        </button>
      </div>
      {error ? <span className="text-[10px] text-red-400">{error}</span> : null}
    </div>
  );
}
