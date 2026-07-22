"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPrizePreference } from "@/app/actions/tournament";
import { useLocale } from "@/components/i18n/locale-provider";

/**
 * Ordonează premiile după preferință (↑/↓). Folosit în pagina turneului și în
 * modalul de după înscriere. `editable=false` = doar citire (turneu închis).
 */
export function PrizePreferencePanel({
  tournamentId,
  pool,
  initial,
  editable = true,
  onSaved,
  compact = false,
}: {
  tournamentId: string;
  pool: string[];
  initial: string[];
  editable?: boolean;
  onSaved?: () => void;
  compact?: boolean;
}) {
  const { t } = useLocale();
  const router = useRouter();

  // Pornim de la preferința salvată dacă e o permutare validă, altfel de la pool.
  const validInitial =
    initial.length === pool.length && initial.every((p) => pool.includes(p));
  const [order, setOrder] = useState<string[]>(validInitial ? initial : pool);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= order.length) return;
    setSaved(false);
    setOrder((prev) => {
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      try {
        await setPrizePreference(tournamentId, order);
        setSaved(true);
        router.refresh();
        onSaved?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-2.5">
      {!compact ? (
        <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
          {t("party.prizePref.hint")}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        {order.map((prize, i) => (
          <div
            key={prize}
            className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
            style={{ borderColor: "rgba(197,160,89,0.25)", backgroundColor: "rgba(197,160,89,0.06)" }}
          >
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0"
              style={{ backgroundColor: "rgba(197,160,89,0.2)", color: "#C5A059" }}
            >
              {i + 1}
            </span>
            <span className="text-sm font-medium text-white flex-1 min-w-0 truncate">{prize}</span>
            {editable ? (
              <span className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0 || isPending}
                  aria-label={t("party.prizePref.moveUp")}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.08] disabled:opacity-25"
                  style={{ color: "rgba(255,255,255,0.75)" }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === order.length - 1 || isPending}
                  aria-label={t("party.prizePref.moveDown")}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/[0.08] disabled:opacity-25"
                  style={{ color: "rgba(255,255,255,0.75)" }}
                >
                  ↓
                </button>
              </span>
            ) : null}
          </div>
        ))}
      </div>

      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      {editable ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#C5A059", color: "#0A0B1E" }}
          >
            {isPending ? t("party.prizePref.saving") : t("party.prizePref.save")}
          </button>
          {saved ? (
            <span className="text-xs" style={{ color: "#34D399" }}>
              {t("party.prizePref.saved")}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
